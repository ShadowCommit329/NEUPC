/**
 * @file Help Desk / Discussion System Configuration
 * Single source of truth for discussion types, statuses, priorities, platforms,
 * role badges, and tab configuration.
 *
 * DB check constraints:
 *   types: ['course_problem','assignment_issue','bug_report','ui_issue','feature_request','general_question','announcement']
 *   status: ['new','open','investigating','in_progress','resolved','closed','acknowledged']
 *   priority: ['low','normal','high','urgent']
 *   platforms: ['website','mobile_app','desktop_app']
 *
 * @module discussion-config
 */

// ─── Discussion Types ─────────────────────────────────────────────────────────

export const DISCUSSION_TYPES = {
  course_problem: {
    key: 'course_problem',
    label: 'Course Problem',
    short: 'Course',
    description: 'Issues with course content, videos, or materials',
    icon: 'BookOpen',
    color: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  },
  assignment_issue: {
    key: 'assignment_issue',
    label: 'Assignment Issue',
    short: 'Assignment',
    description: 'Problems with assignments, submissions, or grading',
    icon: 'ClipboardList',
    color: 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30',
    badge: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  },
  bug_report: {
    key: 'bug_report',
    label: 'Bug Report',
    short: 'Bug',
    description: 'Technical bugs or errors in the platform',
    icon: 'Bug',
    color: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30',
    badge: 'border-red-500/30 bg-red-500/10 text-red-300',
  },
  ui_issue: {
    key: 'ui_issue',
    label: 'UI Issue',
    short: 'UI',
    description: 'User interface problems or design issues',
    icon: 'Layout',
    color: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30',
    badge: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  },
  feature_request: {
    key: 'feature_request',
    label: 'Feature Request',
    short: 'Feature',
    description: 'Suggestions for new features or improvements',
    icon: 'Lightbulb',
    color: 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30',
    badge: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  },
  general_question: {
    key: 'general_question',
    label: 'General Question',
    short: 'Question',
    description: 'General questions or inquiries',
    icon: 'HelpCircle',
    color: 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30',
    badge: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
  },
};

export const DISCUSSION_TYPE_KEYS = Object.keys(DISCUSSION_TYPES);

// ─── Discussion Statuses ──────────────────────────────────────────────────────
// DB constraint: ['new', 'open', 'investigating', 'in_progress', 'resolved', 'closed', 'acknowledged']

export const DISCUSSION_STATUSES = {
  new: {
    key: 'new',
    label: 'New',
    description: 'Newly created discussion',
    icon: 'Sparkles',
    color: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dotColor: 'bg-emerald-400',
  },
  open: {
    key: 'open',
    label: 'Open',
    description: 'Discussion awaiting response',
    icon: 'Circle',
    color: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30',
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    dotColor: 'bg-sky-400',
  },
  investigating: {
    key: 'investigating',
    label: 'Investigating',
    description: 'Being investigated by staff',
    icon: 'Search',
    color: 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30',
    badge: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    dotColor: 'bg-purple-400',
  },
  in_progress: {
    key: 'in_progress',
    label: 'In Progress',
    description: 'Being actively worked on',
    icon: 'Clock',
    color: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    dotColor: 'bg-blue-400',
  },
  acknowledged: {
    key: 'acknowledged',
    label: 'Acknowledged',
    description: 'Acknowledged by staff, pending action',
    icon: 'Eye',
    color: 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30',
    badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    dotColor: 'bg-indigo-400',
  },
  resolved: {
    key: 'resolved',
    label: 'Resolved',
    description: 'Issue has been resolved',
    icon: 'CheckCircle',
    color: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30',
    badge: 'border-green-500/30 bg-green-500/10 text-green-300',
    dotColor: 'bg-green-400',
  },
  closed: {
    key: 'closed',
    label: 'Closed',
    description: 'Discussion closed',
    icon: 'XCircle',
    color: 'bg-gray-500/20 text-gray-300 ring-1 ring-gray-500/30',
    badge: 'border-gray-500/30 bg-gray-500/10 text-gray-300',
    dotColor: 'bg-gray-400',
  },
};

export const DISCUSSION_STATUS_KEYS = Object.keys(DISCUSSION_STATUSES);

// Statuses grouped for kanban board
export const KANBAN_COLUMNS = [
  { key: 'new', label: 'New', statuses: ['new'] },
  { key: 'open', label: 'Open', statuses: ['open'] },
  {
    key: 'in_progress',
    label: 'In Progress',
    statuses: ['investigating', 'in_progress', 'acknowledged'],
  },
  { key: 'done', label: 'Done', statuses: ['resolved', 'closed'] },
];

// ─── Priority Levels ──────────────────────────────────────────────────────────
// DB constraint: ['low', 'normal', 'high', 'urgent']

export const DISCUSSION_PRIORITIES = {
  low: {
    key: 'low',
    label: 'Low',
    description: 'Can be addressed later',
    icon: 'ArrowDown',
    color: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30',
    badge: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  },
  normal: {
    key: 'normal',
    label: 'Normal',
    description: 'Standard priority',
    icon: 'Minus',
    color: 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30',
    badge: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  },
  high: {
    key: 'high',
    label: 'High',
    description: 'Needs attention quickly',
    icon: 'ArrowUp',
    color: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30',
    badge: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  },
  urgent: {
    key: 'urgent',
    label: 'Urgent',
    description: 'Requires immediate attention',
    icon: 'AlertTriangle',
    color: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30',
    badge: 'border-red-500/30 bg-red-500/10 text-red-300',
  },
};

export const DISCUSSION_PRIORITY_KEYS = Object.keys(DISCUSSION_PRIORITIES);

// ─── Platforms ────────────────────────────────────────────────────────────────
// DB constraint: ['website', 'mobile_app', 'desktop_app']

export const DISCUSSION_PLATFORMS = {
  website: {
    key: 'website',
    label: 'Website',
    icon: 'Globe',
    color: 'bg-blue-500/20 text-blue-300',
  },
  mobile_app: {
    key: 'mobile_app',
    label: 'Mobile App',
    icon: 'Smartphone',
    color: 'bg-green-500/20 text-green-300',
  },
  desktop_app: {
    key: 'desktop_app',
    label: 'Desktop App',
    icon: 'Monitor',
    color: 'bg-purple-500/20 text-purple-300',
  },
};

export const DISCUSSION_PLATFORM_KEYS = Object.keys(DISCUSSION_PLATFORMS);

// ─── Role Badges ──────────────────────────────────────────────────────────────

export const ROLE_BADGES = {
  admin: {
    key: 'admin',
    label: 'Admin',
    short: 'Admin',
    icon: 'Shield',
    color: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40',
    badge: 'border-red-500/40 bg-red-500/15 text-red-300',
    textColor: 'text-red-400',
  },
  mentor: {
    key: 'mentor',
    label: 'Mentor',
    short: 'Mentor',
    icon: 'GraduationCap',
    color: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40',
    badge: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    textColor: 'text-emerald-400',
  },
  advisor: {
    key: 'advisor',
    label: 'Advisor',
    short: 'Advisor',
    icon: 'Compass',
    color: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40',
    badge: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
    textColor: 'text-cyan-400',
  },
  executive: {
    key: 'executive',
    label: 'Executive',
    short: 'Exec',
    icon: 'Star',
    color: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
    badge: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    textColor: 'text-amber-400',
  },
  member: {
    key: 'member',
    label: 'Member',
    short: 'Member',
    icon: 'User',
    color: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/40',
    badge: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
    textColor: 'text-slate-400',
  },
  guest: {
    key: 'guest',
    label: 'Guest',
    short: 'Guest',
    icon: 'UserCircle',
    color: 'bg-gray-500/20 text-gray-300 ring-1 ring-gray-500/40',
    badge: 'border-gray-500/40 bg-gray-500/15 text-gray-300',
    textColor: 'text-gray-400',
  },
};

// Staff roles that get special badge treatment
export const STAFF_ROLES = ['admin', 'mentor', 'advisor', 'executive'];

// ─── Help Desk Tabs ───────────────────────────────────────────────────────────

export const HELPDESK_TABS = {
  all_posts: {
    key: 'all_posts',
    label: 'All Post',
    icon: 'MessageSquare',
    description: 'View all discussions',
    defaultTab: true,
  },
  roadmap: {
    key: 'roadmap',
    label: 'Roadmap',
    icon: 'Map',
    description: 'Kanban view of planned features and fixes',
  },
  release_log: {
    key: 'release_log',
    label: 'Release Log',
    icon: 'FileText',
    description: 'Recent updates and changes',
  },
  feature_requests: {
    key: 'feature_requests',
    label: 'Feature Requests',
    icon: 'Lightbulb',
    description: 'Suggested features from the community',
    filterType: 'feature_request',
  },
  self_troubleshoot: {
    key: 'self_troubleshoot',
    label: 'Self Troubleshoot',
    icon: 'BookOpen',
    description: 'FAQs and self-help resources',
  },
};

export const HELPDESK_TAB_KEYS = Object.keys(HELPDESK_TABS);

// ─── Activity Types ───────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = {
  created: {
    key: 'created',
    label: 'Created',
    icon: 'Plus',
    message: 'created this discussion',
  },
  replied: {
    key: 'replied',
    label: 'Replied',
    icon: 'MessageCircle',
    message: 'replied to this discussion',
  },
  status_changed: {
    key: 'status_changed',
    label: 'Status Changed',
    icon: 'RefreshCw',
    message: 'changed the status',
  },
  assigned: {
    key: 'assigned',
    label: 'Assigned',
    icon: 'UserPlus',
    message: 'was assigned to this discussion',
  },
  unassigned: {
    key: 'unassigned',
    label: 'Unassigned',
    icon: 'UserMinus',
    message: 'was unassigned from this discussion',
  },
  priority_changed: {
    key: 'priority_changed',
    label: 'Priority Changed',
    icon: 'Flag',
    message: 'changed the priority',
  },
  type_changed: {
    key: 'type_changed',
    label: 'Type Changed',
    icon: 'Tag',
    message: 'changed the type',
  },
  resolved: {
    key: 'resolved',
    label: 'Resolved',
    icon: 'CheckCircle',
    message: 'marked this as resolved',
  },
  reopened: {
    key: 'reopened',
    label: 'Reopened',
    icon: 'RotateCcw',
    message: 'reopened this discussion',
  },
  edited: {
    key: 'edited',
    label: 'Edited',
    icon: 'Edit2',
    message: 'edited this discussion',
  },
  accepted_answer: {
    key: 'accepted_answer',
    label: 'Accepted Answer',
    icon: 'Award',
    message: 'marked a reply as the accepted answer',
  },
};

// ─── Sort Options ─────────────────────────────────────────────────────────────

export const SORT_OPTIONS = {
  newest: {
    key: 'newest',
    label: 'Newest First',
    column: 'created_at',
    ascending: false,
  },
  oldest: {
    key: 'oldest',
    label: 'Oldest First',
    column: 'created_at',
    ascending: true,
  },
  most_replies: {
    key: 'most_replies',
    label: 'Most Replies',
    column: 'reply_count',
    ascending: false,
  },
  most_viewed: {
    key: 'most_viewed',
    label: 'Most Viewed',
    column: 'views',
    ascending: false,
  },
  recently_updated: {
    key: 'recently_updated',
    label: 'Recently Updated',
    column: 'updated_at',
    ascending: false,
  },
  priority_high: {
    key: 'priority_high',
    label: 'Highest Priority',
    column: 'priority',
    ascending: false,
    customOrder: ['urgent', 'high', 'normal', 'low'],
  },
};

export const SORT_OPTION_KEYS = Object.keys(SORT_OPTIONS);

// ─── Filter Options ───────────────────────────────────────────────────────────

export const FILTER_OPTIONS = {
  all: { key: 'all', label: 'All Discussions' },
  my_posts: { key: 'my_posts', label: 'My Posts' },
  assigned_to_me: { key: 'assigned_to_me', label: 'Assigned to Me' },
  unassigned: { key: 'unassigned', label: 'Unassigned' },
  open_only: { key: 'open_only', label: 'Open Only' },
  resolved_only: { key: 'resolved_only', label: 'Resolved Only' },
  needs_response: { key: 'needs_response', label: 'Needs Response' },
  has_accepted_answer: {
    key: 'has_accepted_answer',
    label: 'Has Accepted Answer',
  },
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// ─── Character Limits ─────────────────────────────────────────────────────────

export const CHARACTER_LIMITS = {
  TITLE_MIN: 10,
  TITLE_MAX: 200,
  CONTENT_MIN: 20,
  CONTENT_MAX: 50000,
  REPLY_MIN: 10,
  REPLY_MAX: 20000,
};

// ─── File Upload Limits ───────────────────────────────────────────────────────

export const ATTACHMENT_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_POST: 5,
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
  ],
  ALLOWED_EXTENSIONS: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.pdf',
    '.txt',
    '.md',
    '.json',
  ],
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get type configuration by key
 * @param {string} type - Discussion type key
 * @returns {object} Type configuration
 */
export function getTypeConfig(type) {
  return DISCUSSION_TYPES[type] ?? DISCUSSION_TYPES.general_question;
}

/**
 * Get status configuration by key
 * @param {string} status - Status key
 * @returns {object} Status configuration
 */
export function getStatusConfig(status) {
  return DISCUSSION_STATUSES[status] ?? DISCUSSION_STATUSES.open;
}

/**
 * Get priority configuration by key
 * @param {string} priority - Priority key
 * @returns {object} Priority configuration
 */
export function getPriorityConfig(priority) {
  return DISCUSSION_PRIORITIES[priority] ?? DISCUSSION_PRIORITIES.normal;
}

/**
 * Get platform configuration by key
 * @param {string} platform - Platform key
 * @returns {object} Platform configuration
 */
export function getPlatformConfig(platform) {
  return DISCUSSION_PLATFORMS[platform] ?? DISCUSSION_PLATFORMS.website;
}

/**
 * Get role badge configuration
 * @param {string} role - Role key
 * @returns {object} Role badge configuration
 */
export function getRoleBadgeConfig(role) {
  return ROLE_BADGES[role] ?? ROLE_BADGES.member;
}

/**
 * Check if a role is a staff role
 * @param {string} role - Role key
 * @returns {boolean} True if staff role
 */
export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

/**
 * Get the default tab configuration
 * @returns {object} Default tab config
 */
export function getDefaultTab() {
  return (
    Object.values(HELPDESK_TABS).find((tab) => tab.defaultTab) ??
    HELPDESK_TABS.all_posts
  );
}

/**
 * Get activity type configuration
 * @param {string} type - Activity type key
 * @returns {object} Activity type configuration
 */
export function getActivityConfig(type) {
  return (
    ACTIVITY_TYPES[type] ?? {
      key: type,
      label: type,
      icon: 'Activity',
      message: type,
    }
  );
}

/**
 * Format discussion type for display
 * @param {string} type - Discussion type key
 * @returns {string} Formatted label
 */
export function formatType(type) {
  return getTypeConfig(type).label;
}

/**
 * Format status for display
 * @param {string} status - Status key
 * @returns {string} Formatted label
 */
export function formatStatus(status) {
  return getStatusConfig(status).label;
}

/**
 * Format priority for display
 * @param {string} priority - Priority key
 * @returns {string} Formatted label
 */
export function formatPriority(priority) {
  return getPriorityConfig(priority).label;
}

/**
 * Check if status is considered "active" (not resolved/closed)
 * @param {string} status - Status key
 * @returns {boolean} True if active
 */
export function isActiveStatus(status) {
  return !['resolved', 'closed'].includes(status);
}

/**
 * Check if discussion requires LMS context (course problem, assignment issue)
 * @param {string} type - Discussion type key
 * @returns {boolean} True if LMS context is needed
 */
export function requiresLMSContext(type) {
  return ['course_problem', 'assignment_issue'].includes(type);
}
