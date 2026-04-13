/**
 * Batch Sync Orchestrator with Checkpointing
 *
 * This module provides a professional sync system that:
 * 1. Processes syncs in batches (extract → store → revalidate)
 * 2. Tracks progress with checkpoints for resume capability
 * 3. Skips already synced data (incremental sync)
 * 4. Provides real-time progress updates
 * 5. Handles errors gracefully with retry logic
 *
 * @module problem-solving-batch-sync
 */

import { supabaseAdmin } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import {
  V2_TABLES,
  isV2SchemaAvailable,
  getPlatformId,
} from './problem-solving-v2-helpers';

/**
 * Sync stages that can be processed independently
 */
export const SYNC_STAGES = {
  SUBMISSIONS: 'submissions',
  RATING_HISTORY: 'rating_history',
  CONTEST_HISTORY: 'contest_history',
  PROBLEMS: 'problems',
  USER_SOLVES: 'user_solves',
  STATISTICS: 'statistics',
};

/**
 * Sync stage status
 */
export const SYNC_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

/**
 * Default batch configuration
 */
const DEFAULT_BATCH_CONFIG = {
  submissionsBatchSize: 100, // Process 100 submissions at a time
  ratingHistoryBatchSize: 50, // Process 50 rating entries at a time
  contestHistoryBatchSize: 50, // Process 50 contest entries at a time
  problemsBatchSize: 100, // Process 100 problems at a time
  userSolvesBatchSize: 100, // Process 100 solves at a time
  checkpointInterval: 5, // Save checkpoint every 5 batches
};

/**
 * Batch Sync Orchestrator
 * Manages the entire sync process with checkpointing and progress tracking
 */
export class BatchSyncOrchestrator {
  constructor(config = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.syncSessionId = uuidv4();
  }

  /**
   * Initialize a sync session with progress tracking
   */
  async initializeSyncSession(
    userId,
    platform,
    syncType = 'manual',
    forceFullSync = false
  ) {
    const useV2 = await isV2SchemaAvailable();
    let platformId = null;

    if (useV2) {
      platformId = await getPlatformId(platform);
    }

    // Define stages for this platform
    const stages = this.getStagesForPlatform(platform);

    // Create progress records for each stage
    const progressRecords = [];
    for (const stage of stages) {
      const { data, error } = await supabaseAdmin
        .from('sync_progress')
        .insert({
          user_id: userId,
          sync_session_id: this.syncSessionId,
          platform_id: platformId,
          stage,
          status: SYNC_STATUS.PENDING,
          sync_type: syncType,
          force_full_sync: forceFullSync,
          total_items: 0,
          processed_items: 0,
          successful_items: 0,
          failed_items: 0,
          skipped_items: 0,
          current_batch: 0,
          total_batches: 0,
          batch_size: this.getBatchSizeForStage(stage),
        })
        .select()
        .single();

      if (error) {
        console.error(
          `[BatchSync] Failed to create progress record for ${stage}:`,
          error
        );
        throw new Error(`Failed to initialize sync session: ${error.message}`);
      }

      progressRecords.push(data);
    }

    console.log(
      `[BatchSync] Initialized sync session ${this.syncSessionId} for ${platform} with ${stages.length} stages`
    );
    return {
      syncSessionId: this.syncSessionId,
      stages: progressRecords,
    };
  }

  /**
   * Get sync stages for a specific platform
   */
  getStagesForPlatform(platform) {
    const baseStages = [
      SYNC_STAGES.SUBMISSIONS,
      SYNC_STAGES.PROBLEMS,
      SYNC_STAGES.USER_SOLVES,
    ];

    // All platforms now support rating history and contest history via CLIST with fallbacks
    // CLIST supports: codeforces, atcoder, leetcode, codechef, topcoder, hackerrank, etc.
    // Fallbacks to platform-specific APIs when CLIST fails
    baseStages.push(SYNC_STAGES.RATING_HISTORY);
    baseStages.push(SYNC_STAGES.CONTEST_HISTORY);

    // Always update statistics at the end
    baseStages.push(SYNC_STAGES.STATISTICS);

    return baseStages;
  }

  /**
   * Get batch size for a specific stage
   */
  getBatchSizeForStage(stage) {
    switch (stage) {
      case SYNC_STAGES.SUBMISSIONS:
        return this.config.submissionsBatchSize;
      case SYNC_STAGES.RATING_HISTORY:
        return this.config.ratingHistoryBatchSize;
      case SYNC_STAGES.CONTEST_HISTORY:
        return this.config.contestHistoryBatchSize;
      case SYNC_STAGES.PROBLEMS:
        return this.config.problemsBatchSize;
      case SYNC_STAGES.USER_SOLVES:
        return this.config.userSolvesBatchSize;
      default:
        return 100;
    }
  }

  /**
   * Update stage progress
   */
  async updateStageProgress(progressId, updates) {
    const { error } = await supabaseAdmin
      .from('sync_progress')
      .update({
        ...updates,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', progressId);

    if (error) {
      console.error(`[BatchSync] Failed to update progress:`, error);
    }
  }

  /**
   * Save checkpoint for resume capability
   */
  async saveCheckpoint(progressId, checkpointData) {
    await this.updateStageProgress(progressId, {
      last_checkpoint: checkpointData,
    });
  }

  /**
   * Get last checkpoint for a stage
   */
  async getLastCheckpoint(userId, platform, stage) {
    const useV2 = await isV2SchemaAvailable();
    let platformId = null;

    if (useV2) {
      platformId = await getPlatformId(platform);
    }

    // Find the most recent checkpoint for this user/platform/stage
    let query = supabaseAdmin
      .from('sync_progress')
      .select('last_checkpoint, completed_at')
      .eq('user_id', userId)
      .eq('stage', stage)
      .eq('status', SYNC_STATUS.COMPLETED)
      .order('completed_at', { ascending: false })
      .limit(1);

    if (platformId) {
      query = query.eq('platform_id', platformId);
    }

    const { data } = await query.single();

    return data?.last_checkpoint || null;
  }

  /**
   * Check if data already exists (for incremental sync)
   */
  async checkExistingData(userId, platform, stage, identifiers) {
    const useV2 = await isV2SchemaAvailable();
    let platformId = null;

    if (useV2) {
      platformId = await getPlatformId(platform);
    }

    switch (stage) {
      case SYNC_STAGES.SUBMISSIONS: {
        const submissionsTable = useV2
          ? V2_TABLES.SUBMISSIONS
          : 'problem_submissions';
        const idColumn = useV2 ? 'external_submission_id' : 'submission_id';
        const platformColumn = useV2 ? 'platform_id' : 'platform';
        const platformValue = useV2 ? platformId : platform;

        // Check which submission IDs already exist
        const { data } = await supabaseAdmin
          .from(submissionsTable)
          .select(idColumn)
          .eq('user_id', userId)
          .eq(platformColumn, platformValue)
          .in(idColumn, identifiers);

        return new Set(data?.map((row) => row[idColumn]) || []);
      }

      case SYNC_STAGES.RATING_HISTORY: {
        // Check which contest IDs already exist in rating history
        const { data } = await supabaseAdmin
          .from('rating_history')
          .select('contest_id')
          .eq('user_id', userId)
          .eq('platform', platform)
          .in('contest_id', identifiers);

        return new Set(data?.map((row) => row.contest_id) || []);
      }

      case SYNC_STAGES.CONTEST_HISTORY: {
        // Check which contest IDs already exist
        const { data } = await supabaseAdmin
          .from('contest_history')
          .select('contest_id')
          .eq('user_id', userId)
          .eq('platform', platform)
          .in('contest_id', identifiers);

        return new Set(data?.map((row) => row.contest_id) || []);
      }

      case SYNC_STAGES.PROBLEMS: {
        const problemsTable = useV2 ? V2_TABLES.PROBLEMS : 'problems';
        const idColumn = useV2 ? 'problem_id' : 'problem_id';
        const platformColumn = useV2 ? 'platform_id' : 'platform';
        const platformValue = useV2 ? platformId : platform;

        // Check which problem IDs already exist
        const { data } = await supabaseAdmin
          .from(problemsTable)
          .select(idColumn)
          .eq(platformColumn, platformValue)
          .in(idColumn, identifiers);

        return new Set(data?.map((row) => row[idColumn]) || []);
      }

      default:
        return new Set();
    }
  }

  /**
   * Process a single batch with progress tracking
   */
  async processBatch(
    progressId,
    batchNumber,
    batchData,
    processor,
    options = {}
  ) {
    const { skipExisting = true, userId, platform, stage } = options;

    try {
      // Update progress to show we're processing this batch
      await this.updateStageProgress(progressId, {
        status: SYNC_STATUS.IN_PROGRESS,
        current_batch: batchNumber,
      });

      // Check for existing data if skipExisting is enabled
      let itemsToProcess = batchData;
      let skippedCount = 0;

      if (skipExisting && stage !== SYNC_STAGES.STATISTICS) {
        const identifiers = this.extractIdentifiers(batchData, stage);
        const existingIds = await this.checkExistingData(
          userId,
          platform,
          stage,
          identifiers
        );

        // Filter out existing items
        itemsToProcess = batchData.filter((item) => {
          const id = this.getItemIdentifier(item, stage);
          if (existingIds.has(id)) {
            skippedCount++;
            return false;
          }
          return true;
        });

        console.log(
          `[BatchSync] Batch ${batchNumber}: ${skippedCount} items already exist, processing ${itemsToProcess.length} new items`
        );
      }

      // Process the batch (if there are items to process)
      let result = { success: true, processed: 0, failed: 0 };

      if (itemsToProcess.length > 0) {
        result = await processor(itemsToProcess);
      }

      // Update progress
      const { data: currentProgress } = await supabaseAdmin
        .from('sync_progress')
        .select(
          'processed_items, successful_items, failed_items, skipped_items'
        )
        .eq('id', progressId)
        .single();

      await this.updateStageProgress(progressId, {
        processed_items:
          (currentProgress?.processed_items || 0) + batchData.length,
        successful_items:
          (currentProgress?.successful_items || 0) + (result.processed || 0),
        failed_items:
          (currentProgress?.failed_items || 0) + (result.failed || 0),
        skipped_items: (currentProgress?.skipped_items || 0) + skippedCount,
      });

      // Save checkpoint every N batches
      if (batchNumber % this.config.checkpointInterval === 0) {
        const lastItem = batchData[batchData.length - 1];
        await this.saveCheckpoint(progressId, {
          lastBatchNumber: batchNumber,
          lastItemId: this.getItemIdentifier(lastItem, stage),
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: result.success,
        processed: result.processed || 0,
        failed: result.failed || 0,
        skipped: skippedCount,
      };
    } catch (error) {
      console.error(`[BatchSync] Batch ${batchNumber} failed:`, error);

      // Update progress with error
      await this.updateStageProgress(progressId, {
        status: SYNC_STATUS.FAILED,
        error_message: error.message,
        error_details: {
          batch: batchNumber,
          stack: error.stack,
        },
      });

      throw error;
    }
  }

  /**
   * Extract identifiers from batch data for existence check
   */
  extractIdentifiers(batchData, stage) {
    return batchData
      .map((item) => this.getItemIdentifier(item, stage))
      .filter(Boolean);
  }

  /**
   * Get identifier for a single item based on stage
   */
  getItemIdentifier(item, stage) {
    switch (stage) {
      case SYNC_STAGES.SUBMISSIONS:
        return item.submission_id;
      case SYNC_STAGES.RATING_HISTORY:
      case SYNC_STAGES.CONTEST_HISTORY:
        return item.contest_id;
      case SYNC_STAGES.PROBLEMS:
        return item.problem_id;
      case SYNC_STAGES.USER_SOLVES:
        return item.problem_id;
      default:
        return null;
    }
  }

  /**
   * Complete a stage
   */
  async completeStage(progressId, success = true, errorMessage = null) {
    const status = success ? SYNC_STATUS.COMPLETED : SYNC_STATUS.FAILED;

    await this.updateStageProgress(progressId, {
      status,
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    });

    console.log(
      `[BatchSync] Stage ${success ? 'completed' : 'failed'}: ${progressId}`
    );
  }

  /**
   * Skip a stage (e.g., if no data to sync)
   */
  async skipStage(progressId, reason = null) {
    await this.updateStageProgress(progressId, {
      status: SYNC_STATUS.SKIPPED,
      completed_at: new Date().toISOString(),
      error_message: reason,
    });

    console.log(`[BatchSync] Stage skipped: ${progressId} (${reason})`);
  }

  /**
   * Get current sync progress for a session
   */
  async getSyncProgress(syncSessionId) {
    const { data, error } = await supabaseAdmin
      .from('sync_progress')
      .select('*')
      .eq('sync_session_id', syncSessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[BatchSync] Failed to get sync progress:', error);
      return null;
    }

    // Calculate overall progress
    const totalItems = data.reduce(
      (sum, stage) => sum + (stage.total_items || 0),
      0
    );
    const processedItems = data.reduce(
      (sum, stage) => sum + (stage.processed_items || 0),
      0
    );
    const successfulItems = data.reduce(
      (sum, stage) => sum + (stage.successful_items || 0),
      0
    );
    const failedItems = data.reduce(
      (sum, stage) => sum + (stage.failed_items || 0),
      0
    );
    const skippedItems = data.reduce(
      (sum, stage) => sum + (stage.skipped_items || 0),
      0
    );

    const completedStages = data.filter(
      (s) => s.status === SYNC_STATUS.COMPLETED
    ).length;
    const failedStages = data.filter(
      (s) => s.status === SYNC_STATUS.FAILED
    ).length;
    const pendingStages = data.filter(
      (s) => s.status === SYNC_STATUS.PENDING
    ).length;
    const inProgressStages = data.filter(
      (s) => s.status === SYNC_STATUS.IN_PROGRESS
    ).length;

    return {
      syncSessionId,
      stages: data,
      overall: {
        totalStages: data.length,
        completedStages,
        failedStages,
        pendingStages,
        inProgressStages,
        totalItems,
        processedItems,
        successfulItems,
        failedItems,
        skippedItems,
        progressPercentage:
          totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0,
      },
    };
  }

  /**
   * Clean up completed sync sessions older than specified days
   */
  static async cleanupOldSessions(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await supabaseAdmin
      .from('sync_progress')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .in('status', [
        SYNC_STATUS.COMPLETED,
        SYNC_STATUS.FAILED,
        SYNC_STATUS.SKIPPED,
      ]);

    if (error) {
      console.error('[BatchSync] Failed to cleanup old sessions:', error);
    } else {
      console.log(
        `[BatchSync] Cleaned up sync sessions older than ${daysOld} days`
      );
    }
  }
}

export default BatchSyncOrchestrator;
