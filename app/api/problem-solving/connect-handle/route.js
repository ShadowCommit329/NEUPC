/**
 * Problem Solving API - Connect Handle Endpoint (Multi-Platform Support)
 * POST /api/problem-solving/connect-handle - Connect a platform handle
 * DELETE /api/problem-solving/connect-handle - Disconnect a platform handle
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  CodeforcesService,
  AtCoderService,
  LeetCodeService,
  TophService,
} from '@/app/_lib/problem-solving-services';
import { PROBLEM_SOLVING_PLATFORM_IDS } from '@/app/_lib/problem-solving-platforms';
import {
  V2_TABLES,
  getPlatformId,
  upsertUserHandleV2,
} from '@/app/_lib/problem-solving-v2-helpers.js';

function normalizeIncomingHandle(platform, rawHandle) {
  const trimmed = String(rawHandle || '').trim();
  if (!trimmed) return '';

  if (platform !== 'leetcode') {
    return trimmed;
  }

  let normalized = trimmed.replace(/^@+/, '');

  // Accept URL formats like:
  // - https://leetcode.com/u/username/
  // - https://leetcode.com/username/
  // - leetcode.com/u/username
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

    // Parse request body
    const body = await request.json();
    const { platform, handle } = body;
    const normalizedHandle = normalizeIncomingHandle(platform, handle);

    // Validate input
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    if (!PROBLEM_SOLVING_PLATFORM_IDS.includes(platform)) {
      return NextResponse.json(
        {
          error: `Unsupported platform: ${platform}. Supported platforms: ${PROBLEM_SOLVING_PLATFORM_IDS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!normalizedHandle) {
      return NextResponse.json(
        { error: 'Handle is required' },
        { status: 400 }
      );
    }

    // Validate handle length
    if (normalizedHandle.length < 1 || normalizedHandle.length > 100) {
      return NextResponse.json(
        { error: 'Handle must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    if (
      platform === 'leetcode' &&
      !/^[A-Za-z0-9._-]{1,100}$/.test(normalizedHandle)
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid LeetCode handle format. Use username, @username, or profile URL.',
        },
        { status: 400 }
      );
    }

    // Get platform ID
    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Check if handle is already connected to another user
    const { data: existingHandle } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select('user_id')
      .eq('platform_id', platformId)
      .eq('handle', normalizedHandle)
      .neq('user_id', userId)
      .single();

    if (existingHandle) {
      return NextResponse.json(
        { error: 'This handle is already connected to another account' },
        { status: 409 }
      );
    }

    // Verify handle exists on the specified platform
    let verificationResult = null;
    try {
      switch (platform) {
        case 'codeforces':
          const codeforcesService = new CodeforcesService();
          verificationResult = await codeforcesService.getUserInfo(
            normalizedHandle
          );
          break;

        case 'atcoder':
          const atcoderService = new AtCoderService();
          const atcoderStats = await atcoderService.getUserStats(
            normalizedHandle
          );
          verificationResult = {
            handle: normalizedHandle,
            rating: atcoderStats.rating,
            maxRating: atcoderStats.max_rating,
            rank:
              atcoderStats.rating > 0
                ? `Rating: ${atcoderStats.rating}`
                : 'Unrated',
          };
          break;

        case 'leetcode':
          const leetcodeService = new LeetCodeService();
          const leetcodeProfile = await leetcodeService.getUserProfile(
            normalizedHandle
          );
          verificationResult = {
            handle: leetcodeProfile.username,
            rating: leetcodeProfile.contest_rating,
            maxRating: leetcodeProfile.contest_rating,
            rank: leetcodeProfile.ranking
              ? `Rank: ${leetcodeProfile.ranking}`
              : null,
          };
          break;

        case 'toph':
          const tophService = new TophService();
          const tophProfile = await tophService.getUserProfile(normalizedHandle);
          verificationResult = {
            handle: tophProfile.handle || normalizedHandle,
            rating: tophProfile.rating || 0,
            maxRating: tophProfile.max_rating || tophProfile.rating || 0,
            rank: tophProfile.rank || null,
          };
          break;

        default:
          // For platforms without verification, skip verification
          console.warn(
            `[CONNECT] No verification service for platform: ${platform}. Skipping verification.`
          );
          verificationResult = { handle: normalizedHandle, platform };
          break;
      }

      console.log(
        `[CONNECT] Handle verified for ${platform}: ${normalizedHandle}`
      );
    } catch (verifyError) {
      console.error(
        `[CONNECT] Handle verification failed for ${platform}:`,
        verifyError.message
      );
      return NextResponse.json(
        {
          error: `Could not verify handle on ${platform}: ${verifyError.message}`,
        },
        { status: 400 }
      );
    }

    // Save handle using helper function
    // Handle is considered verified if we successfully fetched user info from the platform
    const isVerified = verificationResult && verificationResult.handle;
    const canonicalHandle = verificationResult?.handle || normalizedHandle;

    const savedHandle = await upsertUserHandleV2(
      userId,
      platform,
      canonicalHandle,
      {
      is_verified: isVerified,
      verified_at: isVerified ? new Date().toISOString() : null,
      current_rating: verificationResult?.rating,
      max_rating: verificationResult?.maxRating,
      rank_title: verificationResult?.rank,
      avatar_url: verificationResult?.avatar,
      }
    );

    // Create sync job to fetch submissions
    // First check if job already exists
    const { data: existingJob } = await supabaseAdmin
      .from(V2_TABLES.SYNC_JOBS)
      .select('id')
      .eq('user_id', userId)
      .eq('platform_id', platformId)
      .eq('job_type', 'submissions')
      .maybeSingle();

    if (!existingJob) {
      await supabaseAdmin.from(V2_TABLES.SYNC_JOBS).insert({
        user_id: userId,
        platform_id: platformId,
        job_type: 'submissions',
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        handle: savedHandle,
        message: `Successfully connected ${savedHandle} on ${platform}`,
        verified: isVerified,
      },
    });
  } catch (error) {
    console.error('Error connecting handle:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler for disconnecting handles
export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }

    if (!PROBLEM_SOLVING_PLATFORM_IDS.includes(platform)) {
      return NextResponse.json(
        {
          error: `Unsupported platform: ${platform}. Supported platforms: ${PROBLEM_SOLVING_PLATFORM_IDS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Delete the handle
    const { error: deleteError } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .delete()
      .eq('user_id', userId)
      .eq('platform_id', platformId);

    if (deleteError) {
      throw deleteError;
    }

    // Also delete any pending sync jobs
    await supabaseAdmin
      .from(V2_TABLES.SYNC_JOBS)
      .delete()
      .eq('user_id', userId)
      .eq('platform_id', platformId);

    return NextResponse.json({
      success: true,
      message: `Disconnected ${platform} handle`,
    });
  } catch (error) {
    console.error('Error disconnecting handle:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET handler to list connected handles
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getCachedUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: handles, error } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select(
        `
        id,
        handle,
        is_verified,
        current_rating,
        max_rating,
        rank_title,
        avatar_url,
        last_synced_at,
        sync_enabled,
        created_at,
        platforms!inner(code, name)
      `
      )
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Transform to include platform code at top level
    const transformedHandles = (handles || []).map((h) => ({
      ...h,
      platform: h.platforms?.code,
      platform_name: h.platforms?.name,
    }));

    return NextResponse.json({
      success: true,
      handles: transformedHandles,
    });
  } catch (error) {
    console.error('Error fetching handles:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
