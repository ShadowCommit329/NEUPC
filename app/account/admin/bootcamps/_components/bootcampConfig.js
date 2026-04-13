/**
 * @file Bootcamp management configuration and helpers.
 * @module bootcampConfig
 */

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const BOOTCAMP_STATUSES = ['draft', 'published', 'archived'];

export const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    badge: 'bg-gray-500/15 text-gray-400',
    dot: 'bg-gray-400',
    gradient: 'from-gray-600/20 to-gray-700/10',
    description: 'Not visible to students',
  },
  published: {
    label: 'Published',
    badge: 'bg-emerald-500/15 text-emerald-400',
    dot: 'bg-emerald-400',
    gradient: 'from-emerald-600/20 to-emerald-700/10',
    description: 'Visible and enrollable',
  },
  archived: {
    label: 'Archived',
    badge: 'bg-amber-500/15 text-amber-400',
    dot: 'bg-amber-400',
    gradient: 'from-amber-600/20 to-amber-700/10',
    description: 'Hidden from public',
  },
};

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO SOURCE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const VIDEO_SOURCES = ['none', 'drive', 'youtube', 'upload'];

export const VIDEO_SOURCE_CONFIG = {
  none: {
    label: 'No Video',
    description: 'Text/content only lesson',
    icon: 'FileText',
  },
  drive: {
    label: 'Google Drive',
    description: 'Private video from Drive',
    icon: 'HardDrive',
  },
  youtube: {
    label: 'YouTube',
    description: 'Embed YouTube video',
    icon: 'Youtube',
  },
  upload: {
    label: 'Direct Upload',
    description: 'Upload video file',
    icon: 'Upload',
  },
};

export function getVideoSourceConfig(source) {
  return VIDEO_SOURCE_CONFIG[source] || VIDEO_SOURCE_CONFIG.none;
}

// ─────────────────────────────────────────────────────────────────────────────
// SORT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'title', label: 'Title A-Z' },
  { key: 'enrollments', label: 'Most enrolled' },
  { key: 'price_high', label: 'Price: High to Low' },
  { key: 'price_low', label: 'Price: Low to High' },
];

export function sortBootcamps(bootcamps, sortKey) {
  const sorted = [...bootcamps];

  switch (sortKey) {
    case 'newest':
      return sorted.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    case 'title':
      return sorted.sort((a, b) =>
        (a.title || '').localeCompare(b.title || '')
      );
    case 'enrollments':
      return sorted.sort(
        (a, b) => (b.enrollment_count || 0) - (a.enrollment_count || 0)
      );
    case 'price_high':
      return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    case 'price_low':
      return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    default:
      return sorted;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DURATION FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

export function formatDurationSeconds(seconds) {
  if (!seconds || seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

export function formatPrice(price, currency = 'BDT') {
  if (!price || price <= 0) return 'Free';

  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export function validateBootcamp(data) {
  const errors = {};

  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.length > 200) {
    errors.title = 'Title must be less than 200 characters';
  }

  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.slug =
      'Slug can only contain lowercase letters, numbers, and hyphens';
  }

  if (data.price && (isNaN(data.price) || data.price < 0)) {
    errors.price = 'Price must be a positive number';
  }

  if (
    data.max_students &&
    (isNaN(data.max_students) || data.max_students < 1)
  ) {
    errors.max_students = 'Max students must be at least 1';
  }

  if (data.start_date && data.end_date) {
    if (new Date(data.start_date) > new Date(data.end_date)) {
      errors.end_date = 'End date must be after start date';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLesson(data) {
  const errors = {};

  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  }

  if (data.video_source === 'drive' && !data.video_id?.trim()) {
    errors.video_id = 'Google Drive file ID is required';
  }

  if (
    data.video_source === 'youtube' &&
    !data.video_id?.trim() &&
    !data.video_url?.trim()
  ) {
    errors.video_id = 'YouTube video URL or ID is required';
  }

  if (data.duration && (isNaN(data.duration) || data.duration < 0)) {
    errors.duration = 'Duration must be a positive number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
