# roji-store deploy

Programmatic deployment from LocalWP → Kinsta. Three layers, kept separate
on purpose:

| Layer | Tool | When to run |
|---|---|---|
| **Theme + Elementor template scripts** | `deploy-theme.sh` (manual) **or** GitHub Action | every code change (auto on push to main) |
| **Initial migration (DB + uploads + theme + plugins)** | `migrate-to-kinsta.sh` | exactly once, after Kinsta provisions WP |
| **Occasional DB pushes** (after editing pages/products locally) | `db-push.sh` | when you've changed content locally and want it live |

## One-time setup

### 1. Create the Kinsta WordPress site

In MyKinsta → **Add site** → **Install WordPress (PHP 8.2 + WP 6.9.4)**.

- Don't enable any add-ons in the wizard.
- Site name: `roji` (or whatever).
- Once provisioned, attach `rojipeptides.com` and `www.rojipeptides.com` under
  **Domains** in MyKinsta. Kinsta will give you DNS records to point at them.

### 2. Grab your SFTP/SSH credentials

In MyKinsta → your site → **Info** → scroll to **SFTP/SSH**. Copy:

- Host
- Port
- Username
- Password
- The path you land in after SFTP login (something like `/www/rojipeptides_123/public`)

### 3. Configure local `.env`

```bash
cd roji-store/deploy
cp .env.example .env
chmod 600 .env
$EDITOR .env   # paste the values
```

### 4. Install local prerequisites

```bash
brew install hudochenkov/sshpass/sshpass rsync php
```

(`php` is needed for the lint step. macOS ships with it; brew gives you a newer one.)

### 5. Run the one-shot migration

```bash
./migrate-to-kinsta.sh
```

This:

1. Lints all PHP.
2. Confirms Kinsta SSH works.
3. Dumps the LocalWP database, uploads it, imports it on Kinsta.
4. Runs `wp search-replace` to swap `http://roji.local` → `https://rojipeptides.com`.
5. Rsyncs `wp-content/uploads/`.
6. Rsyncs the child theme + Elementor template scripts.
7. Installs and activates the required plugin set (WooCommerce, Elementor, ACF,
   Age Gate, Yoast SEO, LiteSpeed Cache).
8. Activates `roji-child`.
9. Flushes rewrite rules + caches.
10. Hits the live homepage and reports the HTTP status.

After it finishes, log into `https://rojipeptides.com/wp-admin` and:

1. **WooCommerce → Settings**: confirm currency = USD, address, shipping, payments.
2. **Add to `wp-config.php`** via SSH:
   ```php
   define( 'ROJI_INTERNAL_API_TOKEN', '<value from password manager>' );
   ```
3. Once Google Ads is approved, set:
   ```php
   define( 'ROJI_GADS_ID', 'AW-XXXXXXXXXX' );
   define( 'ROJI_GADS_PURCHASE_LABEL', 'XXXXXXX' );
   ```

### 6. Set up the GitHub Action

In your GitHub repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**. Add five secrets (use the same values as your local
`.env`):

| Secret name | Value |
|---|---|
| `KINSTA_SSH_HOST` | from MyKinsta → Info |
| `KINSTA_SSH_PORT` | from MyKinsta → Info |
| `KINSTA_SSH_USER` | from MyKinsta → Info |
| `KINSTA_SSH_PASSWORD` | from MyKinsta → Info |
| `KINSTA_WP_PATH` | e.g. `/www/rojipeptides_123/public` |

Now every push to `main` that touches `roji-store/` will auto-deploy the
theme + Elementor templates to Kinsta. The DB and uploads are never touched
by CI.

## Day-to-day flows

### "I edited some PHP / CSS in roji-child"

```bash
git add roji-store/roji-child/...
git commit -m "store: fix checkout button color"
git push                          # GitHub Action picks it up
```

Or, if you want to deploy without committing yet:

```bash
cd roji-store/deploy
./deploy-theme.sh                 # rsyncs current working copy
./deploy-theme.sh --dry-run       # preview only
```

### "I added a new product / page in LocalWP and want it on prod"

```bash
cd roji-store/deploy
./db-push.sh                      # backs up remote DB first, then overwrites
```

This is destructive — it overwrites the production DB. The script always
takes a timestamped backup of the remote DB first and saves it locally as
`roji-backup-<timestamp>.sql.gz`. To restore:

```bash
gunzip -c roji-backup-<ts>.sql.gz | \
  sshpass -e ssh -p $PORT $USER@$HOST "cd '$WP_PATH' && wp db import -"
# then wp search-replace if you swapped URLs
```

### "I added a new image to the media library locally"

```bash
cd roji-store/deploy
# Just rsync the uploads dir manually:
sshpass -e rsync -avz \
  -e "ssh -p $KINSTA_SSH_PORT" \
  "$LOCAL_WP_PATH/wp-content/uploads/" \
  "$KINSTA_SSH_USER@$KINSTA_SSH_HOST:$KINSTA_WP_PATH/wp-content/uploads/"
```

(or just re-run `migrate-to-kinsta.sh --skip-db` which only re-syncs uploads
and theme — no DB writes.)

## Reverse direction (Kinsta → LocalWP) — pull a fresh copy

Sometimes you want production content on your local machine for development.
There's no script for this yet because it's a one-liner:

```bash
# DB:
sshpass -e ssh -p $PORT $USER@$HOST "cd '$WP_PATH' && wp db export -" \
  | mysql --socket="$LOCAL_DB_SOCKET" -u root -proot local
wp search-replace 'https://rojipeptides.com' 'http://roji.local' --all-tables
# Uploads:
sshpass -e rsync -avz -e "ssh -p $PORT" \
  "$USER@$HOST:$WP_PATH/wp-content/uploads/" \
  "$LOCAL_WP_PATH/wp-content/uploads/"
```

## Files

```
roji-store/deploy/
├── .env.example              # template for credentials
├── .env                      # gitignored, your real creds
├── .gitignore
├── _lib.sh                   # shared bash helpers (SSH/rsync/wp-cli wrappers)
├── deploy-theme.sh           # rsync child theme + mu-plugins (no DB)
├── migrate-to-kinsta.sh      # one-shot first-time migration
├── db-push.sh                # destructive: overwrite remote DB with local
└── README.md                 # this file
```

## Notes / gotchas

- Kinsta's SFTP/SSH password rotates if you click "Generate" in MyKinsta. If
  you do that, you must update both `.env` AND the GitHub repo secret.
- Kinsta uses **password auth** by default. The scripts use `sshpass` for
  non-interactive runs. If you'd rather use SSH keys, generate one in MyKinsta
  → SSH Keys → upload public key, then drop the `sshpass -e` prefix in `_lib.sh`
  and remove `KINSTA_SSH_PASSWORD` from `.env`.
- The `mu-plugins/` approach for Elementor template scripts means they auto-
  activate on every Kinsta deploy without having to register a plugin. They
  run on every request — keep them lightweight (they already are).
- Kinsta's **Object Cache (Redis)** is per-plan. The scripts call `wp cache flush`
  defensively; if it errors out, that's expected on plans without Redis.
- Kinsta's **page cache** is purged automatically on file changes via their
  internal hooks. We also try `wp kinsta-cache-cli purge-complete` opportunistically.
