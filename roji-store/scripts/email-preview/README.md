# Roji email preview + flow tests

Two scripts for offline confidence-checking the members area and
transactional email system without needing a live WordPress install.

## Why this exists

Premium products demand resilient post-purchase signal. Emails are
often the only touchpoint a customer has after checkout, so
regressions in branding, links, or copy degrade trust. This harness
lets us:

1. Render every transactional email to a static HTML file
2. Screenshot each one with headless Chrome
3. Visually scan for layout breakage, broken styles, missing CTAs
4. Run unit tests on the auth-gate + email-helper logic

All without booting WP, MySQL, or staging.

## Files

| Path | Purpose |
| --- | --- |
| `wp-shim.php` | Minimal WP/WC function + class stubs the email templates need |
| `render.php` | Renders all 19 emails into `roji-store/preview/emails/*.html` |
| `screenshot.sh` | Shoots each HTML into `roji-store/preview/screenshots/*.png` via headless Chrome |
| `flow-tests.php` | 41 unit tests covering auth gate, header link, carrier URLs, email helpers, refund context, shipped-email guards, affiliate endpoint registration |

## Usage

```bash
# Render
php scripts/email-preview/render.php

# Screenshot (requires Google Chrome on macOS — adjust path in script for Linux)
scripts/email-preview/screenshot.sh

# Run unit tests
php scripts/email-preview/flow-tests.php
```

Output:

- `preview/emails/customer-completed.html` — open in any browser
- `preview/screenshots/customer-completed.png` — embeddable in PRs / Slack

## Coverage

### Emails rendered (19)

**Customer order lifecycle**
- `customer-processing` — order received, payment confirmed
- `customer-completed` — order complete, with tracking card
- `customer-on-hold` — order pending review
- `customer-failed` — payment failed, retry CTA
- `customer-refunded-full` / `customer-refunded-partial` — refund processed
- `customer-note` — staff note attached to order

**Customer account**
- `customer-new-account` — welcome + member-area button + bullets
- `customer-reset-password` — password reset CTA

**Admin notifications**
- `admin-new-order` — new order with funnel context (UTM/affiliate/autoship)
- `admin-failed-order` — payment failure with source
- `admin-cancelled-order` — order cancelled

**Affiliate program**
- `affiliate-application-received` — application acknowledgment
- `affiliate-approval` — approved, with referral code + tier ladder
- `affiliate-magic-link` — passwordless dashboard sign-in
- `affiliate-payout-sent` — commission payout receipt

**Subscriptions**
- `dunning-payment-failed` — first failure, retry CTA
- `dunning-subscription-paused` — final failure, paused

**Shipping**
- `order-shipped` — branded HTML mail with carrier-specific tracking link

### Flow tests (41)

- **[1] Auth gate** — staff bypass, redirects, logout/rp/resetpass exemptions
- **[2] Header account link** — visibility based on gate + login state
- **[3] Email From identity** — name, address, footer, RFC2047 encoding
- **[4] Carrier tracking URLs** — USPS / UPS / FedEx / DHL / unknown / case-insensitivity / URL-encoding
- **[5] Branded HTML shell** — wordmark fallback, heading bar, dark background, research-use disclaimer
- **[6] Refund/invoice lede** — only fires for the right email IDs, only for HTML customer mail
- **[7] Order-shipped guards** — skip without tracking, skip without email, idempotent
- **[8] Affiliate endpoint** — constant defined, menu order keeps logout last

## Adding a new test or email

1. Add a synthetic case in `render.php` and re-run.
2. Add an assertion in `flow-tests.php` against the helper or filter you added.
3. Re-run `php flow-tests.php` and ensure 0 failures.

## Limitations

- The shim is intentionally minimal. If a template starts calling a new
  WP function (e.g. `wp_get_attachment_url()`), add a stub in
  `wp-shim.php` rather than booting all of WordPress.
- Screenshots use desktop width (820px). Mobile rendering should be
  spot-checked with a real email-testing service before any large
  campaign change.
- These are unit tests, not end-to-end. They don't hit real WP, real
  MySQL, or a real SMTP server. Use a staging environment for that.
