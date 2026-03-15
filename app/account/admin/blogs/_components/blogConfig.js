/**
 * @file Blog configuration constants — admin UI (status, sort, date helpers, slug).
 * Category config is sourced from the shared library so admin and public UIs stay in sync.
 * @module adminBlogConfig
 */

// ─── Category config (shared) ─────────────────────────────────────────────────
// Re-exported so all admin components keep a single import path.
export {
  CATEGORY_CONFIG,
  CATEGORY_KEYS as CATEGORIES,
  getCategoryConfig,
  getCategoryLabel,
} from '@/app/_lib/blog-config';

// ─── Status config ────────────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    badge: 'bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30',
    dot: 'bg-gray-400',
    cardBorder: 'border-gray-700/50',
    gradient: 'from-gray-900/80 to-gray-800/40',
    tabActive: 'bg-gray-800 text-gray-100',
  },
  published: {
    label: 'Published',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    dot: 'bg-emerald-400',
    cardBorder: 'border-emerald-700/30',
    gradient: 'from-emerald-950/80 to-emerald-900/20',
    tabActive: 'bg-emerald-900/50 text-emerald-100',
  },
  archived: {
    label: 'Archived',
    badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    dot: 'bg-amber-400',
    cardBorder: 'border-amber-700/30',
    gradient: 'from-amber-950/80 to-amber-900/20',
    tabActive: 'bg-amber-900/40 text-amber-100',
  },
};

export const STATUSES = ['draft', 'published', 'archived'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
}

export function formatBlogDate(dateStr) {
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
  if (days < 30) return `${days}d ago`;
  return formatBlogDate(dateStr);
}

// ─── Sort options ─────────────────────────────────────────────────────────────

export const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'most-viewed', label: 'Most Viewed' },
  { key: 'most-liked', label: 'Most Liked' },
  { key: 'most-comments', label: 'Most Commented' },
  { key: 'title-az', label: 'Title A → Z' },
];

export function sortPosts(posts, sortKey) {
  const sorted = [...posts];
  switch (sortKey) {
    case 'newest':
      return sorted.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    case 'most-viewed':
      return sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case 'most-liked':
      return sorted.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    case 'most-comments':
      return sorted.sort(
        (a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0)
      );
    case 'title-az':
      return sorted.sort((a, b) =>
        (a.title ?? '').localeCompare(b.title ?? '')
      );
    default:
      return sorted;
  }
}

// ─── Slug helper ──────────────────────────────────────────────────────────────

export function generateSlug(title) {
  return (title ?? '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
