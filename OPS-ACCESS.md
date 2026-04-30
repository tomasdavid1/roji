# Ops & Access — SSH, deploy keys, API credentials

**Companion to `HANDOFF.md`.** This file documents *how to reach* every piece of infrastructure. It contains **no secrets** — actual credentials live outside the repo (see "Where the secrets live" below).

> **Rule:** never commit a credential. If a value matches one of the patterns in `.gitignore` (`.env*`) it'll be blocked; for everything else use your judgement. When in doubt, paste only into local-only files under `~/.cursor/projects/Users-tomas-Roji/agent-tools/`.

---

## 1. Where the secrets live

| Secret class | Location | Format |
|---|---|---|
| **Kinsta SSH/SFTP** (rojipeptides.com host) | `~/.cursor/projects/Users-tomas-Roji/agent-tools/kinsta-ssh.md` | Markdown table; password in plain text |
| **Google Ads API** (OAuth + dev token + refresh token) | `roji-ads-dashboard/.env.local` | Standard dotenv. Gitignored. |
| **Vercel CLI auth** | `~/.local/share/com.vercel.cli/auth.json` (or wherever Vercel CLI keeps it) | Managed by `vercel login` |
| **GitHub auth** | `gh auth status` / `~/.config/gh/hosts.yml` | Managed by `gh auth login` |
| **Fly.io auth** | `~/.fly/config.yml` | Managed by `flyctl auth login` |
| **WordPress `wp-config.php` defines** (`ROJI_GADS_*`, DB creds) | On the Kinsta server only — **not in the repo** | PHP `define()` statements |
| **GitHub Actions secrets** (Kinsta deploy creds) | `repo Settings → Secrets and variables → Actions` | GitHub UI |

A note on the Google Ads credentials: the values currently in `.env.local` were shared in plain chat earlier in the project's life. **They are scheduled for rotation** — see `SECURITY-NOTE.md` for the full list. Until then, treat the dev token + OAuth client secret + refresh token as compromised but functional.

---

## 2. Kinsta SSH (production WordPress)

**Host:** `129.80.57.27` &nbsp;·&nbsp; **Port:** `63324` &nbsp;·&nbsp; **User:** `rojipeptides`

Password is in `~/.cursor/projects/Users-tomas-Roji/agent-tools/kinsta-ssh.md`.

### Quick connect

```bash
ssh rojipeptides@129.80.57.27 -p 63324
# password prompt — paste from the local creds file
```

### Sensitive paths on the server

| Path | What it is |
|---|---|
| `~/public/` | WordPress webroot |
| `~/public/wp-config.php` | Holds DB creds + all `define('ROJI_*')` values (gtag IDs, conversion labels, age requirement, etc.) — **not in the repo by design** |
| `~/public/wp-content/themes/roji-child/` | Child theme — **deployed FROM the repo** via GitHub Actions; do not hand-edit |
| `~/public/wp-content/mu-plugins/roji-elementor-templates/` | Elementor page templates — also deployed from repo |
| `~/public/wp-content/mu-plugins/roji-scripts/` | WP-CLI helper scripts — also deployed from repo |
| `~/public/wp-content/uploads/` | Media library — manual upload territory |

### Common ops one-liners

**Back up wp-config before editing it:**

```bash
ssh rojipeptides@129.80.57.27 -p 63324 \
  'cp ~/public/wp-config.php ~/wp-config.php.bak.$(date +%Y%m%d-%H%M%S) && ls -la ~/wp-config.php*'
```

**Pull wp-config to your laptop, edit, push back:**

```bash
sftp -P 63324 rojipeptides@129.80.57.27:public/wp-config.php ./wp-config.kinsta.php
# ...edit locally...
scp -P 63324 ./wp-config.kinsta.php rojipeptides@129.80.57.27:public/wp-config.php
```

**Flush both WP object cache and Kinsta page cache:**

```bash
ssh rojipeptides@129.80.57.27 -p 63324 \
  'wp --path=~/public cache flush && wp --path=~/public kinsta cache purge --all'
```

⚠️ It's `kinsta cache purge`, not `kinsta cache clear` (the latter fails with "subcommand not found"). The wrapper around Kinsta's caching is opinionated.

**Run any WP-CLI command on the server:**

```bash
ssh rojipeptides@129.80.57.27 -p 63324 'wp --path=~/public <cmd>'
# examples:
#   wp option get blogname
#   wp transient delete --all
#   wp roji reserve:list   (custom command from the reserve gateway)
```

**Watch real-time PHP error log** (useful when chasing a 500):

```bash
ssh rojipeptides@129.80.57.27 -p 63324 'tail -f ~/logs/error.log'
```

---

## 3. GitHub Actions → Kinsta deploy

The `roji-store/**` deploy workflow needs these repo secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `KINSTA_SSH_HOST` | `129.80.57.27` |
| `KINSTA_SSH_PORT` | `63324` |
| `KINSTA_SSH_USER` | `rojipeptides` |
| `KINSTA_SSH_PASSWORD` | (the password from `kinsta-ssh.md`) |
| `KINSTA_WP_PATH` | `/www/<install-id>/public` (the absolute path WP-CLI sees on the server) |

To rotate the SSH password:

1. Update it in MyKinsta (Sites → rojipeptides → Info → SFTP/SSH).
2. Update `KINSTA_SSH_PASSWORD` in GitHub Actions secrets.
3. Update `~/.cursor/projects/Users-tomas-Roji/agent-tools/kinsta-ssh.md` locally.
4. Trigger a deploy (`gh workflow run "Deploy roji-store to Kinsta"`) and verify it passes.

To trigger a manual deploy (useful after editing wp-config or changing GH secrets):

```bash
cd /Users/tomas/Roji
gh workflow run "Deploy roji-store to Kinsta"           # full deploy
gh workflow run "Deploy roji-store to Kinsta" -f dry_run=true   # rsync dry-run, no DB writes
gh run watch                                            # watch the latest run live
```

---

## 4. Vercel CLI (Next.js apps)

User account: **`tomasdaavid@gmail.com`** &nbsp;·&nbsp; Scope: **`tomasdavid1's projects`**

⚠️ There's a separate `tomas-scopelabs` Vercel scope for unrelated work. **Do not touch projects under that scope.**

### Login

```bash
vercel login
# pick "Continue with Email" → tomasdaavid@gmail.com → click magic link
```

### Verify scope

```bash
vercel whoami
vercel teams ls       # shows current scope
vercel switch         # interactive scope picker (if you need to swap)
```

### List projects

```bash
vercel project ls
# expect to see at least:
#   roji-tools  (root: roji-tools/,           prod: tools.rojipeptides.com)
#   roji-ads    (root: roji-ads-dashboard/,   prod: ads.rojipeptides.com)
```

### Inspect environment variables

```bash
cd /Users/tomas/Roji/roji-tools          # or roji-ads-dashboard
vercel env ls production
vercel env ls preview
```

### Deploy manually (rarely needed — auto-deploy on push handles 99%)

```bash
cd /Users/tomas/Roji/roji-tools
vercel --prod                # full prod deploy from this folder
# WARNING: from a monorepo subfolder, vercel sometimes complains about root.
# If so, cancel and just `git push origin main` — the GitHub-Vercel
# integration will auto-deploy.
```

### Pull production env into a local `.env` (one-shot debug)

```bash
cd /Users/tomas/Roji/roji-ads-dashboard
vercel env pull .env.production.local
```

---

## 5. Google Ads API access

Credentials live in **`roji-ads-dashboard/.env.local`** (gitignored).

| Env var | What it is |
|---|---|
| `GOOGLE_ADS_CLIENT_ID` | OAuth Desktop-app client ID (from Google Cloud Console → Credentials) |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth client secret (rotate via Cloud Console → Reset secret) |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | From Ads → Tools → API Center. Currently at "Explorer" access level (~2,880 ops/day on production accounts) |
| `GOOGLE_ADS_REFRESH_TOKEN` | Long-lived OAuth refresh token. Generate via `node scripts/get-refresh-token.js` |
| `GOOGLE_ADS_CUSTOMER_ID` | `6573032286` — the Roji Tools sub-account |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | `2637832527` — the MCC manager account |

### Common diagnostic CLIs

All Node scripts auto-load `.env.local` via `_cli-bootstrap.cjs`:

```bash
cd /Users/tomas/Roji/roji-ads-dashboard

node scripts/list-accessible-customers.js     # confirms OAuth is alive
node scripts/list-conversions.js              # lists conversion actions on the account
node scripts/audit-roji-account.js            # full account inventory
node scripts/check-cross-account-tracking.js  # MCC cross-account settings
node scripts/cleanup-orphan-budgets.js        # remove unattached budgets
node scripts/set-campaign-budget.js <id> <usd>   # mutate daily budget
node scripts/delete-campaign.js <id>          # soft-delete a campaign
node scripts/remove-ad.js <ad_id>             # remove a specific RSA
```

### Re-provision the live blueprint (idempotent — RSA dedup baked in)

```bash
npm run blueprint:dryrun     # no writes; shows the plan
npm run blueprint:live       # writes to AW account, paused
```

### Generate a new refresh token (when current one is revoked)

```bash
cd /Users/tomas/Roji/roji-ads-dashboard
node scripts/get-refresh-token.js
# Opens a browser → grant scope → copy the printed refresh token into .env.local
```

---

## 6. GitHub auth (`gh` CLI)

```bash
gh auth status              # who am I
gh auth login               # interactive (HTTPS, browser flow)
gh auth refresh -s repo,workflow,read:org   # bump scopes if needed
```

Common ops:

```bash
gh run list --limit 5                      # recent CI runs
gh run watch                               # watch the latest one
gh workflow run "Deploy roji-store to Kinsta" -f dry_run=true
gh secret list                             # list (names only) of repo secrets
gh secret set KINSTA_SSH_PASSWORD          # interactive paste-and-set
```

---

## 7. Fly.io (MCP server)

```bash
flyctl auth login
flyctl status -a roji-mcp
flyctl deploy -a roji-mcp -c roji-mcp/fly.toml --remote-only
flyctl logs -a roji-mcp
flyctl secrets list -a roji-mcp
flyctl secrets set FOO=bar -a roji-mcp
```

The MCP server is **not** part of the auto-deploy pipeline — push doesn't trigger a Fly deploy. Run `flyctl deploy` manually after changes in `roji-mcp/`.

---

## 8. Tag Assistant (manual, browser-only)

Used to verify gtag is firing correctly on `rojipeptides.com` and `tools.rojipeptides.com`.

1. Install the [Tag Assistant Companion Chrome extension](https://chromewebstore.google.com/detail/tag-assistant-companion/jmekfmbnaedfebfnmakmokmlfpblbfdm).
2. Go to <https://tagassistant.google.com/>.
3. "Add domain" → enter the URL you want to test → click Connect.
4. A new tab opens to that URL with debug mode on. Walk the funnel.
5. Tag Assistant's left rail shows every gtag event in real time with parameters + which destinations (AW/GA4) received it.

For the **purchase** test: complete a real Reserve-Order checkout. On the thank-you page you should see:
- `purchase` event with `transaction_id`, `value`, `currency`, `items[]`
- `conversion` event with `send_to: AW-18130000394/5UzRCPbFlqUcEIq0h8VD`

For **add_to_cart**: click any "Add to cart" button. You should see `add_to_cart` + `conversion` to `AW-18130000394/zMB-CJPUlqUcEIq0h8VD`.

---

## 9. Recovery — "everything broke, where do I start"

| Symptom | First-look location |
|---|---|
| `rojipeptides.com` 500s or blank | Kinsta SSH → `tail -f ~/logs/error.log` |
| GitHub Actions deploy red | `gh run view <id> --log` |
| Vercel deploy red | Vercel dashboard → project → Deployments → latest → Logs |
| `add_to_cart` not firing | Tag Assistant → check JS console for errors → check `inc/tracking.php` was deployed |
| Place Order does nothing | Inspect rendered checkout HTML for nested `<form>` issues (see HANDOFF.md §6, item 1) |
| Google Ads API returns 403 | OAuth refresh token revoked → regenerate via `scripts/get-refresh-token.js` |
| `npm run blueprint:live` fails | Check `roji-ads-dashboard/.env.local` exists + has all 6 GOOGLE_ADS_* keys |
| Conversion not attributing | Wait 24–48h for Google's crawler to verify the tag, OR manually verify via Google Ads → Tools → Conversions → Diagnostics |

---

## 10. The "I want to give an agent access" matrix

If you're handing off to a human or a separate AI agent:

| Need | Give them |
|---|---|
| Read-only tour of the codebase | Repo access (it's public-ish on GitHub under `tomasdavid1/roji`) + `HANDOFF.md` |
| Edit code, push to `main` | Above + GitHub write access |
| Deploy WP changes to Kinsta | Push access is enough (CI handles it) — they don't need SSH |
| Edit `wp-config.php` directly | Kinsta SSH creds (`kinsta-ssh.md`) |
| Mutate Google Ads campaigns | `roji-ads-dashboard/.env.local` (or generate them their own OAuth refresh token via Cloud Console) |
| Vercel env-var changes | `vercel login` with their own account, then add them as a member of `tomasdavid1's projects` scope |
| Read GitHub Actions secrets | They have to be a repo collaborator with admin role; the values are write-only via UI |

**End of OPS-ACCESS.md.** When in doubt about access: this file first, then `HANDOFF.md`, then the local `kinsta-ssh.md` for the specific creds.
