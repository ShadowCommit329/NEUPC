# NEUPC - Netrokona University Programming Club

A full-stack club management platform for competitive programming communities featuring events, blog CMS, mentorship, discussions, problem-solving tracking, and a complete admin back-office for six user roles.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Tech Stack

| Layer     | Technology                                                  |
| --------- | ----------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack, React Server Components) |
| Language  | JavaScript (ES Modules + JSDoc)                             |
| Styling   | Tailwind CSS v4                                             |
| Database  | Supabase (PostgreSQL + RLS + Realtime)                      |
| Auth      | Auth.js v5 (Google OAuth, JWT sessions)                     |
| Rich Text | TipTap v3 (12+ extensions)                                  |
| Forms     | react-hook-form + Zod                                       |
| Email     | Nodemailer (Gmail OAuth2)                                   |
| Comments  | Giscus (GitHub Discussions)                                 |
| Deploy    | Vercel                                                      |

---

## Features

### Public Website

- **Homepage** - Featured events, blogs, achievements, club stats
- **Events** - Event listings with registration and details
- **Blogs** - Technical articles with syntax highlighting and comments
- **Achievements** - Club awards filtered by year/category
- **Gallery** - Photo albums from events
- **Roadmaps** - Learning path guides
- **Committee** - Leadership team profiles
- **Join** - Membership application form
- **Contact** - Contact form with email notifications

### Member Portal (`/account`)

| Role          | Features                                                                          |
| ------------- | --------------------------------------------------------------------------------- |
| **Guest**     | Browse events, apply for membership, basic profile                                |
| **Member**    | Problem solving tracker, discussions, event registration, certificates, bootcamps |
| **Mentor**    | Manage mentees, assign tasks, log sessions, create resources                      |
| **Executive** | Create events/blogs, manage gallery, approve members, issue certificates          |
| **Advisor**   | Club overview, approve budgets, view analytics, manage committee                  |
| **Admin**     | Full system access: users, roles, settings, security, exports                     |

### Core Modules

- **Problem Solving** - Track solutions across 25+ platforms (Codeforces, AtCoder, LeetCode, etc.) with AI analysis
- **Chat System** - Real-time messaging via Supabase Realtime
- **Mentorship** - Mentor-mentee assignments, sessions, weekly tasks
- **Discussion Forum** - Threads, replies, voting, solutions
- **Certificate System** - Issue and verify event certificates
- **Budget Management** - Income/expense tracking with approvals

---

## Quick Start

### Prerequisites

- Node.js >= 20
- Supabase project ([supabase.com](https://supabase.com))
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))

### Installation

```bash
git clone https://github.com/eyasir329/neupc.git
cd neupc
npm install
cp .env.example .env.local  # Fill in your values
npm run dev                  # http://localhost:3000
```

### Environment Variables

Create `.env.local` with:

```env
# Auth.js
NEXTAUTH_URL=http://localhost:3000/
NEXTAUTH_SECRET=           # Generate: openssl rand -base64 32

# Google OAuth
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=              # anon/public key
SUPABASE_SERVICE_KEY=      # service role key (server-only)

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Optional variables** for additional features:

- `GDRIVE_*` - Google Drive for image storage
- `GMAIL_*` - Gmail OAuth for email notifications
- `GEMINI_API_KEY` - AI features

### Database Setup

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Run the contents of `docs/database/schema.sql`
3. Verify tables exist (`users`, `events`, `blog_posts`, etc.)

### Google OAuth Setup

1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Go to **APIs & Services > Credentials > Create OAuth 2.0 Client ID**
3. Add redirect URIs:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://your-domain.com/api/auth/callback/google`

### First User Setup

After first sign-in, promote yourself to admin:

```sql
UPDATE users SET account_status = 'active' WHERE email = 'your@email.com';
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'your@email.com' AND r.name = 'admin';
```

---

## Project Structure

```
neupc/
├── app/
│   ├── _components/          # Shared UI components
│   │   ├── ui/               # Button, Modal, Avatar, etc.
│   │   ├── sections/         # Homepage sections
│   │   └── chat/             # Chat system components
│   │
│   ├── _lib/                 # Server-side logic
│   │   ├── auth.js           # Auth.js configuration
│   │   ├── auth-guard.js     # requireRole() / requireAuth()
│   │   ├── supabase.js       # Supabase clients
│   │   ├── data-service.js   # 262 data access functions
│   │   └── *-actions.js      # 30+ server action files
│   │
│   ├── account/              # Protected routes
│   │   ├── admin/            # Admin dashboard (16 pages)
│   │   ├── advisor/          # Advisor dashboard
│   │   ├── executive/        # Executive dashboard
│   │   ├── member/           # Member dashboard
│   │   ├── mentor/           # Mentor dashboard
│   │   └── guest/            # Guest dashboard
│   │
│   ├── api/                  # REST API routes
│   └── [public pages]/       # about, blogs, events, etc.
│
├── docs/                     # Documentation
├── browser-extension/        # Chrome extension for Codeforces sync
├── public/                   # Static assets
└── proxy.js                  # Auth middleware
```

---

## Architecture

### Core Patterns

1. **Server Components by default** - Client components only when needed
2. **Server Actions for mutations** - All writes via `"use server"` functions
3. **Centralized data access** - All queries through `data-service.js`
4. **Dual Supabase clients**:
   - `supabase` - Respects RLS (for reads)
   - `supabaseAdmin` - Bypasses RLS (server actions only)

### Security (4-Layer Guard)

```
proxy.js (middleware)      → Blocks unauthenticated /account/* requests
  └── layout.js/page.js    → requireRole() checks role + status
      └── *-actions.js     → Re-validates auth at mutation level
          └── Supabase RLS → Database-level row security
```

### Data Flow

```
Request → Middleware → RSC (requireRole) → data-service.js → Supabase
                                              ↓
Form Submit → Server Action → Validation → Mutation → revalidatePath()
```

---

## Scripts

```bash
npm run dev     # Development server (Turbopack)
npm run build   # Production build
npm run start   # Production server
npm run lint    # ESLint
```

---

## Deployment

### Vercel

1. Import repo at [vercel.com/new](https://vercel.com/new)
2. Add all environment variables
3. Set Node.js version to `20.x`
4. Add production OAuth redirect URI in Google Console
5. Deploy

### Post-Deploy Checklist

- [ ] Google sign-in works
- [ ] `/sitemap.xml` returns valid response
- [ ] Images load from Supabase Storage
- [ ] Giscus comments work on blogs

---

## Documentation

| Document                                                               | Description                 |
| ---------------------------------------------------------------------- | --------------------------- |
| [Getting Started](docs/getting-started/index.md)                       | Full setup guide            |
| [Environment Variables](docs/getting-started/environment-variables.md) | All env vars                |
| [Architecture](docs/architecture/index.md)                             | Core patterns and data flow |
| [Project Structure](docs/architecture/project-structure.md)            | File tree walkthrough       |
| [Database Schema](docs/database/schema.sql)                            | SQL for Supabase setup      |

---

## Contributing

```bash
git checkout -b feat/your-feature
# Make changes
npm run lint && npm run build
git commit -m "feat: description"
git push origin feat/your-feature
# Open pull request
```

**Commit prefixes:** `feat:` `fix:` `docs:` `refactor:` `perf:` `chore:`

**Code rules:**

- Server Components by default
- All DB calls through `data-service.js`
- All mutations in `*-actions.js` with `requireRole()`
- Validate with Zod, sanitize HTML inputs

---

## License

MIT - see [LICENSE](LICENSE)
