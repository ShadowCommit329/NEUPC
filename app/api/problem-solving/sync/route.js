/**
 * Problem Solving API - Sync Endpoint (Multi-Platform Support with Batch Processing)
 * POST /api/problem-solving/sync
 * Triggers manual sync of user's submissions and rating history for all connected platforms
 *
 * Uses the new normalized schema with batch processing and checkpoints.
 *
 * Body: {
 *   platform?: string,        // Optional: specific platform to sync
 *   forceFullSync?: boolean   // Optional: force full sync (defaults to false for incremental)
 *   useBatchSync?: boolean    // Optional: use new batch sync orchestrator (defaults to true)
 * }
 *
 * This endpoint:
 * 1. Fetches submissions from connected platforms (or specific platform if provided)
 * 2. Processes data in batches with progress tracking
 * 3. Skips already existing data (incremental sync)
 * 4. Saves checkpoints for resume capability
 * 5. Fetches rating history from platforms that support it
 * 6. Fetches contest history from platforms that support it
 * 7. Updates user statistics
 * 8. Revalidates UI only after successful sync
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  ProblemSolvingAggregator,
  CodeforcesService,
  AtCoderService,
} from '@/app/_lib/problem-solving-services';
import {
  V2_TABLES,
  getPlatformId,
  getUserHandlesV2,
} from '@/app/_lib/problem-solving-v2-helpers.js';
import { syncPlatformWithBatches } from '@/app/_lib/problem-solving-batch-aware-sync.js';

// Rate limit: 5 minutes for sync
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

function normalizePlatformHandle(platform, rawHandle) {
  const trimmed = String(rawHandle || '').trim();
  if (!trimmed) return '';

  if (platform !== 'leetcode') {
    return trimmed;
  }

  let normalized = trimmed.replace(/^@+/, '');
  normalized = normalized.replace(
    /^(?:https?:\/\/)?(?:www\.)?leetcode\.(?:com|cn)\//i,
    ''
  );
  normalized = normalized.replace(/^(?:u|profile)\//i, '');
  normalized = normalized.split(/[/?#]/)[0].replace(/^@+/, '').trim();
  return normalized;
}

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getCachedUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = dbUser.id;

    // Parse request body - default to incremental sync with batch processing
    let forceFullSync = false;
    let targetPlatform = null;
    let useBatchSync = true;

    try {
      const body = await request.json();
      forceFullSync = body?.forceFullSync === true;
      targetPlatform = body?.platform || null;
      useBatchSync = body?.useBatchSync !== false;
    } catch {
      // No body or invalid JSON - use defaults (incremental sync, batch processing)
    }

    // Apply rate limit - check last sync time
    const { data: lastSync } = await supabaseAdmin
      .from(V2_TABLES.USER_STATS)
      .select('last_updated, updated_at')
      .eq('user_id', userId)
      .single();

    const lastUpdateTime = lastSync?.last_updated || lastSync?.updated_at;
    if (lastUpdateTime) {
      const timeSinceSync = Date.now() - new Date(lastUpdateTime).getTime();
      if (timeSinceSync < SYNC_COOLDOWN_MS) {
        const waitTime = Math.ceil((SYNC_COOLDOWN_MS - timeSinceSync) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitTime} seconds before syncing again` },
          { status: 429 }
        );
      }
    }

    // Get connected handles (all platforms or specific platform)
    const allHandles = await getUserHandlesV2(userId);
    const handles = targetPlatform
      ? allHandles.filter((h) => h.platform === targetPlatform)
      : allHandles;

    if (!handles || handles.length === 0) {
      const message = targetPlatform
        ? `No ${targetPlatform} handle connected. Please connect your handle first.`
        : 'No platform handles connected. Please connect at least one platform handle first.';

      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.log(
      `[SYNC] Starting sync for user ${userId} (batch: ${useBatchSync})`
    );
    console.log(
      `[SYNC] Platforms to sync: ${handles.map((h) => h.platform).join(', ')}`
    );
    console.log(`[SYNC] Sync mode: ${forceFullSync ? 'FULL' : 'INCREMENTAL'}`);

    const syncResults = [];

    // ========================================================================
    // BATCH SYNC ORCHESTRATOR (Recommended)
    // ========================================================================
    if (useBatchSync) {
      console.log('[SYNC] Using batch sync orchestrator with checkpoints');

      for (const handleRecord of handles) {
        const platform = handleRecord.platform;
        const handle = normalizePlatformHandle(platform, handleRecord.handle);

        if (!handle) {
          syncResults.push({
            platform,
            handle: handleRecord.handle,
            submissionsSynced: 0,
            error: 'Invalid or empty handle format',
          });
          continue;
        }

        try {
          console.log(`[SYNC] Starting batch sync for ${platform}:${handle}`);

          // Use the batch-aware sync
          const result = await syncPlatformWithBatches(
            userId,
            platform,
            handle,
            'manual',
            forceFullSync
          );

          if (result.success) {
            const submissions = result.results.stages.submissions || {};
            const rating = result.results.stages.ratingHistory || {};
            const contests = result.results.stages.contestHistory || {};

            syncResults.push({
              platform,
              handle,
              submissionsSynced: submissions.synced || 0,
              submissionsSkipped: submissions.skipped || 0,
              ratingSynced: rating.synced || 0,
              contestsSynced: contests.synced || 0,
              syncSessionId: result.syncSessionId,
              error: null,
            });

            console.log(
              `[SYNC] ✓ ${platform}: submissions=${submissions.synced || 0} (skipped=${submissions.skipped || 0}), ` +
                `rating=${rating.synced || 0}, contests=${contests.synced || 0}`
            );
          } else {
            syncResults.push({
              platform,
              handle,
              submissionsSynced: 0,
              error: result.error,
            });

            console.error(`[SYNC] ✗ ${platform}: ${result.error}`);
          }
        } catch (platformError) {
          console.error(
            `[SYNC] Platform sync failed for ${platform}:`,
            platformError.message
          );
          syncResults.push({
            platform,
            handle,
            submissionsSynced: 0,
            error: platformError.message,
          });
        }
      }
    }
    // ========================================================================
    // LEGACY SYNC (Fallback)
    // ========================================================================
    else {
      console.log('[SYNC] Using legacy sync method');

      const aggregator = new ProblemSolvingAggregator();

      // Sync submissions for each connected platform
      for (const handleRecord of handles) {
        const platform = handleRecord.platform;
        const handle = normalizePlatformHandle(platform, handleRecord.handle);

        if (!handle) {
          syncResults.push({
            platform,
            handle: handleRecord.handle,
            submissionsSynced: 0,
            error: 'Invalid or empty handle format',
          });
          continue;
        }

        try {
          console.log(
            `[SYNC] Syncing ${platform} submissions for handle: ${handle}`
          );

          const platformResult = await aggregator.syncPlatformSubmissions(
            userId,
            platform,
            forceFullSync
          );

          syncResults.push({
            platform,
            handle,
            submissionsSynced: platformResult.synced || 0,
            error: platformResult.error || null,
          });

          // Also sync rating history for platforms that support it
          if (['codeforces', 'atcoder', 'topcoder'].includes(platform)) {
            try {
              let ratingResult = null;

              if (platform === 'codeforces') {
                const codeforcesService = new CodeforcesService();
                const ratingHistory =
                  await codeforcesService.getRatingHistory(handle);
                ratingResult = await syncRatingHistory(
                  userId,
                  platform,
                  handle,
                  ratingHistory
                );
              } else if (platform === 'atcoder') {
                const atcoderService = new AtCoderService();
                const ratingHistory =
                  await atcoderService.getRatingHistory(handle);
                ratingResult = await syncRatingHistory(
                  userId,
                  platform,
                  handle,
                  ratingHistory
                );
              }

              if (ratingResult) {
                syncResults[syncResults.length - 1].ratingSynced =
                  ratingResult.synced;
              }
            } catch (ratingError) {
              console.warn(
                `[SYNC] Rating sync failed for ${platform}:`,
                ratingError.message
              );
              syncResults[syncResults.length - 1].ratingError =
                ratingError.message;
            }
          }
        } catch (platformError) {
          console.error(
            `[SYNC] Platform sync failed for ${platform}:`,
            platformError.message
          );
          syncResults.push({
            platform,
            handle,
            submissionsSynced: 0,
            error: platformError.message,
          });
        }
      }

      // Update user statistics (legacy only - batch sync handles this internally)
      try {
        await aggregator.updateUserStatistics(userId);
        console.log(`[SYNC] Updated statistics for user ${userId}`);
      } catch (statsError) {
        console.warn(`[SYNC] Statistics update failed:`, statsError.message);
      }
    }

    // Calculate totals
    const totalSubmissions = syncResults.reduce(
      (sum, result) => sum + (result.submissionsSynced || 0),
      0
    );
    const totalSkipped = syncResults.reduce(
      (sum, result) => sum + (result.submissionsSkipped || 0),
      0
    );
    const totalRatingSynced = syncResults.reduce(
      (sum, result) => sum + (result.ratingSynced || 0),
      0
    );
    const successfulPlatforms = syncResults.filter(
      (result) => !result.error
    ).length;
    const failedPlatforms = syncResults.filter((result) => result.error).length;

    console.log(`[SYNC] Sync completed for user ${userId}`);
    console.log(
      `[SYNC] Total submissions synced: ${totalSubmissions} (skipped: ${totalSkipped})`
    );
    console.log(
      `[SYNC] Successful platforms: ${successfulPlatforms}, Failed: ${failedPlatforms}`
    );

    // Build appropriate message based on sync mode
    let message;
    if (useBatchSync) {
      message = targetPlatform
        ? `Synced ${totalSubmissions} new submissions (${totalSkipped} already existed) from ${targetPlatform}`
        : `Synced ${totalSubmissions} new submissions (${totalSkipped} already existed) from ${successfulPlatforms} platform(s)`;
    } else {
      message = targetPlatform
        ? `Synced ${totalSubmissions} submissions and ${totalRatingSynced} rating entries from ${targetPlatform}`
        : `Synced ${totalSubmissions} submissions and ${totalRatingSynced} rating entries from ${successfulPlatforms} platform(s)`;
    }

    // Revalidate problem-solving pages ONLY after successful sync
    if (successfulPlatforms > 0) {
      console.log('[SYNC] Revalidating UI paths...');
      revalidatePath('/account/member/problem-solving');
      revalidatePath('/account/member/problem-solving/[userId]', 'page');
      console.log('[SYNC] UI paths revalidated');
    }

    return NextResponse.json({
      success: true,
      syncMethod: useBatchSync ? 'batch' : 'legacy',
      data: {
        totalSubmissions,
        totalSkipped,
        totalRatingSynced,
        platforms: syncResults,
        successfulPlatforms,
        failedPlatforms,
        message,
        syncMode: forceFullSync ? 'full' : 'incremental',
        targetPlatform: targetPlatform || 'all',
      },
    });
  } catch (error) {
    console.error('Error syncing submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to sync rating history
async function syncRatingHistory(userId, platform, handle, ratingHistory) {
  if (!ratingHistory || ratingHistory.length === 0) {
    return { synced: 0 };
  }

  // Get platform_id for the new schema
  const platformId = await getPlatformId(platform);
  if (!platformId) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  // Transform rating history based on platform
  // V2 rating_history schema: user_id, platform_id, contest_id (UUID FK, nullable), rating, rating_change, recorded_at
  // V2 contest_history schema: user_id, platform_id, external_contest_id (varchar), contest_name, contest_url, contest_date,
  //   duration_minutes, rank, total_participants, problems_solved, problems_attempted, score, old_rating, new_rating,
  //   rating_change, is_rated, is_virtual, division, created_at

  let ratingEntries = [];
  let contestEntries = [];

  if (platform === 'codeforces') {
    const contestDate = (entry) =>
      new Date(entry.ratingUpdateTimeSeconds * 1000).toISOString();

    ratingEntries = ratingHistory.map((entry) => ({
      user_id: userId,
      platform_id: platformId,
      contest_id: null, // V2 expects UUID FK to contests table, we don't have that mapping
      rating: entry.newRating,
      rating_change: entry.newRating - entry.oldRating,
      recorded_at: contestDate(entry),
    }));

    contestEntries = ratingHistory.map((entry) => ({
      user_id: userId,
      platform_id: platformId,
      external_contest_id: String(entry.contestId),
      contest_name: entry.contestName || `Contest ${entry.contestId}`,
      contest_url: `https://codeforces.com/contest/${entry.contestId}`,
      contest_date: contestDate(entry),
      rank: entry.rank,
      old_rating: entry.oldRating,
      new_rating: entry.newRating,
      rating_change: entry.newRating - entry.oldRating,
      is_rated: true,
      created_at: new Date().toISOString(),
    }));
  } else if (platform === 'atcoder') {
    const contestDate = (entry) =>
      new Date(entry.EndTime || entry.end_time).toISOString();
    const getOldRating = (entry) => entry.OldRating ?? entry.old_rating ?? 0;
    const getNewRating = (entry) => entry.NewRating ?? entry.new_rating ?? 0;
    const getContestId = (entry) => entry.ContestId || entry.contest_id || '';
    const getContestName = (entry) =>
      entry.ContestName || entry.contest_name || `AtCoder Contest`;

    ratingEntries = ratingHistory.map((entry) => ({
      user_id: userId,
      platform_id: platformId,
      contest_id: null, // V2 expects UUID FK to contests table, we don't have that mapping
      rating: getNewRating(entry),
      rating_change: getNewRating(entry) - getOldRating(entry),
      recorded_at: contestDate(entry),
    }));

    contestEntries = ratingHistory.map((entry) => ({
      user_id: userId,
      platform_id: platformId,
      external_contest_id: getContestId(entry),
      contest_name: getContestName(entry),
      contest_url: `https://atcoder.jp/contests/${getContestId(entry)}`,
      contest_date: contestDate(entry),
      rank: entry.Place || entry.rank,
      old_rating: getOldRating(entry),
      new_rating: getNewRating(entry),
      rating_change: getNewRating(entry) - getOldRating(entry),
      is_rated: entry.IsRated ?? true,
      created_at: new Date().toISOString(),
    }));
  }

  // Upsert rating history
  // V2 unique constraint is on (user_id, platform_id, recorded_at)
  if (ratingEntries.length > 0) {
    const { error: ratingError } = await supabaseAdmin
      .from(V2_TABLES.RATING_HISTORY)
      .upsert(ratingEntries, {
        onConflict: 'user_id,platform_id,recorded_at',
        ignoreDuplicates: false,
      });

    if (ratingError) {
      console.error(
        `[SYNC] Error saving ${platform} rating history:`,
        ratingError
      );
      throw new Error(
        `Failed to save ${platform} rating history: ${ratingError.message}`
      );
    }

    console.log(
      `[SYNC] Saved ${ratingEntries.length} ${platform} rating history entries`
    );
  }

  // Upsert contest history
  // V2 unique constraint is on (user_id, platform_id, external_contest_id)
  if (contestEntries.length > 0) {
    const { error: contestError } = await supabaseAdmin
      .from(V2_TABLES.CONTEST_HISTORY)
      .upsert(contestEntries, {
        onConflict: 'user_id,platform_id,external_contest_id',
        ignoreDuplicates: false,
      });

    if (contestError) {
      console.warn(
        `[SYNC] Error saving ${platform} contest history:`,
        contestError.message
      );
    } else {
      console.log(
        `[SYNC] Saved ${contestEntries.length} ${platform} contest history entries`
      );
    }
  }

  return { synced: ratingEntries.length };
}
