import { RESOURCE_TYPES } from './constants';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const FACEBOOK_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
]);
const LINKEDIN_HOSTS = new Set(['linkedin.com', 'www.linkedin.com']);

function parseUrl(input) {
  try {
    const u = new URL(String(input || '').trim());
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

function youtubeVideoId(url) {
  if (!url) return null;
  if (url.hostname.includes('youtu.be')) {
    return url.pathname.replace('/', '') || null;
  }
  if (url.pathname === '/watch') {
    return url.searchParams.get('v');
  }
  if (url.pathname.startsWith('/shorts/')) {
    return url.pathname.split('/')[2] || null;
  }
  if (url.pathname.startsWith('/live/')) {
    return url.pathname.split('/')[2] || null;
  }
  if (url.pathname.startsWith('/embed/')) {
    return url.pathname.split('/')[2] || null;
  }
  return null;
}

export function sanitizeRichHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export function normalizeEmbed(resourceType, inputUrl) {
  const t = String(resourceType || '').trim();
  if (!RESOURCE_TYPES.includes(t))
    return { ok: false, error: 'Unsupported resource type.' };

  const url = parseUrl(inputUrl);
  if (!url) return { ok: false, error: 'Invalid URL format.' };

  if (t === 'youtube') {
    if (!YOUTUBE_HOSTS.has(url.hostname)) {
      return { ok: false, error: 'YouTube URL expected.' };
    }
    const id = youtubeVideoId(url);
    if (!id) return { ok: false, error: 'Could not detect YouTube video ID.' };
    return {
      ok: true,
      provider: 'youtube',
      url: url.toString(),
      embedUrl: `https://www.youtube.com/embed/${id}`,
      videoId: id,
    };
  }

  if (t === 'facebook_post') {
    if (!FACEBOOK_HOSTS.has(url.hostname)) {
      return { ok: false, error: 'Facebook URL expected.' };
    }
    return {
      ok: true,
      provider: 'facebook',
      url: url.toString(),
      embedUrl: url.toString(),
    };
  }

  if (t === 'linkedin_post') {
    if (!LINKEDIN_HOSTS.has(url.hostname)) {
      return { ok: false, error: 'LinkedIn URL expected.' };
    }
    return {
      ok: true,
      provider: 'linkedin',
      url: url.toString(),
      embedUrl: url.toString(),
    };
  }

  return {
    ok: true,
    provider: 'external',
    url: url.toString(),
    embedUrl: url.toString(),
  };
}

export function safeExternalHref(inputUrl) {
  const url = parseUrl(inputUrl);
  return url ? url.toString() : null;
}
