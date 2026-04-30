# Google Drive OAuth Refresh Token Regeneration

Run this when avatar upload fails with `invalid_grant` or `Google Drive refresh token expired`.

## Prerequisites

Have these values from `.env.local`:
- `GDRIVE_CLIENT_ID`
- `GDRIVE_CLIENT_SECRET`

## Steps

### 1. Add redirect URI in Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs** → add `http://localhost`
4. Save → wait ~1 min

### 2. Open authorization URL in browser

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GDRIVE_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/drive&access_type=offline&prompt=consent
```

Replace `YOUR_GDRIVE_CLIENT_ID` with value from `.env.local`.

`prompt=consent` is required — forces Google to issue a new refresh token.

### 3. Authorize and copy the code

After authorizing, browser redirects to:
```
http://localhost/?code=4/0AX...&scope=...
```

Copy the `code` value.

### 4. Exchange code for refresh token

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_GDRIVE_CLIENT_ID" \
  -d "client_secret=YOUR_GDRIVE_CLIENT_SECRET" \
  -d "code=PASTE_CODE_HERE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost"
```

Response:
```json
{
  "refresh_token": "1//0g...",
  "access_token": "ya29...",
  "refresh_token_expires_in": 604799
}
```

### 5. Update `.env.local`

```
GDRIVE_REFRESH_TOKEN=1//0g...new_token...
```

Restart dev server.

## Notes

- Code from step 3 expires in ~1 minute — run step 4 immediately
- `refresh_token_expires_in: 604799` ≈ 7 days — repeat this process when it expires
- If redirect URI error appears, verify `http://localhost` is added in Cloud Console (step 1)
- `GMAIL_REFRESH_TOKEN` uses same OAuth client — if Gmail also breaks, repeat with `gmail.send` scope
