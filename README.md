# NEUPC — Netrokona University Programming Club

A full-stack club management platform built for competitive programming communities. Covers everything from a public-facing website to a six-role member portal with problem-solving tracking across 41+ platforms, AI-powered solution analysis, real-time chat, mentorship, discussions, events, blogs, and a complete admin back-office.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 — App Router, Turbopack, React Server Components |
| Language | JavaScript (ES Modules + JSDoc) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Auth.js v5 — Google OAuth, JWT sessions |
| Rich Text | TipTap v3 — 12+ extensions |
| Code Editor | CodeMirror — C++, Python, Java, Go, Rust, SQL, JS, and more |
| Forms | react-hook-form + Zod |
| Animation | Framer Motion |
| Email | Nodemailer (Gmail OAuth2) |
| AI | Google Gemini, Groq, GitHub Models, Together AI, Cerebras, OpenRouter |
| Comments | Giscus (GitHub Discussions) |
| Deploy | Vercel |

---

## Features

### Public Website

| Page | Description |
|---|---|
| `/` | Homepage — featured events, blogs, achievements, club stats |
| `/events` | Event listings with registration |
| `/blogs` | Technical articles with syntax highlighting and Giscus comments |
| `/achievements` | Club awards filtered by year and category |
| `/gallery` | Photo albums from events |
| `/roadmaps` | Learning path guides |
| `/committee` | Leadership team profiles |
| `/join` | Membership application form |
| `/contact` | Contact form with email notifications |
| `/about` `/developers` `/privacy` `/terms` | Static pages |

### Member Portal (`/account`)

Six roles, each with a dedicated dashboard and feature set:

| Role | Key Capabilities |
|---|---|
| **Guest** | Browse events, apply for membership, manage profile |
| **Member** | Problem-solving tracker, discussions, bootcamps, certificates, event registration |
| **Mentor** | Manage mentees, log sessions, assign weekly tasks, create resources |
| **Executive** | Create events/blogs, manage gallery, approve members, issue certificates, budget tracking |
| **Advisor** | Club overview, budget approvals, analytics, committee management |
| **Admin** | Full system access — users, roles, security, settings, exports, system logs |

### Core Modules

| Module | Description |
|---|---|
| **Problem Solving** | Track submissions across 41+ platforms with AI-powered analysis, rating history, contest tracking, and leaderboard |
| **Browser Extension** | Chrome/Firefox extension that auto-syncs submissions from 41+ competitive programming platforms |
| **Chat** | Real-time messaging via Supabase Realtime — direct, support, and group conversations |
| **Mentorship** | Mentor-mentee assignments, session logs, weekly tasks, private notes |
| **Discussions** | Threaded forum with voting, nested replies, and solution marking |
| **Certificates** | Issue and verify participation certificates with unique certificate numbers |
| **Budget** | Income/expense tracking per event with approval workflow |
| **Analytics** | Page views, event tracking, member statistics, club-wide reports |

---

## Quick Start

### Prerequisites

- Node.js >= 20
- Docker (for local Supabase)
- Google OAuth credentials — [console.cloud.google.com](https://console.cloud.google.com)

### Installation

```bash
git clone https://github.com/eyasir329/neupc.git
cd neupc
npm install
cp .env.example .env.local   # fill in your values
npm run dev                   # http://localhost:3000
```

### Minimal `.env.local`

```env
NEXTAUTH_URL=http://localhost:3000/
NEXTAUTH_SECRET=                    # openssl rand -base64 32

AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

See [Environment Variables](docs/getting-started/environment-variables.md) for all options.

### First Admin User

After signing in with Google, promote yourself to admin in Supabase SQL Editor:

```sql
UPDATE users SET account_status = 'active' WHERE email = 'your@email.com';
INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, r.id FROM users u, roles r
  WHERE u.email = 'your@email.com' AND r.name = 'admin';
```

---

## Project Structure

```text
neupc/
├── app/
│   ├── _components/           # Shared React components
│   │   ├── ui/                # 36 reusable UI components
│   │   ├── sections/          # Homepage sections
│   │   ├── chat/              # Chat system components
│   │   ├── discussions/       # Discussion forum components
│   │   ├── motion/            # Framer Motion wrappers
│   │   └── resources/         # Resource display components
│   │
│   ├── _lib/                  # All server-side logic (75 files)
│   │   ├── auth.js            # Auth.js configuration
│   │   ├── auth-guard.js      # requireRole() / requireAuth()
│   │   ├── action-guard.js    # requireActionAuth() for server actions
│   │   ├── api-guard.js       # requireApiAuth() for API routes
│   │   ├── supabase.js        # Supabase clients (anon + admin)
│   │   ├── data-service.js    # 292 database access functions
│   │   ├── rate-limiter.js    # Sliding-window rate limiter
│   │   ├── validation.js      # Input sanitization + Zod schemas
│   │   └── *-actions.js       # 30+ server action files
│   │
│   ├── _hooks/                # Custom React hooks
│   ├── _styles/               # Global CSS + color tokens
│   │
│   ├── account/               # Protected routes (/account/*)
│   │   ├── admin/             # 23 admin pages
│   │   ├── advisor/           # 13 advisor pages
│   │   ├── executive/         # 14 executive pages
│   │   ├── member/            # 14 member pages
│   │   ├── mentor/            # 12 mentor pages
│   │   └── guest/             # 10 guest pages
│   │
│   ├── api/                   # REST API routes (13 folders, 32+ endpoints)
│   └── [public pages]/        # about, blogs, events, gallery, join…
│
├── browser-extension/         # Chrome/Firefox extension (41+ platforms)
├── docs/                      # Developer documentation
├── public/                    # Static assets
└── supabase/                  # Supabase config
```

---

## Architecture

### Core Patterns

**1. Server Components by default**
Every file is an RSC unless it has `"use client"`. Client components are used only for browser APIs, event handlers, or client state.

**2. Server Actions for all mutations**
No `fetch()` calls for writes. Every form and data mutation lives in a `"use server"` function inside `*-actions.js`.

**3. Centralized data access**
All database queries go through `data-service.js`. No raw Supabase calls scattered across the codebase.

```js
// ✅ correct
import { getEventById } from '@/app/_lib/data-service';

// ❌ wrong — raw query in a component
const { data } = await supabase.from('events').select('*').eq('id', id);
```

**4. Dual Supabase clients**

```js
export const supabase      // anon key — respects RLS, used for reads
export const supabaseAdmin // service role — bypasses RLS, server-only
```

**5. Security in layers**

```text
layout.js / page.js (RSC)
  └── requireRole('admin')        ← role + account_status check
        └── *-actions.js
              └── requireActionAuth('admin')  ← re-verified at mutation level
                    └── Supabase RLS          ← database-level row security
```

### Data Flow

```text
Request → RSC layout.js → requireRole() → data-service.js → Supabase → render

Form submit → Server Action → requireActionAuth() → Zod validation
           → sanitization → rate-limit check → data-service.js → revalidatePath()
```

---

## Scripts

```bash
npm run dev          # Turbopack dev server
npm run build        # Production build (runs lint + typecheck)
npm run start        # Serve production build
npm run lint         # ESLint (next/core-web-vitals)
npm run format       # Prettier
npm run typecheck    # TypeScript checks
npm run analyze      # Bundle size analysis
```

---

## Deployment

### Vercel (Recommended)

1. Import repo at [vercel.com/new](https://vercel.com/new)
2. Add all environment variables under **Project → Settings → Environment Variables**
3. Set Node.js version to `20.x`
4. Add production OAuth redirect URI in Google Cloud Console:
   `https://your-domain.com/api/auth/callback/google`
5. Set `NEXT_PUBLIC_SITE_URL` to your production domain
6. Deploy — auto-deploys on every push to `main`

### Post-Deploy Checklist

```text
✓ Google sign-in works on production domain
✓ /sitemap.xml returns valid XML
✓ Images load from Supabase Storage
✓ Giscus comments appear on /blogs/[slug]
✓ Security headers pass at securityheaders.com
```

---

## Documentation

| Document | Description |
|---|---|
| [Getting Started](docs/getting-started/index.md) | Full local setup guide |
| [Environment Variables](docs/getting-started/environment-variables.md) | All env vars reference |
| [Local Supabase](docs/getting-started/local-supabase.md) | Run database locally with Docker |
| [Architecture](docs/architecture/index.md) | Patterns, data flow, security model |
| [Project Structure](docs/architecture/project-structure.md) | File tree walkthrough |
| [Database Schema](docs/database/index.md) | 45+ table catalogue, RLS, SQL snippets |
| [Feature Modules](docs/product/features.md) | All features by role |
| [Browser Extension](browser-extension/README.md) | Extension setup and platform list |

---

## Contributing

```bash
git checkout -b feat/your-feature
# make changes
npm run lint && npm run build
git commit -m "feat: description"
git push origin feat/your-feature
# open pull request against main
```

**Commit prefixes:** `feat:` `fix:` `docs:` `refactor:` `perf:` `chore:`

**Code rules:**
- Server Components by default — `"use client"` only when necessary
- All DB calls through `data-service.js`
- All mutations in `*-actions.js` with `requireActionAuth()`
- Validate with Zod, sanitize HTML inputs via `validation.js`
- Never import `supabaseAdmin` in any component or page file

---

## License

MIT — see [LICENSE](LICENSE)
