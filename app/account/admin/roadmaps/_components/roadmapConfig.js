/**
 * @file Roadmap configuration constants — status, category, difficulty colour
 *   mappings and helpers used across all admin roadmap components.
 * @module adminRoadmapConfig
 */

// =============================================================================
// STATUS CONFIG
// =============================================================================

export const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    dot: 'bg-gray-400',
    cardBorder: 'border-gray-700/50',
    cardBg: 'bg-gray-500/5',
    gradient: 'from-gray-500 to-gray-600',
    text: 'text-gray-400',
  },
  published: {
    label: 'Published',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    cardBorder: 'border-emerald-700/40',
    cardBg: 'bg-emerald-500/5',
    gradient: 'from-emerald-500 to-green-500',
    text: 'text-emerald-400',
  },
  archived: {
    label: 'Archived',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
    cardBorder: 'border-amber-700/40',
    cardBg: 'bg-amber-500/5',
    gradient: 'from-amber-500 to-orange-500',
    text: 'text-amber-400',
  },
};

export const STATUSES = ['draft', 'published', 'archived'];

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
}

// =============================================================================
// DIFFICULTY CONFIG
// =============================================================================

export const DIFFICULTY_CONFIG = {
  beginner: {
    label: 'Beginner',
    badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    dot: 'bg-green-400',
    icon: '🟢',
  },
  intermediate: {
    label: 'Intermediate',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
    icon: '🔵',
  },
  advanced: {
    label: 'Advanced',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
    icon: '🟣',
  },
};

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

export function getDifficultyConfig(difficulty) {
  return DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.beginner;
}

// =============================================================================
// CATEGORY CONFIG
// =============================================================================

export const CATEGORY_CONFIG = {
  'Competitive Programming': {
    icon: '🏆',
    emoji: '🏆',
    badge: 'bg-amber-500/20 text-amber-300',
    placeholder: 'from-amber-600/30 to-amber-800/30',
    gradient: 'from-amber-600/30 to-amber-800/30',
    color: 'amber',
    short: 'CP',
  },
  'Data Structures': {
    icon: '🌲',
    emoji: '🌲',
    badge: 'bg-cyan-500/20 text-cyan-300',
    placeholder: 'from-cyan-600/30 to-cyan-800/30',
    gradient: 'from-cyan-600/30 to-cyan-800/30',
    color: 'cyan',
    short: 'DS',
  },
  Algorithms: {
    icon: '⚙️',
    emoji: '⚙️',
    badge: 'bg-violet-500/20 text-violet-300',
    placeholder: 'from-violet-600/30 to-violet-800/30',
    gradient: 'from-violet-600/30 to-violet-800/30',
    color: 'violet',
    short: 'Algo',
  },
  Mathematics: {
    icon: '∑',
    emoji: '∑',
    badge: 'bg-pink-500/20 text-pink-300',
    placeholder: 'from-pink-600/30 to-pink-800/30',
    gradient: 'from-pink-600/30 to-pink-800/30',
    color: 'pink',
    short: 'Math',
  },
  'Web Development': {
    icon: '🌐',
    emoji: '🌐',
    badge: 'bg-sky-500/20 text-sky-300',
    placeholder: 'from-sky-600/30 to-sky-800/30',
    gradient: 'from-sky-600/30 to-sky-800/30',
    color: 'sky',
    short: 'Web',
  },
  'Machine Learning': {
    icon: '🤖',
    emoji: '🤖',
    badge: 'bg-indigo-500/20 text-indigo-300',
    placeholder: 'from-indigo-600/30 to-indigo-800/30',
    gradient: 'from-indigo-600/30 to-indigo-800/30',
    color: 'indigo',
    short: 'ML',
  },
  'System Design': {
    icon: '🏗️',
    emoji: '🏗️',
    badge: 'bg-teal-500/20 text-teal-300',
    placeholder: 'from-teal-600/30 to-teal-800/30',
    gradient: 'from-teal-600/30 to-teal-800/30',
    color: 'teal',
    short: 'SysDesign',
  },
  'Programming Languages': {
    icon: '💻',
    emoji: '💻',
    badge: 'bg-orange-500/20 text-orange-300',
    placeholder: 'from-orange-600/30 to-orange-800/30',
    gradient: 'from-orange-600/30 to-orange-800/30',
    color: 'orange',
    short: 'Lang',
  },
  'Problem Solving': {
    icon: '🧠',
    emoji: '🧠',
    badge: 'bg-rose-500/20 text-rose-300',
    placeholder: 'from-rose-600/30 to-rose-800/30',
    gradient: 'from-rose-600/30 to-rose-800/30',
    color: 'rose',
    short: 'PS',
  },
  General: {
    icon: '📚',
    emoji: '📚',
    badge: 'bg-gray-500/20 text-gray-300',
    placeholder: 'from-gray-600/30 to-gray-800/30',
    gradient: 'from-gray-600/30 to-gray-800/30',
    color: 'gray',
    short: 'General',
  },
};

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);

export function getCategoryConfig(category) {
  return (
    CATEGORY_CONFIG[category] ?? {
      icon: '📚',
      emoji: '📚',
      badge: 'bg-gray-500/20 text-gray-300',
      placeholder: 'from-gray-600/30 to-gray-800/30',
      gradient: 'from-gray-600/30 to-gray-800/30',
      color: 'gray',
      short: 'Other',
    }
  );
}

// =============================================================================
// SLUG HELPER
// =============================================================================

export function generateSlug(title) {
  return (title ?? '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// =============================================================================
// SORT OPTIONS
// =============================================================================

export const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'most-viewed', label: 'Most Viewed' },
  { key: 'title', label: 'Title A–Z' },
];

export function sortRoadmaps(roadmaps, sortKey) {
  const sorted = [...roadmaps];
  switch (sortKey) {
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    case 'most-viewed':
      return sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case 'title':
      return sorted.sort((a, b) =>
        (a.title ?? '').localeCompare(b.title ?? '')
      );
    default:
      return sorted.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
  }
}

// =============================================================================
// DATE HELPER
// =============================================================================

export function formatRoadmapDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
