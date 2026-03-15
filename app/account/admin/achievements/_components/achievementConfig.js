/**
 * @file Achievement configuration constants — badge types, tier labels,
 *   icon mappings, and colour schemes for the admin achievements module.
 * @module adminAchievementConfig
 */

// ─── Category Configuration ───────────────────────────────────────────────────

export const ACHIEVEMENT_CATEGORIES = [
  'Competitive Programming',
  'Hackathon',
  'ICPC',
  'IUPC',
  'NCPC',
  'Web Development',
  'AI / ML',
  'Research',
  'Internship',
  'Academic Award',
  'Club Milestone',
  'Community',
  'Certification',
  'Other',
];

export const CATEGORY_CONFIG = {
  'Competitive Programming': {
    emoji: '💻',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  Hackathon: {
    emoji: '⚡',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  ICPC: {
    emoji: '🏆',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  IUPC: {
    emoji: '🥇',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  NCPC: {
    emoji: '🌏',
    color: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  },
  'Web Development': {
    emoji: '🌐',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  'AI / ML': {
    emoji: '🤖',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  Research: {
    emoji: '🔬',
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
  Internship: {
    emoji: '💼',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  'Academic Award': {
    emoji: '🎓',
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
  'Club Milestone': {
    emoji: '🏛',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  Community: {
    emoji: '🤝',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  Certification: {
    emoji: '📜',
    color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  },
  Other: {
    emoji: '🎯',
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  },
};

export function getCategoryConfig(category) {
  return (
    CATEGORY_CONFIG[category] ?? {
      emoji: '🎯',
      color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
  );
}

// ─── Contest Platforms ──────────────────────────────────────────────────────

export const CONTEST_PLATFORMS = [
  'Codeforces',
  'Vjudge',
  'AtCoder',
  'LeetCode',
  'CodeChef',
  'HackerRank',
  'HackerEarth',
  'Toph',
  'SPOJ',
  'Kaggle',
  'Devpost',
  'Other',
];

// ─── Result / Position ────────────────────────────────────────────────────────

export const COMMON_RESULTS = [
  'Champion',
  '1st Runner-up',
  '2nd Runner-up',
  'Top 5',
  'Top 10',
  'Top 20',
  'Finalist',
  'Semi-Finalist',
  'Participant',
  'Placed',
  'Awarded',
];

// ─── Type config (team vs individual) ────────────────────────────────────────

export const TYPE_CONFIG = {
  team: {
    label: 'Team',
    badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    emoji: '👥',
  },
  individual: {
    label: 'Individual',
    badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    emoji: '👤',
  },
};

// ─── Stat Cards ───────────────────────────────────────────────────────────────

export function getStatCards(stats) {
  const currentYear = new Date().getFullYear();
  return [
    {
      label: 'Total',
      value: stats.total,
      icon: '🏆',
      color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/20',
      text: 'text-amber-400',
    },
    {
      label: `${currentYear} Wins`,
      value: stats.thisYear,
      icon: '📅',
      color: 'from-violet-500/20 to-purple-500/20 border-violet-500/20',
      text: 'text-violet-400',
    },
    {
      label: 'Team',
      value: stats.teamAchievements,
      icon: '👥',
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/20',
      text: 'text-blue-400',
    },
    {
      label: 'Individual',
      value: stats.individualAchievements,
      icon: '👤',
      color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/20',
      text: 'text-emerald-400',
    },
    {
      label: 'Categories',
      value: stats.categories,
      icon: '🏷️',
      color: 'from-rose-500/20 to-pink-500/20 border-rose-500/20',
      text: 'text-rose-400',
    },
    {
      label: 'Years Active',
      value: stats.years?.length ?? 0,
      icon: '📊',
      color: 'from-sky-500/20 to-indigo-500/20 border-sky-500/20',
      text: 'text-sky-400',
    },
  ];
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Year range helper ────────────────────────────────────────────────────────

export function generateYearOptions(from = 2015) {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= from; y--) years.push(y);
  return years;
}
