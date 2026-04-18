# Database

PostgreSQL database managed via Supabase with 45+ tables and Row Level Security (RLS).

---

## Schema Location

All database schema and migrations are managed in the [`/supabase`](/supabase) directory:

```text
supabase/
├── config.toml          # Local Supabase configuration
├── migrations/          # SQL migration files (source of truth)
│   ├── 20260404192226_remote_schema.sql
│   └── 20260404194136_remote_schema.sql
└── README.md            # CLI commands and migration workflow
```

> **Important**: Never modify the database schema directly. Always create migrations using `npx supabase db diff`.

---

## Quick Commands

```bash
# View current schema
npx supabase db dump --local > schema.sql

# Create migration from local changes
npx supabase db diff -f <migration_name>

# Reset database (applies all migrations)
npx supabase db reset

# Push migrations to remote
npx supabase db push
```

See the [Supabase README](/supabase/README.md) for complete CLI reference.

---

## Table Catalogue

### Users & Authentication

| Table              | Description                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `users`            | All users — `id`, `email`, `name`, `avatar_url`, `account_status`, `is_active`, `last_login` |
| `user_roles`       | Maps users to roles (many-to-many)                                                           |
| `roles`            | Role definitions — guest, member, mentor, executive, advisor, admin                          |
| `permissions`      | Permission definitions by category                                                           |
| `role_permissions` | Maps permissions to roles                                                                    |

### Member Profiles

| Table               | Description                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| `member_profiles`   | Extended member info — student ID, batch, department, social links, bio |
| `member_statistics` | Points, contest count, event count, problem count per member            |
| `member_progress`   | Individual progress/milestone records                                   |

### Events

| Table                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `events`              | Event records — slug, category, date, venue, capacity, status, featured |
| `event_registrations` | User registrations — `attended` flag, registered_at                     |
| `event_organizers`    | Organizer assignments per event                                         |
| `event_gallery`       | Gallery items linked to events                                          |

### Contests

| Table                  | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `contests`             | Contest records — platform, slug, official flag, status |
| `contest_participants` | User participations with result/rank data               |

### Blog

| Table           | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| `blog_posts`    | Posts — slug, content (HTML), category, status, featured, view_count |
| `blog_comments` | Comments with approval status                                        |
| `blog_likes`    | User-to-post like associations                                       |

### Achievements

| Table                 | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `achievements`        | Achievement records — year, category, position, platform |
| `member_achievements` | Links members to achievements                            |

### Notices

| Table     | Description                                                           |
| --------- | --------------------------------------------------------------------- |
| `notices` | Club notices — type, content, `is_pinned`, `expires_at`, `view_count` |

### Notifications

| Table           | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `notifications` | Per-user notifications — type, message, `is_read`, created_at |

### Discussions

| Table                   | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `discussion_categories` | Forum categories                                                |
| `discussion_threads`    | Threads — category, content, solved, locked, pinned, view_count |
| `discussion_replies`    | Replies with `parent_reply_id` for nesting, `is_solution`       |
| `discussion_votes`      | User votes on threads and replies (up/down)                     |

### Certificates

| Table          | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| `certificates` | Issued certs — unique `certificate_number`, event, user, issued_at |

### Committee

| Table                 | Description                                  |
| --------------------- | -------------------------------------------- |
| `committee_positions` | Position definitions — name, category, order |
| `committee_members`   | Member assignments to positions per year     |

### Mentorship

| Table                 | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `mentorships`         | Mentor-to-mentee assignments + status                |
| `mentorship_sessions` | Session logs — date, topic, duration, notes, outcome |
| `mentor_notes`        | Private notes per mentor-mentee pair                 |

### Weekly Tasks

| Table              | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `weekly_tasks`     | Tasks created by mentors — title, description, deadline, points |
| `task_submissions` | Member submissions — URL, code, notes, status, feedback         |

### Resources

| Table              | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `resources`        | Learning resources — URL, category, difficulty, free/paid, featured, upvote_count |
| `resource_upvotes` | User-to-resource upvote associations                                              |

### Roadmaps

| Table      | Description                                                               |
| ---------- | ------------------------------------------------------------------------- |
| `roadmaps` | Learning roadmaps — slug, category, content, status, view_count, featured |

### Gallery

| Table           | Description                                               |
| --------------- | --------------------------------------------------------- |
| `gallery_items` | Photos — image_url, title, event link, category, featured |

### Join Requests

| Table           | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| `join_requests` | Public join form submissions — status, reviewed_by, rejection_reason |

### Contact

| Table                 | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `contact_submissions` | Contact form submissions — name, email, message, status |

### Budget

| Table            | Description                                                       |
| ---------------- | ----------------------------------------------------------------- |
| `budget_entries` | Event budget entries — type (income/expense), amount, approved_by |

### Chat

| Table                       | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `conversations`             | Conversation records — type (direct/support/group), status         |
| `conversation_participants` | User memberships in conversations                                  |
| `messages`                  | Message records — content, type (text/file), edited_at, deleted_at |
| `message_reads`             | Read receipts per user per conversation                            |

### Problem Solving

| Table               | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `platforms`         | CP platforms (Codeforces, AtCoder, etc.)             |
| `problems`          | Problem master data (platform, ID, name, difficulty) |
| `problem_tags`      | Many-to-many problem-tag mapping                     |
| `problem_analysis`  | AI analysis (1:1, separate for performance)          |
| `tags`              | Hierarchical problem tags                            |
| `difficulty_tiers`  | Rating-based difficulty levels                       |
| `user_handles`      | User's platform handles with verification status     |
| `submissions`       | Raw submissions from platforms                       |
| `user_solves`       | Aggregated solved problems per user                  |
| `solutions`         | User's solution code                                 |
| `contest_history`   | Contest participation records                        |
| `rating_history`    | Rating changes over time                             |
| `user_stats`        | Global user statistics                               |
| `user_badges`       | Earned badges                                        |
| `badge_definitions` | Badge criteria and rewards                           |
| `sync_jobs`         | Platform sync operations                             |

### Settings & Logs

| Table             | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `settings`        | Key-value site settings by category                   |
| `activity_logs`   | Audit log — user, action, target, metadata, timestamp |
| `security_events` | Security-specific event log                           |

---

## Row Level Security (RLS)

RLS is enabled on every table. The general policy pattern:

| Operation                | Policy                                                                |
| ------------------------ | --------------------------------------------------------------------- |
| SELECT on public data    | `true` (everyone can read published content)                          |
| SELECT on own data       | `auth.uid() = user_id`                                                |
| INSERT / UPDATE / DELETE | Via `supabaseAdmin` in server actions (bypasses RLS for admin writes) |
| Sensitive fields         | Never returned to client — filtered in data-service.js queries        |

> The `supabaseAdmin` client (service role key) is used **only** in server-side code. It is never imported in client components.

---

## Key Relationships

```text
users ──────────────── user_roles ── roles ── role_permissions ── permissions
  │
  ├── member_profiles
  ├── member_statistics
  ├── event_registrations ── events ── event_organizers
  ├── contest_participants ── contests
  ├── blog_posts ── blog_comments
  │              └── blog_likes
  ├── achievements (via member_achievements)
  ├── discussion_threads ── discussion_replies ── discussion_votes
  ├── mentorships ── mentorship_sessions
  │             └── mentor_notes
  ├── task_submissions ── weekly_tasks
  ├── notifications
  ├── certificates ── events
  ├── committee_members ── committee_positions
  ├── conversation_participants ── conversations ── messages
  ├── resource_upvotes ── resources
  ├── budget_entries ── events
  ├── user_handles ── submissions ── user_solves
  └── activity_logs
```

---

## Supabase Storage

| Bucket        | Purpose                                |
| ------------- | -------------------------------------- |
| `blog-images` | Blog post thumbnails and inline images |
| `chat-files`  | File attachments sent via chat         |

Storage hostname is configured in `next.config.mjs` under `remotePatterns`.

---

## Useful SQL Snippets

```sql
-- Make the first user an admin
UPDATE users SET account_status = 'active' WHERE email = 'your@email.com';
INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, r.id FROM users u, roles r
  WHERE u.email = 'your@email.com' AND r.name = 'admin';

-- Check all role assignments
SELECT u.email, r.name AS role
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
ORDER BY u.email;

-- Pending membership applications
SELECT * FROM join_requests WHERE status = 'pending' ORDER BY created_at;

-- Platform stats
SELECT
  (SELECT COUNT(*) FROM users WHERE account_status = 'active') AS active_users,
  (SELECT COUNT(*) FROM events WHERE status = 'published') AS published_events,
  (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') AS published_blogs;
```

---

## Problem Solving Module

The problem-solving schema is designed with **3NF normalization** and **performance optimization**.

### Design Principles

| Principle                | Implementation                                                 |
| ------------------------ | -------------------------------------------------------------- |
| 3NF Normalization        | No redundant data, proper foreign keys, separate lookup tables |
| Performance Indexes      | Composite indexes for common query patterns                    |
| Efficient Data Types     | `SMALLINT` for IDs/ratings, `SMALLSERIAL` for lookup tables    |
| Minimal JSONB            | Only for truly dynamic data (badge criteria, metadata)         |
| Separate Analysis Tables | AI analysis in 1:1 tables for faster core queries              |

### Key Indexes

```sql
-- High-frequency queries
idx_submissions_user_submitted    -- User's recent submissions
idx_user_solves_user_solved       -- User's solved problems
idx_user_daily_activity_user_date -- Heatmap data
idx_contest_history_user_date     -- Contest history

-- Leaderboard queries
idx_leaderboard_global            -- Global ranking
idx_leaderboard_total_score       -- Score-based sorting

-- Sync operations
idx_sync_jobs_pending             -- Pending job queue
```

### Database Triggers

| Trigger                            | Purpose                                     |
| ---------------------------------- | ------------------------------------------- |
| `trg_user_solves_insert`           | Updates `user_stats` on new solve           |
| `trg_daily_activity_on_solve`      | Updates `user_daily_activity` on solve      |
| `trg_daily_activity_on_submission` | Updates `user_daily_activity` on submission |

### Database Views

| View                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `v_user_solved_problems`  | User's solved problems with full details |
| `v_user_activity_summary` | 30-day activity summary                  |
| `v_leaderboard`           | Leaderboard with user info               |

---

## Related Documentation

- [Local Supabase Setup](../getting-started/local-supabase.md) — Run database locally
- [Supabase CLI Reference](/supabase/README.md) — Commands and migration workflow
- [Architecture Overview](../architecture/index.md) — How data flows through the app
