/**
 * @file Settings client — admin website-settings editor with grouped
 *   form fields organized by functionality. No duplicate keys.
 *
 *   Sections:
 *     1. Website Content — Hero, About, Social, Contact, Footer, FAQs, Join, Developers
 *     1b. Page Content — Headings, badges, and CTAs for all public pages
 *     2. Feature Toggles — Enable/disable major platform features
 *     3. Users & Access — Registration, profiles, default role
 *     4. Applications — Membership application workflow
 *     5. Events — Event management behaviour
 *     6. Blogs — Blog publication & comments
 *     7. Notifications — Email & in-app notification settings
 *     8. Security — Account protection, session, rate limits
 *     9. Maintenance — Maintenance mode
 *
 * @module AdminSettingsClient
 */

'use client';

import {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Layout,
  ToggleLeft,
  Users,
  GraduationCap,
  CalendarDays,
  BookOpen,
  Bell,
  ShieldCheck,
  Wrench,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Instagram,
  Facebook,
  Twitter,
  Github,
  Linkedin,
  Youtube,
  Database,
  Type,
  Search,
  X,
  Sparkles,
  RotateCcw,
  Check,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  saveSettingsAction,
  seedDefaultSettingsAction,
} from '@/app/_lib/settings-actions';

// ─── Section / field definitions ─────────────────────────────────────────────

const SECTIONS = [
  // ── 1. Website Content ──────────────────────────────────────
  {
    id: 'website',
    label: 'Website Content',
    icon: Layout,
    group: 'content',
    description: 'Manage all public-facing website content',
    categories: ['hero', 'about', 'social', 'contact', 'footer', 'content'],
    fields: [
      // Hero
      { type: 'divider', label: 'Hero Section' },
      {
        key: 'hero_title',
        label: 'Club Name',
        type: 'text',
        placeholder: 'Programming Club',
        category: 'hero',
      },
      {
        key: 'hero_subtitle',
        label: 'Subtitle',
        type: 'text',
        placeholder: '(NEUPC)',
        category: 'hero',
      },
      {
        key: 'hero_department',
        label: 'Department',
        type: 'text',
        placeholder: 'Department of Computer Science and Engineering',
        category: 'hero',
      },
      {
        key: 'hero_university',
        label: 'University',
        type: 'text',
        placeholder: 'Netrokona University, Netrokona, Bangladesh',
        category: 'hero',
      },

      // About
      { type: 'divider', label: 'About Section' },
      {
        key: 'about_title',
        label: 'About Heading',
        type: 'text',
        placeholder: 'Who We Are',
        category: 'about',
      },
      {
        key: 'about_description_1',
        label: 'Description (Paragraph 1)',
        type: 'textarea',
        placeholder: 'First paragraph about the club…',
        category: 'about',
      },
      {
        key: 'about_description_2',
        label: 'Description (Paragraph 2)',
        type: 'textarea',
        placeholder: 'Second paragraph about the club…',
        category: 'about',
      },
      {
        key: 'about_mission',
        label: 'Mission Points',
        type: 'json',
        desc: 'JSON array of mission statement strings',
        category: 'about',
      },
      {
        key: 'about_vision',
        label: 'Vision Points',
        type: 'json',
        desc: 'JSON array of vision statement strings',
        category: 'about',
      },
      {
        key: 'about_what_we_do',
        label: 'What We Do',
        type: 'json',
        desc: 'JSON array of {icon, title, description} objects',
        category: 'about',
      },
      {
        key: 'about_stats',
        label: 'Club Statistics',
        type: 'json',
        desc: 'JSON array of {value, label, icon} objects',
        category: 'about',
      },
      {
        key: 'about_core_values',
        label: 'Core Values / Principles',
        type: 'json',
        desc: 'JSON array of {label, icon} objects — icon is a Lucide icon name',
        category: 'about',
      },
      {
        key: 'about_org_structure',
        label: 'Organizational Structure',
        type: 'json',
        desc: 'JSON array of {title, description, icon, color} — color: "primary" or "secondary"',
        category: 'about',
      },
      {
        key: 'about_org_financial_note',
        label: 'Org Financial Note',
        type: 'textarea',
        placeholder: 'Note shown below the org structure section…',
        category: 'about',
      },
      {
        key: 'about_skills',
        label: 'Skills / Impact Items',
        type: 'json',
        desc: 'JSON array of {icon, label} objects — icon is a Lucide icon name',
        category: 'about',
      },
      {
        key: 'about_skills_description',
        label: 'Skills Description',
        type: 'textarea',
        placeholder: 'Paragraph shown below skills items…',
        category: 'about',
      },
      {
        key: 'about_wie_title',
        label: 'WIE Title',
        type: 'text',
        placeholder: 'Women in Engineering',
        category: 'about',
      },
      {
        key: 'about_wie_description',
        label: 'WIE Description',
        type: 'textarea',
        placeholder: 'Description for Women in Engineering section…',
        category: 'about',
      },
      {
        key: 'about_mentorship_title',
        label: 'Mentorship Title',
        type: 'text',
        placeholder: 'Mentorship & Guidance',
        category: 'about',
      },
      {
        key: 'about_mentorship_description',
        label: 'Mentorship Description',
        type: 'textarea',
        placeholder: 'Intro text for the mentorship section…',
        category: 'about',
      },
      {
        key: 'about_mentorship_areas',
        label: 'Mentorship Areas',
        type: 'json',
        desc: 'JSON array of strings — each is a mentorship focus area',
        category: 'about',
      },

      // Social Media
      { type: 'divider', label: 'Social Media Links' },
      {
        key: 'social_facebook',
        label: 'Facebook',
        type: 'url',
        placeholder: 'https://facebook.com/…',
        category: 'social',
        icon: Facebook,
      },
      {
        key: 'social_github',
        label: 'GitHub',
        type: 'url',
        placeholder: 'https://github.com/…',
        category: 'social',
        icon: Github,
      },
      {
        key: 'social_linkedin',
        label: 'LinkedIn',
        type: 'url',
        placeholder: 'https://linkedin.com/…',
        category: 'social',
        icon: Linkedin,
      },
      {
        key: 'social_youtube',
        label: 'YouTube',
        type: 'url',
        placeholder: 'https://youtube.com/…',
        category: 'social',
        icon: Youtube,
      },
      {
        key: 'social_twitter',
        label: 'Twitter / X',
        type: 'url',
        placeholder: 'https://twitter.com/…',
        category: 'social',
        icon: Twitter,
      },
      {
        key: 'social_instagram',
        label: 'Instagram',
        type: 'url',
        placeholder: 'https://instagram.com/…',
        category: 'social',
        icon: Instagram,
      },

      // Contact
      { type: 'divider', label: 'Contact Information' },
      {
        key: 'contact_email',
        label: 'Contact Email',
        type: 'email',
        placeholder: 'contact@university.edu',
        category: 'contact',
      },
      {
        key: 'contact_phone',
        label: 'Contact Phone',
        type: 'text',
        placeholder: '+880 1XXX-XXXXXX',
        category: 'contact',
      },
      {
        key: 'contact_address',
        label: 'Address',
        type: 'text',
        placeholder: 'Department of CSE, University…',
        category: 'contact',
      },
      {
        key: 'contact_office_hours',
        label: 'Office Hours',
        type: 'text',
        placeholder: 'Sunday - Thursday, 10:00 AM - 4:00 PM',
        category: 'contact',
      },
      {
        key: 'contact_subjects',
        label: 'Contact Form Subjects',
        type: 'json',
        desc: 'JSON array of subject option strings',
        category: 'contact',
      },

      // Footer
      { type: 'divider', label: 'Footer' },
      {
        key: 'footer_description',
        label: 'Footer Description',
        type: 'textarea',
        placeholder: 'Short description shown in footer…',
        category: 'footer',
      },

      // FAQs
      { type: 'divider', label: 'FAQs' },
      {
        key: 'faqs',
        label: 'FAQ Items',
        type: 'json',
        desc: 'JSON array of {question, answer} objects',
        category: 'content',
      },

      // Join Page
      { type: 'divider', label: 'Join Page' },
      {
        key: 'join_benefits',
        label: 'Membership Benefits',
        type: 'json',
        desc: 'JSON array of {icon, title, description} objects',
        category: 'content',
      },
      {
        key: 'join_features',
        label: 'Public Account Features',
        type: 'json',
        desc: 'JSON array of {icon, title, description} objects',
        category: 'content',
      },

      // Developers Page
      { type: 'divider', label: 'Developers Page' },
      {
        key: 'developers_core',
        label: 'Core Developers',
        type: 'json',
        desc: 'JSON array of {name, role, bio, stack, github, linkedin, portfolio, photo}',
        category: 'content',
      },
      {
        key: 'developers_contributors',
        label: 'Contributors',
        type: 'json',
        desc: 'JSON array of {name, role, contribution, github}',
        category: 'content',
      },
      {
        key: 'tech_stack',
        label: 'Technology Stack',
        type: 'json',
        desc: 'JSON array of {category, items: [{name, description, icon}]}',
        category: 'content',
      },
      {
        key: 'developers_timeline',
        label: 'Development Timeline',
        type: 'json',
        desc: 'JSON array of {year, title, description, status}',
        category: 'content',
      },
      {
        key: 'github_stats',
        label: 'GitHub Statistics',
        type: 'json',
        desc: 'JSON object: {commits, contributors, stars, forks}',
        category: 'content',
      },
    ],
  },

  // ── 1b. Page Content ───────────────────────────────────────
  {
    id: 'pages',
    label: 'Page Content',
    icon: Type,
    description:
      'Customize headings, badges, and call-to-action text across all public pages',
    categories: ['page_content'],
    fields: [
      // Hero
      { type: 'divider', label: 'Hero Section' },
      {
        key: 'hero_welcome_text',
        label: 'Welcome Text',
        type: 'text',
        placeholder: 'Welcome to',
        category: 'page_content',
        desc: 'Text shown before the site name in the hero',
      },
      {
        key: 'hero_join_label',
        label: 'Join Button Label',
        type: 'text',
        placeholder: 'Join Now',
        category: 'page_content',
      },
      {
        key: 'hero_learn_more_label',
        label: 'Learn More Button Label',
        type: 'text',
        placeholder: 'Learn More',
        category: 'page_content',
      },

      // Homepage — About
      { type: 'divider', label: 'Homepage — About Section' },
      {
        key: 'homepage_about_badge',
        label: 'Badge Text',
        type: 'text',
        placeholder: 'About Us',
        category: 'page_content',
      },
      {
        key: 'homepage_about_title',
        label: 'Title',
        type: 'text',
        placeholder: 'Get to Know NEUPC',
        category: 'page_content',
      },
      {
        key: 'homepage_about_subtitle',
        label: 'Subtitle',
        type: 'textarea',
        placeholder:
          'Learn about our mission, vision, and the amazing community…',
        category: 'page_content',
      },
      {
        key: 'homepage_about_cta',
        label: 'CTA Button Text',
        type: 'text',
        placeholder: 'Learn More About Us',
        category: 'page_content',
      },

      // Homepage — Events
      { type: 'divider', label: 'Homepage — Events Section' },
      {
        key: 'homepage_events_badge',
        label: 'Badge Text',
        type: 'text',
        placeholder: 'Upcoming Events',
        category: 'page_content',
      },
      {
        key: 'homepage_events_title',
        label: 'Title',
        type: 'text',
        placeholder: 'Recent Events',
        category: 'page_content',
      },
      {
        key: 'homepage_events_subtitle',
        label: 'Subtitle',
        type: 'textarea',
        placeholder: 'Join our upcoming workshops, contests, and tech talks…',
        category: 'page_content',
      },
      {
        key: 'homepage_events_cta',
        label: 'CTA Button Text',
        type: 'text',
        placeholder: 'View All Events',
        category: 'page_content',
      },
      {
        key: 'events_empty_message',
        label: 'Empty State Message',
        type: 'text',
        placeholder: 'No upcoming events at the moment. Check back soon!',
        category: 'page_content',
      },

      // Homepage — Achievements
      { type: 'divider', label: 'Homepage — Achievements Section' },
      {
        key: 'homepage_achievements_badge',
        label: 'Badge Text',
        type: 'text',
        placeholder: 'Our Achievements',
        category: 'page_content',
      },
      {
        key: 'homepage_achievements_title',
        label: 'Title',
        type: 'text',
        placeholder: 'Excellence in Action',
        category: 'page_content',
      },
      {
        key: 'homepage_achievements_subtitle',
        label: 'Subtitle',
        type: 'textarea',
        placeholder:
          'Celebrating our journey of competitive programming success…',
        category: 'page_content',
      },
      {
        key: 'homepage_achievements_cta',
        label: 'CTA Button Text',
        type: 'text',
        placeholder: 'View All Achievements',
        category: 'page_content',
      },
      {
        key: 'achievements_empty_message',
        label: 'Empty State Message',
        type: 'text',
        placeholder: 'No achievements to display yet.',
        category: 'page_content',
      },

      // Homepage — Blog
      { type: 'divider', label: 'Homepage — Blog Section' },
      {
        key: 'homepage_blogs_badge',
        label: 'Badge Text',
        type: 'text',
        placeholder: 'Latest Articles & Resources',
        category: 'page_content',
      },
      {
        key: 'homepage_blogs_title',
        label: 'Title',
        type: 'text',
        placeholder: 'Knowledge Base',
        category: 'page_content',
      },
      {
        key: 'homepage_blogs_subtitle',
        label: 'Subtitle',
        type: 'textarea',
        placeholder: 'Explore tutorials, contest insights, career guidance…',
        category: 'page_content',
      },
      {
        key: 'homepage_blogs_cta',
        label: 'CTA Button Text',
        type: 'text',
        placeholder: 'Explore All Articles',
        category: 'page_content',
      },
      {
        key: 'blogs_empty_message',
        label: 'Empty State Message',
        type: 'text',
        placeholder: 'No blog posts available yet. Check back soon!',
        category: 'page_content',
      },

      // Homepage — Join
      { type: 'divider', label: 'Homepage — Join Section' },
      {
        key: 'homepage_join_badge',
        label: 'Badge Text',
        type: 'text',
        placeholder: 'Join Our Community',
        category: 'page_content',
      },
      {
        key: 'homepage_join_title',
        label: 'Title',
        type: 'text',
        placeholder: 'Become a Member',
        category: 'page_content',
      },
      {
        key: 'homepage_join_subtitle',
        label: 'Subtitle',
        type: 'textarea',
        placeholder: 'Join NEUPC and unlock your potential…',
        category: 'page_content',
      },
      {
        key: 'homepage_join_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: 'Ready to Start Your Journey?',
        category: 'page_content',
      },
      {
        key: 'homepage_join_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder: 'Join hundreds of students who are already part of NEUPC…',
        category: 'page_content',
      },
      {
        key: 'homepage_join_cta_button',
        label: 'CTA Button Text',
        type: 'text',
        placeholder: 'Join NEUPC Now',
        category: 'page_content',
      },

      // Footer
      { type: 'divider', label: 'Footer' },
      {
        key: 'site_name_full',
        label: 'Full Site Name',
        type: 'text',
        placeholder: 'Netrokona University Programming Club',
        category: 'page_content',
      },
      {
        key: 'footer_developer_credit',
        label: 'Developer Credit',
        type: 'text',
        placeholder: 'Made with ❤️ by NEUPC Developers',
        category: 'page_content',
      },

      // About Page
      { type: 'divider', label: 'About Page' },
      {
        key: 'about_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: '🎓 Student Organization',
        category: 'page_content',
      },
      {
        key: 'about_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'About NEUPC',
        category: 'page_content',
      },
      {
        key: 'about_page_subtitle',
        label: 'Hero Subtitle',
        type: 'text',
        placeholder: 'Netrokona University Programming Club',
        category: 'page_content',
      },
      {
        key: 'about_page_department',
        label: 'Department Name',
        type: 'text',
        placeholder: 'Department of Computer Science and Engineering',
        category: 'page_content',
      },
      {
        key: 'about_page_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: 'Ready to Join Us?',
        category: 'page_content',
      },
      {
        key: 'about_page_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder: 'Become part of a community dedicated to excellence…',
        category: 'page_content',
      },

      // Contact Page
      { type: 'divider', label: 'Contact Page' },
      {
        key: 'contact_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Contact Us',
        category: 'page_content',
      },
      {
        key: 'contact_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Get in Touch',
        category: 'page_content',
      },
      {
        key: 'contact_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'Have questions, ideas, or collaboration proposals?…',
        category: 'page_content',
      },
      {
        key: 'contact_page_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: 'Ready to Get Started?',
        category: 'page_content',
      },
      {
        key: 'contact_page_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder: "Whether you're a student looking to join…",
        category: 'page_content',
      },

      // Events Page
      { type: 'divider', label: 'Events Page' },
      {
        key: 'events_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Upcoming Events',
        category: 'page_content',
      },
      {
        key: 'events_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Events & Activities',
        category: 'page_content',
      },
      {
        key: 'events_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'Join us for exciting programming contests, workshops…',
        category: 'page_content',
      },
      {
        key: 'events_page_subtitle',
        label: 'Hero Subtitle',
        type: 'textarea',
        placeholder: 'From ICPC preparation to beginner-friendly sessions…',
        category: 'page_content',
      },
      {
        key: 'events_page_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: "Don't Miss Out!",
        category: 'page_content',
      },
      {
        key: 'events_page_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder: 'Stay updated with our latest events and activities…',
        category: 'page_content',
      },

      // Achievements Page
      { type: 'divider', label: 'Achievements Page' },
      {
        key: 'achievements_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Excellence & Achievements',
        category: 'page_content',
      },
      {
        key: 'achievements_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Our Achievements',
        category: 'page_content',
      },
      {
        key: 'achievements_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'Celebrating excellence in competitive programming…',
        category: 'page_content',
      },
      {
        key: 'achievements_page_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: 'Ready to Make Your Mark?',
        category: 'page_content',
      },
      {
        key: 'achievements_page_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder: 'Join NEUPC today and be part of our legacy…',
        category: 'page_content',
      },

      // Blogs Page
      { type: 'divider', label: 'Blogs Page' },
      {
        key: 'blogs_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Knowledge Hub',
        category: 'page_content',
      },
      {
        key: 'blogs_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Programming Insights & Updates',
        category: 'page_content',
      },
      {
        key: 'blogs_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'Explore tutorials, contest insights, club updates…',
        category: 'page_content',
      },

      // Gallery Page
      { type: 'divider', label: 'Gallery Page' },
      {
        key: 'gallery_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Photo Gallery',
        category: 'page_content',
      },
      {
        key: 'gallery_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Moments That Define Us',
        category: 'page_content',
      },
      {
        key: 'gallery_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'Capturing innovation, teamwork, and excellence…',
        category: 'page_content',
      },
      {
        key: 'gallery_page_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: 'Join the Programming Club Today',
        category: 'page_content',
      },
      {
        key: 'gallery_page_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder:
          'Be part of creating these memorable moments. Join us in our next competition, workshop, or community event.',
        category: 'page_content',
      },

      // Committee Page
      { type: 'divider', label: 'Committee Page' },
      {
        key: 'committee_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Leadership Team 2025-2026',
        category: 'page_content',
      },
      {
        key: 'committee_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Meet the Committee',
        category: 'page_content',
      },
      {
        key: 'committee_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'The dedicated team leading the Netrokona University…',
        category: 'page_content',
      },
      {
        key: 'committee_page_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: 'Want to Lead with Us?',
        category: 'page_content',
      },
      {
        key: 'committee_page_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder: 'Applications for the next committee term open soon…',
        category: 'page_content',
      },

      // Developers Page
      { type: 'divider', label: 'Developers Page' },
      {
        key: 'developers_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Development Team',
        category: 'page_content',
      },
      {
        key: 'developers_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Meet the Developers',
        category: 'page_content',
      },
      {
        key: 'developers_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'The minds behind the digital platform…',
        category: 'page_content',
      },
      {
        key: 'developers_page_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: 'Want to Contribute?',
        category: 'page_content',
      },
      {
        key: 'developers_page_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder:
          'This project follows collaborative development practices…',
        category: 'page_content',
      },

      // Join Page
      { type: 'divider', label: 'Join Page' },
      {
        key: 'join_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Public Account',
        category: 'page_content',
      },
      {
        key: 'join_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Create Your Public Account',
        category: 'page_content',
      },
      {
        key: 'join_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'Stay updated with events, contests, and workshops…',
        category: 'page_content',
      },

      // Roadmaps Page
      { type: 'divider', label: 'Roadmaps Page' },
      {
        key: 'roadmaps_page_badge',
        label: 'Hero Badge',
        type: 'text',
        placeholder: 'Learning Pathways',
        category: 'page_content',
      },
      {
        key: 'roadmaps_page_title',
        label: 'Hero Title',
        type: 'text',
        placeholder: 'Club Learning Roadmaps',
        category: 'page_content',
      },
      {
        key: 'roadmaps_page_description',
        label: 'Hero Description',
        type: 'textarea',
        placeholder: 'Structured pathways to become a skilled developer…',
        category: 'page_content',
      },
      {
        key: 'roadmaps_page_cta_title',
        label: 'CTA Title',
        type: 'text',
        placeholder: 'Ready to Start Your Journey?',
        category: 'page_content',
      },
      {
        key: 'roadmaps_page_cta_description',
        label: 'CTA Description',
        type: 'textarea',
        placeholder: 'Join NEUPC today and accelerate your learning…',
        category: 'page_content',
      },
    ],
  },

  // ── 2. Feature Toggles ─────────────────────────────────────
  {
    id: 'features',
    label: 'Features',
    icon: ToggleLeft,
    description: 'Enable or disable major platform features globally',
    fields: [
      { type: 'divider', label: 'Communication' },
      {
        key: 'features.chat_enabled',
        label: 'Chat System',
        type: 'toggle',
        desc: 'Enable real-time direct messaging and support tickets',
      },
      {
        key: 'features.discussions_enabled',
        label: 'Discussion Forum',
        type: 'toggle',
        desc: 'Enable threaded discussion forum for members',
      },
      { type: 'divider', label: 'Learning & Development' },
      {
        key: 'features.mentorship_enabled',
        label: 'Mentorship Program',
        type: 'toggle',
        desc: 'Enable mentor-mentee assignments, tasks, and sessions',
      },
      {
        key: 'features.contests_enabled',
        label: 'Contest Tracking',
        type: 'toggle',
        desc: 'Enable multi-platform competitive programming contest tracking',
      },
      {
        key: 'features.resources_enabled',
        label: 'Resource Library',
        type: 'toggle',
        desc: 'Enable the shared resource/link library',
      },
      {
        key: 'features.roadmaps_enabled',
        label: 'Roadmaps',
        type: 'toggle',
        desc: 'Enable learning path roadmaps for members',
      },
      { type: 'divider', label: 'Content & Media' },
      {
        key: 'features.gallery_enabled',
        label: 'Gallery',
        type: 'toggle',
        desc: 'Enable the photo gallery for events and activities',
      },
      {
        key: 'features.achievements_enabled',
        label: 'Achievements',
        type: 'toggle',
        desc: 'Enable the achievements/results showcase',
      },
      {
        key: 'features.notices_enabled',
        label: 'Notice Board',
        type: 'toggle',
        desc: 'Enable the announcements and notice board',
      },
      { type: 'divider', label: 'Operations' },
      {
        key: 'features.certificates_enabled',
        label: 'Certificate System',
        type: 'toggle',
        desc: 'Enable issuing and verifying event certificates',
      },
      {
        key: 'features.budget_enabled',
        label: 'Budget Management',
        type: 'toggle',
        desc: 'Enable income/expense tracking and budget management',
      },
    ],
  },

  // ── 3. Users & Access ──────────────────────────────────────
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    description: 'Control user registration and access settings',
    fields: [
      {
        key: 'users.registration_enabled',
        label: 'Allow New Registrations',
        type: 'toggle',
        desc: 'Allow users to create new accounts',
      },
      {
        key: 'users.require_email_verification',
        label: 'Require Email Verification',
        type: 'toggle',
        desc: 'Users must verify their email before accessing the platform',
      },
      {
        key: 'users.allow_google_login',
        label: 'Allow Google Login',
        type: 'toggle',
        desc: 'Enable "Continue with Google" sign-in',
      },
      {
        key: 'users.default_role',
        label: 'Default Role for New Users',
        type: 'select',
        desc: 'Role assigned automatically upon registration',
        options: [
          { value: 'guest', label: 'Guest' },
          { value: 'member', label: 'Member' },
        ],
      },
      {
        key: 'users.public_profiles',
        label: 'Public Member Profiles',
        type: 'toggle',
        desc: 'Member profiles are visible to anyone without login',
      },
    ],
  },

  // ── 4. Applications ────────────────────────────────────────
  {
    id: 'applications',
    label: 'Applications',
    icon: GraduationCap,
    description: 'Settings for membership application workflow',
    fields: [
      {
        key: 'applications.accept_applications',
        label: 'Accept Applications',
        type: 'toggle',
        desc: 'Open the membership application form to the public',
      },
      {
        key: 'applications.auto_approve',
        label: 'Auto Approve',
        type: 'toggle',
        desc: 'Automatically approve every submitted application',
      },
      {
        key: 'applications.require_login',
        label: 'Require Login to Apply',
        type: 'toggle',
        desc: 'Applicants must be logged in before submitting',
      },
      {
        key: 'applications.max_per_year',
        label: 'Max Applications per Year',
        type: 'number',
        placeholder: '100',
        min: 1,
        max: 9999,
        desc: 'Maximum number of applications accepted per year',
      },
    ],
  },

  // ── 5. Events ──────────────────────────────────────────────
  {
    id: 'events',
    label: 'Events',
    icon: CalendarDays,
    description: 'Control how events are managed and displayed',
    fields: [
      {
        key: 'events.allow_external_registration',
        label: 'Allow External Registration Links',
        type: 'toggle',
        desc: 'Events can use external URLs for registration',
      },
      {
        key: 'events.allow_rsvp_cancellation',
        label: 'Allow RSVP Cancellation',
        type: 'toggle',
        desc: 'Users can cancel their event registration',
      },
      {
        key: 'events.registration_required_default',
        label: 'Registration Required by Default',
        type: 'toggle',
        desc: 'New events require registration by default',
      },
      {
        key: 'events.default_max_participants',
        label: 'Default Max Participants',
        type: 'number',
        placeholder: '0 = unlimited',
        min: 0,
        max: 10000,
        desc: 'Default capacity for new events (0 = unlimited)',
      },
      {
        key: 'events.reminder_hours_before',
        label: 'Reminder Hours Before Event',
        type: 'number',
        placeholder: '24',
        min: 1,
        max: 168,
        desc: 'How many hours before an event to send reminders',
      },
    ],
  },

  // ── 6. Blogs ───────────────────────────────────────────────
  {
    id: 'blogs',
    label: 'Blogs',
    icon: BookOpen,
    description: 'Manage blog publication and comment settings',
    fields: [
      {
        key: 'blogs.require_approval',
        label: 'Require Approval Before Publish',
        type: 'toggle',
        desc: 'Posts need admin approval before going live',
      },
      {
        key: 'blogs.allow_comments',
        label: 'Allow Comments',
        type: 'toggle',
        desc: 'Readers can leave comments on blog posts',
      },
      {
        key: 'blogs.moderate_comments',
        label: 'Moderate Comments',
        type: 'toggle',
        desc: 'Comments are held for review before appearing',
      },
      {
        key: 'blogs.enable_likes',
        label: 'Enable Post Likes',
        type: 'toggle',
        desc: 'Show the like button on blog posts',
      },
      {
        key: 'blogs.max_image_size_mb',
        label: 'Max Blog Image Size (MB)',
        type: 'number',
        placeholder: '5',
        min: 1,
        max: 50,
        desc: 'Maximum upload size for blog images',
      },
    ],
  },

  // ── 7. Notifications ───────────────────────────────────────
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Configure email and in-app notification behaviour',
    fields: [
      { type: 'divider', label: 'Email Notifications' },
      {
        key: 'notifications.email_new_user',
        label: 'New User Registered',
        type: 'toggle',
        desc: 'Email admins when a new user registers',
      },
      {
        key: 'notifications.email_new_application',
        label: 'New Application Submitted',
        type: 'toggle',
        desc: 'Email admins when a membership application is submitted',
      },
      {
        key: 'notifications.email_contact_form',
        label: 'Contact Form Submission',
        type: 'toggle',
        desc: 'Email admins on new contact form submissions',
      },
      {
        key: 'notifications.email_event_reminder',
        label: 'Event Reminder',
        type: 'toggle',
        desc: 'Send reminders to registered users before events',
      },
      {
        key: 'notifications.email_role_change',
        label: 'Role Change Notification',
        type: 'toggle',
        desc: 'Email users when their role is changed',
      },
      { type: 'divider', label: 'In-App Notifications' },
      {
        key: 'notifications.inapp_enabled',
        label: 'Enable In-App Notifications',
        type: 'toggle',
        desc: 'Show notification bell and alerts within the platform',
      },
      {
        key: 'notifications.retention_days',
        label: 'Notification Retention (days)',
        type: 'number',
        placeholder: '30',
        min: 1,
        max: 365,
        desc: 'Automatically delete notifications older than this',
      },
    ],
  },

  // ── 8. Security ────────────────────────────────────────────
  {
    id: 'security',
    label: 'Security',
    icon: ShieldCheck,
    description: 'Account protection and session management settings',
    fields: [
      {
        key: 'security.max_login_attempts',
        label: 'Max Failed Login Attempts',
        type: 'number',
        placeholder: '5',
        min: 1,
        max: 20,
        desc: 'Account locked after this many consecutive failures',
      },
      {
        key: 'security.lock_duration_minutes',
        label: 'Account Lock Duration (min)',
        type: 'number',
        placeholder: '30',
        min: 5,
        max: 1440,
        desc: 'How long an account stays locked after too many failures',
      },
      {
        key: 'security.session_timeout_minutes',
        label: 'Session Timeout (minutes)',
        type: 'number',
        placeholder: '60',
        min: 5,
        max: 1440,
        desc: 'Inactive sessions expire after this duration',
      },
      {
        key: 'security.password_min_length',
        label: 'Minimum Password Length',
        type: 'number',
        placeholder: '8',
        min: 6,
        max: 64,
      },
      {
        key: 'security.require_special_chars',
        label: 'Require Special Characters',
        type: 'toggle',
        desc: 'Passwords must contain at least one special character',
      },
      {
        key: 'security.enable_2fa',
        label: 'Enable Two-Factor Auth',
        type: 'toggle',
        desc: 'Allow users to optionally enable 2FA on their accounts',
      },
    ],
  },

  // ── 9. Maintenance ─────────────────────────────────────────
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    description: 'Control platform maintenance mode',
    fields: [
      {
        key: 'maintenance.enabled',
        label: 'Enable Maintenance Mode',
        type: 'toggle',
        desc: 'Show a maintenance page to all non-admin users',
      },
      {
        key: 'maintenance.message',
        label: 'Maintenance Message',
        type: 'textarea',
        placeholder: 'Custom message shown during maintenance…',
        desc: 'Displayed to visitors during maintenance',
      },
      {
        key: 'maintenance.expected_end',
        label: 'Expected End Time',
        type: 'text',
        placeholder: 'e.g. March 5, 2026 at 10:00 PM BST',
        desc: 'Shown to users so they know when to come back',
      },
    ],
  },
];

// ─── Sidebar groups ───────────────────────────────────────────────────────────

const SIDEBAR_GROUPS = [
  { label: 'Content', ids: ['website', 'pages'] },
  {
    label: 'Platform',
    ids: ['features', 'users', 'applications', 'events', 'blogs'],
  },
  { label: 'System', ids: ['notifications', 'security', 'maintenance'] },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Split flat fields array into labelled groups using divider entries */
function parseFieldGroups(fields) {
  const groups = [];
  let current = { label: null, fields: [] };
  for (const f of fields) {
    if (f.type === 'divider') {
      if (current.fields.length > 0 || current.label !== null)
        groups.push(current);
      current = { label: f.label, fields: [] };
    } else {
      current.fields.push(f);
    }
  }
  if (current.fields.length > 0) groups.push(current);
  return groups;
}

/** Count real (non-divider) fields */
function countFields(section) {
  return section.fields.filter((f) => f.type !== 'divider').length;
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5.5 w-10.5 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.25)]'
          : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm transition-all duration-200 ease-in-out ${
          checked ? 'translate-x-5.5 bg-white' : 'translate-x-0.75 bg-gray-400'
        }`}
      />
    </button>
  );
}

// ─── Field Renderer ───────────────────────────────────────────────────────────

function SettingField({ field, value, onChange, disabled }) {
  if (field.type === 'toggle') {
    return (
      <div className="col-span-full">
        <div
          className={`group flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all duration-150 ${
            value
              ? 'border-blue-500/20 bg-blue-500/4'
              : 'border-white/6 bg-white/1.5 hover:border-white/10 hover:bg-white/3'
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-gray-200">
              {field.label}
            </p>
            {field.desc && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                {field.desc}
              </p>
            )}
          </div>
          <Toggle checked={!!value} onChange={onChange} disabled={disabled} />
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-lg border border-white/8 bg-white/3 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 backdrop-blur-sm transition-all duration-150 focus:border-blue-500/30 focus:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:opacity-40 disabled:cursor-not-allowed';

  const labelEl = (
    <label className="text-xs font-medium tracking-wide text-gray-400">
      {field.label}
    </label>
  );

  const descEl = field.desc ? (
    <p className="text-[11px] leading-relaxed text-gray-600">{field.desc}</p>
  ) : null;

  if (field.type === 'select') {
    return (
      <div className="flex flex-col gap-1.5">
        {labelEl}
        {descEl}
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`${inputCls} cursor-pointer [&>option]:bg-gray-900`}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'color') {
    return (
      <div className="flex flex-col gap-1.5">
        {labelEl}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value ?? '#3b82f6'}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-10 w-14 cursor-pointer rounded-lg border border-white/8 bg-white/3 p-1 disabled:opacity-40"
          />
          <input
            type="text"
            value={value ?? '#3b82f6'}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="#3b82f6"
            className={`${inputCls} font-mono`}
          />
        </div>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="col-span-full flex flex-col gap-1.5">
        {labelEl}
        {descEl}
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={3}
          placeholder={field.placeholder}
          className={`${inputCls} resize-none leading-relaxed`}
        />
      </div>
    );
  }

  if (field.type === 'json') {
    const strValue =
      typeof value === 'string'
        ? value
        : value !== undefined && value !== null
          ? JSON.stringify(value, null, 2)
          : '[]';
    let isValid = true;
    try {
      JSON.parse(strValue);
    } catch {
      isValid = false;
    }
    return (
      <div className="col-span-full flex flex-col gap-1.5">
        {labelEl}
        {descEl}
        <div className="relative">
          <textarea
            value={strValue}
            onChange={(e) => {
              const raw = e.target.value;
              try {
                onChange(JSON.parse(raw));
              } catch {
                onChange(raw);
              }
            }}
            disabled={disabled}
            rows={6}
            placeholder={field.placeholder || '[]'}
            className={`${inputCls} resize-y font-mono text-xs leading-relaxed ${
              !isValid
                ? 'border-red-500/30 focus:border-red-500/50 focus:ring-red-500/15'
                : ''
            }`}
          />
          <div className="absolute right-3 bottom-2 flex items-center gap-1.5">
            {!isValid ? (
              <span className="flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                <AlertCircle className="h-3 w-3" />
                Invalid JSON
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                <Check className="h-3 w-3" />
                Valid
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // text, email, url, number — with optional icon
  const FieldIcon = field.icon;
  return (
    <div className="flex flex-col gap-1.5">
      {labelEl}
      {descEl}
      <div className="relative">
        {FieldIcon && (
          <FieldIcon className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
        )}
        <input
          type={field.type}
          value={value ?? ''}
          onChange={(e) => {
            const v =
              field.type === 'number' ? Number(e.target.value) : e.target.value;
            onChange(v);
          }}
          disabled={disabled}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          className={`${inputCls} ${FieldIcon ? 'pl-9' : ''}`}
        />
      </div>
    </div>
  );
}

// ─── Collapsible Field Group ──────────────────────────────────────────────────

function FieldGroup({
  label,
  fields,
  values,
  onChange,
  disabled,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Ungrouped fields (no divider label)
  if (!label) {
    return fields.map((field) => (
      <SettingField
        key={field.key}
        field={field}
        value={values[field.key]}
        onChange={(val) => onChange(field.key, val)}
        disabled={disabled}
      />
    ));
  }

  const filledCount = fields.filter((f) => {
    const v = values[f.key];
    if (f.type === 'toggle') return !!v;
    if (v === undefined || v === null || v === '') return false;
    return true;
  }).length;

  return (
    <div className="col-span-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group mb-3 flex w-full items-center gap-2 pt-1"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${
            open ? '' : '-rotate-90'
          }`}
        />
        <span className="text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase transition-colors group-hover:text-gray-300">
          {label}
        </span>
        <div className="h-px flex-1 bg-linear-to-r from-white/8 to-transparent" />
        <span className="text-[10px] text-gray-600 tabular-nums">
          {filledCount}/{fields.length}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <SettingField
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(val) => onChange(field.key, val)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Panel ────────────────────────────────────────────────────────────

function SectionPanel({ section, initialSettings }) {
  const router = useRouter();
  const saveRef = useRef(null);

  /* Build initial state from server data */
  const buildInitial = useCallback(() => {
    const s = {};
    section.fields.forEach((f) => {
      if (f.type === 'divider') return;
      if (initialSettings[f.key] !== undefined) {
        s[f.key] = initialSettings[f.key];
      } else if (f.type === 'toggle') {
        s[f.key] = false;
      } else if (f.type === 'number') {
        s[f.key] = 0;
      } else if (f.type === 'json') {
        s[f.key] = [];
      } else {
        s[f.key] = '';
      }
    });
    return s;
  }, [section, initialSettings]);

  const [values, setValues] = useState(buildInitial);
  const [savedSnapshot, setSavedSnapshot] = useState(buildInitial);
  const [msg, setMsg] = useState(null);
  const [isPending, startSave] = useTransition();
  const [search, setSearch] = useState('');

  /* Re-sync when server data changes */
  useEffect(() => {
    const v = buildInitial();
    setValues(v);
    setSavedSnapshot(v);
  }, [initialSettings, buildInitial]);

  /* Dirty check */
  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(savedSnapshot),
    [values, savedSnapshot]
  );

  /* Parse field groups from dividers */
  const fieldGroups = useMemo(
    () => parseFieldGroups(section.fields),
    [section.fields]
  );

  /* Filter groups by search query */
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return fieldGroups;
    const q = search.toLowerCase();
    return fieldGroups
      .map((g) => ({
        ...g,
        fields: g.fields.filter(
          (f) =>
            f.label?.toLowerCase().includes(q) ||
            f.key?.toLowerCase().includes(q) ||
            f.desc?.toLowerCase().includes(q) ||
            f.placeholder?.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.fields.length > 0);
  }, [fieldGroups, search]);

  const totalFields = section.fields.filter((f) => f.type !== 'divider').length;

  function handleChange(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function flash(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  /* Save handler */
  async function handleSave() {
    startSave(async () => {
      for (const f of section.fields) {
        if (f.type === 'json' && typeof values[f.key] === 'string') {
          try {
            JSON.parse(values[f.key]);
          } catch {
            flash('error', `Invalid JSON in "${f.label}". Fix and try again.`);
            return;
          }
        }
      }

      const entries = section.fields
        .filter((f) => f.type !== 'divider')
        .map((f) => {
          let val = values[f.key];
          if (val === undefined || val === null) {
            if (f.type === 'toggle') val = false;
            else if (f.type === 'number') val = 0;
            else if (f.type === 'json') val = [];
            else val = '';
          }
          return {
            key: f.key,
            value:
              typeof val === 'string' && f.type === 'json'
                ? JSON.parse(val)
                : val,
            description: f.desc || null,
            ...(f.category ? { category: f.category } : {}),
          };
        });

      const fd = new FormData();
      fd.set('category', section.id);
      fd.set('entries', JSON.stringify(entries));
      const result = await saveSettingsAction(fd);
      if (result?.error) {
        flash('error', result.error);
      } else {
        flash('success', 'Settings saved');
        setSavedSnapshot({ ...values });
        router.refresh();
      }
    });
  }

  /* Keep a ref to handleSave for keyboard shortcut */
  saveRef.current = handleSave;

  /* Ctrl/Cmd + S to save */
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveRef.current?.();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const SectionIcon = section.icon;

  return (
    <div className="flex flex-col">
      {/* ── Section header ─────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500/15 to-blue-500/5 ring-1 ring-blue-500/20">
            <SectionIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              {section.label}
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              {section.description}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-gray-500 tabular-nums">
          {totalFields} fields
        </span>
      </div>

      {/* ── Search (for sections with many fields) ─────────────── */}
      {totalFields > 8 && (
        <div className="relative mb-5">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${totalFields} settings…`}
            className="w-full rounded-xl border border-white/8 bg-white/3 py-2.5 pr-9 pl-10 text-sm text-gray-200 transition-all placeholder:text-gray-600 focus:border-white/15 focus:bg-white/5 focus:ring-2 focus:ring-blue-500/15 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 text-gray-500 transition-colors hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────── */}
      {msg && (
        <div
          className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            msg.type === 'error'
              ? 'border-red-500/20 bg-red-500/6 text-red-300'
              : 'border-emerald-500/20 bg-emerald-500/6 text-emerald-300'
          }`}
        >
          {msg.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{msg.text}</span>
        </div>
      )}

      {/* ── Field groups ───────────────────────────────────────── */}
      <div className="space-y-5">
        {filteredGroups.map((group, gi) => (
          <FieldGroup
            key={group.label ?? `group-${gi}`}
            label={group.label}
            fields={group.fields}
            values={values}
            onChange={handleChange}
            disabled={isPending}
            defaultOpen={fieldGroups.length <= 4 || gi === 0}
          />
        ))}

        {filteredGroups.length === 0 && search && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Search className="h-8 w-8 text-gray-700" />
            <p className="text-sm text-gray-500">
              No settings match &ldquo;{search}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* ── Sticky save bar (visible when dirty) ───────────────── */}
      <div
        className={`sticky bottom-0 z-10 -mx-5 mt-6 -mb-5 flex items-center justify-between gap-3 border-t border-white/8 bg-gray-950/80 px-5 py-4 backdrop-blur-xl transition-all duration-200 sm:-mx-6 sm:-mb-6 sm:px-6 ${
          isDirty
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 text-[13px] text-gray-400">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Unsaved changes
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setValues(buildInitial());
            }}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400 active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Static footer (when clean) ─────────────────────────── */}
      {!isDirty && (
        <div className="mt-6 flex items-center justify-end border-t border-white/6 pt-5">
          <button
            disabled
            className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-4 py-2 text-[13px] font-medium text-gray-600 opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            All changes saved
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsClient({ initialSettings, adminId }) {
  const [activeSection, setActiveSection] = useState('website');
  const [seeding, startSeed] = useTransition();
  const [seedMsg, setSeedMsg] = useState(null);

  const currentSection = SECTIONS.find((s) => s.id === activeSection);
  const hasSettings = Object.keys(initialSettings).length > 0;

  function handleSeedDefaults() {
    startSeed(async () => {
      const result = await seedDefaultSettingsAction();
      if (result?.error) {
        setSeedMsg({ type: 'error', text: result.error });
      } else {
        setSeedMsg({
          type: 'success',
          text: `Saved ${result.count} default settings. Reloading…`,
        });
        setTimeout(() => window.location.reload(), 1200);
      }
      setTimeout(() => setSeedMsg(null), 4000);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-slate-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-gray-500/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">Settings</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/15 ring-1 ring-slate-500/25">
                <Settings className="h-5 w-5 text-gray-300" />
              </div>
              Settings
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage platform configuration and content
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-300 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white active:scale-[0.98] disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4 text-gray-500" />
              )}
              {seeding
                ? 'Saving…'
                : hasSettings
                  ? 'Reset All to Defaults'
                  : 'Seed Defaults'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Seed message ─────────────────────────────────────────── */}
      {seedMsg && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            seedMsg.type === 'error'
              ? 'border-red-500/20 bg-red-500/6 text-red-300'
              : 'border-emerald-500/20 bg-emerald-500/6 text-emerald-300'
          }`}
        >
          {seedMsg.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          {seedMsg.text}
        </div>
      )}

      {/* ── Empty state CTA ──────────────────────────────────────── */}
      {!hasSettings && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/1.5 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <Sparkles className="h-7 w-7 text-blue-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white">
              No settings configured
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Get started by seeding the default settings. You can customize
              everything after.
            </p>
          </div>
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="mt-2 flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-400 active:scale-[0.98] disabled:opacity-60"
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {seeding ? 'Seeding…' : 'Seed Default Settings'}
          </button>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Sidebar ────────────────────────────────────────────── */}
        <aside className="shrink-0 lg:w-60">
          {/* Mobile: horizontal scroll */}
          <div className="scrollbar-none flex gap-1 overflow-x-auto py-1 lg:hidden">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Desktop: grouped vertical nav */}
          <nav className="hidden space-y-5 lg:block">
            {SIDEBAR_GROUPS.map((group) => {
              const groupSections = group.ids
                .map((id) => SECTIONS.find((s) => s.id === id))
                .filter(Boolean);
              if (groupSections.length === 0) return null;

              return (
                <div key={group.label}>
                  <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {groupSections.map((s) => {
                      const Icon = s.icon;
                      const active = activeSection === s.id;
                      const fc = countFields(s);
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActiveSection(s.id)}
                          className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                            active
                              ? 'bg-white/8 text-white'
                              : 'text-gray-500 hover:bg-white/4 hover:text-gray-300'
                          }`}
                        >
                          {active && (
                            <div className="absolute top-2 bottom-2 left-0 w-0.75 rounded-full bg-blue-500" />
                          )}
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              active
                                ? 'text-blue-400'
                                : 'text-gray-600 group-hover:text-gray-400'
                            }`}
                          />
                          <span className="flex-1 text-left">{s.label}</span>
                          <span
                            className={`text-[10px] tabular-nums transition-colors ${
                              active
                                ? 'text-gray-400'
                                : 'text-gray-700 group-hover:text-gray-500'
                            }`}
                          >
                            {fc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Content ────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/6 bg-white/2 p-5 sm:p-6">
          {currentSection && (
            <SectionPanel
              key={currentSection.id}
              section={currentSection}
              initialSettings={initialSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
}
