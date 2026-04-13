/**
 * @file Sidebar navigation configuration with grouped sections.
 * Returns role-specific navigation items organized into logical groups
 * for a professional dashboard sidebar experience.
 *
 * @module sidebarConfig
 */

import {
  Calendar,
  Trophy,
  Bell,
  User,
  Home,
  Settings,
  Award,
  Users,
  Shield,
  FileText,
  BookOpen,
  Target,
  BarChart,
  Briefcase,
  MessageSquare,
  Image,
  Layout,
  CheckSquare,
  TrendingUp,
  DollarSign,
  ClipboardCheck,
  Database,
  Lock,
  Download,
  FolderOpen,
  Code,
  MapPin,
  Megaphone,
  Mail,
  PenTool,
  BarChart3,
  Sparkles,
  GraduationCap,
  Layers,
  Activity,
  HelpCircle,
} from 'lucide-react';

/**
 * Returns grouped sidebar navigation for the given role.
 *
 * Each group has:
 *  - `key`   — unique identifier
 *  - `label` — section heading (shown when expanded)
 *  - `items` — array of nav items
 *
 * Each item has:
 *  - `id`, `label`, `icon`, `href`
 *  - optional: `badge`, `badgeType`, `condition`
 *
 * @param {string} activeRole
 * @param {object} stats
 * @param {object} session
 * @returns {Array<{key:string, label:string, items:Array}>}
 */
export function getSidebarNavigation(activeRole, stats, session) {
  const baseRole = activeRole || null;

  const configs = {
    // ─── Guest ────────────────────────────────────────────────────────────
    guest: [
      {
        key: 'overview',
        label: 'Overview',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
            href: '/account/guest',
          },
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            href: '/account/guest/notifications',
            badge: stats.notifications,
            badgeType: 'alert',
          },
        ],
      },
      {
        key: 'explore',
        label: 'Explore',
        items: [
          {
            id: 'events',
            label: 'Browse Events',
            icon: Calendar,
            href: '/account/guest/events',
            badge: stats.upcomingEvents,
            condition: ({ stats }) => stats.upcomingEvents > 0,
          },
          {
            id: 'resources',
            label: 'Resources',
            icon: BookOpen,
            href: '/account/guest/resources',
          },
          {
            id: 'participation',
            label: 'My Participations',
            icon: Trophy,
            href: '/account/guest/participation',
            badge: stats.participationCount,
            condition: ({ stats }) => stats.participationCount > 0,
          },
        ],
      },
      {
        key: 'membership',
        label: 'Membership',
        items: [
          {
            id: 'membership-application',
            label: 'Apply for Membership',
            icon: FileText,
            href: '/account/guest/membership-application',
          },
        ],
      },
      {
        key: 'account',
        label: 'Account',
        items: [
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            href: '/account/guest/profile',
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            href: '/account/guest/settings',
          },
        ],
      },
    ],

    // ─── Member ───────────────────────────────────────────────────────────
    member: [
      {
        key: 'overview',
        label: 'Overview',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
            href: '/account/member',
          },
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            href: '/account/member/notifications',
            badge: stats.notifications,
            badgeType: 'alert',
          },
        ],
      },
      {
        key: 'activities',
        label: 'Activities',
        items: [
          {
            id: 'events',
            label: 'Events',
            icon: Calendar,
            href: '/account/member/events',
            badge: stats.upcomingEvents,
            condition: ({ stats }) => stats.upcomingEvents > 0,
          },
          {
            id: 'problem-solving',
            label: 'Problem Solving',
            icon: Code,
            href: '/account/member/problem-solving',
          },
          {
            id: 'bootcamps',
            label: 'Bootcamps',
            icon: GraduationCap,
            href: '/account/member/bootcamps',
          },
          {
            id: 'discussions',
            label: 'Help Desk',
            icon: HelpCircle,
            href: '/account/member/discussions',
          },
        ],
      },
      {
        key: 'resources',
        label: 'Learning',
        items: [
          {
            id: 'resources',
            label: 'Resources',
            icon: FolderOpen,
            href: '/account/member/resources',
          },
          {
            id: 'achievements',
            label: 'Achievements',
            icon: Award,
            href: '/account/member/achievements',
          },
          {
            id: 'participation',
            label: 'Participation',
            icon: CheckSquare,
            href: '/account/member/participation',
          },
          {
            id: 'certificates',
            label: 'Certificates',
            icon: Sparkles,
            href: '/account/member/certificates',
          },
        ],
      },
      {
        key: 'account',
        label: 'Account',
        items: [
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            href: '/account/member/profile',
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            href: '/account/member/settings',
          },
        ],
      },
    ],

    // ─── Executive ────────────────────────────────────────────────────────
    executive: [
      {
        key: 'overview',
        label: 'Overview',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
            href: '/account/executive',
          },
        ],
      },
      {
        key: 'management',
        label: 'Management',
        items: [
          {
            id: 'events',
            label: 'Event Management',
            icon: Calendar,
            href: '/account/executive/events/manage',
          },
          {
            id: 'registrations',
            label: 'Registrations',
            icon: ClipboardCheck,
            href: '/account/executive/registrations',
          },
          {
            id: 'contests',
            label: 'Contest Management',
            icon: Trophy,
            href: '/account/executive/contests/manage',
          },
          {
            id: 'members',
            label: 'Member Approval',
            icon: Users,
            href: '/account/executive/members',
            badge: stats.pendingMembers,
            badgeType: 'alert',
            condition: ({ stats }) => stats.pendingMembers > 0,
          },
          {
            id: 'discussions',
            label: 'Help Desk',
            icon: HelpCircle,
            href: '/account/executive/discussions',
          },
        ],
      },
      {
        key: 'content',
        label: 'Content',
        items: [
          {
            id: 'blogs',
            label: 'Blog Management',
            icon: PenTool,
            href: '/account/executive/blogs/manage',
          },
          {
            id: 'gallery',
            label: 'Gallery Management',
            icon: Image,
            href: '/account/executive/gallery/manage',
          },
          {
            id: 'notices',
            label: 'Notices',
            icon: Megaphone,
            href: '/account/executive/notices/create',
          },
          {
            id: 'certificates',
            label: 'Generate Certificates',
            icon: Award,
            href: '/account/executive/certificates/generate',
          },
        ],
      },
      {
        key: 'insights',
        label: 'Insights',
        items: [
          {
            id: 'reports',
            label: 'Reports',
            icon: BarChart,
            href: '/account/executive/reports',
          },
        ],
      },
      {
        key: 'account',
        label: 'Account',
        items: [
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            href: '/account/executive/profile',
          },
        ],
      },
    ],

    // ─── Admin ────────────────────────────────────────────────────────────
    admin: [
      {
        key: 'overview',
        label: 'Overview',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
            href: '/account/admin',
          },
          {
            id: 'analytics',
            label: 'Analytics',
            icon: BarChart3,
            href: '/account/admin/analytics',
          },
        ],
      },
      {
        key: 'people',
        label: 'People',
        items: [
          {
            id: 'users',
            label: 'User Management',
            icon: Users,
            href: '/account/admin/users',
            badge: stats.totalUsers,
          },
          {
            id: 'roles',
            label: 'Role Management',
            icon: Shield,
            href: '/account/admin/roles',
            condition: ({ activeRole }) => activeRole === 'admin',
          },
          {
            id: 'committee',
            label: 'Committee',
            icon: Briefcase,
            href: '/account/admin/committee',
          },
          {
            id: 'applications',
            label: 'Applications',
            icon: FileText,
            href: '/account/admin/applications',
          },
          {
            id: 'discussions',
            label: 'Help Desk',
            icon: HelpCircle,
            href: '/account/admin/discussions',
          },
        ],
      },
      {
        key: 'content',
        label: 'Content',
        items: [
          {
            id: 'notices',
            label: 'Notices',
            icon: Megaphone,
            href: '/account/admin/notices',
          },
          {
            id: 'events',
            label: 'Events',
            icon: Calendar,
            href: '/account/admin/events',
          },
          {
            id: 'blogs',
            label: 'Blogs',
            icon: PenTool,
            href: '/account/admin/blogs',
          },
          {
            id: 'roadmaps',
            label: 'Roadmaps',
            icon: MapPin,
            href: '/account/admin/roadmaps',
          },
          {
            id: 'bootcamps',
            label: 'Bootcamps',
            icon: GraduationCap,
            href: '/account/admin/bootcamps',
            badge: 'Soon',
          },
          {
            id: 'resources',
            label: 'Resources',
            icon: FolderOpen,
            href: '/account/admin/resources',
          },
          {
            id: 'gallery',
            label: 'Gallery',
            icon: Image,
            href: '/account/admin/gallery',
          },
          {
            id: 'achievements',
            label: 'Achievements',
            icon: Award,
            href: '/account/admin/achievements',
          },
        ],
      },
      {
        key: 'system',
        label: 'System',
        items: [
          {
            id: 'contact',
            label: 'Contact Submissions',
            icon: Mail,
            href: '/account/admin/contact-submissions',
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            href: '/account/admin/settings',
          },
          {
            id: 'security',
            label: 'Security',
            icon: Lock,
            href: '/account/admin/security',
            condition: ({ activeRole }) => activeRole === 'admin',
          },
          {
            id: 'system-logs',
            label: 'System Logs',
            icon: Database,
            href: '/account/admin/system-logs',
            condition: ({ activeRole }) => activeRole === 'admin',
          },
          {
            id: 'export',
            label: 'Export Data',
            icon: Download,
            href: '/account/admin/export',
          },
        ],
      },
    ],

    // ─── Mentor ───────────────────────────────────────────────────────────
    mentor: [
      {
        key: 'overview',
        label: 'Overview',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
            href: '/account/mentor',
          },
        ],
      },
      {
        key: 'mentorship',
        label: 'Mentorship',
        items: [
          {
            id: 'assigned-members',
            label: 'Assigned Members',
            icon: Users,
            href: '/account/mentor/assigned-members',
            badge: stats.mentees,
            condition: ({ stats }) => stats.mentees > 0,
          },
          {
            id: 'tasks',
            label: 'Tasks',
            icon: CheckSquare,
            href: '/account/mentor/tasks',
          },
          {
            id: 'sessions',
            label: 'Sessions',
            icon: Calendar,
            href: '/account/mentor/sessions',
          },
          {
            id: 'recommendations',
            label: 'Recommendations',
            icon: Target,
            href: '/account/mentor/recommendations',
          },
          {
            id: 'discussions',
            label: 'Help Desk',
            icon: HelpCircle,
            href: '/account/mentor/discussions',
          },
        ],
      },
      {
        key: 'resources',
        label: 'Resources',
        items: [
          {
            id: 'resources',
            label: 'Resources',
            icon: BookOpen,
            href: '/account/mentor/resources',
          },
          {
            id: 'notices',
            label: 'Notices',
            icon: Megaphone,
            href: '/account/mentor/notices',
          },
        ],
      },
      {
        key: 'account',
        label: 'Account',
        items: [
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            href: '/account/mentor/profile',
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            href: '/account/mentor/settings',
          },
        ],
      },
    ],

    // ─── Advisor ──────────────────────────────────────────────────────────
    advisor: [
      {
        key: 'overview',
        label: 'Overview',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
            href: '/account/advisor',
          },
          {
            id: 'club-overview',
            label: 'Club Overview',
            icon: Layout,
            href: '/account/advisor/club-overview',
          },
        ],
      },
      {
        key: 'governance',
        label: 'Governance',
        items: [
          {
            id: 'committee',
            label: 'Committee',
            icon: Users,
            href: '/account/advisor/committee',
          },
          {
            id: 'events',
            label: 'Events',
            icon: Calendar,
            href: '/account/advisor/events',
          },
          {
            id: 'approvals',
            label: 'Approvals',
            icon: ClipboardCheck,
            href: '/account/advisor/approvals',
            badge: stats.pendingReviews,
            badgeType: 'alert',
            condition: ({ stats }) => stats.pendingReviews > 0,
          },
          {
            id: 'budget',
            label: 'Budget',
            icon: DollarSign,
            href: '/account/advisor/budget',
          },
          {
            id: 'discussions',
            label: 'Help Desk',
            icon: HelpCircle,
            href: '/account/advisor/discussions',
          },
        ],
      },
      {
        key: 'insights',
        label: 'Insights',
        items: [
          {
            id: 'analytics',
            label: 'Analytics',
            icon: TrendingUp,
            href: '/account/advisor/analytics',
          },
          {
            id: 'achievements',
            label: 'Achievements',
            icon: Award,
            href: '/account/advisor/achievements',
          },
          {
            id: 'reports',
            label: 'Reports',
            icon: BarChart,
            href: '/account/advisor/reports',
          },
        ],
      },
      {
        key: 'account',
        label: 'Account',
        items: [
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            href: '/account/advisor/profile',
          },
        ],
      },
    ],
  };

  const groups = configs[baseRole] || configs.guest;

  // Filter items within each group based on conditions, then remove empty groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.condition) {
          return item.condition({ session, stats, activeRole });
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}
