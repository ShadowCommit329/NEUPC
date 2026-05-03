/**
 * Image proxy for Google Drive files and external image URLs.
 *
 * Serves images through our own domain so there are no CSP,
 * CORS, hostname-whitelist, or expiry issues. Caches for 7 days.
 * When the upstream image is unavailable, redirects to a placeholder.
 *
 * Usage:
 *   /api/image/{driveFileId}        — proxies a Google Drive file
 *   /api/image/proxy?url={encoded}  — proxies any external image URL
 */

export const dynamic = 'force-dynamic'; // required — params differ per request
export const fetchCache = 'force-cache'; // cache all fetch() calls inside this route

const PLACEHOLDER = '/placeholder-event.svg';
const SEVEN_DAYS = 604800;

const PROXY_HEADERS = {
  'Cache-Control': `public, max-age=${SEVEN_DAYS}, immutable`,
  'Access-Control-Allow-Origin': '*',
};

/** In-process memory cache: fileId → ArrayBuffer + content-type */
const memCache = new Map();

function placeholderRedirect() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: PLACEHOLDER,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

async function fetchImage(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'image/webp,image/jpeg,image/*,*/*;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: new URL(url).origin + '/',
    },
    redirect: 'follow',
    next: { revalidate: SEVEN_DAYS },
  });
  if (!res.ok) {
    console.warn(`Upstream fetch failed: ${res.status} for ${url}`);
    return null;
  }
  const ct = res.headers.get('content-type') || '';
  // Professional: Be more lenient with content-types, but prioritize images
  if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) {
    console.warn(`Invalid content-type: ${ct} for ${url}`);
    return null;
  }
  const body = await res.arrayBuffer();
  if (body.byteLength === 0) return null;
  return { body, ct: ct.startsWith('image/') ? ct : 'image/jpeg' };
}

function imageResponse(body, ct) {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': ct, ...PROXY_HEADERS },
  });
}

export async function GET(request, { params }) {
  const { id } = await params;

  // ── External URL proxy mode ────────────────────────────────────────────
  if (id === 'proxy') {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');

    if (!rawUrl || !/^https?:\/\/.+/i.test(rawUrl)) {
      return placeholderRedirect();
    }

    const cacheKey = `proxy:${rawUrl}`;
    if (memCache.has(cacheKey)) {
      const { body, ct } = memCache.get(cacheKey);
      return imageResponse(body, ct);
    }

    try {
      const result = await fetchImage(rawUrl);
      if (result) {
        memCache.set(cacheKey, result);
        return imageResponse(result.body, result.ct);
      }
      return placeholderRedirect();
    } catch (err) {
      console.error('Image proxy error (external):', err);
      return placeholderRedirect();
    }
  }

  // ── Drive file ID mode ─────────────────────────────────────────────────
  if (!id || typeof id !== 'string' || id.length < 10) {
    return placeholderRedirect();
  }

  // Serve from in-process memory cache (survives multiple requests per deploy)
  if (memCache.has(id)) {
    const { body, ct } = memCache.get(id);
    return imageResponse(body, ct);
  }

  try {
    const upstream = `https://lh3.googleusercontent.com/d/${id}`;
    const result = await fetchImage(upstream);
    if (result) {
      memCache.set(id, result);
      return imageResponse(result.body, result.ct);
    }

    // Try alternate direct link format
    const altUpstream = `https://drive.google.com/uc?export=view&id=${id}`;
    const altResult = await fetchImage(altUpstream);
    if (altResult) {
      memCache.set(id, altResult);
      return imageResponse(altResult.body, altResult.ct);
    }

    const fallback = `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
    const result2 = await fetchImage(fallback);
    if (result2) {
      memCache.set(id, result2);
      return imageResponse(result2.body, result2.ct);
    }

    return placeholderRedirect();
  } catch (err) {
    console.error('Image proxy error:', err);
    return placeholderRedirect();
  }
}
