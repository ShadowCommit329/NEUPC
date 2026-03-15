/**
 * @file Centralized category color configuration.
 * Replaces duplicated CATEGORY_COLOR / COLOR_CONFIG objects
 * across BlogsClient, EventsClient, RoadmapsClient, GalleryClient.
 *
 * @module category-colors
 */

/**
 * Color palette for category pills, badges, and accents.
 * Each key maps to a set of Tailwind class strings for different UI states.
 */
export const COLOR_PALETTE = {
  violet: {
    pill: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
    active: 'border-violet-400/60 bg-violet-500/30 text-violet-200',
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    accent: 'from-violet-500/20 to-violet-600/5',
  },
  indigo: {
    pill: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300',
    active: 'border-indigo-400/60 bg-indigo-500/30 text-indigo-200',
    badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    accent: 'from-indigo-500/20 to-indigo-600/5',
  },
  blue: {
    pill: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
    active: 'border-blue-400/60 bg-blue-500/30 text-blue-200',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    accent: 'from-blue-500/20 to-blue-600/5',
  },
  amber: {
    pill: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    active: 'border-amber-400/60 bg-amber-500/30 text-amber-200',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    accent: 'from-amber-500/20 to-amber-600/5',
  },
  teal: {
    pill: 'border-teal-500/40 bg-teal-500/15 text-teal-300',
    active: 'border-teal-400/60 bg-teal-500/30 text-teal-200',
    badge: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
    accent: 'from-teal-500/20 to-teal-600/5',
  },
  sky: {
    pill: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    active: 'border-sky-400/60 bg-sky-500/30 text-sky-200',
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    accent: 'from-sky-500/20 to-sky-600/5',
  },
  rose: {
    pill: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    active: 'border-rose-400/60 bg-rose-500/30 text-rose-200',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    accent: 'from-rose-500/20 to-rose-600/5',
  },
  emerald: {
    pill: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    active: 'border-emerald-400/60 bg-emerald-500/30 text-emerald-200',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    accent: 'from-emerald-500/20 to-emerald-600/5',
  },
  purple: {
    pill: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    active: 'border-purple-400/60 bg-purple-500/30 text-purple-200',
    badge: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    accent: 'from-purple-500/20 to-purple-600/5',
  },
  gray: {
    pill: 'border-gray-500/40 bg-gray-500/15 text-gray-300',
    active: 'border-gray-400/60 bg-gray-500/30 text-gray-200',
    badge: 'border-gray-500/30 bg-gray-500/10 text-gray-300',
    accent: 'from-gray-500/20 to-gray-600/5',
  },
};

/**
 * Get color classes for a given color key.
 * Falls back to gray if the key is not found.
 *
 * @param {string} colorKey - One of the COLOR_PALETTE keys
 * @returns {Object} Color class strings for pill, active, badge, accent states
 */
export function getColorClasses(colorKey) {
  return COLOR_PALETTE[colorKey] || COLOR_PALETTE.gray;
}

/**
 * Derive a deterministic color key from a category string.
 * Uses a simple hash to map unknown categories to a consistent color.
 *
 * @param {string} category - Category name
 * @param {Object} [knownMap] - Optional map of { category: colorKey } overrides
 * @returns {string} A COLOR_PALETTE key
 */
export function getCategoryColor(category, knownMap = {}) {
  if (!category) return 'gray';
  if (knownMap[category]) return knownMap[category];

  const colors = Object.keys(COLOR_PALETTE).filter((k) => k !== 'gray');
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
