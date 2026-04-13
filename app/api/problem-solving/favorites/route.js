/**
 * Problem Solving API - Favorites Endpoint
 * GET /api/problem-solving/favorites - Get user's favorite problems
 * POST /api/problem-solving/favorites - Add a problem to favorites
 * DELETE /api/problem-solving/favorites - Remove from favorites
 *
 * Favorites are stored as is_favorite flag in user_solves table
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  V2_TABLES,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getCachedUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: favorites, error } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .select(
        `
        id,
        first_solved_at,
        solve_count,
        created_at,
        problems!inner(
          id,
          external_id,
          name,
          url,
          difficulty_rating,
          platforms!inner(code, name)
        )
      `
      )
      .eq('user_id', dbUser.id)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    // Transform to match expected format
    const transformedFavorites = (favorites || []).map((fav) => ({
      id: fav.id,
      user_id: dbUser.id,
      problem_id: fav.problems?.external_id,
      platform: fav.problems?.platforms?.code,
      platform_name: fav.problems?.platforms?.name,
      problem_name: fav.problems?.name,
      problem_url: fav.problems?.url,
      difficulty_rating: fav.problems?.difficulty_rating,
      first_solved_at: fav.first_solved_at,
      solve_count: fav.solve_count,
      created_at: fav.created_at,
    }));

    return NextResponse.json({
      success: true,
      favorites: transformedFavorites,
    });
  } catch (error) {
    console.error('Favorites GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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

    const { problem_id, platform } = await request.json();

    if (!problem_id || !platform) {
      return NextResponse.json(
        { error: 'Missing problem_id or platform' },
        { status: 400 }
      );
    }

    const platformId = await getPlatformId(platform.toLowerCase());
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Find the problem
    const { data: problem } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problem_id)
      .single();

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Check if user already has a solve record for this problem
    const { data: existingSolve } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .select('id, is_favorite')
      .eq('user_id', dbUser.id)
      .eq('problem_id', problem.id)
      .single();

    if (existingSolve) {
      if (existingSolve.is_favorite) {
        return NextResponse.json(
          { error: 'Problem already favorited' },
          { status: 409 }
        );
      }

      // Update existing solve record
      const { error: updateError } = await supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .update({ is_favorite: true, updated_at: new Date().toISOString() })
        .eq('id', existingSolve.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        favorite: { id: existingSolve.id, problem_id, platform },
        message: 'Added to favorites',
      });
    }

    // Create new solve record with is_favorite = true (not actually solved)
    const { data: newSolve, error: insertError } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .insert({
        user_id: dbUser.id,
        problem_id: problem.id,
        is_favorite: true,
        solve_count: 0,
        first_solved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      favorite: { id: newSolve.id, problem_id, platform },
      message: 'Added to favorites',
    });
  } catch (error) {
    console.error('Favorites POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { problem_id, platform } = await request.json();

    if (!problem_id || !platform) {
      return NextResponse.json(
        { error: 'Missing problem_id or platform' },
        { status: 400 }
      );
    }

    const platformId = await getPlatformId(platform.toLowerCase());
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Find the problem
    const { data: problem } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problem_id)
      .single();

    if (problem) {
      // Update is_favorite to false
      await supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .update({ is_favorite: false, updated_at: new Date().toISOString() })
        .eq('user_id', dbUser.id)
        .eq('problem_id', problem.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from favorites',
    });
  } catch (error) {
    console.error('Favorites DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
