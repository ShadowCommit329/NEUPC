# Environment Variables

Complete reference for every environment variable in the NEUPC platform.

```bash
cp .env.example .env.local   # never commit .env.local
```

---

## Prefix Rules

| Prefix | Behaviour |
|---|---|
| `NEXT_PUBLIC_` | Bundled into client JS — visible in the browser |
| *(no prefix)* | Server-only — available in RSCs, server actions, API routes |

**Rule:** Never prefix secrets with `NEXT_PUBLIC_`. This applies to `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`, `GDRIVE_CLIENT_SECRET`, and all API keys.

---

## Required

### Auth.js

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Canonical app URL (e.g. `http://localhost:3000/`) |
| `NEXTAUTH_SECRET` | JWT signing secret — `openssl rand -base64 32` |

### Google OAuth

| Variable | Description | Where to get it |
|---|---|---|
| `AUTH_GOOGLE_ID` | OAuth 2.0 Client ID | [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) |
| `AUTH_GOOGLE_SECRET` | OAuth 2.0 Client Secret | Same location |

Setup: Create **Web application** credential, add redirect URIs:
- Dev: `http://localhost:3000/api/auth/callback/google`
- Prod: `https://your-domain.com/api/auth/callback/google`

### Supabase

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Same location |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS, **server-only** | Same location |

> `SUPABASE_SERVICE_ROLE_KEY` must never have a `NEXT_PUBLIC_` prefix. It is imported only in `supabase.js` and used exclusively in server actions and API routes.

### Site URL

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, no trailing slash (e.g. `https://neupc.vercel.app`) |

Used for SEO metadata, sitemaps, canonical URLs, and OG images.

### Local Supabase (development only)

| Variable | Description |
|---|---|
| `SUPABASE_LOCAL` | Set to `true` to use local Supabase at `127.0.0.1:54321` |

When `SUPABASE_LOCAL=true`, the app uses the URL from `NEXT_PUBLIC_SUPABASE_URL`. Set it to `http://127.0.0.1:54321` for local dev. Remove or omit for production.

---

## Optional

### Gmail / Nodemailer

Required for contact form emails, membership notifications, and verification emails.

| Variable | Description |
|---|---|
| `GMAIL_USER` | Gmail address used to send email |
| `GMAIL_CLIENT_ID` | Google OAuth Client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth Client Secret |
| `GMAIL_REFRESH_TOKEN` | OAuth2 refresh token for Gmail |

Setup: Enable the Gmail API, create OAuth credentials, and obtain a refresh token via the OAuth playground.

### Google Drive (Image Storage)

Required for avatar uploads and content image storage.

| Variable | Description |
|---|---|
| `GDRIVE_CLIENT_ID` | Google OAuth Client ID |
| `GDRIVE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GDRIVE_REFRESH_TOKEN` | OAuth2 refresh token |
| `GDRIVE_FOLDER_ID` | Drive folder ID for uploads (from the folder URL) |

Setup: Enable the Drive API, create OAuth credentials, get a refresh token, create a shared Drive folder.

### AI / LLM Providers

Used for AI-powered problem analysis and solution review. At least one provider is needed for AI features. All listed have free tiers.

| Variable | Provider | Notes |
|---|---|---|
| `GITHUB_TOKEN` | GitHub Models | **Recommended** — free with any GitHub account, no extra signup |
| `GEMINI_API_KEY` | Google Gemini | Free tier via [AI Studio](https://aistudio.google.com/) |
| `GROQ_API_KEY` | Groq | Fast inference, generous free tier |
| `TOGETHER_API_KEY` | Together AI | Good free tier |
| `CEREBRAS_API_KEY` | Cerebras | Fast inference |
| `OPENROUTER_API_KEY` | OpenRouter | Access to many models, free models available |
| `OPENAI_API_KEY` | OpenAI | Paid |

The system tries providers in priority order until one succeeds.

### CLIST API

Required for competitive programming contest history and rating sync.

| Variable | Description | Where to get it |
|---|---|---|
| `CLIST_API_KEY` | API key | [clist.by](https://clist.by/api/v4/doc/) — requires login |
| `CLIST_API_USERNAME` | Your CLIST username | Same account |

### Browser Extension

| Variable | Description |
|---|---|
| `NEUPC_EXTENSION_TOKEN` | Token for authenticating browser extension sync requests |

Generate: `openssl rand -base64 32`

### Internal API Key

| Variable | Description |
|---|---|
| `INTERNAL_API_KEY` | Authenticates background cron jobs and internal API calls |

Generate: `openssl rand -base64 32`

---

## Vercel Deployment

Add all variables under **Project → Settings → Environment Variables**.

Vercel auto-sets:
- `NODE_ENV=production`
- `VERCEL_URL` — the deployment hostname

You must manually set everything else, including `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` pointing to your production domain.

---

## Security Checklist

```text
✓ NEXTAUTH_SECRET is a random 32-byte base64 string
✓ SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix
✓ .env.local is in .gitignore (it is — don't override this)
✓ No secrets are logged or returned to the client
✓ Production uses cloud Supabase (SUPABASE_LOCAL is not set)
```
