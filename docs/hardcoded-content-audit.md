# Hardcoded Content Audit Report

> **Scope:** All public-facing pages and shared components in the Next.js app.  
> **Goal:** Identify user-visible text/data that should be controllable from admin settings.  
> **Excludes:** Generic UI labels (`Submit`, `Loading…`, `Go Back`, `Go Home`, etc.), structural CSS, and internal/admin pages.

---

## Table of Contents

1. [CRITICAL — Site-Wide Identity](#1-critical--site-wide-identity)
2. [HIGH — Homepage Section Headers](#2-high--homepage-section-headers)
3. [HIGH — Page Hero Sections](#3-high--page-hero-sections)
4. [HIGH — CTA Sections](#4-high--cta-sections)
5. [MEDIUM — Default Fallback Data Constants](#5-medium--default-fallback-data-constants)
6. [MEDIUM — Page Section Content](#6-medium--page-section-content)
7. [LOW — Legal Pages](#7-low--legal-pages)
8. [LOW — Structural & Navigation](#8-low--structural--navigation)
9. [Architectural Recommendations](#9-architectural-recommendations)
10. [Summary Statistics](#10-summary-statistics)

---

## Legend

| Column | Meaning |
|--------|---------|
| **File** | Workspace-relative path |
| **Line(s)** | Approximate line numbers |
| **Hardcoded Value** | Exact text or data structure |
| **Settings Key** | `EXISTING` = already in `DEFAULT_SETTINGS`; **NEW** = recommended new key |

---

## 1. CRITICAL — Site-Wide Identity

These values propagate to **every page** via metadata, OG images, and shared components.

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 1 | `app/_lib/seo.js` | 14 | `SITE_NAME = 'NEUPC'` | **NEW** `site_name` |
| 2 | `app/_lib/seo.js` | 15 | `SITE_TITLE = 'Netrokona University Programming Club'` | **NEW** `site_title` |
| 3 | `app/_lib/seo.js` | 16–17 | `SITE_DESCRIPTION = 'Building a strong programming community…'` | **NEW** `site_description` |
| 4 | `app/_lib/seo.js` | 22–33 | `BASE_KEYWORDS` — 12 hardcoded keyword strings (`'NEUPC'`, `'Netrokona University'`, `'Programming Club'`, `'Competitive Programming'`, `'ICPC'`, `'CSE'`, `'Coding'`, `'Bangladesh'`, `'Netrokona'`, `'Computer Science'`, `'Algorithm'`, `'Data Structure'`) | **NEW** `site_keywords` (JSON array) |
| 5 | `app/opengraph-image.js` | 13 | `alt = 'Netrokona University Programming Club (NEUPC)'` | Should use `site_title` |
| 6 | `app/opengraph-image.js` | 92 | `'NEUPC'` rendered in OG image | Should use `site_name` |
| 7 | `app/opengraph-image.js` | 105 | `'Netrokona University Programming Club'` in OG image | Should use `site_title` |
| 8 | `app/opengraph-image.js` | 117 | `'Competitive Programming • Workshops • Mentorship • ICPC Preparation'` tagline | **NEW** `site_tagline` |
| 9 | `app/opengraph-image.js` | 140 | `'neupc.vercel.app'` domain in OG image | Should use `SITE_URL` from env |
| 10 | `app/_components/ui/Logo.js` | 28 | `alt="Netrokona University Programming Club logo"` | Should use `site_title` |
| 11 | `app/_components/ui/Logo.js` | 34 | `'NEUPC'` (mobile text) | Should use `site_name` |
| 12 | `app/_components/ui/Logo.js` | 35 | `'NEU'` (desktop abbreviation) | Should use derived from `site_name` |
| 13 | `app/_components/ui/Logo.js` | 38 | `'Programming Club'` (desktop subtext) | **NEW** `site_short_name` or derive from `site_title` |

---

## 2. HIGH — Homepage Section Headers

These are hardcoded as props to `<SectionHeader>` on the homepage (`app/page.js`).

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 14 | `app/page.js` | 119 | `badge="Who We Are"` | **NEW** `homepage_about_badge` |
| 15 | `app/page.js` | 120 | `title="About NEUPC"` | **NEW** `homepage_about_title` |
| 16 | `app/page.js` | 121 | `subtitle="Building a Strong Programming Community at Netrokona University"` | **NEW** `homepage_about_subtitle` |
| 17 | `app/page.js` | 99 | `alt="NEUPC Background"` | Should use `site_name` |
| 18 | `app/page.js` | 25 | metadata `title: 'NEUPC - Netrokona University Programming Club'` | Should compose from `site_name` + `site_title` |
| 19 | `app/page.js` | 27–29 | metadata `description` mentioning "NEUPC", "Netrokona University" | Should compose from `site_description` |

---

## 3. HIGH — Page Hero Sections

Every standalone page has a hardcoded hero badge, title, description, and often stats.

### 3a. Homepage Hero (`app/_components/sections/Hero.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 20 | `Hero.js` | 13–18 | `DEFAULTS.title = 'Programming Club'` | EXISTING `hero_title` ✅ |
| 21 | `Hero.js` | 14 | `DEFAULTS.subtitle = '(NEUPC)'` | EXISTING `hero_subtitle` ✅ |
| 22 | `Hero.js` | 15 | `DEFAULTS.department = 'Department of Computer Science and Engineering'` | EXISTING `hero_department` ✅ |
| 23 | `Hero.js` | 16 | `DEFAULTS.university = 'Netrokona University, Netrokona, Bangladesh'` | EXISTING `hero_university` ✅ |
| 24 | `Hero.js` | 60 | `'Welcome to NEUPC'` label text | **NEW** `hero_welcome_text` |

### 3b. Homepage Events Section (`app/_components/sections/Events.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 25 | `Events.js` | 231 | `badge="Upcoming Events"` | **NEW** `homepage_events_badge` |
| 26 | `Events.js` | 232 | `title="Recent Events"` | **NEW** `homepage_events_title` |
| 27 | `Events.js` | 233 | `subtitle="Join our upcoming workshops, contests, and tech talks…"` | **NEW** `homepage_events_subtitle` |
| 28 | `Events.js` | ~245 | `'No upcoming events at the moment. Check back soon!'` empty state | Low priority |

### 3c. Homepage Achievements Section (`app/_components/sections/Achievements.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 29 | `Achievements.js` | 13–17 | `DEFAULT_STATS` — 4 items: `'Total Awards'`, `'Contest Wins'`, `'ICPC Teams'`, `'Active Members'` | **NEW** `homepage_achievement_stats` (JSON) |
| 30 | `Achievements.js` | 169 | Badge: `'Our Achievements'` | **NEW** `homepage_achievements_badge` |
| 31 | `Achievements.js` | 174 | Title: `'Excellence in Action'` | **NEW** `homepage_achievements_title` |
| 32 | `Achievements.js` | 178 | Subtitle: `'Celebrating our journey of competitive programming success and innovation'` | **NEW** `homepage_achievements_subtitle` |

### 3d. Homepage Blogs Section (`app/_components/sections/Blogs.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 33 | `Blogs.js` | 397 | Badge: `'Latest Articles & Resources'` | **NEW** `homepage_blogs_badge` |
| 34 | `Blogs.js` | 403 | Title: `'Knowledge Base'` | **NEW** `homepage_blogs_title` |
| 35 | `Blogs.js` | 408 | Subtitle: `'Explore tutorials, contest insights, career guidance, and community stories'` | **NEW** `homepage_blogs_subtitle` |
| 36 | `Blogs.js` | 430 | Empty state: `'No blog posts available yet. Check back soon!'` | Low priority |

### 3e. Homepage Join Section (`app/_components/sections/Join.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 37 | `Join.js` | 148 | Badge: `'Join Our Community'` | **NEW** `homepage_join_badge` |
| 38 | `Join.js` | 150 | Title: `'Become a Member'` | **NEW** `homepage_join_title` |
| 39 | `Join.js` | 154 | Subtitle: `'Join NEUPC and unlock your potential in competitive programming, software development, and tech innovation'` | **NEW** `homepage_join_subtitle` |
| 40 | `Join.js` | 181 | CTA heading: `'Ready to Start Your Journey?'` | **NEW** `homepage_join_cta_title` |
| 41 | `Join.js` | 183 | CTA description: `'Join hundreds of students who are already part of NEUPC…'` | **NEW** `homepage_join_cta_description` |
| 42 | `Join.js` | 197 | Button: `'Join NEUPC Now'` | **NEW** `homepage_join_cta_button` |

### 3f. About Page Hero (`app/about/AboutClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 43 | `AboutClient.js` | 292 | Badge: `'🎓 Student Organization'` | **NEW** `about_hero_badge` |
| 44 | `AboutClient.js` | 300 | Title: `'About NEUPC'` | **NEW** `about_hero_title` |
| 45 | `AboutClient.js` | 313 | Subtitle: `'Netrokona University Programming Club'` | Should use `site_title` |
| 46 | `AboutClient.js` | 322 | Sub-subtitle: `'Department of Computer Science and Engineering'` | Should use `hero_department` |

### 3g. Events Page Hero (`app/events/EventsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 47 | `EventsClient.js` | 40 | `badge="Upcoming Events"` | **NEW** `events_hero_badge` |
| 48 | `EventsClient.js` | 41 | `title="Events & Activities"` | **NEW** `events_hero_title` |
| 49 | `EventsClient.js` | 42 | `description="Join us for exciting programming contests…"` | **NEW** `events_hero_description` |
| 50 | `EventsClient.js` | 43 | `subtitle="From ICPC preparation to beginner-friendly sessions…"` | **NEW** `events_hero_subtitle` |
| 51 | `EventsClient.js` | 45–49 | `stats` — `'50+'` Participants, `'10+'` Workshops, `'5+'` Contests | **NEW** `events_hero_stats` (JSON) |
| 52 | `EventsClient.js` | 89 | Empty state: `title="No Events Yet"` | Low priority |

### 3h. Achievements Page Hero (`app/achievements/AchievementsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 53 | `AchievementsClient.js` | 286 | `badge="Excellence & Achievements"` | **NEW** `achievements_hero_badge` |
| 54 | `AchievementsClient.js` | 288 | `title="Our Achievements"` | **NEW** `achievements_hero_title` |
| 55 | `AchievementsClient.js` | 289 | `description="Celebrating excellence in competitive programming…"` | **NEW** `achievements_hero_description` |

### 3i. Gallery Page Hero (`app/gallery/GalleryClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 56 | `GalleryClient.js` | 259 | Badge: `'Photo Gallery'` | **NEW** `gallery_hero_badge` |
| 57 | `GalleryClient.js` | 271 | Title: `'Moments That Define Us'` | **NEW** `gallery_hero_title` |
| 58 | `GalleryClient.js` | 281–284 | Description: `'Capturing innovation, teamwork, and excellence at Netrokona University Programming Club…'` | **NEW** `gallery_hero_description` |

### 3j. Committee Page Hero (`app/committee/CommitteeClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 59 | `CommitteeClient.js` | 385 | Badge: `'Leadership Team 2025-2026'` | **NEW** `committee_hero_badge` |
| 60 | `CommitteeClient.js` | 395 | Title: `'Meet the Committee'` | **NEW** `committee_hero_title` |
| 61 | `CommitteeClient.js` | 405–407 | Description: `'The dedicated team leading the Netrokona University Programming Club…'` | **NEW** `committee_hero_description` |

### 3k. Developers Page Hero (`app/developers/DevelopersClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 62 | `DevelopersClient.js` | 369 | Badge: `'Development Team'` | **NEW** `developers_hero_badge` |
| 63 | `DevelopersClient.js` | 379 | Title: `'Meet the Developers'` | **NEW** `developers_hero_title` |
| 64 | `DevelopersClient.js` | 389–392 | Description: `'The minds behind the digital platform of Netrokona University Programming Club…'` | **NEW** `developers_hero_description` |

### 3l. Blogs Page Hero (`app/blogs/BlogsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 65 | `BlogsClient.js` | 262 | `badge="Knowledge Hub"` | **NEW** `blogs_hero_badge` |
| 66 | `BlogsClient.js` | 263 | `title="Programming Insights & Updates"` | **NEW** `blogs_hero_title` |
| 67 | `BlogsClient.js` | 264 | `description="Explore tutorials, contest insights, club updates…"` | **NEW** `blogs_hero_description` |

### 3m. Roadmaps Page Hero (`app/roadmaps/RoadmapsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 68 | `RoadmapsClient.js` | 344 | `badge="Learning Pathways"` | **NEW** `roadmaps_hero_badge` |
| 69 | `RoadmapsClient.js` | 346 | `title="Club Learning Roadmaps"` | **NEW** `roadmaps_hero_title` |
| 70 | `RoadmapsClient.js` | 347 | `description="Structured pathways to become a skilled developer…"` | **NEW** `roadmaps_hero_description` |

### 3n. Join Page Hero (`app/join/JoinClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 71 | `JoinClient.js` | 78 | Badge: `'Public Account'` | **NEW** `join_hero_badge` |
| 72 | `JoinClient.js` | 91 | Title: `'Create Your Public Account'` | **NEW** `join_hero_title` |
| 73 | `JoinClient.js` | 102–103 | Description: `'Stay updated with events, contests, and workshops at Netrokona University Programming Club'` | **NEW** `join_hero_description` |

### 3o. Login Page (`app/login/page.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 74 | `login/page.js` | 82 | `'NEUPC'` heading | Should use `site_name` |
| 75 | `login/page.js` | 83 | `'Programming Club'` subtext | Should use `site_short_name` |
| 76 | `login/page.js` | 96 | `'Welcome Back'` title | **NEW** `login_title` (low priority) |
| 77 | `login/page.js` | 97 | `'Sign in to continue to your account'` | **NEW** `login_subtitle` (low priority) |
| 78 | `login/page.js` | 117 | `'Secure Authentication'` divider text | Low priority |
| 79 | `login/page.js` | 123 | `'Your Privacy is Protected'` | Low priority |
| 80 | `login/page.js` | 165 | `'New to NEUPC?'` | Should use `site_name` |

---

## 4. HIGH — CTA Sections

Every page ends with a `<CTASection>` that has hardcoded title/description.

| # | File | Line(s) | CTA Title | CTA Description | Settings Key |
|---|------|---------|-----------|-----------------|--------------|
| 81 | `AboutClient.js` | 736 | `"Ready to Join Us?"` | `"Become part of a community dedicated to excellence…"` | **NEW** `about_cta_title`, `about_cta_description` |
| 82 | `EventsClient.js` | 95–96 | `"Don't Miss Out!"` | `"Stay updated with our latest events and activities…"` | **NEW** `events_cta_title`, `events_cta_description` |
| 83 | `AchievementsClient.js` | 500–501 | `"Ready to Make Your Mark?"` | `"Join NEUPC today and be part of our legacy…"` | **NEW** `achievements_cta_title`, `achievements_cta_description` |
| 84 | `CommitteeClient.js` | 659–661 | `"Want to Lead with Us?"` | `"Applications for the next committee term open soon…at Netrokona University."` | **NEW** `committee_cta_title`, `committee_cta_description` |
| 85 | `DevelopersClient.js` | 690–695 | `"Want to Contribute?"` | `"This project follows collaborative development practices…"` | **NEW** `developers_cta_title`, `developers_cta_description` |
| 86 | `DevelopersClient.js` | 693 | `href: 'https://github.com/'` — **incomplete GitHub URL** | **NEW** `developers_github_url` |
| 87 | `RoadmapsClient.js` | 627–629 | `"Ready to Start Your Journey?"` | `"Join NEUPC today and accelerate your learning…"` | **NEW** `roadmaps_cta_title`, `roadmaps_cta_description` |
| 88 | `ContactClient.js` | ~960 | `"Ready to Get Started?"` | (see Contact section below) | **NEW** `contact_cta_title`, `contact_cta_description` |

---

## 5. MEDIUM — Default Fallback Data Constants

These are `DEFAULT_*` / `const` arrays in client components that serve as fallbacks when no data is fetched from the database. Some overlap with existing settings keys; others are entirely new.

### 5a. About Section Defaults (`app/_components/sections/About.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 89 | `About.js` | 13–20 | `DEFAULTS.title = 'Who We Are'`, `DEFAULTS.description1`, `DEFAULTS.description2` | EXISTING `about_title`, `about_description_1`, `about_description_2` ✅ |
| 90 | `About.js` | 25 | `HIGHLIGHT_TERM = 'Programming Club (NEUPC)'` | Should derive from `site_name` |
| 91 | `About.js` | ~121 | `alt="NEUPC Logo"` | Should use `site_name` |

### 5b. Join Section Defaults (`app/_components/sections/Join.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 92 | `Join.js` | 16–37 | `DEFAULT_BENEFITS` — 4 items (`Learn & Grow`, `Network`, `Compete`, `Build Projects`) | EXISTING `join_benefits` ✅ (but defaults here are separate) |

### 5c. Footer Defaults (`app/_components/sections/Footer.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 93 | `Footer.js` | 28–33 | `defaultSocial` — placeholder social URLs | EXISTING `social_*` ✅ |
| 94 | `Footer.js` | 35–38 | `defaultContact` — `email: 'contact@neupc.edu'`, `phone: '+880 123 456 7890'`, `address: 'Netrokona University\nNetrokona, Bangladesh'` | EXISTING `contact_*` ✅ |
| 95 | `Footer.js` | 40–41 | `defaultDescription = 'Netrokona University Programming Club - Empowering students…'` | EXISTING `footer_description` ✅ |
| 96 | `Footer.js` | 74 | `'NEUPC'` heading text | Should use `site_name` |
| 97 | `Footer.js` | 219–220 | `'© {year} Netrokona University Programming Club. All rights reserved.'` | **NEW** `footer_copyright_text` |
| 98 | `Footer.js` | 226 | `'Made with ❤️ by NEUPC Developers'` | **NEW** `footer_credit_text` |

### 5d. About Page Constants (`app/about/AboutClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 99 | `AboutClient.js` | 30–35 | `MISSION_ITEMS` — 5 bullet points | **NEW** `about_mission_items` (JSON) |
| 100 | `AboutClient.js` | 39–76 | `ACTIVITY_CARDS` — 4 cards with titles and items (`Competitive Programming Training`, `Academic & Career Development`, `Contest Participation`, `Women in Engineering (WIE)`) | **NEW** `about_activity_cards` (JSON) |
| 101 | `AboutClient.js` | 79–86 | `CORE_VALUES` — 6 string values | **NEW** `about_core_values` (JSON) |
| 102 | `AboutClient.js` | 89–106 | `ORG_STRUCTURE` — 4 hierarchy items | **NEW** `about_org_structure` (JSON) |
| 103 | `AboutClient.js` | 109–114 | `SKILLS` — 4 items | **NEW** `about_skills` (JSON) |
| 104 | `AboutClient.js` | 117–122 | `MENTORSHIP_AREAS` — 4 strings | **NEW** `about_mentorship_areas` (JSON) |
| 105 | `AboutClient.js` | 432 | Vision paragraph: `'To become a leading university programming community…'` | **NEW** `about_vision_text` |
| 106 | `AboutClient.js` | 681 | WIE section description paragraph | **NEW** `about_wie_description` |
| 107 | `AboutClient.js` | 634 | Skills closing paragraph: `'Through consistent practice and mentorship…'` | **NEW** `about_skills_summary` |

### 5e. Contact Page Constants (`app/contact/ContactClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 108 | `ContactClient.js` | 36–43 | `SUBJECT_OPTIONS` — 7 items | EXISTING `contact_subjects` ✅ (but these constants are separate and may differ!) |
| 109 | `ContactClient.js` | 46–51 | `DEFAULT_CONTACT_INFO` — email/phone/address/officeHours | EXISTING `contact_email`, `contact_phone`, `contact_address`, `contact_office_hours` ✅ |
| 110 | `ContactClient.js` | 54–72 | `DEFAULT_KEY_CONTACTS` — 3 items with TBD names | **NEW** `contact_key_contacts` (JSON) |
| 111 | `ContactClient.js` | 75–100+ | `DEFAULT_FAQS` — 5 Q&A items | EXISTING `faqs` ✅ (but these defaults differ from settings!) |

### 5f. Achievements Page Constants (`app/achievements/AchievementsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 112 | `AchievementsClient.js` | 36–41 | `DEFAULT_TIMELINE` — 5 milestones (2019–2026) | **NEW** `achievements_timeline` (JSON) |
| 113 | `AchievementsClient.js` | 44–49 | `DEFAULT_STATS` — `45+` Total Awards, `18` Contest Wins, `12` ICPC Teams, `150+` Active Members | **NEW** `achievements_stats` (JSON) |
| 114 | `AchievementsClient.js` | 72–98 | `WIE_STATS` — `5+` WIE Champions, `40%` Female Participation, `12` Leadership Roles | **NEW** `achievements_wie_stats` (JSON) |

### 5g. Gallery Page Constants (`app/gallery/GalleryClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 115 | `GalleryClient.js` | 34–38 | `DEFAULT_STATS` — `30+` Events Hosted, `200+` Active Members, `5+` Competitions, `1000+` Photos Captured | **NEW** `gallery_stats` (JSON) |

### 5h. Committee Page Constants (`app/committee/CommitteeClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 116 | `CommitteeClient.js` | 28–36 | `DEFAULT_ADVISOR` — name: `'Dr. Mohammad Rahman'`, designation, university: `'Netrokona University'`, message, linkedin | **NEW** `committee_advisor` (JSON) |
| 117 | `CommitteeClient.js` | 39–57 | `HERO_STATS` — `15+` Committee Members, `7` Departments, `1 Year` Term | **NEW** `committee_hero_stats` (JSON) |

### 5i. Developers Page Constants (`app/developers/DevelopersClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 118 | `DevelopersClient.js` | 32–57 | `DEFAULT_TECH_STACK` — 4 categories × 4 items | EXISTING `tech_stack` ✅ (but hardcoded defaults here) |
| 119 | `DevelopersClient.js` | 91–108 | `DEFAULT_TIMELINE` — 4 milestones | EXISTING `developers_timeline` ✅ (but hardcoded defaults here) |
| 120 | `DevelopersClient.js` | 345–349 | `githubStats` fallbacks: commits `'500+'`, stars `'42'`, forks `'12'` | EXISTING `github_stats` ✅ (but hardcoded fallback) |

### 5j. Roadmaps Page Constants (`app/roadmaps/RoadmapsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 121 | `RoadmapsClient.js` | 72–93 | `CLUB_GROWTH` — 3 year plans with hardcoded goals | **NEW** `roadmaps_club_growth` (JSON) |
| 122 | `RoadmapsClient.js` | 96–104 | `LEADERSHIP_PATH` — 6 roles with descriptions | **NEW** `roadmaps_leadership_path` (JSON) |
| 123 | `RoadmapsClient.js` | 107–111 | `SUMMARY_STATS` — 3 summary stat items | **NEW** `roadmaps_summary_stats` (JSON) |

### 5k. Join Page Constants (`app/join/JoinClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 124 | `JoinClient.js` | 24–45 | `DEFAULT_FEATURES` — 4 feature items | EXISTING `join_features` ✅ (but hardcoded defaults here) |

### 5l. Blogs Page Constants (`app/blogs/BlogsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 125 | `BlogsClient.js` | 53 | Default author: `'NEUPC Team'` | **NEW** `default_blog_author` |
| 126 | `Blogs.js` (section) | 145 | Default author: `'NEUPC Team'` | Same as above |

---

## 6. MEDIUM — Page Section Content

Hardcoded section headings, paragraphs, and content within page body sections.

### 6a. About Page Sections (`app/about/AboutClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 127 | `AboutClient.js` | 366 | `'Our Mission & Vision'` heading | **NEW** `about_mission_heading` |
| 128 | `AboutClient.js` | 368 | `'Driving excellence in programming education and community building'` | **NEW** `about_mission_subtitle` |
| 129 | `AboutClient.js` | 383 | `'Our Mission'` heading | Part of mission section |
| 130 | `AboutClient.js` | 425 | `'Our Vision'` heading | Part of mission section |
| 131 | `AboutClient.js` | 488 | `'What We Do'` heading | **NEW** `about_whatwedo_heading` |
| 132 | `AboutClient.js` | 490 | `'Our activities and initiatives throughout the year'` | **NEW** `about_whatwedo_subtitle` |
| 133 | `AboutClient.js` | 518 | `'Our Core Values'` heading | **NEW** `about_values_heading` |
| 134 | `AboutClient.js` | 520 | `'The principles that guide our community'` | **NEW** `about_values_subtitle` |
| 135 | `AboutClient.js` | 554 | `'📊 Organizational Structure'` heading | **NEW** `about_org_heading` |
| 136 | `AboutClient.js` | 556 | `'A well-defined hierarchy driving excellence'` | **NEW** `about_org_subtitle` |
| 137 | `AboutClient.js` | 560 | `'The club operates under a well-defined structure:'` | Inline text |
| 138 | `AboutClient.js` | 580 | Financial transparency note: `'All financial transactions require official signatory approval…'` | **NEW** `about_finance_note` |
| 139 | `AboutClient.js` | 596 | `'💡 Why the Programming Club Matters'` heading | **NEW** `about_why_heading` |
| 140 | `AboutClient.js` | 598 | `'More than code — building essential skills for the future'` | **NEW** `about_why_subtitle` |
| 141 | `AboutClient.js` | 650 | `'Fostering Growth & Inclusivity'` heading | **NEW** `about_growth_heading` |
| 142 | `AboutClient.js` | 652 | `'Building leaders through mentorship and diversity'` | **NEW** `about_growth_subtitle` |
| 143 | `AboutClient.js` | 670 | `'Women in Engineering (WIE) Branch'` heading | Part of WIE section |
| 144 | `AboutClient.js` | 696 | `'Mentorship & Guidance'` heading | Part of mentorship section |
| 145 | `AboutClient.js` | 700 | `'The club is supported by faculty advisors and experienced mentors who guide students in:'` | Inline text |

### 6b. Achievements Page Sections (`app/achievements/AchievementsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 146 | `AchievementsClient.js` | 365 | `'Our Journey'` heading | Low priority |
| 147 | `AchievementsClient.js` | 391 | `'Hall of Fame'` heading | Low priority |
| 148 | `AchievementsClient.js` | 394 | `'Honoring our top performers and outstanding contributors'` | Low priority |
| 149 | `AchievementsClient.js` | 456 | `'Women in Engineering'` badge | Low priority |
| 150 | `AchievementsClient.js` | 460 | `'Empowering Women in Tech'` heading | Low priority |
| 151 | `AchievementsClient.js` | 494 | `'Promoting diversity, inclusion, and equal opportunities…'` | Low priority |

### 6c. Committee Page Sections (`app/committee/CommitteeClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 152 | `CommitteeClient.js` | 432 | `'Faculty Advisor'` heading | Low priority |
| 153 | `CommitteeClient.js` | 435 | `'Guiding our vision with expertise and experience'` | Low priority |
| 154 | `CommitteeClient.js` | 524 | `'Core Executive Panel'` heading | Low priority |
| 155 | `CommitteeClient.js` | 527 | `'The leadership driving our club's vision and mission'` | Low priority |
| 156 | `CommitteeClient.js` | 557 | `'Department Leads'` heading | Low priority |
| 157 | `CommitteeClient.js` | 559 | `'Specialized teams driving excellence in their domains'` | Low priority |
| 158 | `CommitteeClient.js` | 631 | `'Executive Members'` heading | Low priority |
| 159 | `CommitteeClient.js` | 633 | `'Supporting the club's operations and initiatives'` | Low priority |

### 6d. Developers Page Sections (`app/developers/DevelopersClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 160 | `DevelopersClient.js` | 448 | `'Core Development Team'` heading | Low priority |
| 161 | `DevelopersClient.js` | 456 | `'The architects of our digital ecosystem'` | Low priority |
| 162 | `DevelopersClient.js` | 488 | `'Tech Stack'` heading | Low priority |
| 163 | `DevelopersClient.js` | 496 | `'Technologies powering our platform'` | Low priority |
| 164 | `DevelopersClient.js` | 530 | `'Contributors'` heading | Low priority |
| 165 | `DevelopersClient.js` | 538 | `'Special thanks to everyone who helped build this platform'` | Low priority |
| 166 | `DevelopersClient.js` | 576 | `'Development Timeline'` heading | Low priority |
| 167 | `DevelopersClient.js` | 584 | `'Our journey of building this platform'` | Low priority |

### 6e. Roadmaps Page Sections (`app/roadmaps/RoadmapsClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 168 | `RoadmapsClient.js` | 428 | `'Technical Learning Paths'` heading | Low priority |
| 169 | `RoadmapsClient.js` | 430 | `'Choose your path and start your journey to excellence'` | Low priority |
| 170 | `RoadmapsClient.js` | 487 | `'Club Growth Vision'` heading | Low priority |
| 171 | `RoadmapsClient.js` | 489 | `'Our journey towards excellence and national recognition'` | Low priority |
| 172 | `RoadmapsClient.js` | 540 | `'Leadership Development Path'` heading | Low priority |
| 173 | `RoadmapsClient.js` | 542 | `'Your journey from member to leader'` | Low priority |

### 6f. Join Page Sections (`app/join/JoinClient.js`)

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 174 | `JoinClient.js` | 155 | `'What is a Public Account?'` heading | **NEW** `join_section_title` |
| 175 | `JoinClient.js` | 163 | `'Get started with limited access and upgrade anytime'` | **NEW** `join_section_subtitle` |
| 176 | `JoinClient.js` | 218 | `'Important Note'` heading | Low priority |
| 177 | `JoinClient.js` | 221–223 | `'Public accounts do not have access to internal member resources…'` | **NEW** `join_important_note` |

---

## 7. LOW — Legal Pages

Both legal pages are **entirely hardcoded** — every section, paragraph, and date.

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 178 | `app/privacy/page.js` | 1–224 | Entire privacy policy (8 sections), mentions "NEUPC", "Netrokona University", "Supabase", date `'February 28, 2026'` | **NEW** `privacy_policy_content` (rich text/HTML) or `privacy_sections` (JSON), `privacy_last_updated` |
| 179 | `app/terms/page.js` | 1–283 | Entire terms of service (11 sections), mentions "NEUPC", "Netrokona University", role hierarchy, code of conduct, event policies, date `'February 28, 2026'` | **NEW** `terms_of_service_content` (rich text/HTML) or `terms_sections` (JSON), `terms_last_updated` |

---

## 8. LOW — Structural & Navigation

| # | File | Line(s) | Hardcoded Value | Settings Key |
|---|------|---------|-----------------|--------------|
| 180 | `app/_components/ui/Navbar.js` | 25–56 | `NAV_CONFIG` — all navigation links, dropdown labels, CTA label `'Get Started'` | **NEW** `nav_config` (JSON) — or leave as structural |
| 181 | `Footer.js` | 102–108 | Quick Links array — 5 items (`About Us`, `Events`, `Achievements`, `Committee`, `Gallery`) | **NEW** `footer_quick_links` (JSON) — or leave as structural |
| 182 | `Footer.js` | 121–127 | Resources array — 5 items (`Blogs`, `Roadmaps`, `Join Us`, `Contact`, `Developers`) | **NEW** `footer_resources_links` (JSON) — or leave as structural |
| 183 | `app/not-found.js` | 19–27 | `POPULAR_PAGES` — 6 items with names, hrefs, and icons | Low priority — leave as structural |
| 184 | `app/not-found.js` | 51 | `'Page Not Found'` title | Low priority |
| 185 | `app/not-found.js` | 55 | `'The page you're looking for doesn't exist…'` | Low priority |
| 186 | `app/not-found.js` | 98 | `'Popular Pages'` heading | Low priority |
| 187 | `app/not-found.js` | 112 | `'Contact us for help'` link text | Low priority |

---

## 9. Architectural Recommendations

### 9.1 Critical Issues

1. **Dual-maintenance problem:** Many `*Client.js` files define their own `DEFAULT_*` constants that are **separate from and sometimes inconsistent with** `DEFAULT_SETTINGS` in `settings-actions.js`. For example:
   - `ContactClient.js` has `SUBJECT_OPTIONS` (7 items) that may differ from the `contact_subjects` setting.
   - `ContactClient.js` has `DEFAULT_FAQS` (5 items) that may differ from the `faqs` setting.
   - `DevelopersClient.js` has `DEFAULT_TECH_STACK` separate from `tech_stack` setting.

2. **Incomplete GitHub URL:** `DevelopersClient.js` line 693 has `href: 'https://github.com/'` — an incomplete/placeholder URL in the CTA.

3. **OG Image is fully hardcoded:** `opengraph-image.js` renders all text as hardcoded strings. Since this is an Edge-rendered image, it cannot easily read from the database. Consider reading from environment variables or seo.js constants at minimum.

### 9.2 Recommended Implementation Approach

1. **Phase 1 — Site Identity (HIGH impact, LOW effort):**
   - Add `site_name`, `site_title`, `site_description`, `site_tagline`, `site_keywords` to `DEFAULT_SETTINGS`.
   - Update `seo.js` to read from settings (with current values as fallbacks).
   - Update `Logo.js`, `Footer.js`, `login/page.js` to use these.

2. **Phase 2 — Hero & CTA Sections (HIGH impact, MEDIUM effort):**
   - Add hero/CTA settings keys for each page (badge, title, description).
   - Fetch in each `page.js` server component and pass to client.
   - Client components already accept props; just need to wire them through.

3. **Phase 3 — Page Content Data (MEDIUM impact, MEDIUM effort):**
   - Add JSON settings for structured data (mission items, activity cards, core values, timeline, stats, etc.).
   - Sync `DEFAULT_*` constants in client files with `DEFAULT_SETTINGS` to eliminate dual-maintenance.

4. **Phase 4 — Legal Pages (LOW impact, HIGH effort):**
   - Store privacy policy and terms as rich text or JSON sections in settings.
   - Requires admin UI for rich text editing.

### 9.3 Data Flow Fix

Currently, most pages don't fetch hero/CTA content from settings — they only fetch entity data (events, blogs, etc.). The server components (`page.js`) should additionally call a settings fetch for page-specific content and pass it down as props.

---

## 10. Summary Statistics

| Category | Items Found | New Settings Keys Needed | Existing Keys Used |
|----------|------------:|-------------------------:|-------------------:|
| Site-Wide Identity | 13 | 4–5 | 0 |
| Homepage Section Headers | 6 | 3 | 0 |
| Page Hero Sections | 38 | ~30 | 4 |
| CTA Sections | 8 | ~16 | 0 |
| Default Fallback Data | 27 | ~17 | 8 |
| Page Section Content | 35+ | ~20 (grouped) | 0 |
| Legal Pages | 2 | 4 | 0 |
| Structural/Navigation | 8 | 2–4 | 0 |
| **Total** | **~137** | **~75** | **12** |

> **Bottom line:** The project has **~12 existing settings keys** properly wired but **~75 new settings keys** are recommended to make all user-visible content admin-controllable. Priority should be given to site identity (Phase 1) and hero/CTA sections (Phase 2) as they affect every page and are the most visible to users.
