# Roji Platform — Deployment

End-to-end checklist for getting the three projects live.

> Anything starting with **YOU** is a step you must do (it requires browser auth or external services). Everything else can be automated.

---

## 0. Before you do anything

**Rotate the leaked OAuth client secret.** The current `GOOGLE_ADS_CLIENT_SECRET` (`GOCSPX-F3-...`) was shared in chat and should be considered compromised.

1. Open Google Cloud Console → **APIs & Services → Credentials**.
2. Click your OAuth 2.0 Client ID.
3. Click **Reset secret**, copy the new value.
4. Update `roji-ads-dashboard/.env.local` with the new secret.
5. (Eventually) update the same env var in Vercel.

See [SECURITY-NOTE.md](./SECURITY-NOTE.md) for the full reasoning.

---

## 1. Get the Google Ads refresh token

Required for the dashboard to talk to live Google Ads.

```bash
cd roji-ads-dashboard
node scripts/get-refresh-token.js
```

The script:

1. Loads `GOOGLE_ADS_CLIENT_ID` + `GOOGLE_ADS_CLIENT_SECRET` from `.env.local`.
2. Prints an OAuth URL — open it in your browser.
3. **YOU**: sign in with `tomasdaavid@gmail.com` (the account that owns the Ads customer `667-978-0942`) and grant the `adwords` scope.
4. Captures the redirect on `localhost:8765` and prints the refresh token.

Paste the printed token into `roji-ads-dashboard/.env.local`:

```
GOOGLE_ADS_REFRESH_TOKEN=1//0g...
```

> If `gcloud auth application-default login` is your preferred path, that produces ADC credentials, not the format `google-ads-api` (the npm client) expects. Use the script above instead — it does the same OAuth flow but produces a refresh token in the right format.

### Apply for the Google Ads developer token

Separate from the OAuth flow above. Required for live API calls.

1. **YOU**: Go to <https://ads.google.com/aw/apicenter>.
2. Apply for API access. Approval typically takes 1–3 business days for "Basic" access (which is enough to start).
3. Once approved, paste the developer token into `.env.local`:

   ```
   GOOGLE_ADS_DEVELOPER_TOKEN=...
   ```

Until approved, the dashboard runs against mock data — the nav shows a `Mock data` pill so you always know which mode you're in.

### Smoke test locally

```bash
cd roji-ads-dashboard
npm run dev
# open http://localhost:3001/performance
```

If all four `GOOGLE_ADS_*` values are set, the nav pill flips to `Live API`. If anything is missing, you stay on mock data and the dashboard still works.

---

## 2. GitHub repo

The repo is already initialized locally with `user.email = tomasdaavid@gmail.com`. Verify:

```bash
cd /Users/tomas/Roji
git config --get user.email   # should print tomasdaavid@gmail.com
git log --oneline -1
```

### Create the GitHub repo

Two options:

**Option A — `gh` CLI (fastest):**

```bash
# YOU: install + auth gh first
brew install gh
gh auth login   # follow the prompts; pick your personal GitHub account
# Then:
cd /Users/tomas/Roji
gh repo create roji-platform --private --source=. --push
```

**Option B — Web:**

1. **YOU**: <https://github.com/new>, create `roji-platform` (private).
2. Run:

   ```bash
   cd /Users/tomas/Roji
   git remote add origin git@github.com:<your-username>/roji-platform.git
   git push -u origin main
   ```

> Either way: confirm the commit author shows `tomasdaavid@gmail.com` on GitHub, not your work email.

---

## 3. Vercel — Protocol Engine

Each Next.js project becomes its own Vercel project so they can be deployed and updated independently.

1. **YOU**: <https://vercel.com/new>, sign in with your personal GitHub.
2. Import the `roji-platform` repo.
3. **Root Directory**: `roji-protocol`
4. **Framework Preset**: Next.js (auto-detected)
5. **Environment variables** (Production + Preview):

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_STORE_URL` | `https://rojipeptides.com` |
   | `NEXT_PUBLIC_GADS_ID` | _(once you have it)_ |
   | `NEXT_PUBLIC_GADS_PROTOCOL_LABEL` | _(once you have it)_ |
   | `NEXT_PUBLIC_GA4_ID` | _(once you have it)_ |

6. Click **Deploy**.
7. After first deploy: **Settings → Domains**, add `protocol.rojipeptides.com`. Vercel will show the DNS records to add.

### DNS for `protocol.rojipeptides.com`

**YOU** at your DNS host (wherever `rojipeptides.com` is registered):

```
Type   Name       Value
CNAME  protocol   cname.vercel-dns.com
```

Or use the exact records Vercel shows you.

---

## 4. Vercel — Ads Dashboard

1. **YOU**: <https://vercel.com/new>, import `roji-platform` again as a **second** Vercel project.
2. **Root Directory**: `roji-ads-dashboard`
3. **Environment variables**:

   | Key | Value |
   | --- | --- |
   | `GOOGLE_ADS_CLIENT_ID` | from your `.env.local` |
   | `GOOGLE_ADS_CLIENT_SECRET` | rotated value from step 0 |
   | `GOOGLE_ADS_DEVELOPER_TOKEN` | once approved |
   | `GOOGLE_ADS_REFRESH_TOKEN` | from `get-refresh-token.js` |
   | `GOOGLE_ADS_CUSTOMER_ID` | `6679780942` |
   | `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | only if using a manager account |
   | `ADMIN_USER` | a username you choose |
   | `ADMIN_PASS` | a long random password |

4. Click **Deploy**.
5. Add domain `admin-ads.rojipeptides.com`.

### DNS for `admin-ads.rojipeptides.com`

```
Type   Name        Value
CNAME  admin-ads   cname.vercel-dns.com
```

> Make sure both `ADMIN_USER` and `ADMIN_PASS` are set in production. The basic-auth gate auto-disables if `ADMIN_PASS` is empty (handy for local dev), so leaving it blank in production would expose the dashboard to the world.

---

## 5. WordPress storefront

The `roji-store/` directory in this repo is **not** a deploy target for Vercel — it's a child theme + a product seeder script that you drop into a real WordPress install. See [`roji-store/README.md`](./roji-store/README.md) for the full setup walkthrough (LocalWP / Docker / Kinsta / Cloudways).

After WP is up:

1. Activate `roji-child` theme.
2. Run the seeder: `wp eval-file scripts/import-products.php`.
3. Copy the printed product IDs into `roji-child/inc/config.php`.
4. Add tracking IDs (`ROJI_GADS_ID`, `ROJI_GA4_ID`, `ROJI_GADS_PURCHASE_LABEL`) to the same file.
5. Install your high-risk payment gateway plugin and configure it.

The protocol engine deep-link (`/cart/?protocol_stack=wolverine`) only works once those product IDs are filled in.

---

## 6. Smoke tests after everything is live

- [ ] `https://protocol.rojipeptides.com` → wizard works, "Get this stack" redirects to `https://rojipeptides.com/cart/?protocol_stack=wolverine&utm_source=protocol_engine&...`
- [ ] WooCommerce auto-adds the product to cart and lands on checkout.
- [ ] Checkout shows the disclaimer + mandatory `research_use_confirm` checkbox; submitting without it errors.
- [ ] Footer disclaimer renders on every page.
- [ ] Age gate shows on first visit, persists 30 days.
- [ ] `https://admin-ads.rojipeptides.com` → basic-auth challenge, then nav shows `Live API` pill.
- [ ] GA4 + Google Ads conversion events fire (check DebugView in GA4).

---

## 7. Things I cannot do for you

- Run `gcloud` (browser auth flow under your identity)
- Push to GitHub (no auth + I shouldn't have your token)
- Sign in to Vercel (browser flow)
- Apply for the Google Ads developer token (your account / business)
- DNS changes (your registrar)
- Provision the WordPress host (Kinsta / Cloudways / LocalWP)
- Sign up for AllayPay / Durango / Coinbase Commerce (KYC under your business)
