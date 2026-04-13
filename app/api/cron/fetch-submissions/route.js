/**
 * @file Fetch Submissions Cron Job
 * @module FetchSubmissionsCron
 *
 * Periodically fetches new submissions from connected online judge
 * handles for all users. Runs every 15 minutes.
 *
 * Uses the new normalized schema (sync_jobs, user_handles).
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { ProblemSolvingAggregator } from '@/app/_lib/problem-solving-services';
import { V2_TABLES } from '@/app/_lib/problem-solving-v2-helpers';

// Verify cron secret for security
function verifyCronSecret(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const aggregator = new ProblemSolvingAggregator();

    // Get pending fetch jobs from sync_jobs table
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from(V2_TABLES.SYNC_JOBS)
      .select(
        `
        id, user_id, platform_id, status,
        platforms!inner(code)
      `
      )
      .eq('status', 'pending')
      .lte('next_run_at', new Date().toISOString())
      .limit(50);

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending jobs',
        processed: 0,
      });
    }

    // Process jobs
    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      totalSynced: 0,
    };

    for (const job of jobs) {
      try {
        const platform = job.platforms?.code;

        // Mark job as processing
        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        // Sync submissions
        const syncResult = await aggregator.syncUserSubmissions(job.user_id);

        // Mark job as completed and schedule next fetch
        const nextFetch = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update({
            status: 'pending',
            next_run_at: nextFetch.toISOString(),
            completed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', job.id);

        results.success++;
        results.totalSynced += syncResult.synced || 0;

        console.log(
          `[CRON] Synced ${syncResult.synced || 0} submissions for user ${job.user_id} (${platform})`
        );
      } catch (err) {
        console.error(
          `[CRON] Failed to process job ${job.id} for user ${job.user_id}:`,
          err
        );

        // Get current job for retry count
        const { data: currentJob } = await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .select('retry_count')
          .eq('id', job.id)
          .single();

        const retryCount = (currentJob?.retry_count || 0) + 1;
        const maxRetries = 5;

        // Calculate backoff: min(24 hours, 2^retryCount * 15 minutes)
        const backoffMinutes = Math.min(60 * 24, Math.pow(2, retryCount) * 15);

        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update({
            status: retryCount >= maxRetries ? 'failed' : 'pending',
            next_run_at: new Date(
              Date.now() + backoffMinutes * 60 * 1000
            ).toISOString(),
            error_message: err.message,
            retry_count: retryCount,
          })
          .eq('id', job.id);

        results.failed++;
      }

      results.processed++;
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} jobs`,
      results,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('Cron fetch-submissions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process fetch submissions' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
