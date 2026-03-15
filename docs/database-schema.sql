-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.account_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_messages_pkey PRIMARY KEY (id),
  CONSTRAINT account_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT account_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  contest_name text NOT NULL,
  contest_url text,
  result text NOT NULL,
  year integer NOT NULL,
  category text,
  description text,
  achievement_date date,
  participants ARRAY,
  is_team boolean DEFAULT false,
  team_name text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  gallery_images jsonb DEFAULT '[]'::jsonb,
  featured_photo jsonb,
  platform text,
  profile_url text,
  is_featured boolean NOT NULL DEFAULT false,
  CONSTRAINT achievements_pkey PRIMARY KEY (id),
  CONSTRAINT achievements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.admin_profiles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT admin_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.advisor_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  position text,
  profile_link text,
  department text DEFAULT 'Computer Science & Engineering'::text,
  CONSTRAINT advisor_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.blog_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blog_comments_pkey PRIMARY KEY (id),
  CONSTRAINT blog_comments_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blog_posts(id),
  CONSTRAINT blog_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT blog_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.blog_comments(id)
);
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  thumbnail text,
  author_id uuid NOT NULL,
  category text CHECK (category = ANY (ARRAY['CP'::text, 'WebDev'::text, 'AI-ML'::text, 'Career'::text, 'News'::text, 'Tutorial'::text, 'Programming'::text, 'Other'::text])),
  tags ARRAY,
  read_time integer,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
  published_at timestamp with time zone,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id),
  CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);
CREATE TABLE public.budget_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  amount numeric NOT NULL,
  entry_type text NOT NULL CHECK (entry_type = ANY (ARRAY['income'::text, 'expense'::text])),
  category text,
  event_id uuid,
  transaction_date date NOT NULL,
  receipt_url text,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budget_entries_pkey PRIMARY KEY (id),
  CONSTRAINT budget_entries_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT budget_entries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id),
  CONSTRAINT budget_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  certificate_number text NOT NULL UNIQUE,
  recipient_id uuid NOT NULL,
  event_id uuid,
  contest_id uuid,
  achievement_id uuid,
  title text NOT NULL,
  description text,
  certificate_type text DEFAULT 'participation'::text CHECK (certificate_type = ANY (ARRAY['participation'::text, 'completion'::text, 'achievement'::text, 'appreciation'::text])),
  certificate_url text,
  issue_date date NOT NULL,
  issued_by uuid,
  verified boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT certificates_pkey PRIMARY KEY (id),
  CONSTRAINT certificates_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id),
  CONSTRAINT certificates_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT certificates_contest_id_fkey FOREIGN KEY (contest_id) REFERENCES public.contests(id),
  CONSTRAINT certificates_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id),
  CONSTRAINT certificates_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id)
);
CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct'::text CHECK (type = ANY (ARRAY['direct'::text, 'support'::text])),
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'archived'::text])),
  subject text,
  created_by uuid NOT NULL,
  assigned_to uuid,
  last_message_at timestamp with time zone,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT chat_conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT chat_conversations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id)
);
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text'::text CHECK (message_type = ANY (ARRAY['text'::text, 'system'::text, 'image'::text, 'file'::text])),
  metadata jsonb,
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_conversation_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id),
  CONSTRAINT chat_messages_sender_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.chat_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamp with time zone,
  last_read_message_id uuid,
  is_muted boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_participants_pkey PRIMARY KEY (id),
  CONSTRAINT chat_participants_conversation_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id),
  CONSTRAINT chat_participants_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT chat_participants_last_read_message_fkey FOREIGN KEY (last_read_message_id) REFERENCES public.chat_messages(id)
);
CREATE TABLE public.committee_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_id uuid NOT NULL,
  term_start date NOT NULL,
  term_end date,
  is_current boolean DEFAULT true,
  bio text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT committee_members_pkey PRIMARY KEY (id),
  CONSTRAINT committee_members_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.committee_positions(id),
  CONSTRAINT committee_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.committee_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text CHECK (category = ANY (ARRAY['executive'::text, 'mentor'::text, 'advisor'::text])),
  display_order integer DEFAULT 0,
  responsibilities text,
  created_at timestamp with time zone DEFAULT now(),
  rank integer DEFAULT 99,
  CONSTRAINT committee_positions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contact_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'read'::text, 'replied'::text, 'archived'::text])),
  replied_by uuid,
  replied_at timestamp with time zone,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT contact_submissions_replied_by_fkey FOREIGN KEY (replied_by) REFERENCES public.users(id)
);
CREATE TABLE public.contest_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rank integer,
  score numeric,
  problems_solved integer,
  performance_data jsonb,
  registered_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contest_participants_pkey PRIMARY KEY (id),
  CONSTRAINT contest_participants_contest_id_fkey FOREIGN KEY (contest_id) REFERENCES public.contests(id),
  CONSTRAINT contest_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.contests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  platform text,
  contest_url text,
  start_time timestamp with time zone NOT NULL,
  duration integer NOT NULL,
  type text DEFAULT 'individual'::text CHECK (type = ANY (ARRAY['individual'::text, 'team'::text])),
  division text,
  status text DEFAULT 'upcoming'::text CHECK (status = ANY (ARRAY['upcoming'::text, 'running'::text, 'finished'::text])),
  is_official boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contests_pkey PRIMARY KEY (id),
  CONSTRAINT contests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.discussion_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.discussion_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid,
  is_solution boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_replies_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_replies_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.discussion_threads(id),
  CONSTRAINT discussion_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id),
  CONSTRAINT discussion_replies_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.discussion_replies(id)
);
CREATE TABLE public.discussion_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL,
  tags ARRAY,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_solved boolean DEFAULT false,
  views integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_threads_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_threads_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.discussion_categories(id),
  CONSTRAINT discussion_threads_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);
CREATE TABLE public.discussion_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid,
  reply_id uuid,
  vote_type text NOT NULL CHECK (vote_type = ANY (ARRAY['up'::text, 'down'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_votes_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT discussion_votes_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.discussion_threads(id),
  CONSTRAINT discussion_votes_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.discussion_replies(id)
);
CREATE TABLE public.event_gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  url text NOT NULL,
  type text DEFAULT 'image'::text CHECK (type = ANY (ARRAY['image'::text, 'video'::text])),
  caption text,
  display_order integer DEFAULT 0,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_gallery_pkey PRIMARY KEY (id),
  CONSTRAINT event_gallery_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_gallery_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.event_organizers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_organizers_pkey PRIMARY KEY (id),
  CONSTRAINT event_organizers_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_organizers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.event_registration_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_leader boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  responded_at timestamp with time zone,
  CONSTRAINT event_registration_members_pkey PRIMARY KEY (id),
  CONSTRAINT event_registration_members_reg_fkey FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id),
  CONSTRAINT event_registration_members_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.event_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  team_name text,
  team_members ARRAY,
  registration_data jsonb,
  status text DEFAULT 'registered'::text CHECK (status = ANY (ARRAY['registered'::text, 'confirmed'::text, 'cancelled'::text, 'attended'::text])),
  attended boolean DEFAULT false,
  certificate_issued boolean DEFAULT false,
  registered_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  content text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  location text NOT NULL,
  venue_type text DEFAULT 'offline'::text CHECK (venue_type = ANY (ARRAY['online'::text, 'offline'::text, 'hybrid'::text])),
  cover_image text,
  banner_image text,
  registration_url text,
  external_url text,
  category text CHECK (category = ANY (ARRAY['Workshop'::text, 'Contest'::text, 'Seminar'::text, 'Bootcamp'::text, 'Hackathon'::text, 'Meetup'::text, 'Other'::text])),
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'upcoming'::text, 'ongoing'::text, 'completed'::text, 'cancelled'::text])),
  max_participants integer,
  registration_required boolean DEFAULT false,
  registration_deadline timestamp with time zone,
  is_featured boolean DEFAULT false,
  tags ARRAY,
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  eligibility text DEFAULT 'all'::text,
  prerequisites text,
  participation_type text DEFAULT 'individual'::text CHECK (participation_type = ANY (ARRAY['individual'::text, 'team'::text])),
  team_size integer,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT events_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);
CREATE TABLE public.gallery_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  url text NOT NULL,
  type text DEFAULT 'image'::text CHECK (type = ANY (ARRAY['image'::text, 'video'::text])),
  caption text,
  event_id uuid,
  category text,
  tags ARRAY,
  display_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gallery_items_pkey PRIMARY KEY (id),
  CONSTRAINT gallery_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT gallery_items_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  student_id text NOT NULL,
  batch text NOT NULL,
  department text NOT NULL,
  phone text,
  interests text,
  codeforces_handle text,
  github text,
  reason text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.journey_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year text NOT NULL,
  event text NOT NULL,
  icon text NOT NULL DEFAULT '🎯'::text,
  description text,
  display_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT journey_items_pkey PRIMARY KEY (id),
  CONSTRAINT journey_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.member_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  achievement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  position text,
  CONSTRAINT member_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT member_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id),
  CONSTRAINT member_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.member_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  student_id text NOT NULL UNIQUE,
  academic_session text NOT NULL,
  department text NOT NULL,
  semester text,
  cgpa numeric,
  interests ARRAY,
  linkedin text,
  github text,
  codeforces_handle text,
  vjudge_handle text,
  atcoder_handle text,
  leetcode_handle text,
  skills ARRAY,
  bio text,
  join_reason text,
  approved boolean,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT member_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT member_profiles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id),
  CONSTRAINT member_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.member_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  problems_solved integer DEFAULT 0,
  contests_participated integer DEFAULT 0,
  rating_change integer,
  mentor_notes text,
  self_assessment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT member_progress_pkey PRIMARY KEY (id),
  CONSTRAINT member_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.member_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL UNIQUE,
  total_contests integer DEFAULT 0,
  total_problems_solved integer DEFAULT 0,
  codeforces_rating integer,
  codeforces_max_rating integer,
  vjudge_solved integer,
  atcoder_rating integer,
  leetcode_rating integer,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT member_statistics_pkey PRIMARY KEY (id),
  CONSTRAINT member_statistics_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member_profiles(id)
);
CREATE TABLE public.mentor_profiles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mentor_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT mentor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.mentorship_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mentorship_id uuid NOT NULL,
  session_date timestamp with time zone NOT NULL,
  duration integer,
  topic text,
  notes text,
  attended boolean DEFAULT false,
  feedback text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mentorship_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT mentorship_sessions_mentorship_id_fkey FOREIGN KEY (mentorship_id) REFERENCES public.mentorships(id),
  CONSTRAINT mentorship_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.mentorships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'paused'::text, 'cancelled'::text])),
  focus_area text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mentorships_pkey PRIMARY KEY (id),
  CONSTRAINT mentorships_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(id),
  CONSTRAINT mentorships_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(id)
);
CREATE TABLE public.notices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  notice_type text DEFAULT 'general'::text CHECK (notice_type = ANY (ARRAY['general'::text, 'urgent'::text, 'event'::text, 'deadline'::text, 'achievement'::text])),
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  target_audience ARRAY,
  is_pinned boolean DEFAULT false,
  expires_at timestamp with time zone,
  attachments ARRAY,
  created_by uuid NOT NULL,
  views integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notices_pkey PRIMARY KEY (id),
  CONSTRAINT notices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text CHECK (notification_type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text, 'event'::text, 'mention'::text, 'achievement'::text])),
  link text,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.participation_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  contest_name text NOT NULL,
  contest_url text,
  category text,
  year integer NOT NULL,
  participation_date date,
  result text,
  is_team boolean NOT NULL DEFAULT false,
  team_name text,
  team_members jsonb DEFAULT '[]'::jsonb,
  achievement_id uuid,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  photos jsonb DEFAULT '[]'::jsonb,
  featured_photo jsonb,
  CONSTRAINT participation_records_pkey PRIMARY KEY (id),
  CONSTRAINT participation_records_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id),
  CONSTRAINT participation_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT participation_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.resources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  resource_type text DEFAULT 'article'::text CHECK (resource_type = ANY (ARRAY['article'::text, 'video'::text, 'course'::text, 'book'::text, 'tool'::text, 'documentation'::text, 'other'::text])),
  category text NOT NULL,
  difficulty text CHECK (difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  tags ARRAY,
  thumbnail text,
  is_free boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resources_pkey PRIMARY KEY (id),
  CONSTRAINT resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.roadmaps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty text DEFAULT 'beginner'::text CHECK (difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  thumbnail text,
  content jsonb,
  estimated_duration text,
  prerequisites ARRAY,
  created_by uuid,
  views integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roadmaps_pkey PRIMARY KEY (id),
  CONSTRAINT roadmaps_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name = ANY (ARRAY['guest'::text, 'member'::text, 'executive'::text, 'admin'::text, 'mentor'::text, 'advisor'::text])),
  description text,
  priority integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.task_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  submission_url text,
  code text,
  notes text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'late'::text, 'missed'::text])),
  reviewed_by uuid,
  feedback text,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.weekly_tasks(id),
  CONSTRAINT task_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT task_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  avatar_url text DEFAULT 'https://robohash.org/30d749d7-64e1-4f5f-a781-c2d5c238e0f5.png?set=set4'::text,
  email_verified boolean DEFAULT false,
  verification_token text,
  reset_token text,
  reset_token_expires timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  provider text DEFAULT 'google'::text,
  account_status text NOT NULL DEFAULT 'inActive'::text CHECK (account_status = ANY (ARRAY['active'::text, 'inActive'::text, 'rejected'::text, 'pending'::text, 'suspended'::text, 'banned'::text, 'locked'::text])),
  status_changed_at timestamp with time zone,
  status_changed_by uuid DEFAULT '4d4f226e-3324-4680-936e-25c8e4aa41df'::uuid,
  suspension_expires_at timestamp with time zone,
  phone_verified boolean DEFAULT false,
  status_reason text,
  is_online boolean DEFAULT false,
  last_seen timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_status_changed_by_fkey FOREIGN KEY (status_changed_by) REFERENCES public.users(id)
);
CREATE TABLE public.website_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  category text,
  description text,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT website_settings_pkey PRIMARY KEY (id),
  CONSTRAINT website_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);
CREATE TABLE public.weekly_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  difficulty text DEFAULT 'medium'::text CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  problem_links ARRAY,
  deadline timestamp with time zone NOT NULL,
  assigned_by uuid NOT NULL,
  target_audience text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT weekly_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id)
);