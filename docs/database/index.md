# Database

PostgreSQL managed via Supabase with 45+ tables and Row Level Security (RLS) on every table.

---

## Schema Management

Schema is managed via the Supabase cloud project. The `/supabase` directory holds local configuration only.

```bash
# Pull remote schema to local
npx supabase db pull

# Create a migration from local changes
npx supabase db diff -f <migration_name>

# Push migrations to remote
npx supabase db push
```

See [Local Supabase Setup](../getting-started/local-supabase.md) for the full workflow.

---

## Table Catalogue

### Users & Auth

| Table | Key columns | Description |
|---|---|---|
| `users` | `id`, `email`, `full_name`, `avatar_url`, `account_status`, `is_active`, `last_login` | All users |
| `user_roles` | `user_id`, `role_id` | Many-to-many role assignments |
| `roles` | `name`, `description` | guest, member, mentor, executive, advisor, admin |
| `permissions` | `name`, `category` | Permission definitions |
| `role_permissions` | `role_id`, `permission_id` | Maps permissions to roles |

`account_status` values: `pending` | `active` | `inactive` | `banned`

### Member Profiles

| Table | Key columns | Description |
|---|---|---|
| `member_profiles` | `user_id`, `student_id`, `batch`, `department`, `bio`, `social_links` | Extended member info |
| `member_statistics` | `user_id`, `points`, `contest_count`, `event_count`, `problem_count` | Aggregated stats |
| `member_progress` | `user_id`, `milestone`, `completed_at` | Individual milestone records |

### Events

| Table | Key columns | Description |
|---|---|---|
| `events` | `slug`, `category`, `start_date`, `end_date`, `venue`, `capacity`, `status`, `is_featured` | Event records |
| `event_registrations` | `event_id`, `user_id`, `attended` | User registrations |
| `event_organizers` | `event_id`, `user_id` | Organizer assignments |
| `event_gallery` | `event_id`, `gallery_item_id` | Gallery linkage |

`status` values: `draft` | `published` | `completed` | `cancelled`

### Blog

| Table | Key columns | Description |
|---|---|---|
| `blog_posts` | `slug`, `title`, `content` (HTML), `category`, `status`, `is_featured`, `views` | Posts |
| `blog_comments` | `post_id`, `user_id`, `content`, `status` | Comments with approval |
| `blog_likes` | `post_id`, `user_id` | Like associations |

### Achievements

| Table | Key columns | Description |
|---|---|---|
| `achievements` | `title`, `contest_name`, `result`, `year`, `category`, `is_team` | Achievement records |
| `member_achievements` | `achievement_id`, `user_id` | Links members to achievements |

### Notices & Notifications

| Table | Key columns | Description |
|---|---|---|
| `notices` | `title`, `notice_type`, `priority`, `is_pinned`, `expires_at`, `views` | Club notices |
| `notifications` | `user_id`, `type`, `message`, `is_read`, `created_at` | Per-user notifications |

### Discussions

| Table | Key columns | Description |
|---|---|---|
| `discussion_categories` | `name`, `slug`, `order` | Forum categories |
| `discussion_threads` | `category_id`, `title`, `content`, `solved`, `locked`, `pinned`, `view_count` | Threads |
| `discussion_replies` | `thread_id`, `parent_reply_id`, `content`, `is_solution` | Nested replies |
| `discussion_votes` | `thread_id` or `reply_id`, `user_id`, `vote` | Up/down votes |

### Mentorship

| Table | Key columns | Description |
|---|---|---|
| `mentorships` | `mentor_id`, `mentee_id`, `status`, `started_at` | Assignments |
| `mentorship_sessions` | `mentorship_id`, `date`, `topic`, `duration`, `outcome` | Session logs |
| `mentor_notes` | `mentorship_id`, `content` | Private mentor notes |
| `weekly_tasks` | `mentor_id`, `title`, `description`, `deadline`, `points` | Tasks |
| `task_submissions` | `task_id`, `user_id`, `url`, `code`, `status`, `score`, `feedback` | Submissions |

### Resources & Roadmaps

| Table | Key columns | Description |
|---|---|---|
| `resources` | `title`, `url`, `resource_type`, `category`, `difficulty`, `is_free`, `upvotes` | Learning resources |
| `resource_upvotes` | `resource_id`, `user_id` | Upvote associations |
| `roadmaps` | `slug`, `title`, `category`, `content`, `status`, `view_count`, `is_featured` | Roadmaps |

### Certificates & Committee

| Table | Key columns | Description |
|---|---|---|
| `certificates` | `certificate_number`, `event_id`, `user_id`, `issued_at` | Issued certificates |
| `committee_positions` | `name`, `category`, `order` | Position definitions |
| `committee_members` | `position_id`, `user_id`, `year` | Year-based assignments |

### Chat

| Table | Key columns | Description |
|---|---|---|
| `conversations` | `type` (direct/support/group), `status` | Conversation records |
| `conversation_participants` | `conversation_id`, `user_id` | Memberships |
| `messages` | `conversation_id`, `user_id`, `content`, `type`, `edited_at`, `deleted_at` | Messages |
| `message_reads` | `conversation_id`, `user_id`, `last_read_at` | Read receipts |

### Problem Solving

| Table | Key columns | Description |
|---|---|---|
| `platforms` | `name`, `slug`, `url`, `color` | CP platform registry |
| `problems` | `platform_id`, `external_id`, `title`, `difficulty`, `url` | Problem master data |
| `tags` | `name`, `parent_id` | Hierarchical problem tags |
| `problem_tags` | `problem_id`, `tag_id` | Many-to-many mapping |
| `problem_analysis` | `problem_id`, `analysis` (JSON), `ai_status` | AI analysis (1:1 with problems) |
| `user_handles` | `user_id`, `platform_id`, `handle`, `verified`, `rating` | Platform handles |
| `submissions` | `user_id`, `platform_id`, `external_submission_id`, `verdict`, `language`, `submitted_at` | Raw submissions |
| `user_solves` | `user_id`, `problem_id`, `first_solved_at`, `best_time_ms` | Aggregated solved problems |
| `solutions` | `user_id`, `problem_id`, `source_code`, `language`, `version_number` | Solution code |
| `contest_history` | `user_id`, `platform_id`, `contest_name`, `rank`, `rating_change`, `problems_data` | Contest records |
| `rating_history` | `user_id`, `platform_id`, `rating`, `recorded_at` | Rating over time |
| `user_stats` | `user_id`, `total_solved`, `total_submissions`, `acceptance_rate` | Global stats |
| `sync_jobs` | `user_id`, `platform_id`, `status`, `started_at`, `completed_at` | Sync job queue |

### Other

| Table | Key columns | Description |
|---|---|---|
| `join_requests` | `email`, `student_id`, `status`, `reviewed_by`, `rejection_reason` | Membership applications |
| `contact_submissions` | `name`, `email`, `subject`, `message`, `status`, `ip_address` | Contact form |
| `budget_entries` | `event_id`, `type` (income/expense), `amount`, `approved_by` | Event budget |
| `gallery_items` | `url`, `caption`, `category`, `is_featured`, `display_order` | Photo gallery |
| `settings` | `key`, `value`, `category` | Site-wide key-value settings |
| `activity_logs` | `user_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `created_at` | Full audit trail |
| `security_events` | `user_id`, `event_type`, `severity`, `details`, `created_at` | Security event log |

---

## Row Level Security (RLS)

RLS is enabled on every table. General policy pattern:

| Operation | Policy |
|---|---|
| SELECT on public data | `true` — anyone can read published content |
| SELECT on own data | `auth.uid() = user_id` |
| INSERT / UPDATE / DELETE | Via `supabaseAdmin` in server actions only |

`supabaseAdmin` (service role key) is used **only** in server-side code (`_lib/`). It is never imported in any component or page file.

---

## Key Relationships

```text
users
  ├── user_roles ──────── roles ── role_permissions ── permissions
  ├── member_profiles, member_statistics, member_progress
  ├── event_registrations ─── events ─── event_organizers
  ├── blog_posts ─── blog_comments, blog_likes
  ├── discussion_threads ─── discussion_replies ─── discussion_votes
  ├── mentorships ─── mentorship_sessions, mentor_notes
  ├── task_submissions ─── weekly_tasks
  ├── conversation_participants ─── conversations ─── messages ─── message_reads
  ├── user_handles ─── submissions ─── user_solves ─── solutions
  ├── contest_history, rating_history, user_stats
  ├── certificates ─── events
  ├── member_achievements ─── achievements
  ├── resource_upvotes ─── resources
  ├── notifications
  └── activity_logs, security_events
```

---

## Database Triggers

| Trigger | Table | Purpose |
|---|---|---|
| `trg_user_solves_insert` | `user_solves` | Updates `user_stats` on new solve |
| `trg_daily_activity_on_solve` | `user_solves` | Updates `user_daily_activity` heatmap |
| `trg_daily_activity_on_submission` | `submissions` | Updates `user_daily_activity` on submission |

---

## Useful SQL

```sql
-- Promote a user to admin
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

-- Club stats snapshot
SELECT
  (SELECT COUNT(*) FROM users WHERE account_status = 'active') AS active_users,
  (SELECT COUNT(*) FROM events WHERE status = 'published')     AS published_events,
  (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') AS published_blogs,
  (SELECT COUNT(*) FROM submissions)                           AS total_submissions;

-- Pending join requests
SELECT full_name, email, student_id, batch, created_at
FROM join_requests
WHERE status = 'pending'
ORDER BY created_at;
```

---

## Supabase Storage

| Bucket | Purpose |
|---|---|
| `blog-images` | Blog post thumbnails and inline images |
| `chat-files` | File attachments in chat conversations |

Storage hostnames are configured in `next.config.mjs` under `remotePatterns`.
