# SECURITY NOTE — rotate before going live

## What happened

During setup, the following credentials were shared in plain chat:

- **Google OAuth Client ID**: `455608725935-6v3ig52927edcm6pl8p9hcrk9ceaj20p.apps.googleusercontent.com`
- **Google OAuth Client Secret**: `GOCSPX-F3-...` (full value redacted here, but it was sent in chat)
- **Google Ads Customer ID**: `667-978-0942`

Of these, only the **client secret** is sensitive. Client IDs and Customer IDs are not secrets — they show up in OAuth redirect URLs and in Google's UI. The secret is the one thing that needs to be rotated.

## What to do

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click your **OAuth 2.0 Client ID** (the one matching `455608725935-...`).
3. Click **Reset secret** (top right). Copy the new value.
4. Update [`roji-ads-dashboard/.env.local`](./roji-ads-dashboard/.env.local) with the new value.
5. If you've already deployed to Vercel, update the `GOOGLE_ADS_CLIENT_SECRET` env var in **Vercel → Project Settings → Environment Variables** and trigger a redeploy.
6. Re-run [`scripts/get-refresh-token.js`](./roji-ads-dashboard/scripts/get-refresh-token.js) to mint a fresh refresh token under the new secret.

## Going forward

When sharing credentials with anyone (including AI assistants):

- Never paste secrets directly in chat. Put them in a local `.env.local` file and tell the assistant the file is ready.
- Rotate secrets after any incident where they may have been exposed.
- Use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for production secrets, never commit them.
- Consider Google Cloud's [Secret Manager](https://cloud.google.com/secret-manager) if you outgrow `.env`.

## Verification

The repo's `.gitignore` blocks `.env*` (except `.env.example`) at every level, and the initial commit was verified to contain no occurrences of `GOCSPX-` before pushing. To re-verify at any point:

```bash
git ls-files | xargs grep -l "GOCSPX-" 2>/dev/null && echo "LEAKED" || echo "clean"
```
