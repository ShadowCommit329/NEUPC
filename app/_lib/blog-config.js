/**
 * @file Shared blog category configuration.
 * Single source of truth for category metadata — used by both the public
 * blog pages (listing, detail) and the admin create/edit UI.
 *
 * DB check constraint:
 *   ['CP','Programming','WebDev','AI-ML','Career','News','Tutorial','Other']
 *
 * @module blog-config
 */

// ─── Category config ──────────────────────────────────────────────────────────

export const CATEGORY_CONFIG = {
  CP: {
    label: 'Competitive Programming',
    short: 'CP',
    emoji: '🏆',
    /** ring-style — admin segmented-select pills */
    color: 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30',
    /** border-style — public article & card badges */
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  },
  Programming: {
    label: 'Programming',
    short: 'Prog',
    emoji: '💻',
    color: 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30',
    badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  },
  WebDev: {
    label: 'Web Dev',
    short: 'WebDev',
    emoji: '🌐',
    color: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  },
  'AI-ML': {
    label: 'AI / ML',
    short: 'AI-ML',
    emoji: '🤖',
    color: 'bg-pink-500/20 text-pink-300 ring-1 ring-pink-500/30',
    badge: 'border-pink-500/30 bg-pink-500/10 text-pink-300',
  },
  Career: {
    label: 'Career',
    short: 'Career',
    emoji: '💼',
    color: 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30',
    badge: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
  },
  News: {
    label: 'News',
    short: 'News',
    emoji: '📰',
    color: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30',
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  },
  Tutorial: {
    label: 'Tutorial',
    short: 'Tutorial',
    emoji: '📚',
    color: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30',
    badge: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  },
  Other: {
    label: 'Other',
    short: 'Other',
    emoji: '📄',
    color: 'bg-gray-500/20 text-gray-300 ring-1 ring-gray-500/30',
    badge: 'border-gray-500/30 bg-gray-500/10 text-gray-300',
  },
};

/** Ordered array of category keys. */
export const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG);

/** Get full config for a category key. Falls back to 'Other'. */
export function getCategoryConfig(cat) {
  return CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.Other;
}

/** Get the human-readable label, e.g. 'Competitive Programming' for 'CP'. */
export function getCategoryLabel(cat) {
  return getCategoryConfig(cat).label;
}
