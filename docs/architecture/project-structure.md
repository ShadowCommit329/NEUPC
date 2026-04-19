# Project Structure

Detailed walkthrough of the NEUPC codebase file organization.

---

## Root Directory

```text
neupc/
├── app/                    # Next.js App Router — all pages, components, and server logic
├── docs/                   # Developer documentation (this folder)
├── public/                 # Static assets (images, icons, SVGs)
├── scripts/                # Utility scripts
│
├── next.config.mjs         # Next.js config — security headers, image domains
├── tailwind.config.mjs     # Tailwind CSS v4 theme — colors, fonts, animations
├── postcss.config.mjs      # PostCSS config — uses @tailwindcss/postcss
├── jsconfig.json           # Path alias: @/ → project root
├── eslint.config.mjs       # ESLint — next/core-web-vitals + prettier
├── .prettierrc             # Prettier formatting rules
├── vercel.json             # Vercel deployment config
├── package.json            # Dependencies and npm scripts
└── .env.example            # Environment variable template
```

---

## App Directory — `app/`

The heart of the application. Uses Next.js **App Router** conventions.

### Root Files

| File                 | Purpose                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `layout.js`          | Root layout — global CSS, fonts, providers (toast, role context, page transition), header/footer |
| `page.js`            | Homepage — server component that fetches and renders all homepage sections                       |
| `error.js`           | Global error boundary                                                                            |
| `loading.js`         | Global loading skeleton                                                                          |
| `not-found.js`       | Custom 404 page                                                                                  |
| `icon.png`           | Favicon                                                                                          |
| `robots.js`          | Dynamic `robots.txt` generator                                                                   |
| `sitemap.js`         | Dynamic `sitemap.xml` generator                                                                  |
| `opengraph-image.js` | Edge-rendered Open Graph image                                                                   |

---

### Private Directories (Not Routes)

Directories prefixed with `_` are excluded from routing by Next.js convention.

#### `app/_lib/` — Server-Side Logic

The brain of the application. Contains **58 files** covering:

| Category        | Key Files                                                                   | Description                                                         |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Auth**        | `auth.js`, `auth.config.js`, `auth-guard.js`                                | NextAuth config, session callbacks, `requireRole()`/`requireAuth()` |
| **Data**        | `data-service.js`                                                           | Central data layer — 292 exported functions                         |
| **Actions**     | `*-actions.js` (30+ files)                                                  | All server actions (`"use server"`) for mutations                   |
| **Public Data** | `public-actions.js`                                                         | Cached SSR fetchers for public pages (`unstable_cache`)             |
| **Database**    | `supabase.js`                                                               | Supabase client initialization (anon + service role)                |
| **Validation**  | `validation.js`, `schemas.js`                                               | Input sanitization, Zod schemas                                     |
| **Security**    | `rate-limiter.js`, `security-service.js`, `action-guard.js`, `api-guard.js` | Rate limiting, security logging, permission wrappers                |
| **Email**       | `email-service.js`                                                          | Gmail API email dispatch                                            |
| **Media**       | `gdrive.js`, `gcs.js`, `image-gen.js`                                       | Google Drive integration, image generation                          |
| **Config**      | `sidebarConfig.js`, `roleDashboardConfig.js`                                | Per-role UI configuration                                           |
| **Utils**       | `helpers.js`, `utils.js`, `hooks.js`, `seo.js`                              | Utilities, custom hooks, SEO helpers                                |
| **Logging**     | `analytics-service.js`, `system-logs-service.js`                            | Analytics and system log services                                   |

#### `app/_components/` — Shared Components

| Directory   | Count    | Description                                          |
| ----------- | -------- | ---------------------------------------------------- |
| `ui/`       | 37 files | Reusable UI components (Button, Modal, Avatar, etc.) |
| `sections/` | 11 files | Homepage sections (Hero, Events, Blogs, etc.)        |
| `motion/`   | 7 files  | Framer Motion animation wrappers                     |
| `chat/`     | 10 files | Real-time chat system components                     |

See [components.md](components.md) for the full catalog.

#### `app/_styles/` — Global Styles

| File         | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `global.css` | CSS variables, component classes, scrollbar, prose overrides |
| `color.json` | Color palette configuration                                  |

---

### Public Route Directories

Each folder under `app/` creates a route. All public pages are **server components** that fetch data and render a corresponding client component.

```text
app/
├── about/              → /about              Club mission and vision
├── achievements/       → /achievements       Achievement records and timeline
├── blogs/              → /blogs              Blog post listing
│   └── [blogId]/       → /blogs/:slug        Blog post detail with comments
├── committee/          → /committee          Current leadership committee
├── contact/            → /contact            Contact form and FAQ
├── developers/         → /developers         Development team and tech stack
├── events/             → /events             Events listing
│   └── [eventId]/      → /events/:slug       Event detail with registration
├── gallery/            → /gallery            Photo gallery
├── join/               → /join               Join/sign-up CTA
├── login/              → /login              Google OAuth sign-in
├── privacy/            → /privacy            Privacy policy
├── roadmaps/           → /roadmaps           Learning path roadmaps
│   └── [roadmapId]/    → /roadmaps/:slug     Roadmap detail
├── terms/              → /terms              Terms of service
└── verify-email/       → /verify-email       Email verification
```

---

### Authenticated Area — `app/account/`

All routes under `/account/` are **protected** by server-side guards (`requireRole()`) in each layout and page.

```text
app/account/
├── _components/            # Dashboard-specific shared components (16 files)
├── layout.js               # Account layout — sidebar, header, chat FAB
├── page.js                 # Role selection hub (/account)
│
├── guest/                  # Guest dashboard (7 pages)
│   ├── layout.js           # requireRole('guest')
│   ├── page.js             # Dashboard overview
│   ├── events/             # Browse events
│   ├── membership-application/  # Submit join request
│   ├── notifications/      # Notifications
│   ├── participation/      # Participation history
│   ├── profile/            # Basic profile
│   └── settings/           # Account settings
│
├── member/                 # Member dashboard (14 pages)
│   ├── layout.js           # requireRole('member')
│   ├── achievements/       # Personal achievements
│   ├── certificates/       # Issued certificates
│   ├── contests/           # Contest participation
│   ├── discussions/        # Forum threads
│   ├── events/             # Event registration
│   ├── gallery/            # Photo gallery
│   ├── notices/            # Club announcements
│   ├── notifications/      # Notifications
│   ├── participation/      # Full history
 │   ├── bootcamps/          # CP problem list
│   ├── profile/            # Full profile
│   ├── resources/          # Learning resources
│   ├── roadmap/            # Roadmaps
│   └── settings/           # Settings
│
├── mentor/                 # Mentor dashboard (8 pages)
│   ├── assigned-members/   # Manage mentees
│   ├── recommendations/    # Write recommendations
│   ├── resources/          # Create resources
│   ├── sessions/           # Log sessions
│   └── tasks/              # Assign/review tasks
│
├── executive/              # Executive dashboard (10 pages)
│   ├── blogs/manage/       # Blog CMS
│   ├── certificates/generate/  # Issue certificates
│   ├── contests/manage/    # Contest management
│   ├── events/manage/      # Event management
│   ├── gallery/manage/     # Gallery management
│   ├── members/            # Member directory
│   ├── notices/create/     # Post notices
│   ├── registrations/      # Registration management
│   └── reports/            # Reports
│
├── advisor/                # Advisor dashboard (9 pages)
│   ├── achievements/       # Review achievements
│   ├── analytics/          # Platform analytics
│   ├── approvals/          # Approve applications
│   ├── budget/             # Budget management
│   ├── club-overview/      # Club summary
│   ├── committee/          # Committee overview
│   ├── events/             # Event oversight
│   └── reports/            # Reports
│
└── admin/                  # Admin dashboard (16+ pages)
    ├── achievements/       # CRUD achievements
    ├── analytics/          # Full analytics
    ├── applications/       # Membership applications
    ├── blogs/              # All blog management
    ├── contact-submissions/ # Contact form inbox
    ├── events/             # Event management
    ├── export/             # Data export (CSV/JSON)
    ├── gallery/            # Gallery management
    ├── notices/            # Notice board
    ├── resources/          # Resource library
    ├── roles/              # Role/permission matrix
    ├── security/           # Security event log
    ├── settings/           # Site-wide settings
    ├── system-logs/        # Activity logs
    └── users/              # User management + CRUD
```

---

### API Routes — `app/api/`

```text
app/api/
├── auth/[...nextauth]/     # NextAuth handler (Google OAuth)
├── account/
│   ├── heartbeat/          # Online status heartbeat
│   ├── events/[eventId]/registrations/  # Event registration data
│   ├── messages/           # Chat messages
│   └── status-reason/      # Account status info
├── admin/
│   ├── users/              # User CRUD endpoints
│   ├── blogs/[blogId]/comments/  # Blog comment management
│   └── events/[eventId]/registrations/  # Registration management
├── code/
│   ├── execute/            # Code execution via Wandbox
│   ├── explain/            # Code explanation
│   └── format/             # Code formatting
├── health/                 # Health check endpoint
├── image/[id]/             # Image proxy (Drive + external URLs)
└── debug/users/            # Dev-only user debug
```

See [api-routes.md](api-routes.md) for full API documentation.

---

## Documentation — `docs/`

```text
docs/
├── README.md                    # Documentation index
├── CONTRIBUTING.md              # Contribution guide
├── getting-started/
│   ├── index.md                 # Setup guide
│   └── environment-variables.md # Env var reference
├── architecture/
│   ├── index.md                 # Core patterns and data flow
│   ├── project-structure.md     # This file
│   ├── components.md            # Component catalog
│   ├── api-routes.md            # API routes reference
│   ├── data-service.md          # 292 data-service functions
│   └── server-actions.md        # 30+ server action files
├── auth/
│   └── authentication.md        # OAuth flow, session, guards
├── product/
│   ├── features.md              # Feature modules reference
│   ├── roles-and-pages.md       # Role dashboard pages
│   └── sitemap.md               # Full route inventory
├── database/
│   ├── index.md                 # Schema overview, 45+ tables
│   └── schema.sql               # Raw SQL for schema setup
├── security/
│   └── index.md                 # 4-layer security model
├── frontend/
│   └── design-system.md         # Colors, typography, animations
├── deployment/
│   └── index.md                 # Deployment and CI/CD
├── guides/
│   ├── event-registration.md    # Event registration walkthrough
│   └── adding-new-feature.md    # Step-by-step feature guide
└── troubleshooting.md           # Common issues and fixes
```
