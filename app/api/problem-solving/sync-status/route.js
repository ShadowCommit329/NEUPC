/**
 * Problem Solving API - Sync Status Endpoint
 * GET /api/problem-solving/sync-status
 * Returns sync status and statistics for the current user
 *
 * This endpoint:
 * 1. Returns current sync status across all platforms
 * 2. Shows last sync times and submission counts
 * 3. Provides extension token for browser extension authentication
 * 4. Shows recent sync activity and statistics
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  generateExtensionToken,
  verifyExtensionToken,
} from '@/app/_lib/extension-auth';
import {
  V2_TABLES,
  getAllPlatforms,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  console.log('[SYNC-STATUS] GET request received');

  try {
    let userId = null;

    // Check for extension token in Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('[SYNC-STATUS] Auth header present:', !!authHeader);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      console.log('[SYNC-STATUS] Token length:', token.length);

      // Try JWT token first (generated token)
      userId = verifyExtensionToken(token);
      console.log('[SYNC-STATUS] JWT verification result:', userId);

      // If JWT fails, try database token lookup
      if (!userId) {
        console.log('[SYNC-STATUS] JWT failed, trying database token');

        // Validate token format before database query
        if (!token.startsWith('neupc_') || token.length < 70) {
          console.log('[SYNC-STATUS] Invalid token format, skipping DB lookup');
        } else {
          const { data: tokenUser, error: dbError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('extension_token', token)
            .maybeSingle();

          if (dbError) {
            console.error(
              '[SYNC-STATUS] Database token lookup error:',
              dbError
            );
          }

          if (tokenUser) {
            userId = tokenUser.id;
            console.log(
              '[SYNC-STATUS] Database token verified, userId:',
              userId
            );
          }
        }
      }
    }

    // Fallback to NextAuth session
    if (!userId) {
      console.log('[SYNC-STATUS] No token auth, checking session');
      const session = await auth();
      if (!session?.user?.email) {
        console.log('[SYNC-STATUS] No session, returning 401');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: corsHeaders }
        );
      }
      const dbUser = await getCachedUserByEmail(session.user.email);
      if (!dbUser) {
        console.log('[SYNC-STATUS] User not found in database');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      userId = dbUser.id;
      console.log('[SYNC-STATUS] Session authenticated, userId:', userId);
    }

    console.log('[SYNC-STATUS] Fetching handles for user:', userId);

    // Get user handles and their sync status
    const { data: handles } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select(
        `
        handle, is_verified, last_synced_at, created_at,
        platforms!inner(code, name)
      `
      )
      .eq('user_id', userId);

    // Transform handles to include platform code at top level
    const normalizedHandles = (handles || []).map((h) => ({
      platform: h.platforms?.code,
      handle: h.handle,
      is_verified: h.is_verified,
      last_synced_at: h.last_synced_at,
      created_at: h.created_at,
    }));

    // Get submission counts per platform
    const { data: submissionCounts } = await supabaseAdmin
      .from(V2_TABLES.SUBMISSIONS)
      .select(
        `
        created_at,
        platforms!inner(code)
      `
      )
      .eq('user_id', userId);

    // Normalize submission counts
    const normalizedSubmissions = (submissionCounts || []).map((s) => ({
      platform: s.platforms?.code,
      created_at: s.created_at,
    }));

    // Get recent sync activity from cache
    const { data: recentActivity } = await supabaseAdmin
      .from('api_cache')
      .select('cache_key, cache_value, updated_at')
      .like('cache_key', `%_sync_${userId}%`)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Get user statistics
    const { data: userStats } = await supabaseAdmin
      .from(V2_TABLES.USER_STATS)
      .select('*')
      .eq('user_id', userId)
      .single();

    // Process submission counts by platform
    const platformStats = {};
    if (normalizedSubmissions) {
      normalizedSubmissions.forEach((submission) => {
        if (!platformStats[submission.platform]) {
          platformStats[submission.platform] = {
            totalSubmissions: 0,
            lastSubmissionAt: null,
          };
        }
        platformStats[submission.platform].totalSubmissions++;

        const submissionDate = new Date(submission.created_at);
        if (
          !platformStats[submission.platform].lastSubmissionAt ||
          submissionDate >
            new Date(platformStats[submission.platform].lastSubmissionAt)
        ) {
          platformStats[submission.platform].lastSubmissionAt =
            submission.created_at;
        }
      });
    }

    // Combine handle info with submission stats
    const platformSyncStatus = (normalizedHandles || []).map((handle) => ({
      platform: handle.platform,
      handle: handle.handle,
      isVerified: handle.is_verified,
      isConnected: true,
      lastSyncedAt: handle.last_synced_at,
      connectedAt: handle.created_at,
      totalSubmissions: platformStats[handle.platform]?.totalSubmissions || 0,
      lastSubmissionAt:
        platformStats[handle.platform]?.lastSubmissionAt || null,
    }));

    // Process recent activity
    const recentSyncActivity = (recentActivity || []).map((activity) => {
      const keyParts = activity.cache_key.split('_');
      const activityType =
        keyParts[0] === 'extension'
          ? 'extension_sync'
          : keyParts[0] === 'bulk'
            ? 'bulk_import'
            : 'unknown';

      return {
        type: activityType,
        timestamp: activity.updated_at,
        details: activity.cache_value,
      };
    });

    // Generate extension token
    const extensionToken = generateExtensionToken(userId);

    // Get supported platforms from database
    const supportedPlatforms = (await getAllPlatforms()).map((p) => p.code);

    console.log(
      '[SYNC-STATUS] Returning success response with',
      platformSyncStatus.length,
      'platforms'
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          userId,
          extensionToken,
          syncStatus: {
            connectedPlatforms: platformSyncStatus.length,
            totalSubmissions: Object.values(platformStats).reduce(
              (sum, stats) => sum + stats.totalSubmissions,
              0
            ),
            lastSyncAt: userStats?.last_updated || null,
            platforms: platformSyncStatus,
          },
          statistics: userStats
            ? {
                totalSolved: userStats.total_solved || 0,
                totalAttempted: userStats.total_attempted || 0,
                solveRate: userStats.solve_rate || 0,
                avgDifficulty: userStats.avg_difficulty || 0,
                preferredLanguages: userStats.preferred_languages || [],
                lastUpdated: userStats.last_updated,
              }
            : null,
          recentActivity: recentSyncActivity,
          supportedPlatforms,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[SYNC-STATUS] Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST endpoint to update sync settings
export async function POST(request) {
  try {
    let userId = null;

    // Check for extension token in Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      userId = verifyExtensionToken(token);

      // If JWT fails, try database token lookup
      if (!userId) {
        const { data: tokenUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('extension_token', token)
          .maybeSingle();

        if (tokenUser) {
          userId = tokenUser.id;
        }
      }
    }

    // Fallback to NextAuth session
    if (!userId) {
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: corsHeaders }
        );
      }
      const dbUser = await getCachedUserByEmail(session.user.email);
      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      userId = dbUser.id;
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { action, platform, settings } = body;

    if (action === 'clear_sync_cache') {
      // Clear sync cache for user (useful for debugging)
      await supabaseAdmin
        .from('api_cache')
        .delete()
        .like('cache_key', `%_sync_${userId}%`);

      return NextResponse.json(
        {
          success: true,
          message: 'Sync cache cleared',
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'reset_platform_sync' && platform) {
      // Get platform_id
      const platformId = await getPlatformId(platform);

      if (platformId) {
        await supabaseAdmin
          .from(V2_TABLES.USER_HANDLES)
          .update({ last_synced_at: null })
          .eq('user_id', userId)
          .eq('platform_id', platformId);
      }

      return NextResponse.json(
        {
          success: true,
          message: `Reset sync status for ${platform}`,
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'update_sync_settings' && settings) {
      // Update sync settings (store in user preferences)
      await supabaseAdmin.from('api_cache').upsert({
        cache_key: `sync_settings_${userId}`,
        cache_value: settings,
        expires_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Sync settings updated',
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error updating sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
