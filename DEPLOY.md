# Roji Platform — Deployment

End-to-end checklist for getting the three projects live.

> Anything starting with **YOU** is a step you must do (it requires browser auth or external services). Everything else can be automated.

---

## 0. Before you do anything

**Rotate the leaked OAuth client secret.** The current `GOOGLE_ADS_CLIENT_SECRET` was shared in chat and should be considered compromised.

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

#### Troubleshooting the OAuth flow

**Browser shows `Error 400: redirect_uri_mismatch`**
The OAuth client wasn't created as a Desktop app. Two fixes:

1. (Easiest) Go to [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials), click your OAuth client, and check **Application type**. If it's **Web application**, you need to either:
   - Add `http://127.0.0.1:8765` to **Authorized redirect URIs** and save, or
   - Create a new OAuth client of type **Desktop app**, download the new JSON, and update `GOOGLE_ADS_CLIENT_ID` + `GOOGLE_ADS_CLIENT_SECRET` in `.env.local`.
2. The script uses `http://127.0.0.1:8765` (not `localhost`) because Google Desktop OAuth clients only accept the loopback IP.

**Browser shows `Error 403: access_denied` or "This app is blocked"**
Your OAuth Consent Screen needs to have your test user added (if in Testing mode) or be Published.

1. Go to [OAuth consent screen → Audience](https://console.cloud.google.com/apis/credentials/consent).
2. If **Publishing status** is "Testing", add `tomasdaavid@gmail.com` to **Test users**.
3. Or click **Publish App** to move it to "In production" (no review required for internal use with the `adwords` scope; review IS required to remove the unverified-app warning for external users).

**Terminal shows `No refresh_token in response`**
This happens when you've already authorized the app with this Google account. Google only returns a refresh token on first consent.

1. Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
2. Find the OAuth client (probably named after your Google Cloud project).
3. Click **Remove access**.
4. Re-run the script.

The script already passes `prompt=consent` to force re-consent, but Google sometimes still skips the refresh token if access was previously granted.

**Port 8765 is already in use**
Either kill whatever's using it (`lsof -ti tcp:8765 | xargs kill`) or edit `PORT` near the top of [`scripts/get-refresh-token.js`](./roji-ads-dashboard/scripts/get-refresh-token.js).

**Browser hangs after clicking Allow**
Make sure the script is still running in the terminal. The browser redirects to `http://127.0.0.1:8765/?code=...` and the script's local server has to be listening to catch it. Don't close the terminal.

### Google Ads developer token + Basic Access

You have a developer token (currently in **Test Account Access** mode), wired into [`roji-ads-dashboard/.env.local`](./roji-ads-dashboard/.env.local).

**Account topology:**

- Manager (MCC) account: **263-783-2527** (`GOOGLE_ADS_LOGIN_CUSTOMER_ID=2637832527`) — owns the developer token and authorizes calls
- Operating account: **667-978-0942** (`GOOGLE_ADS_CUSTOMER_ID=6679780942`) — Roji Peptides, the actual ad account

The operating account must be linked under the MCC. **YOU**: in the MCC, go to **Account access → Sub-accounts** and confirm `667-978-0942` is linked. If not, the API will return `USER_PERMISSION_DENIED` regardless of token state.

A test-mode token can only call the API against [Google Ads test accounts](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts), not your production customer `667-978-0942`. To call your real account, **YOU** need to apply for **Basic Access** from the **MCC** (not the operating account):

1. Go to <https://ads.google.com/aw/apicenter> (sign in with `tomasdaavid@gmail.com`).
2. In the **Access level** section, click **Apply for Basic Access**.
3. Fill out the application form. Recommended answers given Roji's setup:

   | Field | Suggested answer |
   | --- | --- |
   | Tool name | Roji Ads Dashboard |
   | Tool URL | `https://admin-ads.rojipeptides.com` (or `https://github.com/tomasdavid1/roji` if not yet deployed) |
   | Tool description | Internal admin dashboard for managing Google Ads search campaigns for Roji Peptides. Read-only metrics views (campaigns, keywords, performance) plus a server-validated campaign creation flow that runs an internal ad-copy safety check before submitting. Single user (the business owner). No third-party data sharing. |
   | Tool's primary purpose | Reporting + campaign management |
   | Estimated monthly API calls | < 5,000 (single-user internal admin) |
   | Languages | English |
   | Compliance with Google Ads API Required Minimum Functionality | Read-only metrics + create/update campaigns with mandatory ad-copy validation. Does not auto-create accounts. |

4. Approval typically takes 1–3 business days. You'll get an email; the access level on the API Center page flips to "Basic Access".

While you wait:

- The dashboard nav shows a **Test mode** pill (orange).
- A banner under each page tells you what's happening.
- Any live API call will throw a clear error: `Developer token is in TEST mode...`.
- You can still develop UI/logic against mock data by temporarily commenting out `GOOGLE_ADS_DEVELOPER_TOKEN=` in `.env.local` (which flips the dashboard to mock mode).

> **Test it before applying** — you can spin up a Google Ads test account at <https://ads.google.com/intl/en/aw/anon/SignupTestAccount>, set its customer ID as `GOOGLE_ADS_CUSTOMER_ID`, and verify the wiring works end-to-end before submitting the Basic Access application. Reviewers like to see this.

### Smoke test locally

```bash
cd roji-ads-dashboard
npm run dev
# open http://localhost:3001/performance
```

If all four `GOOGLE_ADS_*` values are set, the nav pill flips to `Live API`. If anything is missing, you stay on mock data and the dashboard still works.

---

## 2. GitHub repo

Local repo:

- Identity: `Tomas David <tomasdaavid@gmail.com>`
- Remote: `git@github.com:tomasdavid1/roji.git` (already configured)
- Branch: `main`

To push:

```bash
cd /Users/tomas/Roji
git push -u origin main
```

> The first push uses your existing GitHub SSH key. Verify with `ssh -T git@github.com` (should print `Hi tomasdavid1! ...`).

---

## 3. Vercel — Protocol Engine

Each Next.js project becomes its own Vercel project so they can be deployed and updated independently.

1. **YOU**: <https://vercel.com/new>, sign in with your personal GitHub.
2. Import the `tomasdavid1/roji` repo.
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

1. **YOU**: <https://vercel.com/new>, import `tomasdavid1/roji` again as a **second** Vercel project.
2. **Root Directory**: `roji-ads-dashboard`
3. **Environment variables**:

   | Key | Value |
   | --- | --- |
   | `GOOGLE_ADS_CLIENT_ID` | from your `.env.local` |
   | `GOOGLE_ADS_CLIENT_SECRET` | rotated value from step 0 |
   | `GOOGLE_ADS_DEVELOPER_TOKEN` | once approved |
   | `GOOGLE_ADS_REFRESH_TOKEN` | from `get-refresh-token.js` |
   | `GOOGLE_ADS_CUSTOMER_ID` | `6679780942` (operating account: Roji) |
   | `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | `2637832527` (manager / MCC) |
   | `ADMIN_USER` | a username you choose |
   | `ADMIN_PASS` | a long random password |
   | `CRON_SECRET` | a long random string (used by Vercel Cron to authenticate to `/api/cron/*` endpoints) |

4. Click **Deploy**.
5. Add domain `admin-ads.rojipeptides.com`.

#### Vercel Cron jobs

`vercel.json` declares two cron jobs that Vercel will schedule automatically:

| Path | Schedule | What it does |
| --- | --- | --- |
| `/api/cron/mine-search-terms` | daily, 14:00 UTC | Pulls last-7-days search terms, auto-adds risky ones (matching the master negative-keyword list) as campaign negatives |
| `/api/cron/check-disapprovals` | hourly | Pulls all disapproved ads and auto-pauses them (per the strategy doc: prevents account-level review cascade) |

Both endpoints require `Authorization: Bearer ${CRON_SECRET}` — Vercel injects this header automatically when invoking your declared crons. Manual triggers via the dashboard UI use a different route (`/api/ads/search-terms`) that's gated by the basic-auth middleware.

Generate a CRON_SECRET with: `openssl rand -hex 32`

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

## 5b. Trustpilot

Wired up across both apps. Inert until you give us the four credentials from <https://businessapp.b2b.trustpilot.com/> → **Integrations → API access**.

### What's wired

| Surface | Behavior | Requires |
| --- | --- | --- |
| **TrustBox widgets on storefront** (homepage hero, cart top, checkout top, footer) | Auto-rendered when `ROJI_TRUSTPILOT_BUSINESS_UNIT_ID` is set | BU id only |
| **AFS review invitations** (sent 7 days after `order-completed`) | Server-side cron job dispatches via Trustpilot Invitations API | All four secrets |
| **Reviews summary card** in `/performance` (admin dashboard) | Fetches trust score + review count via Business API | All four secrets |

Until at least the BU id is set, every Trustpilot surface renders nothing — the rest of the site behaves identically.

### WordPress side — set in `wp-config.php`

```php
define( 'ROJI_TRUSTPILOT_BUSINESS_UNIT_ID', '<24-char hex from Trustpilot>' );
define( 'ROJI_TRUSTPILOT_API_KEY',          '<api key>' );
define( 'ROJI_TRUSTPILOT_API_SECRET',       '<api secret>' );
define( 'ROJI_TRUSTPILOT_BUSINESS_USER_ID', '<user id>' );
// Optional:
// define( 'ROJI_TRUSTPILOT_TEMPLATE_ID', '<custom invite template id>' );
// define( 'ROJI_TRUSTPILOT_INVITATION_DELAY_DAYS', 7 );
```

> Add these to `wp-config.php` (above `require_once ABSPATH . 'wp-settings.php';`), not to the theme — that way they survive theme updates and aren't tracked in git.

### Ads dashboard side — set in Vercel env vars

| Key | Value |
| --- | --- |
| `TRUSTPILOT_BUSINESS_UNIT_ID` | same as above |
| `TRUSTPILOT_API_KEY` | same |
| `TRUSTPILOT_API_SECRET` | same |
| `TRUSTPILOT_BUSINESS_USER_ID` | same |

### Where to find each value in Trustpilot Business

1. **Business Unit ID** — Settings → Integrations → API access → BU id (or in the URL of any TrustBox widget on `businessapp.b2b.trustpilot.com`).
2. **API Key + API Secret** — Settings → Integrations → API access → Create new application → copy the credentials shown (you won't see the secret again).
3. **Business User ID** — Click your profile avatar (top right) → User profile → the URL contains `/users/<id>`. Required by Trustpilot when authenticating via `client_credentials` (per their OAuth docs).

### Verifying it works

After adding the BU id (no API creds needed):

```bash
curl -s http://roji.local/ | grep -c "trustpilot-widget"   # should print >= 1
curl -s http://roji.local/ | grep "tp.widget.bootstrap"     # should match
```

After adding all four (and setting them in Vercel for the dashboard):

- Reviews summary card on `/performance` shows trust score + count instead of "Not configured".
- New WC orders create a `wp_cron` event 7 days out (visible in `wp cron event list`).
- After 7d, you'll see `Trustpilot review invitation sent.` in the order notes (or an error message if something failed).

---

## 5c. Subscriptions / Autoship

Wired up across all three apps. Currently using the **free** "Subscriptions for WooCommerce" (WP Swings) plugin; the integration code is provider-aware and will switch to the paid Automattic "WooCommerce Subscriptions" plugin automatically when that's installed.

### What's wired

| Surface | Behavior | Requires |
| --- | --- | --- |
| **Variable pricing on each stack** | One-time price + monthly autoship at 15% off + free shipping | Subs plugin active |
| **Autoship sibling provisioning** | Three "<stack> — Autoship" hidden products auto-created, mirroring price/SKU | Subs plugin + WP-CLI |
| **Deep-link `&autoship=1`** | Protocol engine "Get this stack" routes to autoship variant when toggle is on | (always on) |
| **In-cart upsell** | Banner in cart shows "Save 15% with autoship" when one-time stack is present | Subs plugin |
| **Free shipping for autoship-only carts** | All paid shipping rates hidden when cart contains only recurring items | Subs plugin |
| **Dunning ladder** | 1d / 3d / 7d retries on failed renewals, then on-hold + email | Subs plugin |
| **MRR/churn dashboard** | `/subscriptions` page in admin dashboard with MRR, ARPU, churn, recent cancellations | `ROJI_INTERNAL_API_TOKEN` set on both sides |

### Provider switch

The integration uses a single `roji_subs_provider()` function to dispatch between providers. To switch from free to paid:

1. Buy WC Subscriptions ($199/yr at <https://woocommerce.com/products/woocommerce-subscriptions/>)
2. Upload .zip and activate it in WP admin
3. Deactivate the free "Subscriptions for WooCommerce" plugin
4. Run `wp roji subs:provision` to re-mark the existing autoship sibling products with the paid plugin's meta keys
5. Existing customer subscriptions on the free plugin **do not migrate automatically** — they remain functional under the free plugin's scheduler. Only future subscriptions use the paid plugin.

### WordPress side — set in `wp-config.php`

Required for the dashboard's `/subscriptions` page to read aggregate metrics:

```php
define( 'ROJI_INTERNAL_API_TOKEN', '<openssl rand -hex 32>' );
```

Optional config (sensible defaults shown):

```php
define( 'ROJI_SUBS_DISCOUNT_PCT', 15 );          // % off for autoship
define( 'ROJI_SUBS_INTERVAL_NUMBER', 1 );         // 1 month between renewals
define( 'ROJI_SUBS_INTERVAL_UNIT', 'month' );    // day | week | month | year
define( 'ROJI_SUBS_FREE_SHIPPING', true );        // free ship for autoship-only carts
define( 'ROJI_SUBS_DUNNING_DELAYS', '1,3,7' );    // retry days
```

### Ads dashboard side — set in Vercel env vars

| Key | Value |
| --- | --- |
| `ROJI_STORE_URL` | `https://rojipeptides.com` |
| `ROJI_INTERNAL_API_TOKEN` | same token as set in `wp-config.php` |

### CLI commands (run on the WP host)

```bash
wp roji subs:status          # show provider, settings, sibling product map
wp roji subs:provision        # idempotently create/update autoship siblings
```

### Known limitations of the free plugin

- No "variable subscription" product type — that's why we duplicate stacks instead of adding a variant.
- No prorated upgrades/downgrades between stacks.
- No coupon support on renewals (only initial signup).
- Renewal payment retry logic is naive — our dunning module wraps it with a proper 3-strike ladder.
- These limitations all disappear with paid WC Subscriptions.

---

## 5d. Affiliate program

Native implementation (no plugin dependency). Currently in **test mode**: commissions are recorded and tier-promoted automatically, but payouts are a manual operator step.

### What's wired

| Surface | Behavior | Requires |
| --- | --- | --- |
| **`?ref=CODE` cookie** | First-touch, 30-day window, HttpOnly + SameSite=Lax | (always on) |
| **Click counter** | Per-affiliate lifetime click count, updated on `?ref=` visit | (always on) |
| **Commission ledger** | One row per (affiliate, order). Idempotent. Tier-aware. | Order completed |
| **Renewal commissions** | 50% of tier rate on every recurring renewal | Subs plugin active |
| **Refund reversal** | Order refunded → commission flipped to `reversed`, lifetime gross decreased | (always on) |
| **30-day commission lock** | New commissions start `pending`, transition to `approved` after the lock window via daily cron | (always on) |
| **Signup form** | `[roji_affiliate_signup]` shortcode at `/become-an-affiliate/` page | (always on) |
| **Admin moderation** | New applications land as `pending` posts; admin approves via WP admin → Affiliates | (always on) |
| **Approval email** | When admin approves, affiliate gets emailed their referral link + tier ladder | (always on) |
| **Dashboard** | `/affiliates` page with GMV (30d), pending/approved commission totals, tier ladder, top performers | `ROJI_INTERNAL_API_TOKEN` set on both sides |

### Tier ladder (defaults — change in `wp-config.php` if needed)

| Lifetime gross referred | Commission |
| --- | --- |
| < $10,000 | 10% |
| ≥ $10,000 | 15% |
| ≥ $50,000 | 20% |

Subscription renewals always pay at 50% of the affiliate's current tier rate.

### Optional config in `wp-config.php`

```php
define( 'ROJI_AFF_TIER_DEFAULT_PCT', 10 );
define( 'ROJI_AFF_TIER_2_THRESHOLD', 10000 );
define( 'ROJI_AFF_TIER_2_PCT', 15 );
define( 'ROJI_AFF_TIER_3_THRESHOLD', 50000 );
define( 'ROJI_AFF_TIER_3_PCT', 20 );
define( 'ROJI_AFF_COOKIE_DAYS', 30 );           // attribution window
define( 'ROJI_AFF_LOCK_DAYS', 30 );              // refund-protection window before payable
define( 'ROJI_AFF_RENEWAL_PCT_OF_TIER', 50 );    // renewal commissions = 50% of tier
```

### CLI commands (run on the WP host)

```bash
wp roji aff:create --name="Joe Rogan" --email=joe@example.com --code=ROGAN --approve
wp roji aff:approve <affiliate_id>     # approve a pending application
wp roji aff:status                     # show the same numbers as the dashboard
```

### Migration to AffiliateWP (when ready)

The native system is purpose-built for our needs. If you ever need AffiliateWP's richer features (creatives library, MLM, payout integrations):

1. Buy AffiliateWP ($149/yr at <https://affiliatewp.com/>)
2. Install the plugin
3. Run `wp post list --post_type=roji_affiliate --format=csv > affiliates.csv`
4. Run `wp post list --post_type=roji_aff_commission --format=csv > commissions.csv`
5. Use AffiliateWP's CSV import (Settings → Tools) to bulk-load both
6. Optional: deactivate this module by removing the `require_once` line in `functions.php`

The cookie name (`roji_aff_ref`) is non-conflicting with AffiliateWP's (`affwp_ref`), so both can run in parallel during a migration period.

### Why we chose to build native instead of using AffiliateWP from day one

- **Scope is small**: cookie + commission calc + a CPT. ~700 LOC total. AffiliateWP would have been ~10x the surface area for the same MVP.
- **No plugin lock-in**: our data is in standard WP posts/meta. Easy to query, easy to migrate.
- **Tighter integration**: native module gets first-class hooks into the existing subscription + Trustpilot stack.
- **Test-mode-first**: payouts stay manual until real revenue exists. No risk of wiring a payment processor against fake data.

---

## 5e. Elementor pages + menus

The storefront ships with a **programmatic Elementor build** under `roji-store/elementor-templates/`. Nine pages and two nav menus live in version control as PHP files. An importer writes them straight into Elementor's data structures.

### What's wired

| Page | URL | Notes |
| --- | --- | --- |
| Home | `/` | Hero + Protocol Engine teaser + 3-stack grid (one-time/autoship buttons) + trust pillars + Trustpilot widget + FAQ tease + CTA |
| About | `/about/` | Three commitments + sourcing/test/store/ship process |
| FAQ | `/faq/` | 18 Q/A across compliance, quality, Protocol Engine, shipping, payment, subscriptions, refunds, affiliates |
| Research Library | `/research-library/` | Per-compound cards with peer-reviewed PubMed citations (kept in sync manually with `roji-protocol/src/lib/constants.ts`) |
| COA Library | `/coa/` | 3-step process strip + table of recent batches with download links (placeholder PDFs — replace with real ones) |
| Terms of Service | `/terms/` | 15 sections, FL governing law |
| Privacy Policy | `/privacy/` | 12 sections incl. CCPA, GA4, Google Ads disclosures |
| Refund & Return Policy | `/refunds/` | 9 sections incl. 14-day window, 15% restocking fee, COA-driven quality returns |
| Shipping Policy | `/shipping/` | 12 sections incl. discreet packaging, $200 free threshold, autoship-always-free |

Plus two menus:
- **Header (`menu-1`)**: Shop · Protocol Engine · Research Library · COA · About · FAQ
- **Footer (`menu-2`)**: Shop · About · Research Library · COA · FAQ · Affiliates · Shipping · Refunds · Privacy · Terms

### Run the importer

From the WordPress root (LocalWP, Kinsta SSH, etc.):

```bash
# All pages (idempotent — re-run anytime)
wp eval-file /path/to/roji-store/elementor-templates/import.php

# Single page
wp eval-file /path/to/roji-store/elementor-templates/import.php -- home
wp eval-file /path/to/roji-store/elementor-templates/import.php -- terms,privacy,refunds

# Header + footer menus (run after pages exist)
wp eval-file /path/to/roji-store/elementor-templates/menus.php
```

The importer is **idempotent** — it looks pages up by slug and rewrites `_elementor_data` in place. Element IDs are deterministic per `(slug, counter)` so Elementor's compiled CSS doesn't get orphaned.

### Editor compatibility

After import, every page is fully editable in the Elementor visual editor. **Be aware:** the importer overwrites `_elementor_data` wholesale, so if you customize a page in the editor and then re-run the importer for that slug, your changes are lost. Two safe workflows:

- **Code-first**: edit the PHP file → re-run the importer. (Recommended for content-heavy pages like legal/FAQ.)
- **Editor-first**: do an initial import → polish in the editor → stop importing that slug. (Recommended for marketing pages where designers want full control.)

### Adding new pages later

1. Drop a `pages/<slug>.php` returning `['title' => ..., 'content' => [...]]`.
2. Use the helpers in `lib/builder.php` (containers, headings, text, buttons, cards, grids, FAQ items, legal-page template).
3. Add the slug to `$ALL_PAGES` in `import.php`.
4. Re-run.

See `roji-store/elementor-templates/README.md` for full helper reference.

### Required plugins

- Elementor (free) — version 4.0+ verified.
- Hello Elementor parent theme + `roji-child` active.

### Trustpilot widget on Home

Home renders `[trustpilot_hero]`. The shortcode is a no-op until `ROJI_TRUSTPILOT_BUSINESS_UNIT_ID` is set (see section 5b). The page renders fine without it.

---

## 6. Smoke tests after everything is live

- [ ] `https://protocol.rojipeptides.com` → wizard works, "Get this stack" redirects to `https://rojipeptides.com/cart/?protocol_stack=wolverine&utm_source=protocol_engine&...`
- [ ] WooCommerce auto-adds the product to cart and lands on checkout.
- [ ] Checkout shows the disclaimer + mandatory `research_use_confirm` checkbox; submitting without it errors.
- [ ] Footer disclaimer renders on every page.
- [ ] Age gate shows on first visit, persists 30 days.
- [ ] `https://admin-ads.rojipeptides.com` → basic-auth challenge, then nav shows `Live API` pill.
- [ ] GA4 + Google Ads conversion events fire (check DebugView in GA4).
- [ ] (If Trustpilot configured) TrustBox widgets render on homepage hero, cart, checkout, footer.
- [ ] (If Trustpilot configured) Place a test order; after 7 days, order notes show "Trustpilot review invitation sent."
- [ ] (If Trustpilot configured) `/performance` reviews card shows real trust score + count.
- [ ] (If Subscriptions plugin active) Protocol engine "Save 15% with autoship" toggle changes the destination URL.
- [ ] (If Subscriptions plugin active) Cart shows "Save 15%" upsell when one-time stack is in cart, and "Switch to autoship" swaps the line item.
- [ ] (If Subscriptions plugin active) `/subscriptions` dashboard page shows MRR/ARPU/churn from the WP REST endpoint.
- [ ] `/become-an-affiliate/` page renders the signup form with tier ladder.
- [ ] Visit `https://rojipeptides.com/?ref=TEST` (after creating a test affiliate) → cookie `roji_aff_ref` is set.
- [ ] Place a test order → order notes show "Affiliate commission recorded: $X to affiliate #Y".
- [ ] `/affiliates` dashboard page shows the test commission and click count.
- [ ] After running the Elementor importer: `/`, `/about/`, `/faq/`, `/research-library/`, `/coa/`, `/terms/`, `/privacy/`, `/refunds/`, `/shipping/` all return HTTP 200 with the expected content.
- [ ] Header menu shows: Shop · Protocol Engine · Research Library · COA · About · FAQ.
- [ ] Footer menu shows the four legal pages and the affiliate signup link.
- [ ] Home → click any "Autoship −15%" stack button → cart contains the autoship variant (requires Subscriptions plugin).

---

## 7. Things I cannot do for you

- Run `gcloud` (browser auth flow under your identity)
- Push to GitHub (no auth + I shouldn't have your token)
- Sign in to Vercel (browser flow)
- Apply for the Google Ads developer token (your account / business)
- DNS changes (your registrar)
- Provision the WordPress host (Kinsta / Cloudways / LocalWP)
- Sign up for AllayPay / Durango / Coinbase Commerce (KYC under your business)
