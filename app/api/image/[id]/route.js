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

const PLACEHOLDER = '/placeholder-event.svg';

const PROXY_HEADERS = {
  'Cache-Control': 'public, max-age=604800, immutable',
  'Access-Control-Allow-Origin': '*',
};

/** Redirect to placeholder image (short cache so it retries later). */
function placeholderRedirect() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: PLACEHOLDER,
      'Cache-Control': 'public, max-age=300', // retry after 5 min
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
    next: { revalidate: 604800 }, // cache upstream fetch for 7 days, matching PROXY_HEADERS
  });
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.startsWith('image/')) return null;
  const body = await res.arrayBuffer();
  if (body.byteLength === 0) return null;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': ct, ...PROXY_HEADERS },
  });
}

export async function GET(request, { params }) {
  const { id } = await params;

  // ── External URL proxy mode: /api/image/proxy?url=<encoded> ───────────
  if (id === 'proxy') {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');

    if (!rawUrl || !/^https?:\/\/.+/i.test(rawUrl)) {
      return placeholderRedirect();
    }

    try {
      const result = await fetchImage(rawUrl);
      if (result) return result;
      return placeholderRedirect();
    } catch (err) {
      console.error('Image proxy error (external):', err);
      return placeholderRedirect();
    }
  }

  // ── Drive file ID mode: /api/image/{driveFileId} ──────────────────────
  if (!id || typeof id !== 'string' || id.length < 10) {
    return placeholderRedirect();
  }

  try {
    // Try Google CDN direct link
    const upstream = `https://lh3.googleusercontent.com/d/${id}`;
    const result = await fetchImage(upstream);
    if (result) return result;

    // Fallback: drive.google.com/thumbnail
    const fallback = `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
    const result2 = await fetchImage(fallback);
    if (result2) return result2;

    return placeholderRedirect();
  } catch (err) {
    console.error('Image proxy error:', err);
    return placeholderRedirect();
  }
}
