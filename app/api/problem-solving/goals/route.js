/**
 * Problem Solving API - Goals Endpoint
 * GET /api/problem-solving/goals - Get user's goals and progress
 * POST /api/problem-solving/goals - Create or update user's goals
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import { V2_TABLES } from '@/app/_lib/problem-solving-v2-helpers';

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

    const userId = dbUser.id;

    // Get user goals
    const { data: goals } = await supabaseAdmin
      .from(V2_TABLES.USER_GOALS)
      .select('*')
      .eq('user_id', userId)
      .single();

    // Default goals if none exist
    const userGoals = goals || {
      daily_target: 3,
      weekly_target: 15,
      monthly_target: 50,
      notify_on_miss: true,
      notify_on_complete: true,
    };

    // Calculate progress periods
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Start of week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekStartISO = startOfWeek.toISOString();

    // Start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartISO = startOfMonth.toISOString();

    // Get counts in parallel
    const [dailyResult, weeklyResult, monthlyResult] = await Promise.all([
      supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('first_solved_at', todayISO),
      supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('first_solved_at', weekStartISO),
      supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('first_solved_at', monthStartISO),
    ]);

    return NextResponse.json({
      success: true,
      goals: userGoals,
      progress: {
        daily: dailyResult.count || 0,
        weekly: weeklyResult.count || 0,
        monthly: monthlyResult.count || 0,
      },
    });
  } catch (error) {
    console.error('Goals GET error:', error);
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

    const userId = dbUser.id;
    const body = await request.json();
    const {
      daily_target,
      weekly_target,
      monthly_target,
      notify_on_miss,
      notify_on_complete,
    } = body;

    // Validate targets
    if (daily_target !== undefined && (daily_target < 0 || daily_target > 50)) {
      return NextResponse.json(
        { error: 'Daily target must be between 0 and 50' },
        { status: 400 }
      );
    }
    if (
      weekly_target !== undefined &&
      (weekly_target < 0 || weekly_target > 200)
    ) {
      return NextResponse.json(
        { error: 'Weekly target must be between 0 and 200' },
        { status: 400 }
      );
    }
    if (
      monthly_target !== undefined &&
      (monthly_target < 0 || monthly_target > 500)
    ) {
      return NextResponse.json(
        { error: 'Monthly target must be between 0 and 500' },
        { status: 400 }
      );
    }

    // Upsert goals
    const { data: goals, error } = await supabaseAdmin
      .from(V2_TABLES.USER_GOALS)
      .upsert(
        {
          user_id: userId,
          daily_target: daily_target ?? 3,
          weekly_target: weekly_target ?? 15,
          monthly_target: monthly_target ?? 50,
          notify_on_miss: notify_on_miss ?? true,
          notify_on_complete: notify_on_complete ?? true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving goals:', error);
      return NextResponse.json(
        { error: 'Failed to save goals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      goals,
      message: 'Goals saved successfully',
    });
  } catch (error) {
    console.error('Goals POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
