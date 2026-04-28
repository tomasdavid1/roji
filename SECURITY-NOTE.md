# SECURITY NOTE — rotate before going live

## What happened

During setup, the following credentials were shared in plain chat:

- **Google OAuth Client ID**: `455608725935-...` (not secret)
- **Google OAuth Client Secret**: `GOCSPX-F3-...` (**SECRET — rotate**)
- **Google Ads Customer ID**: `667-978-0942` (not secret)
- **Google Ads Developer Token**: `UWqlm9Z...` (**SECRET — rotate**)

Two values are sensitive and need to be rotated: the OAuth client secret and the developer token. Client IDs and Customer IDs are not secrets — they show up in OAuth redirect URLs and in Google's UI.

## What to do

### Rotate the OAuth client secret

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click your **OAuth 2.0 Client ID** (matching `455608725935-...`).
3. Click **Reset secret** (top right). Copy the new value.
4. Update [`roji-ads-dashboard/.env.local`](./roji-ads-dashboard/.env.local) → `GOOGLE_ADS_CLIENT_SECRET`.
5. Re-run [`scripts/get-refresh-token.js`](./roji-ads-dashboard/scripts/get-refresh-token.js) to mint a fresh refresh token under the new secret.
6. If deployed to Vercel: update `GOOGLE_ADS_CLIENT_SECRET` + `GOOGLE_ADS_REFRESH_TOKEN` in **Vercel → Project Settings → Environment Variables** and redeploy.

### Rotate the developer token

1. Go to <https://ads.google.com/aw/apicenter>.
2. In the **Developer token** section, click **Reset token**.
3. Copy the new value.
4. Update [`roji-ads-dashboard/.env.local`](./roji-ads-dashboard/.env.local) → `GOOGLE_ADS_DEVELOPER_TOKEN`.
5. If deployed to Vercel: update the same env var and redeploy.

> Tip: do both rotations in one sitting — refresh tokens are tied to the client secret, but the developer token is independent.

## Going forward

When sharing credentials with anyone (including AI assistants):

- Never paste secrets directly in chat. Put them in a local `.env.local` file and tell the assistant the file is ready.
- Rotate secrets after any incident where they may have been exposed.
- Use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for production secrets, never commit them.
- Consider Google Cloud's [Secret Manager](https://cloud.google.com/secret-manager) if you outgrow `.env`.

## Verification

The repo's `.gitignore` blocks `.env*` (except `.env.example`) at every level. To re-verify nothing sensitive ever ends up tracked:

```bash
# Search tracked files for OAuth-secret prefixes or any
# 22-char alphanumeric strings that look like Google Ads developer tokens.
# (Edit the dev-token list with any tokens you've actually used.)
git ls-files | xargs grep -lE 'GOCSPX-[A-Za-z0-9_-]{20,}' 2>/dev/null && echo "!!! LEAKED OAuth secret" || echo "clean (no OAuth secrets)"
```

The current commits have been verified clean by this check.
