# Technical Route Documentation & Sitemap

> 📍 **Last Updated**: March 2026 | **Version**: 2.0 | **Status**: Production

---

## 📑 Table of Contents

### Quick Navigation

- [1. Website Structure Overview](#1-website-structure-overview)
- [2. Public Navigation Flow](#2-public-navigation-flow)
- [3. Route Categorization](#3-route-categorization)
- [4. Public Route Documentation](#4-public-route-documentation)
  - [Core Pages](#core-pages)
  - [Content Pages](#content-pages)
  - [Community Pages](#community-pages)
  - [Authentication & Legal Pages](#authentication--legal-pages)
- [5. Internal Portal Routes](#5-internal-portal-routes)
- [6. Directory Structure Tree](#6-directory-structure-tree)

### By Role

- [Admin Hub](#admin-hub-accountadmin)
- [Executive Hub](#executive-hub-accountexecutive)
- [Advisor Hub](#advisor-hub-accountadvisor)
- [Mentor Hub](#mentor-hub-accountmentor)
- [Member Hub](#member-hub-accountmember)
- [Guest Hub](#guest-hub-accountguest)

### By Route Type

- [Public Pages](#-public-website)
- [Internal Portal](#-internal-portal-accountadmin)
- [Legal & Auth](#authentication--legal-pages)

---

## 1. Website Structure Overview

The Programming Club platform is built on a modern Next.js App Router architecture. The application is divided into two primary ecosystems:

1. **Public-Facing Website (`/`)**: Statically generated (where possible) and ISR (Incremental Static Regeneration) routes designed for high performance, SEO visibility, and public community engagement.
2. **Internal Portal (`/account/*`)**: Highly dynamic, role-based, authenticated dashboards for members, executives, mentors, advisors, and admins.

This document serves as the technical reference for the entire platform.

---

**[↑ Back to Top](#-table-of-contents)** | **[→ Next: Public Navigation](#2-public-navigation-flow)**

---

## 2. Public Navigation Flow

The user journey typically begins at the root landing page (`/`), branching out into four distinct pillars of interaction:

- **Discovering Content** → Reading blogs, viewing learning roadmaps, and exploring the gallery.
- **Engaging with Events** → Browsing upcoming tech sessions and registering.
- **Understanding the Community** → Viewing the committee hierarchy, club achievements, and about pages.
- **Onboarding** → Applying for membership or logging into the portal.

---

**[↑ Back to Top](#-table-of-contents)** | **[← Previously: Overview](#1-website-structure-overview)** | **[→ Next: Route Categorization](#3-route-categorization)**

---

## 3. Route Categorization

### 🌐 Public Website

| Category            | Routes                                                                        |
| :------------------ | :---------------------------------------------------------------------------- |
| **Core Pages**      | `/`, `/about`, `/contact`, `/developers`                                      |
| **Content Pages**   | `/blogs`, `/blogs/[blogId]`, `/roadmaps`, `/roadmaps/[roadmapId]`, `/gallery` |
| **Community Pages** | `/events`, `/events/[eventId]`, `/committee`, `/achievements`, `/join`        |
| **Auth Pages**      | `/login`, `/verify-email`                                                     |
| **Legal Pages**     | `/privacy`, `/terms`                                                          |

### 🔐 Internal Portal (`/account`)

| Role          | Base Route           | Key Modules                                                            |
| :------------ | :------------------- | :--------------------------------------------------------------------- |
| **Admin**     | `/account/admin`     | System-wide management, users, roles, security logs, content control   |
| **Advisor**   | `/account/advisor`   | Approvals, budget tracking, club overview, reports                     |
| **Executive** | `/account/executive` | Event management, blog publishing, member administration, certificates |
| **Mentor**    | `/account/mentor`    | Assigned members, mentoring sessions, tasks, recommendations           |
| **Member**    | `/account/member`    | Problem sets, contest prep, event registration, discussions            |
| **Guest**     | `/account/guest`     | Membership applications, profile management, limited event access      |

---

**[↑ Back to Top](#-table-of-contents)** | **[← Previously: Navigation Flow](#2-public-navigation-flow)** | **[→ Next: Public Routes](#4-public-route-documentation)**

---

## 4. Public Route Documentation

### Core Pages

#### `/` (Home)

**Purpose**: The primary landing page and entry point for the club.
**Primary Features**: Hero showcase, mission statement highlights, featured upcoming events, recent blog posts, and quick-action CTAs.
**Major Components Used**: `PageHero`, `FeaturedSpotlight`, `MotionSection`.
**User Interactions**: Scrolling through high-level club summaries, navigating to specific content silos.
**Data Sources**: Supabase `events` (upcoming), `blogs` (recent).
**User Actions**: Click to join, click to read more, click to view events.
**SEO & Visibility**: Highly optimized; serves as the primary indexed page.
**Related Routes**: `/about`, `/join`

#### `/about`

**Purpose**: Details the history, mission, vision, and core values of the programming club.
**Primary Features**: Rich text narratives, timeline of the club, core value propositions.
**Major Components Used**: `PageHero`, `PageShell`, `MotionFadeIn`.
**User Interactions**: Reading static informational content.
**Data Sources**: Static Content / Markdown / Config.
**User Actions**: Read club history.
**SEO & Visibility**: Public; optimized for branded keyword search.
**Related Routes**: `/committee`

#### `/contact`

**Purpose**: Provides a way for users, sponsors, or students to get in touch with the club executives.
**Primary Features**: Contact form (Name, Email, Message), club physical address, email links, and social media links.
**Major Components Used**: `PageHero`, `ContactClient` (with form validation).
**User Interactions**: Filling and submitting the contact form; copying email addresses.
**Data Sources**: Submits to Supabase `contact_submissions` table or triggers an edge function API.
**User Actions**: Submit inquiry, click social links.
**SEO & Visibility**: Public.
**Related Routes**: `/about`

#### `/developers`

**Purpose**: Credits the developers, contributors, and maintainers of the club platform.
**Primary Features**: Grid layout of contributor cards, tech stack overview, contribution timeline.
**Major Components Used**: `PageHero`, `MemberCard`.
**User Interactions**: Viewing profiles, linking to GitHub profiles.
**Data Sources**: Static configuration or Supabase `users` (filtered by contributor roles).
**User Actions**: Click outgoing external links to GitHub/LinkedIn.
**SEO & Visibility**: Public.
**Related Routes**: `/committee`

---

**📍 Core Pages Summary** | **[↑ Back to Top](#-table-of-contents)** | **[→ Next Section: Content Pages](#content-pages)**

---

### Content Pages

#### `/blogs`

**Purpose**: A central repository for all technical articles, tutorials, and club announcements.
**Primary Features**: Paginated grid/list of articles, category pills, global search, and a featured spotlight carousel.
**Major Components Used**: `FilterPanel`, `FeaturedSpotlight`, `BlogCard`, `BlogsClient`.
**User Interactions**: Searching by keyword, filtering by tags, toggling grid/list view.
**Data Sources**: Supabase `blogs` table (with views/likes aggregations).
**User Actions**: Search, filter, paginate, click to read.
**SEO & Visibility**: Highly optimized for technical long-tail keywords.
**Related Routes**: `/blogs/[blogId]`

#### `/blogs/[blogId]`

**Purpose**: The dedicated reading environment for a single blog post.
**Primary Features**: Markdown/HTML rendering, syntax-highlighted code blocks with "Copy/Run" functionality, sticky Table of Contents, reading progress bar, customizable reading preferences (font size, theme), like/share sidebar, and comments section.
**Major Components Used**: `BlogDetailClient`, `CodePlayground`, `BlogComments`.
**User Interactions**: Scrolling, clicking TOC links, toggling focus mode, copying code, liking the post, posting comments.
**Data Sources**: Supabase `blogs`, `blog_comments`, `blog_likes`.
**User Actions**: Read, interact with code blocks, share to social media, drop a comment.
**SEO & Visibility**: Public; dynamically maps OpenGraph meta tags based on blog title/excerpt.
**Related Routes**: `/blogs`

#### `/roadmaps`

**Purpose**: Provides curated learning paths for various technology stacks.
**Primary Features**: Grid of available roadmaps (e.g., Frontend, Backend, ML), difficulty indicators, estimated completion times.
**Major Components Used**: `PageHero`, `FilterPanel`.
**User Interactions**: Filtering roadmaps by difficulty or category.
**Data Sources**: Supabase `roadmaps`.
**User Actions**: Browse and select a learning path.
**SEO & Visibility**: Public.
**Related Routes**: `/roadmaps/[roadmapId]`

#### `/roadmaps/[roadmapId]`

**Purpose**: A detailed, step-by-step graphical or list-based learning track.
**Primary Features**: Expandable steps, prerequisite links, resource recommendations (videos, articles), and progress tracking (if authenticated).
**Major Components Used**: `RoadmapDetailClient`, interactive tree/list components.
**User Interactions**: Expanding roadmap nodes, clicking external resource links.
**Data Sources**: Supabase `roadmap_steps`, `roadmap_resources`.
**User Actions**: View steps, mark as complete (if logged in).
**SEO & Visibility**: Public.
**Related Routes**: `/roadmaps`

#### `/gallery`

**Purpose**: A visual showcase of past club events, workshops, and hackathons.
**Primary Features**: Masonry or CSS grid layout of images, lightbox/modal for full-screen viewing, image categorization.
**Major Components Used**: `ImageModal`, `FilterPanel`, `GalleryClient`.
**User Interactions**: Filtering by event/year, clicking images to open lightbox, navigating via arrow keys inside the modal.
**Data Sources**: Supabase `gallery_images` / Storage buckets.
**User Actions**: View, zoom, cycle through images.
**SEO & Visibility**: Public.
**Related Routes**: `/events`

---

**📍 Content Pages Summary** | **[↑ Back to Top](#-table-of-contents)** | **[→ Next Section: Community Pages](#community-pages)**

---

### Community Pages

#### `/events`

**Purpose**: Lists all upcoming, ongoing, and past club events, seminars, and hackathons.
**Primary Features**: Tabbed views (Upcoming / Past), date/time badges, location tags, and search functionality.
**Major Components Used**: `FilterPanel`, `FeaturedSpotlight`.
**User Interactions**: Searching for specific events, toggling past/upcoming views.
**Data Sources**: Supabase `events`.
**User Actions**: Find an event, click for details.
**SEO & Visibility**: Public.
**Related Routes**: `/events/[eventId]`

#### `/events/[eventId]`

**Purpose**: Comprehensive information regarding a specific event.
**Primary Features**: Event poster, countdown timer, speaker profiles, agenda/schedule timeline, venue/map details, and a registration CTA.
**Major Components Used**: `EventDetailClient`.
**User Interactions**: Reviewing the agenda, clicking the registration button.
**Data Sources**: Supabase `events`, `event_speakers`, `event_schedules`.
**User Actions**: Register / RSVP.
**SEO & Visibility**: Public; uses structured schema data for Event SEO.
**Related Routes**: `/events`, `/account/guest/events`

#### `/committee`

**Purpose**: Introduces the leadership teams to the public.
**Primary Features**: Categorized sections (e.g., Faculty Advisors, Executive Panel, Mentors), modern horizontal/vertical member cards detailing academic session, department, and specific responsibilities.
**Major Components Used**: `CommitteeClient`, `PageHero`.
**User Interactions**: Scrolling through the current (and possibly past) committee panels.
**Data Sources**: Supabase `committee_members` or `users` table joined with roles.
**User Actions**: View profiles.
**SEO & Visibility**: Public.
**Related Routes**: `/about`, `/developers`

#### `/achievements`

**Purpose**: Showcases the awards, hackathon victories, and milestones reached by club members.
**Primary Features**: Timeline or grid of achievements, participants involved, event names.
**Major Components Used**: `PageHero`, `FeaturedSpotlight`.
**User Interactions**: Browsing past successes.
**Data Sources**: Supabase `achievements`.
**User Actions**: Read success stories.
**SEO & Visibility**: Public.
**Related Routes**: `/about`

#### `/join`

**Purpose**: Information and application gateway for prospective members.
**Primary Features**: Membership benefits overview, eligibility criteria, FAQs, and a CTA leading to the registration portal.
**Major Components Used**: `PageHero`, FAQ accordions.
**User Interactions**: Reading FAQs, clicking "Apply Now".
**Data Sources**: Static content.
**User Actions**: Proceed to membership application.
**SEO & Visibility**: Public.
**Related Routes**: `/login`, `/account/guest/membership-application`

---

**📍 Community Pages Summary** | **[↑ Back to Top](#-table-of-contents)** | **[→ Next Section: Auth & Legal](#authentication--legal-pages)**

---

### Authentication & Legal Pages

#### `/login`

**Purpose**: The secure entry point for existing users to access their respective role-based dashboards.
**Primary Features**: Magic link input, OAuth providers, or standard credentials form.
**Data Sources**: Supabase Auth.
**SEO & Visibility**: Limited (NoIndex recommended).

#### `/verify-email`

**Purpose**: Callback route to handle authentication tokens sent via email; automatically redirects.
**Data Sources**: Supabase Auth session validation.
**SEO & Visibility**: Private/Hidden.

#### `/privacy` & `/terms`

**Purpose**: Standard legal disclosures regarding data handling and terms of service.
**Data Sources**: Static markdown or code text.
**SEO & Visibility**: Public.

---

**📍 Auth & Legal Pages Summary** | **[↑ Back to Top](#-table-of-contents)** | **[→ Next Section: Internal Portal](#5-internal-portal-routes)**

---

## 5. Internal Portal Routes (`/account`)

The internal portal uses dynamic routing to serve context-aware dashboards depending on the user's role.

### 👨‍💼 Admin Hub (`/account/admin/*`)

**Purpose**: Ultimate system control and configuration.

- `/users`, `.../roles`: User access control and role management.
- `/security`, `.../system-logs`: Audit trails and access logs.
- `/applications`: Review and approve incoming membership or role applications.
- `/content` (blogs, events, bootcamps): Full CRUD over all public-facing content.

### 📋 Executive Hub (`/account/executive/*`)

**Purpose**: Operational management of club activities.

- `/members`: Manage active club members, update statuses.
- `/events/manage`: Create and manage upcoming events and track RSVPs.
- `/blogs/manage`: Review, edit, and publish blog submissions from members.
- `/certificates/generate`: Generate and distribute event/completion certificates.

### 🎓 Advisor Hub (`/account/advisor/*`)

**Purpose**: High-level oversight and approvals.

- `/club-overview`, `.../analytics`: High-level dashboards showing club metrics.
- `/approvals`: Approve budget requests or major event initiatives.
- `/reports`: View end-of-term or event-specific reports.

### 👥 Mentor Hub (`/account/mentor/*`)

**Purpose**: Tools for guiding junior members.

- `/assigned-members`: View profiles and progress of mentees.
- `/sessions`: Schedule and track 1-on-1 mentoring sessions.
- `/tasks`: Assign and review coding tasks or mini-projects for mentees.

### 👤 Member Hub (`/account/member/*`)

**Purpose**: The core experience for approved club members.

- `/bootcamps`, `.../contests`: Practice coding problems and participate in internal contests.
- `/roadmap`: Track personal learning progress across tech stacks.
- `/discussions`: Participate in member-only forums or Q&A.
- `/certificates`: View and download earned certificates.

### 🔓 Guest Hub (`/account/guest/*`)

**Purpose**: Sandbox access for newly registered users pending approval.

- `/membership-application`: Complete and submit the formal club joining form.
- `/events`: View limited events available to guests.
- `/profile`: Manage basic account details pending full approval.

---

**📍 Internal Portal Summary** | **[↑ Back to Top](#-table-of-contents)** | **[View Role Comparison](#-internal-portal-accountadmin)** | **[→ Next Section: Directory Tree](#6-directory-structure-tree)**

---

## 6. Directory Structure Tree

```text
app                                          // Root application directory
├── about                                    // Club history and mission
├── account                                  // Authenticated user portal hub
│   ├── admin                                // System administration dashboard
│   │   ├── achievements                     // Club awards and milestones
│   │   ├── analytics                        // Platform usage and metrics overview
│   │   ├── applications                     // Review membership and role applications
│   │   ├── blogs                            // Technical article listing and management
│   │   ├── bootcamps                        // Manage learning bootcamps
│   │   ├── committee                        // Committee hierarchy and profiles
│   │   ├── contact-submissions              // Inquiries from the contact form
│   │   ├── events                           // Event listings and registration
│   │   ├── export                           // Data export tools
│   │   ├── gallery                          // Photo gallery from past events
│   │   ├── notices                          // System-wide and role-specific announcements
│   │   ├── resources                        // Shared learning materials and assets
│   │   ├── roadmaps                         // Curated learning paths
│   │   ├── roles                            // Role-based access control (RBAC) settings
│   │   ├── security                         // Security settings and audit logs
│   │   ├── settings                         // User and system configuration
│   │   ├── system-logs                      // Technical error and activity logs
│   │   └── users                            // User account management
│   │       ├── [userId]
│   │       │   └── edit                     // Edit existing entities
│   │       └── create                       // Create new entities
│   ├── advisor                              // Faculty advisor dashboard
│   │   ├── achievements                     // Club awards and milestones
│   │   ├── analytics                        // Platform usage and metrics overview
│   │   ├── approvals                        // Approve requests or budgets
│   │   ├── budget                           // Financial tracking for the club
│   │   ├── club-overview                    // High-level club status for advisors
│   │   ├── committee                        // Committee hierarchy and profiles
│   │   ├── events                           // Event listings and registration
│   │   ├── profile                          // User profile management
│   │   └── reports                          // Generate and view activity reports
│   ├── executive                            // Executive committee dashboard
│   │   ├── blogs                            // Technical article listing and management
│   │   │   └── manage                       // CRUD operations for specific resources
│   │   ├── certificates                     // View and generate participation certificates
│   │   │   └── generate                     // Create new certificates
│   │   ├── contests                         // Internal programming contests
│   │   │   └── manage                       // CRUD operations for specific resources
│   │   ├── events                           // Event listings and registration
│   │   │   └── manage                       // CRUD operations for specific resources
│   │   ├── gallery                          // Photo gallery from past events
│   │   │   └── manage                       // CRUD operations for specific resources
│   │   ├── members                          // View and manage club members
│   │   ├── notices                          // System-wide and role-specific announcements
│   │   │   └── create                       // Create new entities
│   │   ├── profile                          // User profile management
│   │   ├── registrations                    // Manage event RSVPs
│   │   └── reports                          // Generate and view activity reports
│   ├── guest                                // Pending member / guest dashboard
│   │   ├── events                           // Event listings and registration
│   │   ├── membership-application           // Apply to join the club
│   │   ├── notifications                    // User alerts and messages
│   │   ├── participation                    // Track event and contest involvement
│   │   ├── profile                          // User profile management
│   │   └── settings                         // User and system configuration
│   ├── member                               // Approved member dashboard
│   │   ├── achievements                     // Club awards and milestones
│   │   ├── certificates                     // View and generate participation certificates
│   │   ├── contests                         // Internal programming contests
│   │   ├── discussions                      // Member Q&A and forums
│   │   ├── events                           // Event listings and registration
│   │   ├── gallery                          // Photo gallery from past events
│   │   ├── notices                          // System-wide and role-specific announcements
│   │   ├── notifications                    // User alerts and messages
│   │   ├── participation                    // Track event and contest involvement
 │   │   ├── bootcamps                        // Coding practice problems
│   │   ├── profile                          // User profile management
│   │   ├── resources                        // Shared learning materials and assets
│   │   ├── roadmap                          // Track personal learning progress
│   │   └── settings                         // User and system configuration
│   └── mentor                               // Mentor dashboard (for tutoring/guidance)
│       ├── assigned-members                 // Mentees assigned to a mentor
│       ├── notices                          // System-wide and role-specific announcements
│       ├── profile                          // User profile management
│       ├── recommendations                  // Mentor hardware/software recommendations
│       ├── resources                        // Shared learning materials and assets
│       ├── sessions                         // 1-on-1 mentoring scheduling
│       ├── settings                         // User and system configuration
│       └── tasks                            // Assign and review mentee tasks
├── achievements                             // Club awards and milestones
├── blogs                                    // Technical article listing and management
│   └── [blogId]                             // Dynamic blog post details
├── committee                                // Committee hierarchy and profiles
├── contact                                  // Public contact form
├── developers                               // Platform contributors and tech stack
├── events                                   // Event listings and registration
│   └── [eventId]                            // Dynamic event details and RSVP
├── gallery                                  // Photo gallery from past events
├── join                                     // Public membership info and CTA
├── login                                    // Authentication gateway
├── privacy                                  // Privacy policy
├── roadmaps                                 // Curated learning paths
│   └── [roadmapId]                          // Dynamic roadmap steps
├── terms                                    // Terms of service
└── verify-email                             // Email verification callback
```

---

## 📖 Quick Reference Guides

### By User Role

| Role                  | Entry Point                     | Primary Dashboard                       | Use Cases                                               |
| :-------------------- | :------------------------------ | :-------------------------------------- | :------------------------------------------------------ |
| **Anonymous Visitor** | `/`                             | `/blogs`, `/events`, `/about`           | Browse content, discover events, apply for membership   |
| **Guest**             | `/login` → `/account/guest`     | `/account/guest/membership-application` | Complete membership form, view limited event info       |
| **Member**            | `/login` → `/account/member`    | `/account/member/bootcamps`             | Practice coding, participate in contests, attend events |
| **Mentor**            | `/login` → `/account/mentor`    | `/account/mentor/assigned-members`      | Guide mentees, schedule sessions, assign tasks          |
| **Executive**         | `/login` → `/account/executive` | `/account/executive/events/manage`      | Manage events, publish blogs, issue certificates        |
| **Advisor**           | `/login` → `/account/advisor`   | `/account/advisor/club-overview`        | Monitor club health, approve initiatives, view reports  |
| **Admin**             | `/login` → `/account/admin`     | `/account/admin/users`                  | System-wide configuration, user management, security    |

### By Feature

| Feature              | Public Route                          | Internal Route (if applicable)      |
| :------------------- | :------------------------------------ | :---------------------------------- |
| **Blog Discovery**   | `/blogs` → `/blogs/[blogId]`          | `/account/executive/blogs/manage`   |
| **Event Management** | `/events` → `/events/[eventId]`       | `/account/executive/events/manage`  |

| **Gallery**          | `/gallery`                            | `/account/executive/gallery/manage` |
| **Committee Info**   | `/committee`                          | `/account/admin/committee`          |
| **User Management**  | —                                     | `/account/admin/users`              |
| **Settings**         | —                                     | `/account/*/settings`               |

### By Access Level

```
PUBLIC (No Auth Required)
├── / (Home)
├── /about
├── /contact
├── /developers
├── /blogs
├── /blogs/[blogId]
├── /roadmaps
├── /roadmaps/[roadmapId]
├── /gallery
├── /events
├── /events/[eventId]
├── /committee
├── /achievements
├── /join
├── /login
├── /privacy
├── /terms
└── /verify-email

AUTHENTICATED (Auth Required - Role-Based)
└── /account (Pending Members Stay Here)
    |         Authenticated but account status not active
    ├── /guest/* (Approve Guests)
    ├── /member/* (Approved Members)
    ├── /mentor/* (Mentors)
    ├── /executive/* (Leadership)
    ├── /advisor/* (Faculty Advisors)
    └── /admin/* (System Admin)
```

---

## 🔗 Navigation Reference

### Main Sections

1. **[Website Structure Overview](#1-website-structure-overview)** — Understand the two-ecosystem architecture
2. **[Public Navigation Flow](#2-public-navigation-flow)** — Learn the typical user journey
3. **[Route Categorization](#3-route-categorization)** — See all routes organized by type
4. **[Public Route Documentation](#4-public-route-documentation)** — Detailed guide for each public-facing page
5. **[Internal Portal Routes](#5-internal-portal-routes)** — Complete role-based portal documentation
6. **[Directory Structure Tree](#6-directory-structure-tree)** — File system layout overview

### By Role

- **[Admin Hub](#-admin-hub-accountadmin)** — System administration & content control
- **[Executive Hub](#-executive-hub-accountexecutive)** — Club operations & events
- **[Advisor Hub](#-advisor-hub-accountadvisor)** — Oversight & approvals
- **[Mentor Hub](#-mentor-hub-accountmentor)** — Member guidance & development
- **[Member Hub](#-member-hub-accountmember)** — Learning & participation
- **[Guest Hub](#-guest-hub-accountguest)** — Onboarding & applications

### By Content Type

- **[Core Pages](#core-pages)** — Landing, about, contact, developers
- **[Content Pages](#content-pages)** — Blogs, roadmaps, gallery
- **[Community Pages](#community-pages)** — Events, committee, achievements
- **[Auth & Legal](#authentication--legal-pages)** — Login, verification, privacy, terms

---

## 💡 Common Navigation Patterns

### Content Silo Entry Points

```
Public Discovery → Content Detail → Account Integration
/blogs           → /blogs/[id]      → /account/member/...

/events          → /events/[id]     → /account/*/events
/gallery         → /gallery (modal)  → —
```

### Admin/Executive Management Workflows

```
View List → Create/Find → Edit Details → Publish/Approve → Track Analytics
/account/*/[resource]       → /[resource]/manage → /[resource]/create → /admin/analytics
```

### Member Onboarding Flow

```
Public Site → Join Info → Application → Approval → Full Portal Access
/       →    /join    →  /login      →    ✓      →  /account/member
/about  →              /account/guest/...(pending)
/events →
```

---

## 🎯 SEO & Performance Notes

### Highly Optimized Routes (Indexed, High Priority)

- `/` (Homepage)
- `/blogs` & `/blogs/[blogId]`
- `/roadmaps` & `/roadmaps/[roadmapId]`
- `/about`, `/contact`, `/committee`

### Limited Indexing (NoIndex Recommended)

- `/login`, `/verify-email` (auth pages)
- `/account/*` (internal portal, private)

### Dynamic Content

- All `/[id]` routes use dynamic routes with ISR or SSR
- Real-time data from Supabase where applicable

---

## 📝 Documentation Maintenance

- **Last Updated**: March 2026
- **Version**: 2.0 (Professional Navigation)
- **Maintained By**: Development Team
- **Related Docs**:
  - [Architecture Guide](../architecture/index.md)
  - [Database Schema](../database/schema.sql)
  - [Server Actions Reference](../architecture/server-actions.md)
  - [Authentication Flow](../auth/authentication.md)
  - [Role & Permissions](./roles-and-pages.md)

---

## 🎯 Complete Routes with Details - What's In Each Route

### PUBLIC ROUTES - What You'll Find

#### **CORE PAGES**

**`/` — Homepage**

- Hero section with club mission and call-to-action
- Featured upcoming events carousel
- Recent blog posts showcase
- Quick navigation to key sections
- Social media and contact links
- Club statistics and highlights
- ISR enabled for performance

**`/about` — About Our Club**

- Club history and founding story
- Mission, vision, and core values
- Team leadership overview
- Club achievements timeline
- Membership benefits explanation
- Contact information
- Links to committee page

**`/contact` — Contact Form**

- Contact form with Name, Email, Message fields
- Form validation and error handling
- Club phone number and email address
- Office location and directions
- Social media links and icons
- Direct email mailto links
- Response confirmation message

**`/developers` — Developer Credits**

- List of contributors and developers
- Contributor cards with profiles
- GitHub and LinkedIn links
- Tech stack overview
- Build and deployment information
- Version and release history
- Open source acknowledgments

#### **CONTENT PAGES**

**`/blogs` — Blog Articles Listing**

- Grid/list view toggle
- Paginated blog list (10-20 per page)
- Search functionality by title or keyword
- Category/tag filtering
- Featured spotlight carousel
- Blog card previews with images
- Sort by date, views, likes
- Author information and read time

**`/blogs/[blogId]` — Individual Blog Article**

- Markdown content with syntax highlighting
- Blog title, author, date, category
- Featured image and cover photo
- Table of contents with scroll linking
- Reading progress indicator
- Like and share buttons
- Comments section with nested replies
- Related articles recommendations
- Reading time estimate

**`/roadmaps` — Learning Roadmaps Listing**

- Grid of available learning tracks
- Roadmap titles and descriptions
- Difficulty level badges
- Estimated completion time
- Technology stack tags
- Filter by difficulty or category
- Preview thumbnails
- Enrollment/start button

**`/roadmaps/[roadmapId]` — Roadmap Detail & Steps**

- Expandable/collapsible roadmap steps
- Step titles and descriptions
- Prerequisites and dependencies
- Resource links (videos, articles, docs)
- Difficulty and time per step
- Progress bar (if authenticated)
- Mark as complete buttons
- Related roadmaps
- Community discussions

**`/gallery` — Event Photo Gallery**

- Masonry grid of event photos
- Lightbox/modal for full-screen view
- Image filtering by event or year
- Image navigation with arrows
- Image counter and pagination
- Save/download options
- Event information per image
- Photo uploader (admin only)

#### **COMMUNITY PAGES**

**`/events` — Events Listing**

- Tabbed view: Upcoming and Past events
- Event cards with date and time
- Location and venue information
- Speaker information preview
- Event status badges
- Search and filter functionality
- Pagination
- RSVP button for each event

**`/events/[eventId]` — Event Details**

- Event poster and cover image
- Event title, date, time, location
- Countdown timer
- Detailed event description
- Speaker profiles and bios
- Event agenda/schedule timeline
- Venue map and directions
- RSVP/registration form
- Attendee list (if applicable)
- Event capacity and status

**`/committee` — Committee & Team**

- Faculty advisors section
- Executive panel with roles
- Mentor team listings
- Member cards with photos
- Name, designation, department
- Contact information
- Social media links
- Committee hierarchy overview
- Current and past members

**`/achievements` — Club Achievements**

- Timeline or grid of club achievements
- Hackathon wins and rankings
- Award certificates and honors
- Milestones and records
- Year-wise achievement breakdown
- Team member participation
- Event photos and highlights
- Achievement descriptions

**`/join` — Join Us / Membership Info**

- Membership benefits list
- Eligibility criteria
- Application process steps
- FAQ accordion section
- Benefits of joining
- Club rules and regulations
- Apply Now button/link
- Contact for more info

#### **AUTHENTICATION & LEGAL PAGES**

**`/login` — Login / Authentication**

- Magic link input field
- Email/password form
- OAuth provider buttons
- Social login options
- Remember me checkbox
- Forgot password link
- Sign up link
- Error messages and feedback

**`/verify-email` — Email Verification**

- Email token validation
- Auto-redirect to dashboard
- Verification status message
- Retry option if failed
- Resend verification link
- Verification timer

**`/privacy` — Privacy Policy**

- Data collection practices
- Privacy rights information
- Cookie policy
- Third-party services
- Data retention policy
- Contact privacy officer
- GDPR compliance info

**`/terms` — Terms of Service**

- User rights and responsibilities
- Prohibited activities
- Intellectual property
- Limitation of liability
- Disclaimer of warranties
- Dispute resolution
- Changes to terms

---

### INTERNAL PORTAL ROUTES - Dashboard and Features

#### **Admin Dashboard** — `/account/admin/*`

**What's in the Admin Dashboard:**

- **users**: User list, search, edit, delete, role assignment
- **roles**: Role management, permissions configuration
- **security**: Login attempts, IP logs, security events
- **applications**: Pending memberships, approvals, rejections
- **analytics**: Platform metrics, user stats, activity trends
- **content**: Moderation queue, content approval
- **blogs**: Blog management, publishing control
- **events**: Event management, scheduling
- **bootcamps**: Training programs management
- **achievements**: Award listing and management
- **notices**: System announcements
- **resources**: Learning materials repository
- **roadmaps**: Learning path management
- **export**: Data export tools
- **system-logs**: Error logs, audit trail

#### **Executive Dashboard** — `/account/executive/*`

**What's in the Executive Dashboard:**

- **events**: Upcoming events list, RSVP management
- **events/manage**: Create events, edit, schedule, publish
- **blogs**: Blog submissions list, reviews
- **blogs/manage**: Create, edit, publish blogs
- **members**: Member directory with filters
- **certificates**: Issue and track certificates
- **certificates/generate**: Certificate creation form
- **contests**: Contest listings and management
- **contests/manage**: Create contests, judge submissions
- **gallery**: Photo uploads and organization
- **gallery/manage**: Manage event photos
- **registrations**: Event RSVP management
- **notices**: Post announcements
- **notices/create**: Create system notices
- **profile**: Executive profile settings
- **reports**: Event reports and analytics
- **settings**: Dashboard preferences

#### **Advisor Dashboard** — `/account/advisor/*`

**What's in the Advisor Dashboard:**

- **club-overview**: Statistics, metrics, KPIs
- **analytics**: Trends, charts, data visualization
- **approvals**: Budget approvals, initiative review
- **budget**: Financial tracking and reports
- **committee**: View and manage committee
- **events**: Upcoming events calendar
- **profile**: Advisor profile management
- **reports**: Monthly/yearly reports
- **achievements**: Club achievements showcase
- **notifications**: Advisor alerts and messages
- **settings**: Preferences and configurations

#### **Mentor Dashboard** — `/account/mentor/*`

**What's in the Mentor Dashboard:**

- **assigned-members**: Mentee profiles, progress tracking
- **notices**: Mentee notifications and updates
- **profile**: Mentor profile and credentials
- **recommendations**: Hardware/software suggestions
- **resources**: Share documents and tutorials
- **sessions**: Schedule and manage 1-on-1 meetings
- **settings**: Mentor preferences
- **tasks**: Assign coding tasks and mini-projects

#### **Member Dashboard** — `/account/member/*`

**What's in the Member Dashboard:**

- **bootcamps**: Coding challenges library
- **contests**: Contest listings, participate
- **roadmap**: Track learning progress
- **discussions**: Forums, Q and A
- **events**: Register for events
- **gallery**: View event photos
- **achievements**: Personal achievements
- **certificates**: Downloaded certificates
- **notices**: Member announcements
- **notifications**: System notifications
- **participation**: Activity history
- **profile**: Member profile customization
- **resources**: Learning materials
- **settings**: Preferences and email settings

#### **Guest Dashboard** — `/account/guest/*`

**What's in the Guest Dashboard:**

- **membership-application**: Apply to join club
- **events**: Limited event access
- **notifications**: System messages
- **participation**: Track event attendance
- **profile**: Basic profile setup
- **settings**: Account preferences

---

### API ENDPOINTS - What Each Endpoint Does

#### **Authentication Endpoints**

**`POST /auth/login`** — User Authentication

- Accepts email and password or magic link request
- Authenticates user credentials
- Generates JWT token session
- Returns auth token and user data
- Sets authentication cookies

**`POST /auth/signup`** — User Registration

- Validates new user registration
- Creates user account in database
- Sends verification email
- Returns success/error response

**`POST /auth/logout`** — Session Termination

- Clears user session
- Invalidates JWT token
- Removes authentication cookies
- Redirects to login page

**`POST /auth/verify`** — Email Verification

- Verifies email verification token
- Confirms email address
- Updates user status to active
- Enables full account access

**`POST /auth/refresh`** — Token Renewal

- Renews expired JWT token
- Extends session duration
- Returns new token

**`POST /auth/reset-password`** — Password Recovery

- Sends password reset email
- Generates reset token
- Validates reset request
- Updates password in database

#### **Data and Content Endpoints**

**`GET /blogs`** — Fetch Blog List

- Retrieves paginated blog list
- Applies filters and sorting
- Returns author info and metadata

**`GET /blogs/[id]`** — Fetch Single Blog

- Returns single blog post data
- Includes comments and likes
- Fetches related articles

**`GET /events`** — Fetch Events List

- Lists all events with status
- Filters by date, category, status
- Returns event overview data

**`GET /events/[id]`** — Fetch Event Details

- Returns full event details
- Includes schedule and speakers
- Shows RSVP status

**`GET /roadmaps`** — Fetch Roadmap List

- Lists available learning tracks
- Returns difficulty and duration

**`GET /roadmaps/[id]`** — Fetch Roadmap Details

- Returns all roadmap steps
- Includes resources and links

**`GET /gallery`** — Fetch Gallery Images

- Retrieves gallery images
- Returns with metadata

**`GET /comments`** — Fetch Comments

- Retrieves comments for content
- Returns nested replies

**`GET /achievements`** — Fetch Achievements

- Returns club achievements
- Includes participants info

#### **User Management Endpoints**

**`GET /users`** — Fetch User List (Admin Only)

- Returns admin user list
- Includes filters for search
- Shows user roles and status

**`GET /users/[id]`** — Fetch User Profile (Admin Only)

- Returns specific user profile
- Admin access only

**`PUT /users/[id]`** — Update User (Admin)

- Updates user information
- Admin can modify other users
- Records audit trail

**`GET /profile`** — Fetch Current User Profile

- Returns current user profile
- Shows personal preferences

**`PUT /profile`** — Update User Profile

- Updates own profile data
- Saves user preferences
- Updates profile picture

**`GET /settings`** — Fetch User Settings

- Retrieves user preferences
- Includes notification settings

**`PUT /settings`** — Update Settings

- Saves user preferences
- Updates notification settings

**`GET /notifications`** — Fetch Notifications

- Returns user notifications
- Shows unread status

**`POST /notifications/read`** — Mark as Read

- Marks notification as read
- Updates notification status

#### **Admin Operations & Business Logic Endpoints**

**Admin Operations (Admin Only):**

- `GET /admin/users` — Fetches all users with filters
- `POST /admin/users` — Creates new user
- `PUT /admin/users/[id]` — Edits user information
- `DELETE /admin/users/[id]` — Deletes user account
- `GET /admin/roles` — Fetches role list
- `POST /admin/audit-logs` — Records to audit logs
- `GET /admin/analytics` — Returns platform metrics
- `POST /admin/broadcast` — Sends announcements

**Business Logic Endpoints:**

- `POST /events/register` — Registers user for event
- `POST /comments/create` — Adds new comment
- `POST /blogs/like` — Records blog like
- `POST /contests/submit` — Submits contest solution
- `POST /certificates/generate` — Creates certificate
- `POST /applications/submit` — Saves membership app
- `POST /contacts/submit` — Stores contact message
- `POST /discussions/create` — Creates forum post

---

## 🎫 Event Registration Workflows (Actual Implementation)

### ✅ Individual Registration (Member/Authenticated User)

**Entry:** `/events/[eventId]` → Click "Register Now"

**Validation Checks:**

- ✓ User logged in
- ✓ Event status: "upcoming" or "ongoing"
- ✓ Registration deadline not passed
- ✓ User has eligible role (if event has eligibility requirements)
- ✓ Event not full (`max_participants` check)
- ✓ User not already registered

**Database Action:**

```sql
INSERT INTO event_registrations (
  event_id,
  user_id,
  status = 'registered',
  registered_at = NOW()
)
```

**Output:**

- ✓ Success toast: "Registered for [Event]"
- ✓ Button changes to "✓ Registered" (green badge)
- ✓ Cancel option appears
- ✓ Registration appears in `/account/member/events`

**Cancellation:**

- ✓ Team leader: Can cancel anytime (unless `confirmed` or `attended`)
- ✓ Non-team member: Can cancel anytime (unless `confirmed` or `attended`)
- ✓ If `confirmed` or `attended`: "Contact the club to cancel"
- ✓ Re-activate allowed: If cancelled earlier, click register again to re-activate

---

### 👥 Team Registration (Multiple Members)

**Entry:** `/events/[eventId]` → Click "Register as Team"

**Process:**

#### 1️⃣ Team Details Form

- Enter team name (e.g., "Alpha Coders")
- Search & add members using `TeamMemberSearch` component
  - Search by name or email (min 2 chars)
  - Excludes: current user, already-registered members, non-eligible members
  - Live results with avatars
  - Click to add, then click ✕ to remove

#### 2️⃣ Validation

- ✓ Team name not empty
- ✓ At least 1 member selected (besides team lead)
- ✓ All members eligible for event (role-specific eligibility)
- ✓ No member already registered as leader for this event
- ✓ No member already in another team for this event
- ✓ Team size matches event requirement (if `team_size` set)
- ✓ Event capacity not exceeded

#### 3️⃣ Database Records Created

```sql
-- Main team registration (led by current user)
INSERT INTO event_registrations (
  event_id,
  user_id,           -- Team leader
  status = 'registered',
  team_name,         -- e.g., "Alpha Coders"
  team_members = [id1, id2, ...],  -- ALL member IDs including leader
  registered_at
)
RETURNING registration.id

-- Per-member tracking rows
INSERT INTO event_registration_members [
  { registration_id, user_id: leader, is_leader: true, status: 'accepted', responded_at: NOW() },
  { registration_id, user_id: member1, is_leader: false, status: 'pending', responded_at: NULL },
  { registration_id, user_id: member2, is_leader: false, status: 'pending', responded_at: NULL }
]
```

#### 4️⃣ Team View (Member Dashboard)

- `/account/member/events` shows:
  - Team name badge
  - Member list with confirmation status
  - Example: "✓ You (leader) · ⏳ Alice · ⏳ Bob"
- Team lead sees all members
- Non-leader only sees their own status

#### 5️⃣ Non-Leader Invitation Response

- UI shows: "You've been invited to join [Team Name]"
- Two buttons: "Accept" or "Decline"
- Updates `event_registration_members` status: `'accepted'` or `'declined'`
- Leader can see live updates

#### 6️⃣ Cancellation

- **Team leader only** can cancel entire registration
- ✓ Sets `status = 'cancelled'`
- ✓ Deletes all `event_registration_members` rows
- Non-leader: Cannot cancel (error: "Contact team lead or club")

---

### 👤 Guest Registration (No Account)

**Entry:** `/events/[eventId]` → "Login to Register" (unauthenticated)

**Options Panel:**

1. **"Login"** → `/login` (existing account)
2. **"Join Club"** → `/join` (new membership)
3. **"Register as Guest"** → Guest form (no account needed)

**Guest Form:**

- Full name (required)
- Email (required)
- Phone (optional)
- Additional fields stored in `registration_data` (JSONB)

**Validation:**

- ✓ Email not already registered
- ✓ Event not full
- ✓ Event not cancelled

**Database Action:**

```sql
INSERT INTO event_registrations (
  event_id,
  -- No user_id for guests
  status = 'registered',
  registration_data = {
    guest_name: "...",
    guest_email: "...",
    guest_phone: "..."
  },
  registered_at
)
```

**No email verification needed** – Guest can attend immediately.

---

### ⚡ Current Registration Status

**Function:** `getMyRegistrationAction(eventId)`

**Returns:**

```javascript
{
  registration: {
    id,
    status: 'registered' | 'confirmed' | 'attended' | 'cancelled',
    isTeamLeader: true | false | null,  // null = individual, true = team leader, false = team member
    myAcceptance: 'pending' | 'accepted' | 'declined',  // only for non-leaders in teams
    teamName: "Alpha Coders",
    teamMembers: [...]
  }
}
```

**Status Values:**

| Status       | Meaning                              | Can Cancel?     |
| ------------ | ------------------------------------ | --------------- |
| `registered` | User signed up                       | ✓ Yes           |
| `confirmed`  | Event organizer confirmed attendance | ✗ Contact club  |
| `attended`   | Marked present at event              | ✗ Contact club  |
| `cancelled`  | User or organizer cancelled          | Can re-register |

---

### 🔄 Search & Add Members to Team

**Function:** `searchUsersForTeamAction(query, roleId?, eventId?)`

**Filters Out:**

- ✗ Current user (can't add self)
- ✗ Users already registered for this event
- ✗ Users in other teams for this event
- ✗ Inactive users (`account_status !== 'active'`)
- ✗ Users without required role (if `roleId` provided)

**Search Matches:**

- By `full_name` (ilike - case-insensitive)
- By `email` (ilike - case-insensitive)

**Returns:** Up to 20 matching users with: `id`, `full_name`, `email`, `avatar_url`

---

### 📋 Registration State Machine

```
INDIVIDUAL REGISTRATION:
┌─────────────────────────────────────────┐
│ Available (not registered)              │
│ - All validation passed                 │
│ - Button: "Register Now"                │
│ - Click → Insert to event_registrations │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Registered (status='registered')        │
│ - Button: "✓ Registered" (green)        │
│ - Can cancel ✓                          │
│ - Organizer can confirm/mark attended   │
└──────────┬──────────────┬───────────────┘
           │              │
           │ Organizer    │ Member cancels
           │ confirms     │
           ▼              ▼
        Confirmed    Cancelled
      (can't cancel) (can re-register)
           │
           ▼
        Attended
      (certificate eligible)

TEAM REGISTRATION:
┌─────────────────────────────────────────┐
│ Team Registered (status='registered')   │
│ - Members have pending invites          │
│ - Team lead can remove members          │
│ - Member can accept/decline             │
└──────────────┬──────────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
       ▼       ▼       ▼
   Accepted  Declined Pending
   (auto-ok) (opted out) (awaiting)
       │
       ▼ (all accepted)
    Ready to Attend
       │
       ▼ (organizer confirms)
   Team Confirmed
       │
       ▼ (organizer marks attended)
   Team Attended
```

---

### 🔌 Server Actions (App Actions)

**Main Registration Function:**

```javascript
registerForEventAction(eventId, teamData?)
// teamData = { teamName, teamMembers: [ids...] }
// Returns: { success: true } | { error: "message" }
```

**Cancellation:**

```javascript
cancelEventRegistrationAction(eventId);
// Only team leader can cancel team registrations
// Cannot cancel if status is 'confirmed' or 'attended'
```

**Team Invite Response:**

```javascript
respondToTeamInviteAction(registrationId, accept: boolean)
// Non-leader members accept/decline team invites
// Updates event_registration_members status
```

**Get Registration Status:**

```javascript
getMyRegistrationAction(eventId);
// Fetches current user's registration for an event
// Called on page load + after every action
```

---

### 📊 Database Tables

**`event_registrations`**

- `id` (uuid, primary key)
- `event_id` (uuid, foreign key → events)
- `user_id` (uuid, foreign key → users)
- `status` (enum: registered, confirmed, attended, cancelled)
- `team_name` (text, null for individual)
- `team_members` (array, null for individual)
- `registration_data` (JSONB, for guest data)
- `attended` (boolean, default false)
- `certificate_issued` (boolean)
- `registered_at` (timestamp)

**`event_registration_members`** (team member tracking)

- `id` (uuid, primary key)
- `registration_id` (uuid, foreign key → event_registrations)
- `user_id` (uuid, foreign key → users)
- `is_leader` (boolean, true = team lead)
- `status` (enum: pending, accepted, declined)
- `responded_at` (timestamp, null if pending)

---

### ❌ Error Handling

**Registration Blocked If:**

- Event not found
- Event cancelled or not upcoming/ongoing
- Registration deadline passed
- User not eligible (role check failed)
- User already registered
- Event fully booked
- Team size doesn't match event requirement
- Team member not eligible
- Team member already in another registration

**Cancellation Blocked If:**

- Not a team leader (for team regs)
- Status is 'confirmed' or 'attended'
- Registration not found

**All errors returned as:** `{ error: "Human-readable message" }`

- guest_id: string
- status: "verification_sent"
- message: "Check your email to verify"

```

**`POST /events/cancel-registration`** — Cancel Registration

```

Request:

- registration_id: string
- reason?: string

Response:

- status: "cancelled"
- refund_eligible: boolean

```

**`GET /events/[eventId]/registrations`** — Get Registration Status

```

Response:

- registration_status: "registered" | "waitlisted" | "cancelled"
- user_details: object
- team_info?: object (if team member)
- attendance_confirmed: boolean

```

---

### Event Registration Timeline & Notifications

**60 Days Before Event:**

- Event published to `/events`
- Registration opens
- All roles receive: "New event announced: [Name]"

**30 Days Before:**

- ✉️ Email: "Early bird offer - register now!"
- Appears in member dashboards

**14 Days Before:**

- ✉️ Email: "2 weeks until [Event]"
- Team coordinator receives: "Confirm all team members"
- Guest receives: "Don't forget to verify your email"

**7 Days Before:**

- ✉️ Email: "One week left to register"
- Waitlist members: "Spot may open up soon"
- Registered members: "Save the date!"

**24 Hours Before:**

- ✉️ Email: "Event tomorrow! Here's everything you need to know"
- Dashboard shows: "Event tomorrow at [time]"
- Team gets: Team lead can send final message to members

**2 Hours Before:**

- ✉️ SMS/Email: "[Event] starts in 2 hours!"
- Dashboard: Prominent event banner
- Direction link to venue

**Event Day:**

- Check-in dashboard opens
- Staff can scan QR codes
- No-show tracking begins

**24 Hours After:**

- ✉️ Email: Event photos/gallery
- Feedback form link
- "Join our club" offer (for guests)
- Certificate download link

**7 Days After:**

- Attendee survey sent
- Option to discuss experience with mentor

---

**[↑ Back to Top](#-table-of-contents)** | **[View All Sections](#📑-table-of-contents)** | **[Archive Versions](./)**
```
