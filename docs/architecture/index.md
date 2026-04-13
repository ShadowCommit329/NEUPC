# Architecture

How the codebase is structured and the key patterns it follows.

---

## Deep Dives

- [Root Homepage (`/`) Technical Documentation](homepage-root-page.md)

---

## Folder Structure

```
neupc/
├── app/
│   ├── layout.js / page.js           # Root layout + homepage
│   ├── error.js / loading.js / not-found.js
│   │
│   ├── _components/                  # Shared UI — NOT a route (underscore convention)
│   │   ├── features/                 # Navbar, EventCard, SignInButton
│   │   ├── layout/                   # Header, Footer
│   │   ├── sections/                 # Homepage sections (Hero, Events, Blogs…)
│   │   └── ui/                       # Avatar, Logo, Wave, GiscusComments, TopProgressBar
│   │
│   ├── _lib/                         # All server-side logic
│   │   ├── auth.js                   # NextAuth provider + all callbacks
│   │   ├── auth-guard.js             # requireRole() / requireAuth()
│   │   ├── supabase.js               # supabase (anon) + supabaseAdmin (service role)
│   │   ├── data-service.js           # Central data layer — 262 exported functions
│   │   ├── public-actions.js         # Cached SSR fetchers (no "use server")
│   │   ├── actions.js                # Auth actions (signIn/signOut/switchRole)
│   │   ├── helpers.js                # requireAdmin(), logActivity()
│   │   ├── validation.js             # stripHtml, sanitizeText, sanitizeRichText, zod schemas
│   │   ├── rate-limiter.js           # Sliding-window in-memory rate limiter
│   │   ├── seo.js                    # SITE_URL, OG defaults, BASE_KEYWORDS
│   │   ├── analytics-service.js      # Page view + event tracking
│   │   ├── security-service.js       # Security event logging
│   │   ├── system-logs-service.js    # System log writes
│   │   ├── sidebarConfig.js          # Per-role sidebar definitions
│   │   ├── roleDashboardConfig.js    # Per-role dashboard widget config
│   │   ├── action-guard.js           # Server action permission wrapper
│   │   ├── api-guard.js              # API route permission wrapper
│   │   └── *-actions.js             # 30+ domain server action files
│   │
│   ├── _styles/
│   │   ├── global.css                # CSS variables, component classes, scrollbar
│   │   └── color.json
│   │
│   ├── [public routes]/              # about/ blogs/ events/ gallery/ join/ contact/ …
│   │
│   ├── account/                      # All protected routes (/account/*)
│   │   ├── _components/              # AccountHeader, AccountSidebar, RoleContext, chat/
│   │   ├── admin/                    # 16 sub-pages
│   │   ├── advisor/                  # 9 sub-pages
│   │   ├── executive/                # 10 sub-pages
│   │   ├── member/                   # 14 sub-pages
│   │   ├── mentor/                   # 8 sub-pages
│   │   └── guest/                    # 6 sub-pages
│   │
│   └── api/
│       ├── auth/[...nextauth]/       # NextAuth handler
│       ├── account/                  # Account endpoints
│       ├── admin/                    # Admin REST endpoints
│       └── debug/                    # Dev-only
│
├── docs/                             # This documentation
├── proxy.js                          # NextAuth middleware — matcher: /account/:path*
├── next.config.mjs                   # Security headers, image domains
├── tailwind.config.mjs               # Design tokens
├── jsconfig.json                     # @/ path alias → project root
└── package.json
```

---

## Core Patterns

### 1. Server Components by default

Every file is a React Server Component unless it has `"use client"` at the top. Client components are used only when browser APIs, event listeners, or client state are required. This keeps the JS bundle small and moves work to the server.

### 2. Server Actions for all mutations

No `fetch()` calls for writes. Every form submission and data mutation is handled by a `"use server"` function in one of the `*-actions.js` files. This means mutations work with progressive enhancement (forms work without JS).

### 3. Centralised data access

All database queries live in `data-service.js`. Components and server actions call named, typed functions — no raw Supabase queries scattered across the codebase.

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

export const supabase = createClient(url, anonKey);
// Respects Row Level Security — use for reads in server components

export const supabaseAdmin = createClient(url, serviceRoleKey);
// Bypasses RLS — use ONLY in server actions/API routes for writes
// Never import supabaseAdmin in any component or page file
```

### 5. Role guard at every layer

```
proxy.js (middleware)
  └─ blocks unauthenticated /account/* requests

page.js / layout.js (server component)
  └─ requireRole('admin')  ← checks role + account_status + is_active

*-actions.js (server action)
  └─ requireRole('admin')  ← second check at mutation level
```

React `cache()` in `auth-guard.js` deduplicates the DB lookup when both `layout.js` and `page.js` call `requireRole()` in the same request.

### 6. Caching strategy

```
Public pages        → unstable_cache in public-actions.js (ISR-style)
Protected pages     → no cache (always fresh, user-specific data)
DB deduplication    → React cache() in auth-guard.js
```

---

## Data Flow

```
Browser request
      │
      ▼
proxy.js (middleware) ─── not authenticated? ──→ redirect /login
      │ authenticated
      ▼
layout.js + page.js (RSC)
      │
      ├─ requireRole()  ──── wrong role/status? ──→ redirect /account
      │
      ├─ data-service.js functions
      │       └─ supabase (reads via RLS)
      │       └─ supabaseAdmin (only in server actions)
      │
      └─ renders HTML on server → streams to browser

Form submit / button click
      │
      ▼
Server Action (*-actions.js)
      │
      ├─ requireRole() (re-verification)
      ├─ zod validation
      ├─ sanitization (validation.js)
      ├─ rate-limiter check
      ├─ data-service.js mutation (supabaseAdmin)
      └─ revalidatePath() / redirect()
```

---

## Key Config Files

| File | Purpose |
|---|---|
| `proxy.js` | NextAuth middleware — named `proxy.js` deliberately (not `middleware.js`), works via `matcher` export |
| `next.config.mjs` | `poweredByHeader: false`, security headers, Supabase Storage image domain whitelist |
| `tailwind.config.mjs` | Custom color tokens, fonts (Inter, Space Grotesk, JetBrains Mono), 8 animations |
| `jsconfig.json` | `@/` maps to project root — use in all imports |
| `eslint.config.mjs` | `next/core-web-vitals` + `eslint-config-prettier` |
