/**
 * @file settings actions
 * @module settings-actions
 */

'use server';

import { supabaseAdmin } from './supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from './auth';
import { getUserByEmail } from './data-service';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) throw new Error('Unauthorized');
  const user = await getUserByEmail(session.user.email);
  if (!user || user.account_status !== 'active' || !user.is_online)
    throw new Error('Unauthorized');
  return user;
}

/**
 * Save a batch of settings for a given category.
 * `entries` is an array of { key, value, description?, category? }
 * If a field has its own `category`, it overrides the section-level category.
 */
export async function saveSettingsAction(formData) {
  try {
    const user = await requireAdmin();
    const defaultCategory = formData.get('category');
    const entriesRaw = formData.get('entries');
    if (!defaultCategory || !entriesRaw) return { error: 'Invalid request' };

    const entries = JSON.parse(entriesRaw);

    const rows = entries.map(({ key, value, description, category }) => ({
      key,
      value, // jsonb accepts any JS value
      category: category || defaultCategory,
      description: description || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from('website_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) return { error: error.message };

    // Bust ALL unstable_cache tags so every public page gets fresh data
    revalidateTag('settings');
    revalidateTag('homepage');
    revalidateTag('events');
    revalidateTag('blogs');
    revalidateTag('achievements');
    revalidateTag('gallery');
    revalidateTag('committee');
    revalidateTag('roadmaps');
    revalidateTag('notices');

    // Revalidate all public page routes (Full Route Cache)
    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/events');
    revalidatePath('/achievements');
    revalidatePath('/blogs');
    revalidatePath('/gallery');
    revalidatePath('/committee');
    revalidatePath('/contact');
    revalidatePath('/developers');
    revalidatePath('/join');
    revalidatePath('/roadmaps');
    revalidatePath('/account/admin/settings');

    return { success: true };
  } catch (err) {
    return { error: err.message || 'Failed to save settings' };
  }
}

/**
 * Reset settings in a category (or multiple categories) to their defaults
 * by upserting the matching DEFAULT_SETTINGS entries back into the database.
 */
export async function resetCategoryAction(formData) {
  try {
    const user = await requireAdmin();
    const category = formData.get('category');
    const categoriesRaw = formData.get('categories');
    if (!category && !categoriesRaw) return { error: 'Invalid request' };

    const targetCategories = categoriesRaw
      ? JSON.parse(categoriesRaw)
      : [category];

    // Find matching defaults for these categories
    const defaults = DEFAULT_SETTINGS.filter((s) =>
      targetCategories.includes(s.category)
    );

    if (defaults.length === 0) {
      return { error: 'No default settings found for this category' };
    }

    const rows = defaults.map((s) => ({
      key: s.key,
      value: s.value,
      category: s.category,
      description: s.description || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from('website_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) return { error: error.message };

    revalidateTag('settings');
    revalidateTag('homepage');
    revalidateTag('events');
    revalidateTag('blogs');
    revalidateTag('achievements');
    revalidateTag('gallery');
    revalidateTag('committee');
    revalidateTag('roadmaps');
    revalidateTag('notices');

    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/events');
    revalidatePath('/achievements');
    revalidatePath('/blogs');
    revalidatePath('/gallery');
    revalidatePath('/committee');
    revalidatePath('/contact');
    revalidatePath('/developers');
    revalidatePath('/join');
    revalidatePath('/roadmaps');
    revalidatePath('/account/admin/settings');

    return { success: true, count: rows.length };
  } catch (err) {
    return { error: err.message || 'Failed to reset settings' };
  }
}

// ─── Default settings seed data ────────────────────────────────────────────────

const DEFAULT_SETTINGS = [
  // ── Hero ─────────────────────────────────────────────────────
  {
    key: 'hero_title',
    value: 'Programming Club',
    category: 'hero',
    description: 'Club name displayed in hero section',
  },
  {
    key: 'hero_subtitle',
    value: '(NEUPC)',
    category: 'hero',
    description: 'Subtitle shown below club name',
  },
  {
    key: 'hero_department',
    value: 'Department of Computer Science and Engineering',
    category: 'hero',
    description: 'Department name',
  },
  {
    key: 'hero_university',
    value: 'Netrokona University, Netrokona, Bangladesh',
    category: 'hero',
    description: 'University name and location',
  },

  // ── About ────────────────────────────────────────────────────
  {
    key: 'about_title',
    value: 'Who We Are',
    category: 'about',
    description: 'About section heading',
  },
  {
    key: 'about_description_1',
    value:
      'The Netrokona University Programming Club (NEUPC) is a student-driven community dedicated to fostering a culture of coding, problem-solving, and innovation within the Department of Computer Science and Engineering. We bring together passionate learners and experienced programmers to share knowledge and grow together.',
    category: 'about',
    description: 'First paragraph about the club',
  },
  {
    key: 'about_description_2',
    value:
      'Through regular workshops, competitive programming contests, hackathons, and mentorship programs, we empower students to build strong foundations in algorithms, data structures, and software development — preparing them for academic excellence and successful careers in the tech industry.',
    category: 'about',
    description: 'Second paragraph about the club',
  },
  {
    key: 'about_mission',
    category: 'about',
    description: 'Mission statement points',
    value: [
      'Promote competitive programming and algorithmic thinking among students',
      'Provide mentorship and resources to help beginners grow into skilled programmers',
      'Build a collaborative community that shares knowledge and supports each other',
      'Represent the university in national and international programming competitions',
    ],
  },
  {
    key: 'about_vision',
    category: 'about',
    description: 'Vision statement points',
    value: [
      'To become the leading programming community in the region',
      'To produce world-class competitive programmers from Netrokona University',
      'To bridge the gap between academic learning and industry-ready skills',
      'To inspire a new generation of problem solvers and innovators',
    ],
  },
  {
    key: 'about_what_we_do',
    category: 'about',
    description: 'What we do items',
    value: [
      {
        icon: 'Code',
        title: 'Competitive Programming',
        description:
          'Weekly contests on Codeforces, AtCoder, and LeetCode with leaderboard tracking',
      },
      {
        icon: 'GraduationCap',
        title: 'Workshops & Tutorials',
        description:
          'Regular sessions on algorithms, data structures, web development, and more',
      },
      {
        icon: 'Users',
        title: 'Mentorship Program',
        description:
          'Senior members guide juniors through structured learning paths and code reviews',
      },
      {
        icon: 'Trophy',
        title: 'Hackathons & Events',
        description:
          'Organize and participate in hackathons, coding marathons, and tech talks',
      },
    ],
  },
  {
    key: 'about_stats',
    category: 'about',
    description: 'Club statistics',
    value: [
      { value: '120+', label: 'Active Members', icon: 'Users' },
      { value: '50+', label: 'Contests Hosted', icon: 'Trophy' },
      { value: '30+', label: 'Workshops Done', icon: 'BookOpen' },
      { value: '15+', label: 'National Awards', icon: 'Award' },
    ],
  },
  {
    key: 'about_core_values',
    category: 'about',
    description: 'Core values / principles',
    value: [
      { label: 'Discipline & Professionalism', icon: 'Shield' },
      { label: 'Ethical Conduct', icon: 'Heart' },
      { label: 'Zero Tolerance for Discrimination', icon: 'Users' },
      { label: 'Transparency in Finances', icon: 'BookOpen' },
      { label: 'Non-political Structure', icon: 'Globe' },
      { label: 'Non-profit Organization', icon: 'Award' },
    ],
  },
  {
    key: 'about_org_structure',
    category: 'about',
    description: 'Organizational structure items',
    value: [
      {
        title: 'Faculty Advisors',
        description: 'Lecturers from the Department of CSE',
        icon: 'GraduationCap',
        color: 'primary',
      },
      {
        title: 'Executive Committee',
        description:
          'President, Vice President, Secretary, and other officers',
        icon: 'Briefcase',
        color: 'secondary',
      },
      {
        title: 'Mentors',
        description: 'Senior students and alumni',
        icon: 'Star',
        color: 'primary',
      },
      {
        title: 'Members',
        description: 'Active student participants',
        icon: 'Users',
        color: 'secondary',
      },
    ],
  },
  {
    key: 'about_org_financial_note',
    category: 'about',
    description: 'Financial note shown below org structure',
    value:
      'All financial transactions require official signatory approval and are maintained transparently according to club policy.',
  },
  {
    key: 'about_skills',
    category: 'about',
    description: 'Skills / why programming matters items',
    value: [
      { icon: 'Target', label: 'Logical reasoning' },
      { icon: 'Cpu', label: 'Structured thinking' },
      { icon: 'Monitor', label: 'Analytical problem solving' },
      { icon: 'Globe', label: 'Real-world solution building' },
    ],
  },
  {
    key: 'about_skills_description',
    category: 'about',
    description: 'Paragraph below skills section',
    value:
      'Through consistent practice and mentorship, the Programming Club helps students transform from beginners into confident programmers ready for competitive and professional challenges.',
  },
  {
    key: 'about_wie_title',
    category: 'about',
    description: 'Women in Engineering section title',
    value: 'Women in Engineering',
  },
  {
    key: 'about_wie_description',
    category: 'about',
    description: 'Women in Engineering section description',
    value:
      'The Programming Club runs a dedicated Women in Engineering (WIE) branch to encourage female participation in programming and leadership roles. This branch organizes focused sessions, mentoring programs, and awareness initiatives to create an inclusive technical environment.',
  },
  {
    key: 'about_mentorship_title',
    category: 'about',
    description: 'Mentorship section title',
    value: 'Mentorship & Guidance',
  },
  {
    key: 'about_mentorship_description',
    category: 'about',
    description: 'Mentorship section intro text',
    value:
      'The club is supported by faculty advisors and experienced mentors who guide students in:',
  },
  {
    key: 'about_mentorship_areas',
    category: 'about',
    description: 'Mentorship focus areas list',
    value: [
      'Competitive programming strategies',
      'Academic development',
      'Career direction',
      'Project building',
    ],
  },

  // ── Social Media ─────────────────────────────────────────────
  {
    key: 'social_facebook',
    value: 'https://facebook.com/neupc',
    category: 'social',
    description: 'Facebook page URL',
  },
  {
    key: 'social_github',
    value: 'https://github.com/neupc',
    category: 'social',
    description: 'GitHub organization URL',
  },
  {
    key: 'social_linkedin',
    value: 'https://linkedin.com/company/neupc',
    category: 'social',
    description: 'LinkedIn page URL',
  },
  {
    key: 'social_youtube',
    value: 'https://youtube.com/@neupc',
    category: 'social',
    description: 'YouTube channel URL',
  },
  {
    key: 'social_twitter',
    value: 'https://x.com/neupc',
    category: 'social',
    description: 'Twitter/X profile URL',
  },
  {
    key: 'social_instagram',
    value: 'https://instagram.com/neupc',
    category: 'social',
    description: 'Instagram profile URL',
  },

  // ── Contact ──────────────────────────────────────────────────
  {
    key: 'contact_email',
    value: 'neupc@neu.ac.bd',
    category: 'contact',
    description: 'Primary contact email',
  },
  {
    key: 'contact_phone',
    value: '+880 1712-345678',
    category: 'contact',
    description: 'Contact phone number',
  },
  {
    key: 'contact_address',
    value:
      'Department of CSE, Netrokona University, Netrokona-2400, Bangladesh',
    category: 'contact',
    description: 'Physical address',
  },
  {
    key: 'contact_office_hours',
    value: 'Sunday - Thursday, 10:00 AM - 4:00 PM',
    category: 'contact',
    description: 'Office hours',
  },
  {
    key: 'contact_subjects',
    category: 'contact',
    description: 'Contact form subject options',
    value: [
      'General Inquiry',
      'Membership',
      'Event Collaboration',
      'Sponsorship',
      'Technical Support',
      'Feedback & Suggestions',
      'Other',
    ],
  },

  // ── Footer ───────────────────────────────────────────────────
  {
    key: 'footer_description',
    value:
      'NEUPC is the official programming club of Netrokona University, empowering students through competitive programming, workshops, and a vibrant tech community.',
    category: 'footer',
    description: 'Short footer description',
  },

  // ── Content (FAQs, Join, Developers) ─────────────────────────
  {
    key: 'faqs',
    category: 'content',
    description: 'FAQ items',
    value: [
      {
        question: 'Who can join NEUPC?',
        answer:
          'Any student of Netrokona University, regardless of department, who is passionate about programming and problem-solving can apply for membership.',
      },
      {
        question: 'Do I need prior programming experience?',
        answer:
          'Not at all! We welcome complete beginners. Our mentorship program and beginner-friendly workshops will help you get started from scratch.',
      },
      {
        question: 'How often are contests held?',
        answer:
          'We host internal contests bi-weekly and participate in external contests on platforms like Codeforces, AtCoder, and LeetCode every week.',
      },
      {
        question: 'Is there a membership fee?',
        answer:
          'No, NEUPC membership is completely free. We believe knowledge and opportunity should be accessible to everyone.',
      },
      {
        question: 'How can I become a mentor?',
        answer:
          'Active members who have demonstrated strong problem-solving skills and a willingness to help others can apply for mentor roles through the platform.',
      },
    ],
  },
  {
    key: 'join_benefits',
    category: 'content',
    description: 'Membership benefits',
    value: [
      {
        icon: 'Zap',
        title: 'Contest Access',
        description:
          'Participate in exclusive internal contests and team selections for nationals',
      },
      {
        icon: 'BookOpen',
        title: 'Learning Resources',
        description:
          'Access curated problem sets, tutorials, and editorial solutions',
      },
      {
        icon: 'Users',
        title: 'Mentorship',
        description:
          'Get paired with experienced mentors for personalized guidance',
      },
      {
        icon: 'Award',
        title: 'Certificates',
        description:
          'Earn certificates for contest participation, workshops, and achievements',
      },
      {
        icon: 'MessageSquare',
        title: 'Community Chat',
        description:
          'Connect with fellow programmers through our real-time messaging platform',
      },
      {
        icon: 'Calendar',
        title: 'Priority Registration',
        description:
          'Get early access to workshops, hackathons, and special events',
      },
    ],
  },
  {
    key: 'join_features',
    category: 'content',
    description: 'Public account features',
    value: [
      {
        icon: 'Eye',
        title: 'Browse Events',
        description: 'View upcoming events, workshops, and contests',
      },
      {
        icon: 'BookOpen',
        title: 'Read Blogs',
        description: 'Access published articles and tutorials from our members',
      },
      {
        icon: 'Image',
        title: 'View Gallery',
        description: 'Explore photos from past events and activities',
      },
      {
        icon: 'Send',
        title: 'Contact Us',
        description: 'Reach out to the club through our contact form',
      },
    ],
  },
  {
    key: 'developers_core',
    category: 'content',
    description: 'Core developers',
    value: [
      {
        name: 'Emdadul Haque Yasir',
        role: 'Lead Developer',
        bio: 'Full-stack developer passionate about building tools for the programming community.',
        stack: ['Next.js', 'React', 'Supabase', 'Tailwind CSS'],
        github: 'https://github.com/eyasir329',
        linkedin: '',
        portfolio: '',
        photo: '',
      },
    ],
  },
  {
    key: 'developers_contributors',
    category: 'content',
    description: 'Contributors list',
    value: [
      {
        name: 'Contributor 1',
        role: 'Frontend Developer',
        contribution: 'UI components and responsive design',
        github: '',
      },
      {
        name: 'Contributor 2',
        role: 'Backend Developer',
        contribution: 'API routes and database schema',
        github: '',
      },
    ],
  },
  {
    key: 'tech_stack',
    category: 'content',
    description: 'Technology stack',
    value: [
      {
        category: 'Frontend',
        items: [
          {
            name: 'Next.js 15',
            description: 'React framework with App Router and Server Actions',
            icon: 'Globe',
          },
          {
            name: 'React 19',
            description: 'Component-based UI library',
            icon: 'Code',
          },
          {
            name: 'Tailwind CSS',
            description: 'Utility-first CSS framework',
            icon: 'Palette',
          },
          {
            name: 'Lucide Icons',
            description: 'Beautiful open-source icon library',
            icon: 'Smile',
          },
        ],
      },
      {
        category: 'Backend & Database',
        items: [
          {
            name: 'Supabase',
            description:
              'PostgreSQL database with real-time subscriptions and auth',
            icon: 'Database',
          },
          {
            name: 'NextAuth.js',
            description: 'Authentication with Google OAuth and credentials',
            icon: 'Shield',
          },
          {
            name: 'Server Actions',
            description: 'Type-safe server mutations without API routes',
            icon: 'Server',
          },
        ],
      },
      {
        category: 'DevOps & Tools',
        items: [
          {
            name: 'Vercel',
            description: 'Deployment and hosting platform',
            icon: 'Cloud',
          },
          {
            name: 'ESLint',
            description: 'Code quality and consistency',
            icon: 'CheckCircle',
          },
          {
            name: 'Git & GitHub',
            description: 'Version control and collaboration',
            icon: 'GitBranch',
          },
        ],
      },
    ],
  },
  {
    key: 'developers_timeline',
    category: 'content',
    description: 'Development timeline',
    value: [
      {
        year: '2024',
        title: 'Project Inception',
        description: 'Initial idea and planning for the NEUPC platform',
        status: 'completed',
      },
      {
        year: '2024',
        title: 'Core Platform Development',
        description:
          'Built authentication, user management, and admin dashboard',
        status: 'completed',
      },
      {
        year: '2025',
        title: 'Feature Expansion',
        description:
          'Added events, blogs, gallery, mentorship, and contest tracking',
        status: 'completed',
      },
      {
        year: '2025',
        title: 'Community Launch',
        description: 'Public release and onboarding of first batch of members',
        status: 'completed',
      },
      {
        year: '2026',
        title: 'Advanced Features',
        description:
          'Chat system, certificates, budget management, and analytics',
        status: 'in-progress',
      },
      {
        year: '2026',
        title: 'Mobile App',
        description: 'Native mobile application for iOS and Android',
        status: 'planned',
      },
    ],
  },
  {
    key: 'github_stats',
    value: { commits: 850, contributors: 5, stars: 12, forks: 3 },
    category: 'content',
    description: 'GitHub statistics',
  },

  // ── Page Content (headings, badges, CTAs) ────────────────────
  {
    key: 'hero_welcome_text',
    value: 'Welcome to',
    category: 'page_content',
    description: 'Text shown before the site name in the hero',
  },
  {
    key: 'hero_join_label',
    value: 'Join Now',
    category: 'page_content',
    description: 'Hero section join button label',
  },
  {
    key: 'hero_learn_more_label',
    value: 'Learn More',
    category: 'page_content',
    description: 'Hero section learn more button label',
  },
  {
    key: 'homepage_about_badge',
    value: 'About Us',
    category: 'page_content',
    description: 'Homepage about section badge text',
  },
  {
    key: 'homepage_about_title',
    value: 'Get to Know NEUPC',
    category: 'page_content',
    description: 'Homepage about section title',
  },
  {
    key: 'homepage_about_subtitle',
    value:
      'Learn about our mission, vision, and the amazing community we have built at Netrokona University Programming Club',
    category: 'page_content',
    description: 'Homepage about section subtitle',
  },
  {
    key: 'homepage_about_cta',
    value: 'Learn More About Us',
    category: 'page_content',
    description: 'Homepage about section CTA button text',
  },
  {
    key: 'homepage_events_badge',
    value: 'Upcoming Events',
    category: 'page_content',
    description: 'Homepage events section badge text',
  },
  {
    key: 'homepage_events_title',
    value: 'Recent Events',
    category: 'page_content',
    description: 'Homepage events section title',
  },
  {
    key: 'homepage_events_subtitle',
    value:
      'Join our upcoming workshops, contests, and tech talks to enhance your skills and connect with the community',
    category: 'page_content',
    description: 'Homepage events section subtitle',
  },
  {
    key: 'homepage_events_cta',
    value: 'View All Events',
    category: 'page_content',
    description: 'Homepage events section CTA button text',
  },
  {
    key: 'events_empty_message',
    value: 'No upcoming events at the moment. Check back soon!',
    category: 'page_content',
    description: 'Message shown when no events are available',
  },
  {
    key: 'homepage_achievements_badge',
    value: 'Our Achievements',
    category: 'page_content',
    description: 'Homepage achievements section badge text',
  },
  {
    key: 'homepage_achievements_title',
    value: 'Excellence in Action',
    category: 'page_content',
    description: 'Homepage achievements section title',
  },
  {
    key: 'homepage_achievements_subtitle',
    value:
      'Celebrating our journey of competitive programming success and innovation',
    category: 'page_content',
    description: 'Homepage achievements section subtitle',
  },
  {
    key: 'homepage_achievements_cta',
    value: 'View All Achievements',
    category: 'page_content',
    description: 'Homepage achievements section CTA button text',
  },
  {
    key: 'achievements_empty_message',
    value: 'No achievements to display yet.',
    category: 'page_content',
    description: 'Message shown when no achievements are available',
  },
  {
    key: 'homepage_blogs_badge',
    value: 'Latest Articles & Resources',
    category: 'page_content',
    description: 'Homepage blog section badge text',
  },
  {
    key: 'homepage_blogs_title',
    value: 'Knowledge Base',
    category: 'page_content',
    description: 'Homepage blog section title',
  },
  {
    key: 'homepage_blogs_subtitle',
    value:
      'Explore tutorials, contest insights, career guidance, and community stories',
    category: 'page_content',
    description: 'Homepage blog section subtitle',
  },
  {
    key: 'homepage_blogs_cta',
    value: 'Explore All Articles',
    category: 'page_content',
    description: 'Homepage blog section CTA button text',
  },
  {
    key: 'blogs_empty_message',
    value: 'No blog posts available yet. Check back soon!',
    category: 'page_content',
    description: 'Message shown when no blog posts are available',
  },
  {
    key: 'homepage_join_badge',
    value: 'Join Our Community',
    category: 'page_content',
    description: 'Homepage join section badge text',
  },
  {
    key: 'homepage_join_title',
    value: 'Become a Member',
    category: 'page_content',
    description: 'Homepage join section title',
  },
  {
    key: 'homepage_join_subtitle',
    value:
      'Join NEUPC and unlock your potential in competitive programming, software development, and tech innovation',
    category: 'page_content',
    description: 'Homepage join section subtitle',
  },
  {
    key: 'homepage_join_cta_title',
    value: 'Ready to Start Your Journey?',
    category: 'page_content',
    description: 'Homepage join CTA title',
  },
  {
    key: 'homepage_join_cta_description',
    value:
      'Join hundreds of students who are already part of NEUPC and take your programming skills to the next level',
    category: 'page_content',
    description: 'Homepage join CTA description',
  },
  {
    key: 'homepage_join_cta_button',
    value: 'Join NEUPC Now',
    category: 'page_content',
    description: 'Homepage join CTA button text',
  },
  {
    key: 'site_name_full',
    value: 'Netrokona University Programming Club',
    category: 'page_content',
    description: 'Full site name shown in footer',
  },
  {
    key: 'footer_developer_credit',
    value: 'Made with ❤️ by NEUPC Developers',
    category: 'page_content',
    description: 'Developer credit text in footer',
  },
  {
    key: 'about_page_badge',
    value: '🎓 Student Organization',
    category: 'page_content',
    description: 'About page hero badge',
  },
  {
    key: 'about_page_title',
    value: 'About NEUPC',
    category: 'page_content',
    description: 'About page hero title',
  },
  {
    key: 'about_page_subtitle',
    value: 'Netrokona University Programming Club',
    category: 'page_content',
    description: 'About page hero subtitle',
  },
  {
    key: 'about_page_department',
    value: 'Department of Computer Science and Engineering',
    category: 'page_content',
    description: 'About page department name',
  },
  {
    key: 'about_page_cta_title',
    value: 'Ready to Join Us?',
    category: 'page_content',
    description: 'About page CTA title',
  },
  {
    key: 'about_page_cta_description',
    value:
      'Become part of a community dedicated to excellence in programming and innovation.',
    category: 'page_content',
    description: 'About page CTA description',
  },
  {
    key: 'contact_page_badge',
    value: 'Contact Us',
    category: 'page_content',
    description: 'Contact page hero badge',
  },
  {
    key: 'contact_page_title',
    value: 'Get in Touch',
    category: 'page_content',
    description: 'Contact page hero title',
  },
  {
    key: 'contact_page_description',
    value:
      "Have questions, ideas, or collaboration proposals? We'd love to hear from you. Reach out and let's build something amazing together.",
    category: 'page_content',
    description: 'Contact page hero description',
  },
  {
    key: 'contact_page_cta_title',
    value: 'Ready to Get Started?',
    category: 'page_content',
    description: 'Contact page CTA title',
  },
  {
    key: 'contact_page_cta_description',
    value:
      "Whether you're a student looking to join, a company interested in collaboration, or just want to say hello — we're here to help.",
    category: 'page_content',
    description: 'Contact page CTA description',
  },
  {
    key: 'events_page_badge',
    value: 'Upcoming Events',
    category: 'page_content',
    description: 'Events page hero badge',
  },
  {
    key: 'events_page_title',
    value: 'Events & Activities',
    category: 'page_content',
    description: 'Events page hero title',
  },
  {
    key: 'events_page_description',
    value:
      'Join us for exciting programming contests, workshops, bootcamps, and tech talks designed to enhance your skills and connect with fellow developers.',
    category: 'page_content',
    description: 'Events page hero description',
  },
  {
    key: 'events_page_subtitle',
    value:
      'From ICPC preparation to beginner-friendly sessions, we organize events that cater to programmers of all skill levels.',
    category: 'page_content',
    description: 'Events page hero subtitle',
  },
  {
    key: 'events_page_cta_title',
    value: "Don't Miss Out!",
    category: 'page_content',
    description: 'Events page CTA title',
  },
  {
    key: 'events_page_cta_description',
    value:
      'Stay updated with our latest events and activities. Join our community to receive notifications.',
    category: 'page_content',
    description: 'Events page CTA description',
  },
  {
    key: 'achievements_page_badge',
    value: 'Excellence & Achievements',
    category: 'page_content',
    description: 'Achievements page hero badge',
  },
  {
    key: 'achievements_page_title',
    value: 'Our Achievements',
    category: 'page_content',
    description: 'Achievements page hero title',
  },
  {
    key: 'achievements_page_description',
    value:
      'Celebrating excellence in competitive programming, innovation, and academic growth',
    category: 'page_content',
    description: 'Achievements page hero description',
  },
  {
    key: 'achievements_page_cta_title',
    value: 'Ready to Make Your Mark?',
    category: 'page_content',
    description: 'Achievements page CTA title',
  },
  {
    key: 'achievements_page_cta_description',
    value:
      'Join NEUPC today and be part of our legacy of excellence in competitive programming and technology.',
    category: 'page_content',
    description: 'Achievements page CTA description',
  },
  {
    key: 'blogs_page_badge',
    value: 'Knowledge Hub',
    category: 'page_content',
    description: 'Blogs page hero badge',
  },
  {
    key: 'blogs_page_title',
    value: 'Programming Insights & Updates',
    category: 'page_content',
    description: 'Blogs page hero title',
  },
  {
    key: 'blogs_page_description',
    value:
      'Explore tutorials, contest insights, club updates, and career guidance from our programming community',
    category: 'page_content',
    description: 'Blogs page hero description',
  },
  {
    key: 'gallery_page_badge',
    value: 'Photo Gallery',
    category: 'page_content',
    description: 'Gallery page hero badge',
  },
  {
    key: 'gallery_page_title',
    value: 'Moments That Define Us',
    category: 'page_content',
    description: 'Gallery page hero title',
  },
  {
    key: 'gallery_page_description',
    value:
      'Capturing innovation, teamwork, and excellence at Netrokona University Programming Club. Every photo tells a story of growth, learning, and community.',
    category: 'page_content',
    description: 'Gallery page hero description',
  },
  {
    key: 'gallery_page_cta_title',
    value: 'Join the Programming Club Today',
    category: 'page_content',
    description: 'Gallery page CTA section title',
  },
  {
    key: 'gallery_page_cta_description',
    value:
      'Be part of creating these memorable moments. Join us in our next competition, workshop, or community event.',
    category: 'page_content',
    description: 'Gallery page CTA section description',
  },
  {
    key: 'committee_page_badge',
    value: 'Leadership Team 2025-2026',
    category: 'page_content',
    description: 'Committee page hero badge',
  },
  {
    key: 'committee_page_title',
    value: 'Meet the Committee',
    category: 'page_content',
    description: 'Committee page hero title',
  },
  {
    key: 'committee_page_description',
    value:
      'The dedicated team leading the Netrokona University Programming Club towards excellence in competitive programming and software development.',
    category: 'page_content',
    description: 'Committee page hero description',
  },
  {
    key: 'committee_page_cta_title',
    value: 'Want to Lead with Us?',
    category: 'page_content',
    description: 'Committee page CTA title',
  },
  {
    key: 'committee_page_cta_description',
    value:
      'Applications for the next committee term open soon. Be part of shaping the future of programming at Netrokona University.',
    category: 'page_content',
    description: 'Committee page CTA description',
  },
  {
    key: 'developers_page_badge',
    value: 'Development Team',
    category: 'page_content',
    description: 'Developers page hero badge',
  },
  {
    key: 'developers_page_title',
    value: 'Meet the Developers',
    category: 'page_content',
    description: 'Developers page hero title',
  },
  {
    key: 'developers_page_description',
    value:
      'The minds behind the digital platform of Netrokona University Programming Club. Passionate developers building the future of our community.',
    category: 'page_content',
    description: 'Developers page hero description',
  },
  {
    key: 'developers_page_cta_title',
    value: 'Want to Contribute?',
    category: 'page_content',
    description: 'Developers page CTA title',
  },
  {
    key: 'developers_page_cta_description',
    value:
      'This project follows collaborative development practices. Contributions from club members are welcomed through GitHub.',
    category: 'page_content',
    description: 'Developers page CTA description',
  },
  {
    key: 'join_page_badge',
    value: 'Public Account',
    category: 'page_content',
    description: 'Join page hero badge',
  },
  {
    key: 'join_page_title',
    value: 'Create Your Public Account',
    category: 'page_content',
    description: 'Join page hero title',
  },
  {
    key: 'join_page_description',
    value:
      'Stay updated with events, contests, and workshops at Netrokona University Programming Club',
    category: 'page_content',
    description: 'Join page hero description',
  },
  {
    key: 'roadmaps_page_badge',
    value: 'Learning Pathways',
    category: 'page_content',
    description: 'Roadmaps page hero badge',
  },
  {
    key: 'roadmaps_page_title',
    value: 'Club Learning Roadmaps',
    category: 'page_content',
    description: 'Roadmaps page hero title',
  },
  {
    key: 'roadmaps_page_description',
    value:
      'Structured pathways to become a skilled developer, problem solver, and tech leader',
    category: 'page_content',
    description: 'Roadmaps page hero description',
  },
  {
    key: 'roadmaps_page_cta_title',
    value: 'Ready to Start Your Journey?',
    category: 'page_content',
    description: 'Roadmaps page CTA title',
  },
  {
    key: 'roadmaps_page_cta_description',
    value:
      'Join NEUPC today and accelerate your learning with structured guidance and mentorship.',
    category: 'page_content',
    description: 'Roadmaps page CTA description',
  },

  // ── Feature Toggles ──────────────────────────────────────────
  {
    key: 'features.chat_enabled',
    value: true,
    category: 'features',
    description: 'Enable real-time direct messaging and support tickets',
  },
  {
    key: 'features.discussions_enabled',
    value: true,
    category: 'features',
    description: 'Enable threaded discussion forum for members',
  },
  {
    key: 'features.mentorship_enabled',
    value: true,
    category: 'features',
    description: 'Enable mentor-mentee assignments, tasks, and sessions',
  },
  {
    key: 'features.contests_enabled',
    value: true,
    category: 'features',
    description:
      'Enable multi-platform competitive programming contest tracking',
  },
  {
    key: 'features.resources_enabled',
    value: true,
    category: 'features',
    description: 'Enable the shared resource/link library',
  },
  {
    key: 'features.roadmaps_enabled',
    value: true,
    category: 'features',
    description: 'Enable learning path roadmaps for members',
  },
  {
    key: 'features.gallery_enabled',
    value: true,
    category: 'features',
    description: 'Enable the photo gallery for events and activities',
  },
  {
    key: 'features.achievements_enabled',
    value: true,
    category: 'features',
    description: 'Enable the achievements/results showcase',
  },
  {
    key: 'features.notices_enabled',
    value: true,
    category: 'features',
    description: 'Enable the announcements and notice board',
  },
  {
    key: 'features.certificates_enabled',
    value: true,
    category: 'features',
    description: 'Enable issuing and verifying event certificates',
  },
  {
    key: 'features.budget_enabled',
    value: true,
    category: 'features',
    description: 'Enable income/expense tracking and budget management',
  },

  // ── Users & Access ───────────────────────────────────────────
  {
    key: 'users.registration_enabled',
    value: true,
    category: 'users',
    description: 'Allow new user registrations',
  },
  {
    key: 'users.require_email_verification',
    value: true,
    category: 'users',
    description: 'Require email verification before access',
  },
  {
    key: 'users.allow_google_login',
    value: true,
    category: 'users',
    description: 'Enable Google sign-in',
  },
  {
    key: 'users.default_role',
    value: 'guest',
    category: 'users',
    description: 'Default role for new users',
  },
  {
    key: 'users.public_profiles',
    value: false,
    category: 'users',
    description: 'Member profiles visible without login',
  },

  // ── Applications ─────────────────────────────────────────────
  {
    key: 'applications.accept_applications',
    value: true,
    category: 'applications',
    description: 'Accept membership applications',
  },
  {
    key: 'applications.auto_approve',
    value: false,
    category: 'applications',
    description: 'Auto-approve submitted applications',
  },
  {
    key: 'applications.require_login',
    value: true,
    category: 'applications',
    description: 'Require login before applying',
  },
  {
    key: 'applications.max_per_year',
    value: 100,
    category: 'applications',
    description: 'Max applications accepted per year',
  },

  // ── Events ───────────────────────────────────────────────────
  {
    key: 'events.allow_external_registration',
    value: true,
    category: 'events',
    description: 'Allow external registration URLs',
  },
  {
    key: 'events.allow_rsvp_cancellation',
    value: true,
    category: 'events',
    description: 'Allow RSVP cancellation',
  },
  {
    key: 'events.registration_required_default',
    value: false,
    category: 'events',
    description: 'New events require registration by default',
  },
  {
    key: 'events.default_max_participants',
    value: 0,
    category: 'events',
    description: 'Default max participants (0 = unlimited)',
  },
  {
    key: 'events.reminder_hours_before',
    value: 24,
    category: 'events',
    description: 'Hours before event to send reminders',
  },

  // ── Blogs ────────────────────────────────────────────────────
  {
    key: 'blogs.require_approval',
    value: true,
    category: 'blogs',
    description: 'Require admin approval before publishing',
  },
  {
    key: 'blogs.allow_comments',
    value: true,
    category: 'blogs',
    description: 'Allow comments on blog posts',
  },
  {
    key: 'blogs.moderate_comments',
    value: true,
    category: 'blogs',
    description: 'Hold comments for review',
  },
  {
    key: 'blogs.enable_likes',
    value: true,
    category: 'blogs',
    description: 'Show like button on posts',
  },
  {
    key: 'blogs.max_image_size_mb',
    value: 5,
    category: 'blogs',
    description: 'Max blog image upload size in MB',
  },

  // ── Notifications ────────────────────────────────────────────
  {
    key: 'notifications.email_new_user',
    value: true,
    category: 'notifications',
    description: 'Email admins on new registration',
  },
  {
    key: 'notifications.email_new_application',
    value: true,
    category: 'notifications',
    description: 'Email admins on new application',
  },
  {
    key: 'notifications.email_contact_form',
    value: true,
    category: 'notifications',
    description: 'Email admins on contact form submission',
  },
  {
    key: 'notifications.email_event_reminder',
    value: true,
    category: 'notifications',
    description: 'Send event reminders to registered users',
  },
  {
    key: 'notifications.email_role_change',
    value: false,
    category: 'notifications',
    description: 'Email users on role change',
  },
  {
    key: 'notifications.inapp_enabled',
    value: true,
    category: 'notifications',
    description: 'Enable in-app notifications',
  },
  {
    key: 'notifications.retention_days',
    value: 30,
    category: 'notifications',
    description: 'Auto-delete notifications after N days',
  },

  // ── Security ─────────────────────────────────────────────────
  {
    key: 'security.max_login_attempts',
    value: 5,
    category: 'security',
    description: 'Lock account after N failed logins',
  },
  {
    key: 'security.lock_duration_minutes',
    value: 30,
    category: 'security',
    description: 'Account lock duration in minutes',
  },
  {
    key: 'security.session_timeout_minutes',
    value: 60,
    category: 'security',
    description: 'Inactive session timeout in minutes',
  },
  {
    key: 'security.password_min_length',
    value: 8,
    category: 'security',
    description: 'Minimum password length',
  },
  {
    key: 'security.require_special_chars',
    value: false,
    category: 'security',
    description: 'Require special characters in password',
  },
  {
    key: 'security.enable_2fa',
    value: false,
    category: 'security',
    description: 'Allow users to enable 2FA',
  },

  // ── Maintenance ──────────────────────────────────────────────
  {
    key: 'maintenance.enabled',
    value: false,
    category: 'maintenance',
    description: 'Enable maintenance mode',
  },
  {
    key: 'maintenance.message',
    value:
      'We are currently performing scheduled maintenance. Please check back soon.',
    category: 'maintenance',
    description: 'Message shown during maintenance',
  },
  {
    key: 'maintenance.expected_end',
    value: '',
    category: 'maintenance',
    description: 'Expected maintenance end time',
  },
];

/**
 * Seed all default settings into the database.
 * Overwrites any existing settings with the default values.
 */
export async function seedDefaultSettingsAction() {
  try {
    const user = await requireAdmin();

    const rows = DEFAULT_SETTINGS.map((s) => ({
      key: s.key,
      value: s.value,
      category: s.category,
      description: s.description || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from('website_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) return { error: error.message };

    revalidateTag('settings');
    revalidateTag('homepage');
    revalidateTag('events');
    revalidateTag('blogs');
    revalidateTag('achievements');
    revalidateTag('gallery');
    revalidateTag('committee');
    revalidateTag('roadmaps');
    revalidateTag('notices');

    revalidatePath('/');
    revalidatePath('/about');
    revalidatePath('/events');
    revalidatePath('/achievements');
    revalidatePath('/blogs');
    revalidatePath('/gallery');
    revalidatePath('/committee');
    revalidatePath('/contact');
    revalidatePath('/developers');
    revalidatePath('/join');
    revalidatePath('/roadmaps');
    revalidatePath('/account/admin/settings');

    return { success: true, count: rows.length };
  } catch (err) {
    return { error: err.message || 'Failed to seed default settings' };
  }
}
