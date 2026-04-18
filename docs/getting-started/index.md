# Getting Started

Setup guide for local development and production deployment.

---

## Prerequisites

| Requirement                  | Version | Notes                                                        |
| ---------------------------- | ------- | ------------------------------------------------------------ |
| Node.js                      | >= 20   | `node -v` to verify                                          |
| npm                          | >= 10   | bundled with Node 20                                         |
| Docker                       | Latest  | Required for local Supabase                                  |
| Google OAuth 2.0 credentials | —       | [console.cloud.google.com](https://console.cloud.google.com) |

---

## 1. Clone & Install

```bash
git clone https://github.com/eyasir329/neupc.git
cd neupc
npm install
```

---

## 2. Supabase Setup

You have two options for database setup:

### Option A: Local Supabase (Recommended for Development)

See the complete [Local Supabase Setup Guide](./local-supabase.md) for detailed instructions.

**Quick start:**

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase (requires Docker)
npx supabase start

# Apply migrations and seed data
npx supabase db reset
```

Copy the output keys to `.env.local`:

```env
SUPABASE_LOCAL=true
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from output>
```

**Local Supabase URLs:**

- API Gateway: [http://127.0.0.1:54321](http://127.0.0.1:54321)
- Studio (Dashboard): [http://127.0.0.1:54323](http://127.0.0.1:54323)
- Inbucket (Email Testing): [http://127.0.0.1:54324](http://127.0.0.1:54324)

### Option B: Remote Supabase (Cloud)

1. Create a project at [supabase.com](https://supabase.com) (free tier works)
2. Go to **Settings → API** and copy your keys
3. Open **SQL Editor** and run the schema from `docs/database/schema.sql`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

---

## 3. Environment Variables

Create `.env.local` at the project root. **Never commit this file.**

```bash
cp .env.example .env.local
```

```env
# ─── Auth.js ────────────────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000/
NEXTAUTH_SECRET=

# ─── Google OAuth ───────────────────────────────────────────────────────────
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# ─── Google Drive ───────────────────────────────────────────────────────────
GDRIVE_CLIENT_ID=
GDRIVE_CLIENT_SECRET=
GDRIVE_REFRESH_TOKEN=
GDRIVE_FOLDER_ID=

# ─── Gmail OAuth ────────────────────────────────────────────────────────────
GMAIL_USER=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# ─── Gemini API ─────────────────────────────────────────────────────────────
GEMINI_API_KEY=

# ─── Supabase (Local) ───────────────────────────────────────────────────────
SUPABASE_LOCAL=true
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# ─── Site ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # no trailing slash
```

---

## 4. Google OAuth Setup

In [Google Cloud Console](https://console.cloud.google.com):

1. **Create project** (or select existing)
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Add **Authorized redirect URIs**:

```text
http://localhost:3000/api/auth/callback/google    ← development
https://your-domain.com/api/auth/callback/google  ← production
```

1. Copy **Client ID** → `AUTH_GOOGLE_ID`
2. Copy **Client Secret** → `AUTH_GOOGLE_SECRET`

---

## 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Google. The first user has `account_status: pending` — promote it to `admin` directly in Supabase:

```sql
-- In Supabase SQL Editor
UPDATE users SET account_status = 'active' WHERE email = 'your@email.com';
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'your@email.com' AND r.name = 'admin';
```

---

## 6. Giscus (Blog Comments) — Optional

Required only if you want comments on public blog posts.

1. Enable **GitHub Discussions** on your repo
2. Install the [Giscus app](https://github.com/apps/giscus) on the repo
3. Visit [giscus.app](https://giscus.app), fill in repo details, copy the generated config
4. Update `app/_components/ui/GiscusComments.js` with your `repo`, `repoId`, `categoryId` values

---

## 7. Deploy to Vercel

```bash
# Install Vercel CLI (optional)
npm i -g vercel
vercel
```

Or import via [vercel.com/new](https://vercel.com/new):

1. Connect the GitHub repo
2. Add all env vars under **Project → Settings → Environment Variables**
3. Set **Node.js version** to `20.x`
4. Add production OAuth redirect URI in Google Cloud Console (see step 4)
5. Set `NEXT_PUBLIC_SITE_URL` to your production URL
6. Deploy — auto-deploys on every push to `main`

### Post-deploy checklist

```text
✓ Google sign-in works on production
✓ /sitemap.xml and /robots.txt return valid responses
✓ Security headers pass at securityheaders.com
✓ Supabase Storage images load (check next.config.mjs remotePatterns)
✓ Giscus comments load on /blogs/[slug]
```

---

## 8. Scripts Reference

```bash
npm run dev     # Turbopack dev server
npm run build   # production build (runs type checks + lint)
npm run start   # serve production build
npm run lint    # ESLint — next/core-web-vitals
```

---

## Troubleshooting

| Symptom                                             | Fix                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Sign-in redirects to `/account` but shows "pending" | Run the SQL above to set `account_status = 'active'` and assign a role         |
| Images from Supabase Storage don't load             | Add your Supabase hostname to `remotePatterns` in `next.config.mjs`            |
| `SUPABASE_SERVICE_KEY` undefined in server action   | Verify the env var is set — it must not have `NEXT_PUBLIC_` prefix             |
| Giscus comments don't appear                        | Ensure GitHub Discussions is enabled and `giscus.app` script config is correct |
| Build fails on `sanitize-html`                      | Run `npm install` — it is a direct dependency, not devDependency               |
