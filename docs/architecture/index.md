# Architecture

How NEUPC is structured and the key patterns it follows.

---

## Folder Structure

```text
neupc/
├── app/
│   ├── layout.js / page.js              # Root layout + homepage
│   ├── error.js / loading.js / not-found.js
│   ├── robots.js / sitemap.js / opengraph-image.js
│   │
│   ├── _components/                     # Shared UI — NOT a route (underscore = private)
│   │   ├── ui/                          # 36 reusable components
│   │   │   ├── Avatar, Button, Modal, Skeleton, Pagination
│   │   │   ├── RichTextEditor (TipTap), CodePlayground (CodeMirror)
│   │   │   ├── Navbar, GiscusComments, TopProgressBar
│   │   │   └── EventCard, PageHero, SectionContainer, …
│   │   ├── sections/                    # Homepage sections (Hero, Events, Blogs…)
│   │   ├── chat/                        # Real-time chat components
│   │   ├── discussions/                 # Discussion forum components
│   │   ├── motion/                      # Framer Motion animation wrappers
│   │   └── resources/                   # Resource display components
│   │
│   ├── _lib/                            # All server-side logic (75 files)
│   │   ├── auth.js                      # NextAuth provider + session callbacks
│   │   ├── auth.config.js               # Google OAuth provider config
│   │   ├── auth-guard.js                # requireRole() / requireAuth() for pages
│   │   ├── action-guard.js              # requireActionAuth() for server actions
│   │   ├── api-guard.js                 # requireApiAuth() for API routes
│   │   ├── supabase.js                  # supabase (anon) + supabaseAdmin (service role)
│   │   ├── data-service.js              # 292 exported DB query functions (~140KB)
│   │   ├── public-actions.js            # Cached SSR fetchers for public pages
│   │   ├── validation.js                # stripHtml, sanitizeText, sanitizeRichText
│   │   ├── schemas.js                   # Zod validation schemas
│   │   ├── rate-limiter.js              # Sliding-window in-memory rate limiter
│   │   ├── seo.js                       # SITE_URL, OG defaults, BASE_KEYWORDS
│   │   ├── helpers.js                   # logActivity(), requireAdmin()
│   │   ├── analytics-service.js         # Page view + event tracking
│   │   ├── security-service.js          # Security event logging
│   │   ├── system-logs-service.js       # System log writes
│   │   ├── email-service.js             # Nodemailer Gmail OAuth2 email sending
│   │   ├── extension-auth.js            # Browser extension token generation/verify
│   │   ├── llm.js                       # Multi-provider LLM client (6 providers)
│   │   ├── solution-analyzer.js         # AI solution analysis
│   │   ├── gdrive.js / gcs.js           # Google Drive + Cloud Storage helpers
│   │   ├── sidebarConfig.js             # Per-role sidebar navigation definitions
│   │   ├── roleDashboardConfig.js       # Per-role dashboard widget config
│   │   ├── problem-solving-actions.js   # Problem solving mutations (110KB)
│   │   ├── problem-solving-services.js  # Platform sync services (342KB)
│   │   ├── problem-solving-platforms.js # Platform registry
│   │   ├── codeforces-scraper.js        # Codeforces profile scraper
│   │   └── *-actions.js                 # 30 domain server action files
│   │
│   ├── _hooks/                          # Custom React hooks
│   ├── _styles/
│   │   ├── global.css                   # CSS variables, component classes, scrollbar
│   │   └── color.json                   # Design token palette
│   │
│   ├── [public routes]/                 # about/ blogs/ events/ gallery/ join/ contact/ …
│   │
│   ├── account/                         # All protected routes (/account/*)
│   │   ├── _components/                 # AccountHeader, AccountSidebar, RoleContext, chat/
│   │   ├── admin/                       # 23 pages
│   │   ├── advisor/                     # 13 pages
│   │   ├── executive/                   # 14 pages
│   │   ├── member/                      # 14 pages
│   │   ├── mentor/                      # 12 pages
│   │   └── guest/                       # 10 pages
│   │
│   └── api/
│       ├── auth/[...nextauth]/          # NextAuth handler
│       ├── problem-solving/             # 32+ endpoints (core feature)
│       ├── admin/                       # Admin REST endpoints
│       ├── account/                     # Account management endpoints
│       ├── image/                       # Image proxy (Drive + external URLs)
│       ├── health/                      # Health check
│       ├── cron/                        # Scheduled background jobs
│       └── debug/                       # Dev-only diagnostics
│
├── browser-extension/                   # Chrome/Firefox extension (41+ platforms)
├── docs/                                # This documentation
├── public/                              # Static assets
│   ├── logo.png, bg.webp
│   └── placeholder-event.png / .svg
└── supabase/                            # Supabase local config
    ├── config.toml
    └── README.md
```

---

## Core Patterns

### 1. Server Components by default

Every file is a React Server Component unless it has `"use client"` at the top. Client components are used only when browser APIs, event listeners, or client-side state are required. This keeps the JS bundle small and moves work to the server.

### 2. Server Actions for all mutations

No `fetch()` calls for writes. Every form submission and data mutation is handled by a `"use server"` function in one of the `*-actions.js` files. Mutations work with progressive enhancement — forms work without JS.

### 3. Centralized data access

All database queries live in `data-service.js`. Components and server actions call named functions — no raw Supabase queries scattered across the codebase.

```js
// ✅ correct
import { getEventById } from '@/app/_lib/data-service';
const event = await getEventById(id);

// ❌ wrong — raw query in a component
const { data } = await supabase.from('events').select('*').eq('id', id);
```

### 4. Dual Supabase clients

```js
// app/_lib/supabase.js

export const supabase      // anon key — respects RLS — used for reads in RSCs
export const supabaseAdmin // service role — bypasses RLS — server actions/API routes only
// Never import supabaseAdmin in any component or page file
```

### 5. Role guard at every layer

```text
layout.js / page.js (RSC)
  └── requireRole('admin')
        ├── checks session exists
        ├── checks role membership
        └── checks account_status === 'active'

*-actions.js (server action)
  └── requireActionAuth('admin')   ← re-verified at mutation time

app/api/* (API route)
  └── requireApiAuth('admin')      ← verified per request

Supabase RLS                       ← database-level row security
```

React `cache()` in `auth-guard.js` deduplicates the DB lookup when both `layout.js` and `page.js` call `requireRole()` in the same request.

### 6. Caching strategy

| Data type | Strategy |
|---|---|
| Public pages | `unstable_cache` in `public-actions.js` (ISR-style, revalidates on mutation) |
| Protected pages | No cache — always fresh, user-specific |
| DB deduplication | `React.cache()` in `auth-guard.js` |

---

## Security Model

```text
┌──────────────────────────────────────────────────────┐
│  Layer 1: layout.js / page.js                        │
│  requireRole(role) — blocks wrong role or inactive   │
│  account before the page even renders                │
├──────────────────────────────────────────────────────┤
│  Layer 2: *-actions.js                               │
│  requireActionAuth(role) — re-verifies at mutation   │
│  time so direct action calls are also blocked        │
├──────────────────────────────────────────────────────┤
│  Layer 3: app/api/*                                  │
│  requireApiAuth(role) — protects REST endpoints      │
├──────────────────────────────────────────────────────┤
│  Layer 4: Supabase RLS                               │
│  Row-level security enforced at the database —       │
│  last line of defence even if app logic is bypassed  │
└──────────────────────────────────────────────────────┘
```

Additionally:
- **Rate limiting** — `rate-limiter.js` protects public forms (5/15 min) and API routes (100/min)
- **Input sanitization** — all user HTML goes through `sanitizeRichText()` before storage
- **Zod validation** — all server action inputs are validated via schemas in `schemas.js`
- **Security headers** — set in `next.config.mjs`: HSTS, X-Frame-Options DENY, XSS protection, CSP

---

## Data Flow

### Page render

```text
Browser → RSC layout.js
            └── requireRole()
                  └── data-service.js → supabase (RLS) → DB
                        └── render HTML → stream to browser
```

### Form submission / mutation

```text
User action → Server Action (*-actions.js)
                  ├── requireActionAuth()   — auth check
                  ├── Zod schema.parse()    — input validation
                  ├── sanitizeRichText()    — HTML sanitization
                  ├── rateLimit()           — rate check
                  ├── data-service.js       — supabaseAdmin → DB
                  └── revalidatePath() / redirect()
```

### Problem solving sync

```text
Browser Extension → /api/problem-solving/bulk-import
                        ├── extension token verification
                        ├── per-user rate limiting
                        └── problem-solving-services.js → DB

Sync button → fullSyncAction()
                  ├── platform handles
                  ├── problem-solving-services.js (submissions, ratings, contests)
                  ├── CLIST API for enriched contest data
                  └── AI analysis queue
```

---

## Key Config Files

| File | Purpose |
|---|---|
| `next.config.mjs` | Security headers, image `remotePatterns`, 2GB body limit, server external packages |
| `tailwind.config.mjs` | Custom color tokens, fonts (Inter, Space Grotesk, JetBrains Mono), animations |
| `jsconfig.json` | `@/` alias maps to project root |
| `eslint.config.mjs` | `next/core-web-vitals` + `eslint-config-prettier` |
| `supabase/config.toml` | Local Supabase ports, auth settings, storage limits |

---

## Related Documentation

- [Project Structure](./project-structure.md) — detailed file tree
- [Data Service](./data-service.md) — how the DB layer works
- [Server Actions](./server-actions.md) — mutation patterns
- [API Routes](./api-routes.md) — REST endpoint reference
- [Database Schema](../database/index.md) — table catalogue
