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
import crypto from 'crypto';
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

const EXTENSION_CHECKPOINT_JOB_TYPE = 'extension_bulk_import';

const SUPPORTED_CHECKPOINT_VERDICT_FILTERS = new Set([
  'all',
  'ac',
  'wa',
  'tle',
  'mle',
  're',
  'ce',
  'pe',
  'ile',
  'pc',
  'pending',
  'unknown',
]);

function normalizeCheckpointVerdictFilter(verdictFilter) {
  const normalized = String(verdictFilter || 'all')
    .trim()
    .toLowerCase();

  if (normalized === 'accepted' || normalized === 'ok') {
    return 'ac';
  }

  return SUPPORTED_CHECKPOINT_VERDICT_FILTERS.has(normalized)
    ? normalized
    : 'all';
}

function normalizeCheckpointContext({
  platform,
  handle,
  fetchCodes,
  verdictFilter,
}) {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();
  const normalizedHandle = String(handle || '')
    .trim()
    .toLowerCase();

  if (!normalizedPlatform || !normalizedHandle) {
    return null;
  }

  return {
    platform: normalizedPlatform,
    handle: normalizedHandle,
    fetchCodes: Boolean(fetchCodes),
    verdictFilter: normalizeCheckpointVerdictFilter(verdictFilter),
  };
}

function buildExtensionCheckpointKey(context) {
  const handleHash = crypto
    .createHash('sha1')
    .update(context.handle)
    .digest('hex')
    .slice(0, 24);

  return `ext_cp:${context.platform}:${context.fetchCodes ? 1 : 0}:${context.verdictFilter}:${handleHash}`.slice(
    0,
    100
  );
}

function toSafeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function buildExtensionCheckpointPayload(row, context) {
  if (!row) {
    return null;
  }

  const totalPages = toSafeInt(row.total_items);
  const lastCompletedPage = toSafeInt(row.processed_items);
  const currentPage = Math.max(
    lastCompletedPage,
    toSafeInt(row.processed_items)
  );
  const imported = toSafeInt(row.inserted_items);

  return {
    version: 1,
    updatedAt:
      row.last_processed_at || row.completed_at || row.created_at || null,
    platform: context.platform,
    handle: context.handle,
    fetchCodes: context.fetchCodes,
    verdictFilter: context.verdictFilter,
    currentPage,
    totalPages,
    lastCompletedPage,
    totalSubmissions: 0,
    processedSubmissions: 0,
    codesFetched: 0,
    codesSkipped: 0,
    imported,
    submissionsCreated: 0,
    submissionsUpdated: 0,
    phase: row.error_message || row.status || 'importing',
  };
}

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

    const {
      action,
      platform,
      settings,
      handle,
      fetchCodes,
      verdictFilter,
      checkpoint,
    } = body;

    if (action === 'get_extension_checkpoint') {
      const checkpointContext = normalizeCheckpointContext({
        platform,
        handle,
        fetchCodes,
        verdictFilter,
      });

      if (!checkpointContext) {
        return NextResponse.json(
          { error: 'platform and handle are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const platformId = await getPlatformId(checkpointContext.platform);
      if (!platformId) {
        return NextResponse.json(
          { error: `Unknown platform: ${checkpointContext.platform}` },
          { status: 400, headers: corsHeaders }
        );
      }

      const checkpointKey = buildExtensionCheckpointKey(checkpointContext);

      const { data: row, error: rowError } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .select(
          'id, status, total_items, processed_items, inserted_items, completed_at, last_processed_at, created_at, error_message'
        )
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .eq('job_type', EXTENSION_CHECKPOINT_JOB_TYPE)
        .eq('last_processed_id', checkpointKey)
        .order('last_processed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rowError) {
        console.error('[SYNC-STATUS] Checkpoint lookup failed:', rowError);
        return NextResponse.json(
          { error: 'Failed to fetch extension checkpoint' },
          { status: 500, headers: corsHeaders }
        );
      }

      // Completed checkpoints are not resumable.
      const payload =
        row && row.status !== 'completed'
          ? buildExtensionCheckpointPayload(row, checkpointContext)
          : null;

      return NextResponse.json(
        {
          success: true,
          data: {
            checkpoint: payload,
          },
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'save_extension_checkpoint') {
      const checkpointContext = normalizeCheckpointContext({
        platform,
        handle,
        fetchCodes,
        verdictFilter,
      });

      if (!checkpointContext) {
        return NextResponse.json(
          { error: 'platform and handle are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const platformId = await getPlatformId(checkpointContext.platform);
      if (!platformId) {
        return NextResponse.json(
          { error: `Unknown platform: ${checkpointContext.platform}` },
          { status: 400, headers: corsHeaders }
        );
      }

      const checkpointKey = buildExtensionCheckpointKey(checkpointContext);
      const checkpointData =
        checkpoint && typeof checkpoint === 'object' ? checkpoint : {};

      const totalPages = toSafeInt(checkpointData.totalPages);
      const currentPage = toSafeInt(checkpointData.currentPage);
      const lastCompletedPage = Math.max(
        toSafeInt(checkpointData.lastCompletedPage),
        currentPage
      );
      const imported = toSafeInt(checkpointData.imported);
      const phase = String(checkpointData.phase || 'importing').trim();
      const nowIso = new Date().toISOString();

      const status =
        phase.toLowerCase() === 'complete' ? 'completed' : 'in_progress';

      const { data: existingRow, error: existingRowError } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .select('id')
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .eq('job_type', EXTENSION_CHECKPOINT_JOB_TYPE)
        .eq('last_processed_id', checkpointKey)
        .order('last_processed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRowError) {
        console.error(
          '[SYNC-STATUS] Checkpoint pre-update lookup failed:',
          existingRowError
        );
        return NextResponse.json(
          { error: 'Failed to save extension checkpoint' },
          { status: 500, headers: corsHeaders }
        );
      }

      const payload = {
        status,
        completed_at: status === 'completed' ? nowIso : null,
        total_items: totalPages,
        processed_items: lastCompletedPage,
        inserted_items: imported,
        last_processed_at: nowIso,
        error_message: phase,
      };

      if (existingRow?.id) {
        const { error: updateError } = await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update(payload)
          .eq('id', existingRow.id);

        if (updateError) {
          console.error('[SYNC-STATUS] Checkpoint update failed:', updateError);
          return NextResponse.json(
            { error: 'Failed to update extension checkpoint' },
            { status: 500, headers: corsHeaders }
          );
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .insert({
            user_id: userId,
            platform_id: platformId,
            job_type: EXTENSION_CHECKPOINT_JOB_TYPE,
            status,
            scheduled_at: nowIso,
            started_at: nowIso,
            completed_at: status === 'completed' ? nowIso : null,
            total_items: totalPages,
            processed_items: lastCompletedPage,
            inserted_items: imported,
            last_processed_id: checkpointKey,
            last_processed_at: nowIso,
            error_message: phase,
          });

        if (insertError) {
          console.error('[SYNC-STATUS] Checkpoint insert failed:', insertError);
          return NextResponse.json(
            { error: 'Failed to create extension checkpoint' },
            { status: 500, headers: corsHeaders }
          );
        }
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            checkpointSaved: true,
          },
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'clear_extension_checkpoint') {
      const checkpointContext = normalizeCheckpointContext({
        platform,
        handle,
        fetchCodes,
        verdictFilter,
      });

      if (!checkpointContext) {
        return NextResponse.json(
          { error: 'platform and handle are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const platformId = await getPlatformId(checkpointContext.platform);
      if (!platformId) {
        return NextResponse.json(
          { error: `Unknown platform: ${checkpointContext.platform}` },
          { status: 400, headers: corsHeaders }
        );
      }

      const checkpointKey = buildExtensionCheckpointKey(checkpointContext);

      const { error: deleteError } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .delete()
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .eq('job_type', EXTENSION_CHECKPOINT_JOB_TYPE)
        .eq('last_processed_id', checkpointKey);

      if (deleteError) {
        console.error('[SYNC-STATUS] Checkpoint clear failed:', deleteError);
        return NextResponse.json(
          { error: 'Failed to clear extension checkpoint' },
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            checkpointCleared: true,
          },
        },
        { headers: corsHeaders }
      );
    }

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
