# Getting Started

Everything you need to run NEUPC locally and deploy it to production.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 20 | `node -v` to verify |
| npm | >= 10 | bundled with Node 20 |
| Docker | Latest | required for local Supabase |
| Google OAuth credentials | — | [console.cloud.google.com](https://console.cloud.google.com) |

---

## 1. Clone & Install

```bash
git clone https://github.com/eyasir329/neupc.git
cd neupc
npm install
```

---

## 2. Database Setup

Choose one option:

### Option A — Local Supabase (recommended for development)

Runs the full Supabase stack on your machine. No internet required after setup.

```bash
npx supabase start        # requires Docker
npx supabase db reset     # applies schema
```

Copy output keys to `.env.local`:

```env
SUPABASE_LOCAL=true
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

Local dashboard: [http://127.0.0.1:54323](http://127.0.0.1:54323)

See [Local Supabase Setup](./local-supabase.md) for full details.

### Option B — Remote Supabase (cloud)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your keys
3. Apply schema via Supabase SQL Editor or `npx supabase db push`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 3. Environment Variables

```bash
cp .env.example .env.local
```

Minimum required variables:

```env
# Auth
NEXTAUTH_URL=http://localhost:3000/
NEXTAUTH_SECRET=          # openssl rand -base64 32

# Google OAuth
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Supabase (local or remote — see above)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

See [Environment Variables](./environment-variables.md) for all options including AI keys, email, and Google Drive.

---

## 4. Google OAuth Setup

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Create **OAuth 2.0 Client ID** → Application type: **Web application**
3. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-domain.com/api/auth/callback/google
   ```
4. Copy **Client ID** → `AUTH_GOOGLE_ID`
5. Copy **Client Secret** → `AUTH_GOOGLE_SECRET`

---

## 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

The first user has `account_status: pending`. Promote it to admin:

```sql
-- Run in Supabase SQL Editor or Studio
UPDATE users SET account_status = 'active' WHERE email = 'your@email.com';
INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, r.id FROM users u, roles r
  WHERE u.email = 'your@email.com' AND r.name = 'admin';
```

---

## 6. Optional: Blog Comments (Giscus)

Giscus powers comments on public blog posts via GitHub Discussions.

1. Enable **GitHub Discussions** on your repo
2. Install the [Giscus app](https://github.com/apps/giscus)
3. Visit [giscus.app](https://giscus.app), fill in your repo details
4. Copy the generated values into `app/_components/ui/GiscusComments.js`

---

## 7. Deploy to Vercel

```bash
# via CLI
npm i -g vercel
vercel
```

Or import via [vercel.com/new](https://vercel.com/new):

1. Connect your GitHub repo
2. Add all env vars under **Project → Settings → Environment Variables**
3. Set Node.js version to `20.x`
4. Set `NEXTAUTH_URL` to your production domain
5. Set `NEXT_PUBLIC_SITE_URL` to your production domain
6. Deploy

Auto-deploys on every push to `main`.

### Post-Deploy Checklist

```text
✓ Google sign-in works on production domain
✓ /sitemap.xml returns valid XML
✓ Images load from Supabase Storage
✓ Giscus comments appear on /blogs/[slug]
✓ Security headers pass at securityheaders.com
```

---

## 8. Scripts Reference

```bash
npm run dev          # Turbopack dev server
npm run build        # Production build (lint + typecheck)
npm run start        # Serve production build
npm run lint         # ESLint
npm run format       # Prettier
npm run typecheck    # TypeScript checks
npm run analyze      # Bundle size analysis
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Sign in redirects but shows "pending" | Run the SQL above to activate the account and assign a role |
| Images from Supabase don't load | Add hostname to `remotePatterns` in `next.config.mjs` |
| `SUPABASE_SERVICE_ROLE_KEY` undefined | Must not have `NEXT_PUBLIC_` prefix — server-only |
| Giscus comments don't appear | Verify GitHub Discussions is enabled and app is installed |
| Build fails on `sanitize-html` | Run `npm install` — it is a direct dependency |
| `NEXTAUTH_SECRET` error | Generate with `openssl rand -base64 32` |
