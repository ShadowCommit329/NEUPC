/**
 * CLIST API - Fetch data from clist.by
 * GET /api/problem-solving/clist
 *
 * Query parameters:
 * - platform: Platform ID (codeforces, atcoder, etc.)
 * - handle: User handle on the platform
 * - type: Data type to fetch (stats, rating, contests, all)
 *
 * This endpoint provides direct access to clist.by data for:
 * - Account statistics
 * - Rating history
 * - Contest participation history
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import { verifyExtensionToken } from '@/app/_lib/extension-auth';
import { ClistService } from '@/app/_lib/problem-solving-services';
import { supabaseAdmin } from '@/app/_lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Extension-Token',
  'Access-Control-Max-Age': '86400',
};

function jsonWithCors(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

async function resolveAuthenticatedUserId(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();

    let userId = verifyExtensionToken(token);
    if (!userId && token.startsWith('neupc_') && token.length >= 70) {
      const { data: tokenUser, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('extension_token', token)
        .maybeSingle();

      if (!error && tokenUser?.id) {
        userId = tokenUser.id;
      }
    }

    if (userId) {
      return userId;
    }
  }

  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const dbUser = await getCachedUserByEmail(session.user.email);
  return dbUser?.id || null;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return jsonWithCors({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const handle = searchParams.get('handle');
    const type = searchParams.get('type') || 'all';

    if (!platform || !handle) {
      return jsonWithCors(
        { error: 'Missing required parameters: platform and handle' },
        { status: 400 }
      );
    }

    const clistService = new ClistService();

    if (!clistService.isConfigured()) {
      return jsonWithCors(
        {
          error: 'CLIST API not configured',
          message:
            'Please set CLIST_API_KEY and CLIST_API_USERNAME environment variables',
        },
        { status: 503 }
      );
    }

    // Check if platform is supported
    const clistHost = clistService.getClistHost(platform);
    if (!clistHost) {
      return jsonWithCors(
        { error: `Platform '${platform}' is not supported by CLIST` },
        { status: 400 }
      );
    }

    let data = {};

    switch (type) {
      case 'stats':
        data = await clistService.getAccountStats(platform, handle);
        break;

      case 'rating':
        data = await clistService.getRatingHistory(platform, handle);
        break;

      case 'contests':
        const limit = parseInt(searchParams.get('limit')) || 50;
        data = await clistService.getContestHistory(platform, handle, limit);
        break;

      case 'all':
      default:
        data = await clistService.getFullStats(platform, handle);
        break;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return jsonWithCors(
        {
          error: 'No data found',
          message: `Could not find data for ${handle} on ${platform}`,
        },
        { status: 404 }
      );
    }

    return jsonWithCors({
      success: true,
      platform,
      handle,
      type,
      data,
    });
  } catch (error) {
    console.error('CLIST API error:', error);
    return jsonWithCors(
      { error: error.message || 'Failed to fetch CLIST data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/problem-solving/clist
 * Fetch data for multiple handles at once
 *
 * Body:
 * {
 *   handles: [{ platform: "codeforces", handle: "tourist" }, ...]
 *   type: "rating" | "contests" | "stats" | "all"
 * }
 */
export async function POST(request) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return jsonWithCors({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { handles, type = 'all' } = body;

    if (!handles || !Array.isArray(handles) || handles.length === 0) {
      return jsonWithCors(
        { error: 'Missing required parameter: handles (array)' },
        { status: 400 }
      );
    }

    const clistService = new ClistService();

    if (!clistService.isConfigured()) {
      return jsonWithCors(
        {
          error: 'CLIST API not configured',
          message:
            'Please set CLIST_API_KEY and CLIST_API_USERNAME environment variables',
        },
        { status: 503 }
      );
    }

    let data = {};

    switch (type) {
      case 'rating':
        data = await clistService.getAggregatedRatingHistory(handles);
        break;

      case 'contests':
        data = await clistService.getAggregatedContestHistory(handles, 30);
        break;

      case 'stats':
      case 'all':
      default:
        data = await clistService.getMultiPlatformStats(handles);
        break;
    }

    return jsonWithCors({
      success: true,
      type,
      handles: handles.length,
      data,
    });
  } catch (error) {
    console.error('CLIST API error:', error);
    return jsonWithCors(
      { error: error.message || 'Failed to fetch CLIST data' },
      { status: 500 }
    );
  }
}
