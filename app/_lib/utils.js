/**
 * @file utils
 * @module utils
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

/**
 * Merge Tailwind CSS classes with conflict resolution.
 * Combines clsx (conditional class joining) + tailwind-merge (deduplication).
 *
 * @param  {...(string|boolean|null|undefined|Record<string,boolean>)} inputs
 * @returns {string} Merged class string
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary-500', 'px-6')
 * // → 'py-2 bg-primary-500 px-6'
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to a human-readable format.
 *
 * @param {string} dateStr - ISO date string
 * @param {Intl.DateTimeFormatOptions} [options] - Intl format options
 * @returns {string} Formatted date or empty string
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '';
  try {
    const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', {
      ...defaults,
      ...options,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Estimate reading time based on word count.
 *
 * @param {string} content - Text content
 * @param {number} [wpm=200] - Words per minute
 * @returns {string} Reading time string (e.g. "5 min")
 */
export function estimateReadTime(content, wpm = 200) {
  if (!content) return '5 min';
  const words = content.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / wpm))} min`;
}

/**
 * Extract initials from a full name.
 *
 * @param {string} name - Full name
 * @returns {string} 1-2 letter initials
 */
export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Normalize an image URL to go through our proxy.
 *
 * - `/api/image/…` URLs pass through unchanged.
 * - Legacy `lh3.googleusercontent.com/d/{id}` URLs → `/api/image/{id}`.
 * - Local paths (`/placeholder-event.svg`, etc.) pass through unchanged.
 * - Any other external URL (lh3 /gg/, fbcdn, etc.) → `/api/image/proxy?url=…`.
 *
 * @param {string} url - Image URL
 * @returns {string} Normalized URL safe for `<img src>`
 */
export function driveImageUrl(url) {
  if (!url) return '';
  // Already using our proxy
  if (url.startsWith('/api/image/')) return url;
  // Local/relative paths — pass through
  if (url.startsWith('/')) return url;
  // Legacy lh3 /d/{fileId} → direct proxy
  const m = url.match(/lh3\.googleusercontent\.com\/d\/([^/?&]+)/);
  if (m) return `/api/image/${m[1]}`;
  // Any other external URL → proxy it
  if (/^https?:\/\//i.test(url)) {
    return `/api/image/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Generate a fallback avatar URL using RoboHash based on identifier.
 * Used as a fallback when primary avatar images fail to load.
 *
 * @param {string} identifier - User ID, name, or email for consistent avatar
 * @returns {string} RoboHash avatar URL
 */
export function getFallbackAvatarUrl(identifier) {
  if (!identifier) return 'https://robohash.org/default?set=set4&size=200x200';
  const hash = identifier.replace(/[^a-z0-9]/gi, '').slice(0, 20) || 'default';
  return `https://robohash.org/${hash}?set=set4&size=200x200`;
}

/**
 * Format a date as a relative time string (e.g., "5 minutes ago").
 *
 * @param {string|Date} date - ISO date string or Date object
 * @returns {string} Relative time string with "ago" suffix, or empty string on error
 *
 * @example
 * formatRelativeTime('2024-01-15T10:30:00Z')
 * // → "2 hours ago"
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}

/**
 * Debounce a function call.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 *
 * @example
 * const debouncedSearch = debounce((query) => search(query), 300);
 */
export function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Truncate text to a maximum length with ellipsis.
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Strip HTML tags from a string for plain text preview.
 *
 * @param {string} html - HTML string
 * @returns {string} Plain text without HTML tags
 */
export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract video ID from various Google Drive URL formats.
 *
 * Supported formats:
 * - https://drive.google.com/file/d/{fileId}/view
 * - https://drive.google.com/open?id={fileId}
 * - https://drive.google.com/uc?id={fileId}
 * - Plain file ID
 *
 * @param {string} input - Drive URL or file ID
 * @returns {string|null} - Extracted file ID or null if invalid
 */
export function extractDriveFileId(input) {
  if (!input) return null;

  // Already a plain ID (25+ chars, alphanumeric with dashes/underscores)
  if (/^[\w-]{25,}$/.test(input) && !input.includes('http')) {
    return input;
  }

  // Ensure it's a Google Drive related URL
  if (!input.includes('drive.google.com') && 
      !input.includes('docs.google.com') && 
      !input.includes('lh3.googleusercontent.com')) {
    return null;
  }

  // Try to extract from URL
  const patterns = [/\/file\/d\/([^/]+)/, /[?&]id=([^&]+)/, /\/d\/([^/]+)/];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      // Ensure the extracted ID looks like a valid Google Drive ID
      if (match[1].length >= 15) {
        return match[1];
      }
    }
  }

  return null;
}

/**
 * Get a YouTube embed URL from various YouTube URL formats.
 *
 * @param {string} input - YouTube URL or video ID
 * @returns {string|null} - YouTube embed URL or null if invalid
 */
export function getYouTubeEmbedUrl(input) {
  if (!input) return null;

  // Extract video ID from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Plain video ID
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  return null;
}
