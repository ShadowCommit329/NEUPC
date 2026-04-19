# Feature Modules

Every feature in NEUPC, the roles that access it, and the server actions that power it.

---

## Public Website

All public pages are server-rendered with ISR caching via `public-actions.js`. No authentication required.

| Route | Description | Data source |
|---|---|---|
| `/` | Homepage — featured events, blogs, achievements, club stats | `public-actions.js` |
| `/events` + `/events/[slug]` | Published events list and detail with registration | `public-actions.js` |
| `/blogs` + `/blogs/[slug]` | Blog posts with Giscus comments and syntax highlighting | `public-actions.js` |
| `/achievements` | Club awards — filter by year, category | `public-actions.js` |
| `/committee` | Current committee positions and members | `public-actions.js` |
| `/gallery` | Photo albums — filter by event, category | `public-actions.js` |
| `/roadmaps` + `/roadmaps/[slug]` | Learning path roadmaps | `public-actions.js` |
| `/join` | Membership application form | `guest-actions.js` |
| `/contact` | Contact form with email notification | `contact-actions.js` |

---

## Blog & Content Management

**Roles:** Executive (own posts), Admin (all posts)

**Editor:** TipTap v3 with StarterKit, TextAlign, Highlight, Color, Link, Image, CodeBlockLowlight, CharacterCount, Typography, Placeholder.

| Feature | Description |
|---|---|
| Create / edit posts | Title, slug (auto-generated), excerpt, thumbnail, category, tags |
| Rich text editor | Full WYSIWYG with syntax highlighting, tables, images, code blocks |
| Status control | Draft → Published toggle |
| Featured toggle | Pins post to homepage featured section |
| View / like tracking | Automatic view count, user like toggle |
| Comment moderation | Approve, reject, delete, bulk actions |

**Server actions:** `blog-actions.js`, `executive-actions.js`

---

## Events

**Roles:** Executive (create/manage), Admin (all), Member/Guest (register)

| Feature | Description |
|---|---|
| Create / edit events | Title, slug, category, date range, venue, capacity, registration deadline |
| Registration | Member registration with attendance tracking |
| Organizer assignment | Multiple organizers per event |
| Gallery linkage | Link gallery items to events |
| Status control | Draft → Published → Completed |

**Server actions:** `event-actions.js`, `member-events-actions.js`

---

## Problem Solving Tracker

**Roles:** Member (own data), Admin (all users)

The core feature of the platform. Tracks submissions across 41+ competitive programming platforms.

| Feature | Description |
|---|---|
| Platform handles | Connect handles for 41+ platforms with verification |
| Auto-sync | Browser extension captures submissions in real time |
| Manual sync | "Sync All Platforms" button triggers full platform sync |
| Submission history | All submissions with verdict, language, runtime, memory |
| Rating history | Rating changes over time per platform |
| Contest history | Contest participation with rank, score, problem breakdown |
| Leaderboard | Club-wide ranking by solved count, rating, activity |
| AI analysis | Per-solution AI analysis (complexity, approach, improvements) |
| Problem tags | Tag-based filtering and browsing |
| Daily activity | Heatmap of daily problem-solving activity |
| Statistics | Total solved, acceptance rate, platform distribution |

**Supported platforms:** Codeforces, AtCoder, LeetCode, Toph, CSES, CodeChef, TopCoder, HackerRank, Kattis, LightOJ, UVA, SPOJ, VJudge, CS Academy, E-Olymp, USACO, DMOJ, HackerEarth, Beecrowd, BAPSOJ, DimiKOJ, LOJ, COJ, Timus, ACMP, Codewars, Exercism, Project Euler, Google Code Jam, Facebook Hacker Cup, LeetCode CN, Luogu, ACWing, POJ, HDU, ZOJ, BZOJ, 51NOD, AIZU, Yosupo Judge, Library Checker

**Server actions:** `problem-solving-actions.js`, `problem-solving-services.js`  
**API routes:** `app/api/problem-solving/` (32+ endpoints)

---

## Browser Extension

Chrome and Firefox extension that auto-syncs submissions from 41+ platforms to NEUPC.

| Feature | Description |
|---|---|
| Auto-detect | Detects submission pages automatically |
| Real-time sync | Sends submission data to NEUPC immediately after judging |
| Bulk import | Import full submission history from supported platforms |
| Token auth | Secure token-based authentication tied to user account |
| Local caching | Prevents duplicate submissions with local deduplication |

See [Browser Extension README](../../browser-extension/README.md) for installation and platform list.

---

## Real-Time Chat

**Roles:** All authenticated users

| Feature | Description |
|---|---|
| Direct messages | One-on-one conversations |
| Support chat | Member-to-executive/admin support channel |
| Group conversations | Multi-participant conversations |
| File attachments | File sharing within conversations |
| Read receipts | Per-user read tracking |
| Message editing | Edit and delete sent messages |

Powered by **Supabase Realtime** — live updates without polling.

**Server actions:** `chat-actions.js`

---

## Mentorship

**Roles:** Mentor (manage mentees), Member (view own mentorship)

| Feature | Description |
|---|---|
| Assignments | Admin/Advisor assigns mentors to members |
| Session logs | Mentors log sessions — date, topic, duration, notes, outcome |
| Weekly tasks | Mentors assign tasks with deadlines and point values |
| Task submissions | Members submit task solutions with URL, code, notes |
| Feedback | Mentors review and score submissions |
| Private notes | Mentor-only notes per mentee |
| Recommendations | Mentors write recommendations for mentees |

**Server actions:** `mentor-actions.js`, `member-tasks-actions.js`

---

## Discussion Forum

**Roles:** All authenticated users

| Feature | Description |
|---|---|
| Thread creation | Create threads in categorized forums |
| Nested replies | Multi-level reply threads |
| Voting | Upvote/downvote threads and replies |
| Solution marking | Mark a reply as the accepted solution |
| Pin / lock | Executive and Admin can pin or lock threads |
| Categories | Configurable discussion categories |

**Server actions:** `discussion-actions.js`

---

## Certificates

**Roles:** Executive (issue), Member (view own)

| Feature | Description |
|---|---|
| Issue certificates | Linked to specific events with unique certificate numbers |
| Verification | Public certificate verification by certificate number |
| PDF generation | Downloadable certificate files |

**Server actions:** `event-actions.js`, `executive-actions.js`

---

## Resources

**Roles:** Mentor/Executive (create), All authenticated (browse, upvote)

| Feature | Description |
|---|---|
| Resource library | Links with title, description, URL, category, difficulty, free/paid |
| Upvoting | Community upvotes surface the best resources |
| Featured toggle | Admin/Mentor can feature resources |
| Filtering | Filter by category, difficulty, free/paid, platform |

**Server actions:** `resource-actions.js`, `member-resources-actions.js`

---

## Roadmaps

**Roles:** Executive/Admin (create/edit), All (browse)

| Feature | Description |
|---|---|
| Learning paths | Structured roadmaps with rich content |
| Categories | Organized by topic/skill area |
| View tracking | Automatic view count |
| Featured toggle | Surface on homepage |

**Server actions:** `roadmap-actions.js`

---

## Achievements

**Roles:** Executive/Admin (create), All (browse)

| Feature | Description |
|---|---|
| Achievement records | Contest name, result, year, category, participants |
| Team achievements | Support for team and individual achievements |
| Year/category filter | Filter on public achievement page |
| Member linking | Link achievements to member profiles |

**Server actions:** `achievement-actions.js`

---

## Gallery

**Roles:** Executive (upload), All (browse)

| Feature | Description |
|---|---|
| Photo uploads | Images with caption, category, event linkage |
| Featured toggle | Featured items on homepage |
| Event filtering | Filter by associated event |
| Display order | Manual ordering control |

**Server actions:** `gallery-actions.js`

---

## Bootcamps

**Roles:** Admin (create/manage), Member (enroll/view)

| Feature | Description |
|---|---|
| Bootcamp programs | Structured learning programs with modules |
| Enrollment | Members enroll in bootcamps |
| Progress tracking | Track completion per module |

**Server actions:** `bootcamp-actions.js`

---

## Notices

**Roles:** Executive/Admin (create), All authenticated (view)

| Feature | Description |
|---|---|
| Club notices | Pinnable announcements with expiry dates |
| Priority levels | Normal, urgent, critical |
| View tracking | Automatic view count |

**Server actions:** `notice-actions.js`

---

## Budget Management

**Roles:** Executive (create entries), Advisor/Admin (approve)

| Feature | Description |
|---|---|
| Income/expense tracking | Per-event budget entries |
| Approval workflow | Advisor approval for expenses |
| Reports | Budget summary by event |

**Server actions:** `executive-actions.js`

---

## Admin Back-Office

**Role:** Admin only

| Section | Description |
|---|---|
| Users | View, activate, deactivate, manage roles |
| Applications | Review and approve/reject join requests |
| Roles | Manage role definitions and permissions |
| Security | Security event log, suspicious activity |
| Settings | Site-wide key-value settings |
| System Logs | Full audit trail of all actions |
| Export | Export users, events, blogs, contacts, activity logs as CSV |
| Analytics | Traffic, engagement, member stats |
| Problem Solving Extraction | Admin-level sync and data tools |
| All content modules | Full access to blogs, events, gallery, committee, roadmaps, resources, bootcamps, achievements, notices, discussions |

**Server actions:** `admin-actions.js`, `export-actions.js`, `role-actions.js`, `settings-actions.js`

---

## Analytics & Logging

| Feature | Description | Where |
|---|---|---|
| Page view tracking | Tracks views on public pages | `analytics-service.js` |
| Event tracking | Custom analytics events | `analytics-service.js` |
| Activity log | Full audit trail of user actions | `helpers.js → activity_logs` |
| Security events | Auth failures, suspicious activity | `security-service.js` |
| System logs | Internal system events | `system-logs-service.js` |
