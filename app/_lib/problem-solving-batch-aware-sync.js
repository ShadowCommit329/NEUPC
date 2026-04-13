/**
 * Enhanced Batch-Aware Sync Functions
 *
 * This module provides wrapper functions around ProblemSolvingAggregator
 * that integrate with BatchSyncOrchestrator for professional batch processing.
 *
 * Features:
 * - Batch-by-batch processing (extract → store → revalidate)
 * - Incremental sync (skip existing data)
 * - Checkpoint support for resume capability
 * - Progress tracking
 *
 * @module problem-solving-batch-aware-sync
 */

import {
  ProblemSolvingAggregator,
  ClistService,
} from './problem-solving-services';
import {
  BatchSyncOrchestrator,
  SYNC_STAGES,
  SYNC_STATUS,
} from './problem-solving-batch-sync';
import { supabaseAdmin } from './supabase';
import {
  V2_TABLES,
  isV2SchemaAvailable,
  getPlatformId,
} from './problem-solving-v2-helpers';

/**
 * Sync submissions with batch processing and progress tracking
 */
export async function syncSubmissionsBatchAware(
  userId,
  platform,
  handle,
  orchestrator,
  progressId,
  forceFullSync = false
) {
  const aggregator = new ProblemSolvingAggregator();

  try {
    // Update stage to in_progress
    await orchestrator.updateStageProgress(progressId, {
      status: SYNC_STATUS.IN_PROGRESS,
      started_at: new Date().toISOString(),
    });

    console.log(`[BatchSync] Fetching submissions for ${platform}:${handle}`);

    // STEP 1: Extract submissions from platform API
    let fromTimestamp = null;
    if (!forceFullSync) {
      // Get checkpoint or last submission
      const checkpoint = await orchestrator.getLastCheckpoint(
        userId,
        platform,
        SYNC_STAGES.SUBMISSIONS
      );
      if (checkpoint?.lastSubmissionTimestamp) {
        fromTimestamp = checkpoint.lastSubmissionTimestamp;
        console.log(`[BatchSync] Resuming from checkpoint: ${fromTimestamp}`);
      } else {
        const lastSubmission = await aggregator.getLastSubmission(
          userId,
          platform
        );
        fromTimestamp = lastSubmission?.submitted_at;
        if (fromTimestamp) {
          console.log(`[BatchSync] Incremental sync from: ${fromTimestamp}`);
        }
      }
    }

    // Fetch submissions from platform
    let submissions = [];
    const platformService = getPlatformService(aggregator, platform);

    if (platformService) {
      submissions = await platformService.getSubmissions(handle, fromTimestamp);
    } else {
      throw new Error(`No service available for platform: ${platform}`);
    }

    console.log(
      `[BatchSync] Fetched ${submissions.length} submissions from ${platform}`
    );

    if (!submissions || submissions.length === 0) {
      await orchestrator.skipStage(progressId, 'No new submissions found');
      return { synced: 0, skipped: 0, failed: 0 };
    }

    // Update total items
    await orchestrator.updateStageProgress(progressId, {
      total_items: submissions.length,
      total_batches: Math.ceil(
        submissions.length / orchestrator.config.submissionsBatchSize
      ),
    });

    // STEP 2: Process submissions in batches
    const batchSize = orchestrator.config.submissionsBatchSize;
    const batches = [];
    for (let i = 0; i < submissions.length; i += batchSize) {
      batches.push(submissions.slice(i, i + batchSize));
    }

    console.log(
      `[BatchSync] Processing ${submissions.length} submissions in ${batches.length} batches`
    );

    let totalSynced = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Process this batch
      const result = await orchestrator.processBatch(
        progressId,
        i + 1,
        batch,
        async (itemsToProcess) => {
          // Insert batch into database
          const insertResult = await aggregator.insertSubmissions(
            userId,
            platform,
            itemsToProcess
          );
          return {
            success: insertResult.success,
            processed: insertResult.inserted || 0,
            failed: insertResult.errors?.length || 0,
          };
        },
        {
          skipExisting: !forceFullSync,
          userId,
          platform,
          stage: SYNC_STAGES.SUBMISSIONS,
        }
      );

      totalSynced += result.processed;
      totalSkipped += result.skipped;
      totalFailed += result.failed;

      console.log(
        `[BatchSync] Batch ${i + 1}/${batches.length}: synced=${result.processed}, skipped=${result.skipped}, failed=${result.failed}`
      );
    }

    // STEP 3: Save final checkpoint
    const lastSubmission = submissions[submissions.length - 1];
    await orchestrator.saveCheckpoint(progressId, {
      lastSubmissionId: lastSubmission.submission_id,
      lastSubmissionTimestamp: lastSubmission.submitted_at,
      totalProcessed: submissions.length,
      completedAt: new Date().toISOString(),
    });

    // Complete stage
    await orchestrator.completeStage(progressId, true);

    console.log(
      `[BatchSync] Submissions sync completed: synced=${totalSynced}, skipped=${totalSkipped}, failed=${totalFailed}`
    );

    return {
      synced: totalSynced,
      skipped: totalSkipped,
      failed: totalFailed,
      total: submissions.length,
    };
  } catch (error) {
    console.error(`[BatchSync] Submissions sync failed:`, error);
    await orchestrator.completeStage(progressId, false, error.message);
    throw error;
  }
}

/**
 * Sync rating history with batch processing
 */
export async function syncRatingHistoryBatchAware(
  userId,
  platform,
  handle,
  orchestrator,
  progressId,
  forceFullSync = false
) {
  try {
    await orchestrator.updateStageProgress(progressId, {
      status: SYNC_STATUS.IN_PROGRESS,
      started_at: new Date().toISOString(),
    });

    console.log(
      `[BatchSync] Fetching rating history for ${platform}:${handle}`
    );

    // Fetch rating history using CLIST with fallbacks
    const clistService = new ClistService();
    let ratingHistory = [];

    try {
      // Try CLIST first, which has fallbacks to platform-specific APIs
      // Pass userId to enable CLIST account ID caching
      ratingHistory = await clistService.getRatingHistory(
        platform,
        handle,
        userId
      );
      console.log(
        `[BatchSync] Retrieved ${ratingHistory.length} rating entries for ${platform}:${handle}`
      );
    } catch (error) {
      console.warn(
        `[BatchSync] Rating history fetch failed for ${platform}:${handle}:`,
        error.message
      );
      await orchestrator.skipStage(
        progressId,
        `Rating history not available: ${error.message}`
      );
      return { synced: 0, skipped: 0 };
    }

    if (!ratingHistory || ratingHistory.length === 0) {
      await orchestrator.skipStage(progressId, 'No rating history found');
      return { synced: 0, skipped: 0 };
    }

    console.log(
      `[BatchSync] Fetched ${ratingHistory.length} rating entries from ${platform}`
    );

    // Update total items
    await orchestrator.updateStageProgress(progressId, {
      total_items: ratingHistory.length,
      total_batches: Math.ceil(
        ratingHistory.length / orchestrator.config.ratingHistoryBatchSize
      ),
    });

    // Transform rating entries based on platform
    let ratingEntries = transformRatingHistory(
      userId,
      platform,
      handle,
      ratingHistory
    );

    // Process in batches
    const batchSize = orchestrator.config.ratingHistoryBatchSize;
    const batches = [];
    for (let i = 0; i < ratingEntries.length; i += batchSize) {
      batches.push(ratingEntries.slice(i, i + batchSize));
    }

    let totalSynced = 0;
    let totalSkipped = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      const result = await orchestrator.processBatch(
        progressId,
        i + 1,
        batch,
        async (itemsToProcess) => {
          // Insert batch into rating_history table
          // V2 schema uses platform_id and recorded_at as unique constraint
          const useV2 = await isV2SchemaAvailable();
          const conflictColumns = useV2
            ? 'user_id,platform_id,recorded_at'
            : 'user_id,platform,contest_id';

          const { data, error } = await supabaseAdmin
            .from('rating_history')
            .upsert(itemsToProcess, {
              onConflict: conflictColumns,
              ignoreDuplicates: false,
            });

          if (error) {
            throw error;
          }

          return {
            success: true,
            processed: itemsToProcess.length,
            failed: 0,
          };
        },
        {
          skipExisting: !forceFullSync,
          userId,
          platform,
          stage: SYNC_STAGES.RATING_HISTORY,
        }
      );

      totalSynced += result.processed;
      totalSkipped += result.skipped;
    }

    await orchestrator.completeStage(progressId, true);

    console.log(
      `[BatchSync] Rating history sync completed: synced=${totalSynced}, skipped=${totalSkipped}`
    );

    return { synced: totalSynced, skipped: totalSkipped };
  } catch (error) {
    console.error(`[BatchSync] Rating history sync failed:`, error);
    await orchestrator.completeStage(progressId, false, error.message);
    throw error;
  }
}

/**
 * Sync contest history with batch processing
 */
export async function syncContestHistoryBatchAware(
  userId,
  platform,
  handle,
  orchestrator,
  progressId,
  contestHistory
) {
  try {
    await orchestrator.updateStageProgress(progressId, {
      status: SYNC_STATUS.IN_PROGRESS,
      started_at: new Date().toISOString(),
    });

    if (!contestHistory || contestHistory.length === 0) {
      await orchestrator.skipStage(progressId, 'No contest history available');
      return { synced: 0 };
    }

    // Transform contest history based on schema version
    const useV2 = await isV2SchemaAvailable();
    let contestEntries;

    if (useV2) {
      // V2 schema: contest_history uses platform_id, external_contest_id, etc.
      const platformId = await getPlatformId(platform);

      contestEntries = contestHistory.map((entry) => ({
        user_id: userId,
        platform_id: platformId,
        external_contest_id: String(
          entry.platformContestId || entry.contestId || ''
        ),
        contest_name:
          entry.name || entry.contest_name || entry.contestName || '',
        contest_url: entry.url || entry.contest_url || '',
        contest_date: entry.date || entry.contest_date,
        duration_minutes: entry.durationMinutes || null,
        rank: entry.rank,
        total_participants: entry.totalParticipants || null,
        problems_solved: entry.solved || entry.problemsSolved || null,
        problems_attempted: entry.problemsAttempted || null,
        score: entry.score || null,
        old_rating: entry.oldRating || entry.old_rating || null,
        new_rating: entry.newRating || entry.new_rating || null,
        rating_change: entry.ratingChange || entry.rating_change || 0,
        is_rated: entry.isRated !== undefined ? entry.isRated : true,
        is_virtual: entry.isVirtual || false,
        division: entry.division || null,
        created_at: new Date().toISOString(),
      }));
    } else {
      // Legacy schema
      contestEntries = contestHistory.map((entry) => ({
        user_id: userId,
        platform,
        contest_id: entry.platformContestId || entry.contestId,
        contest_name: entry.name || entry.contest_name,
        handle,
        rank: entry.rank,
        rating_change: entry.ratingChange || entry.rating_change,
        new_rating: entry.newRating || entry.new_rating,
        contest_date: entry.date || entry.contest_date,
        source: platform,
        created_at: new Date().toISOString(),
      }));
    }

    await orchestrator.updateStageProgress(progressId, {
      total_items: contestEntries.length,
      total_batches: Math.ceil(
        contestEntries.length / orchestrator.config.contestHistoryBatchSize
      ),
    });

    // Process in batches
    const batchSize = orchestrator.config.contestHistoryBatchSize;
    const batches = [];
    for (let i = 0; i < contestEntries.length; i += batchSize) {
      batches.push(contestEntries.slice(i, i + batchSize));
    }

    let totalSynced = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      const result = await orchestrator.processBatch(
        progressId,
        i + 1,
        batch,
        async (itemsToProcess) => {
          // V2 schema uses platform_id, external_contest_id; legacy uses platform, contest_id
          const conflictColumns = useV2
            ? 'user_id,platform_id,external_contest_id'
            : 'user_id,platform,contest_id';

          const { data, error } = await supabaseAdmin
            .from('contest_history')
            .upsert(itemsToProcess, {
              onConflict: conflictColumns,
              ignoreDuplicates: false,
            });

          if (error) {
            throw error;
          }

          return {
            success: true,
            processed: itemsToProcess.length,
            failed: 0,
          };
        },
        {
          skipExisting: false, // Contest history is derived, always upsert
          userId,
          platform,
          stage: SYNC_STAGES.CONTEST_HISTORY,
        }
      );

      totalSynced += result.processed;
    }

    await orchestrator.completeStage(progressId, true);

    console.log(
      `[BatchSync] Contest history sync completed: synced=${totalSynced}`
    );

    return { synced: totalSynced };
  } catch (error) {
    console.error(`[BatchSync] Contest history sync failed:`, error);
    await orchestrator.completeStage(progressId, false, error.message);
    throw error;
  }
}

/**
 * Update user statistics (final stage)
 */
export async function updateStatisticsBatchAware(
  userId,
  orchestrator,
  progressId
) {
  try {
    await orchestrator.updateStageProgress(progressId, {
      status: SYNC_STATUS.IN_PROGRESS,
      started_at: new Date().toISOString(),
      total_items: 1,
      total_batches: 1,
    });

    const aggregator = new ProblemSolvingAggregator();
    await aggregator.updateUserStatistics(userId);

    await orchestrator.updateStageProgress(progressId, {
      processed_items: 1,
      successful_items: 1,
    });

    await orchestrator.completeStage(progressId, true);

    console.log(`[BatchSync] Statistics update completed`);

    return { success: true };
  } catch (error) {
    console.error(`[BatchSync] Statistics update failed:`, error);
    await orchestrator.completeStage(progressId, false, error.message);
    throw error;
  }
}

/**
 * Helper: Get platform service from aggregator
 */
function getPlatformService(aggregator, platform) {
  switch (platform) {
    case 'codeforces':
      return aggregator.codeforces;
    case 'atcoder':
      return aggregator.atcoder;
    case 'leetcode':
      return aggregator.leetcode;
    case 'toph':
      return aggregator.toph;
    case 'cses':
      return aggregator.cses;
    case 'codechef':
      return aggregator.codechef;
    case 'topcoder':
      return aggregator.topcoder;
    case 'hackerrank':
      return aggregator.hackerrank;
    case 'kattis':
      return aggregator.kattis;
    case 'lightoj':
      return aggregator.lightoj;
    case 'uva':
      return aggregator.uva;
    case 'spoj':
      return aggregator.spoj;
    default:
      return null;
  }
}

/**
 * Helper: Transform rating history based on platform and schema version
 */
async function transformRatingHistory(userId, platform, handle, ratingHistory) {
  const useV2 = await isV2SchemaAvailable();

  if (useV2) {
    // V2 schema: rating_history uses platform_id
    const platformId = await getPlatformId(platform);

    // Check if data is already in normalized CLIST format
    if (
      ratingHistory.length > 0 &&
      'rating' in ratingHistory[0] &&
      'recorded_at' in ratingHistory[0]
    ) {
      // Already normalized (from CLIST or fallback services)
      return ratingHistory.map((entry) => ({
        user_id: userId,
        platform_id: platformId,
        rating: entry.rating,
        rating_change: entry.rating_change || 0,
        recorded_at: entry.recorded_at,
      }));
    }

    // Platform-specific transformations for raw API data
    if (platform === 'codeforces') {
      return ratingHistory.map((entry) => ({
        user_id: userId,
        platform_id: platformId,
        // V2 schema has contest_id as UUID FK - for now we skip it
        rating: entry.newRating,
        rating_change: entry.newRating - entry.oldRating,
        recorded_at: new Date(
          entry.ratingUpdateTimeSeconds * 1000
        ).toISOString(),
      }));
    } else if (platform === 'atcoder') {
      return ratingHistory.map((entry) => ({
        user_id: userId,
        platform_id: platformId,
        rating: entry.NewRating || entry.new_rating,
        rating_change:
          (entry.NewRating || entry.new_rating) -
          (entry.OldRating || entry.old_rating),
        recorded_at: new Date(entry.EndTime || entry.end_time).toISOString(),
      }));
    } else if (platform === 'leetcode') {
      // LeetCode format from our service
      return ratingHistory.map((entry) => ({
        user_id: userId,
        platform_id: platformId,
        rating: entry.rating,
        rating_change: entry.rating_change || 0,
        recorded_at: entry.contest_date || entry.recorded_at,
      }));
    }

    return [];
  } else {
    // Legacy schema
    if (platform === 'codeforces') {
      return ratingHistory.map((entry) => ({
        user_id: userId,
        platform: 'codeforces',
        contest_id: entry.contestId,
        contest_name: entry.contestName,
        handle,
        rank: entry.rank,
        rating_before: entry.oldRating,
        rating_after: entry.newRating,
        rating_change: entry.newRating - entry.oldRating,
        contest_date: new Date(
          entry.ratingUpdateTimeSeconds * 1000
        ).toISOString(),
        source: 'codeforces',
        created_at: new Date().toISOString(),
      }));
    } else if (platform === 'atcoder') {
      return ratingHistory.map((entry) => ({
        user_id: userId,
        platform: 'atcoder',
        contest_id: entry.ContestId || entry.contest_id,
        contest_name: entry.ContestName || entry.contest_name,
        handle,
        rank: entry.Place || entry.rank,
        rating_before: entry.OldRating || entry.old_rating,
        rating_after: entry.NewRating || entry.new_rating,
        rating_change:
          (entry.NewRating || entry.new_rating) -
          (entry.OldRating || entry.old_rating),
        contest_date: new Date(entry.EndTime || entry.end_time).toISOString(),
        source: 'atcoder',
        created_at: new Date().toISOString(),
      }));
    }

    return [];
  }
}

/**
 * Main orchestration function: Sync a single platform with all stages
 */
export async function syncPlatformWithBatches(
  userId,
  platform,
  handle,
  syncType = 'manual',
  forceFullSync = false
) {
  console.log(`[BatchSync] Starting batch sync for ${platform}:${handle}`);

  const orchestrator = new BatchSyncOrchestrator();

  try {
    // Initialize sync session with all stages
    const session = await orchestrator.initializeSyncSession(
      userId,
      platform,
      syncType,
      forceFullSync
    );

    console.log(
      `[BatchSync] Session ${session.syncSessionId} initialized with ${session.stages.length} stages`
    );

    const results = {
      syncSessionId: session.syncSessionId,
      platform,
      stages: {},
    };

    // Find progress records for each stage
    const stageProgress = {};
    for (const stage of session.stages) {
      stageProgress[stage.stage] = stage.id;
    }

    // STAGE 1: Sync submissions
    if (stageProgress[SYNC_STAGES.SUBMISSIONS]) {
      results.stages.submissions = await syncSubmissionsBatchAware(
        userId,
        platform,
        handle,
        orchestrator,
        stageProgress[SYNC_STAGES.SUBMISSIONS],
        forceFullSync
      );
    }

    // STAGE 2: Sync rating history (if supported)
    let ratingHistoryData = null;
    if (stageProgress[SYNC_STAGES.RATING_HISTORY]) {
      const ratingResult = await syncRatingHistoryBatchAware(
        userId,
        platform,
        handle,
        orchestrator,
        stageProgress[SYNC_STAGES.RATING_HISTORY],
        forceFullSync
      );
      results.stages.ratingHistory = ratingResult;

      // Always try to get contest history data, regardless of whether new ratings were synced
      // This ensures contest history is populated even if ratings are up-to-date
      try {
        const clistService = new ClistService();
        // Get contest history with full metadata
        // Pass userId to enable CLIST account ID caching
        ratingHistoryData = await clistService.getContestHistory(
          platform,
          handle,
          10000,
          userId
        );
        console.log(
          `[BatchSync] Retrieved ${ratingHistoryData.length} contest entries for contest history sync`
        );
      } catch (error) {
        console.warn(
          `[BatchSync] Failed to fetch contest history for ${platform}:`,
          error.message
        );
      }
    }

    // STAGE 3: Sync contest history (if supported)
    if (stageProgress[SYNC_STAGES.CONTEST_HISTORY] && ratingHistoryData) {
      const contestResult = await syncContestHistoryBatchAware(
        userId,
        platform,
        handle,
        orchestrator,
        stageProgress[SYNC_STAGES.CONTEST_HISTORY],
        ratingHistoryData // Pass raw contest history data with full metadata
      );
      results.stages.contestHistory = contestResult;
    }

    // STAGE 4: Update statistics
    if (stageProgress[SYNC_STAGES.STATISTICS]) {
      results.stages.statistics = await updateStatisticsBatchAware(
        userId,
        orchestrator,
        stageProgress[SYNC_STAGES.STATISTICS]
      );
    }

    console.log(`[BatchSync] All stages completed for ${platform}`);

    // Get final progress summary
    const progress = await orchestrator.getSyncProgress(session.syncSessionId);

    return {
      success: true,
      syncSessionId: session.syncSessionId,
      platform,
      results,
      progress,
    };
  } catch (error) {
    console.error(`[BatchSync] Platform sync failed for ${platform}:`, error);
    return {
      success: false,
      platform,
      error: error.message,
    };
  }
}

export default {
  syncPlatformWithBatches,
  syncSubmissionsBatchAware,
  syncRatingHistoryBatchAware,
  syncContestHistoryBatchAware,
  updateStatisticsBatchAware,
};
