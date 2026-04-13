import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import {
  isV2SchemaAvailable,
  V2_TABLES,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers';

/**
 * @file Problem-Solving Notes API
 *
 * Uses normalized schema: notes are stored in `user_solves.notes`.
 * GET /api/problem-solving/notes
 * Get all notes for the current user, or notes for a specific problem
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useV2 = await isV2SchemaAvailable();
    if (!useV2) {
      return NextResponse.json(
        {
          error:
            'Problem Solving schema is not available. Apply docs/database/schema.sql first.',
        },
        { status: 500 }
      );
    }

    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    const problem_id = searchParams.get('problem_id');
    const platform = searchParams.get('platform');

    // If specific problem requested
    if (problem_id && platform) {
      const platformId = await getPlatformId(platform);
      if (!platformId) {
        return NextResponse.json(
          { error: `Unknown platform: ${platform}` },
          { status: 400 }
        );
      }

      const { data: problem, error: problemError } = await supabase
        .from(V2_TABLES.PROBLEMS)
        .select('id')
        .eq('platform_id', platformId)
        .eq('external_id', problem_id)
        .maybeSingle();

      if (problemError) {
        console.error('Error resolving problem for notes:', problemError);
        return NextResponse.json(
          { error: 'Failed to resolve problem' },
          { status: 500 }
        );
      }

      if (!problem?.id) {
        return NextResponse.json({ notes: [] });
      }

      const { data: solve, error } = await supabase
        .from(V2_TABLES.USER_SOLVES)
        .select('notes')
        .eq('user_id', session.user.id)
        .eq('problem_id', problem.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json(
          { error: 'Failed to fetch notes' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        notes: solve?.notes ? [{ content: solve.notes }] : [],
      });
    }

    const { data: solves, error } = await supabase
      .from(V2_TABLES.USER_SOLVES)
      .select('notes, updated_at')
      .eq('user_id', session.user.id)
      .not('notes', 'is', null)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notes: (solves || [])
        .filter((s) => s.notes)
        .map((s) => ({ content: s.notes, updated_at: s.updated_at })),
    });
  } catch (error) {
    console.error('Notes GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/problem-solving/notes
 * Add or update notes for a problem (upsert)
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useV2 = await isV2SchemaAvailable();
    if (!useV2) {
      return NextResponse.json(
        {
          error:
            'Problem Solving schema is not available. Apply docs/database/schema.sql first.',
        },
        { status: 500 }
      );
    }

    const supabase = supabaseAdmin;
    const { problem_id, platform, content } = await request.json();

    if (!problem_id || !platform) {
      return NextResponse.json(
        { error: 'Missing problem_id or platform' },
        { status: 400 }
      );
    }

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Note content cannot be empty' },
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

    const { data: problem, error: problemError } = await supabase
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problem_id)
      .maybeSingle();

    if (problemError) {
      console.error('Error resolving problem for notes:', problemError);
      return NextResponse.json(
        { error: 'Failed to resolve problem' },
        { status: 500 }
      );
    }

    if (!problem?.id) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const { data: solve, error: solveError } = await supabase
      .from(V2_TABLES.USER_SOLVES)
      .select('id')
      .eq('user_id', session.user.id)
      .eq('problem_id', problem.id)
      .maybeSingle();

    if (solveError) {
      console.error('Error resolving solve for notes:', solveError);
      return NextResponse.json(
        { error: 'Failed to resolve solve' },
        { status: 500 }
      );
    }

    if (!solve?.id) {
      return NextResponse.json({ error: 'Solve not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from(V2_TABLES.USER_SOLVES)
      .update({
        notes: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', solve.id);

    if (error) {
      console.error('Error saving note:', error);
      return NextResponse.json(
        { error: 'Failed to save note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Note saved' });
  } catch (error) {
    console.error('Notes POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/problem-solving/notes
 * Delete notes for a problem
 */
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useV2 = await isV2SchemaAvailable();
    if (!useV2) {
      return NextResponse.json(
        {
          error:
            'Problem Solving schema is not available. Apply docs/database/schema.sql first.',
        },
        { status: 500 }
      );
    }

    const supabase = supabaseAdmin;
    const { problem_id, platform } = await request.json();

    if (!problem_id || !platform) {
      return NextResponse.json(
        { error: 'Missing problem_id or platform' },
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

    const { data: problem, error: problemError } = await supabase
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problem_id)
      .maybeSingle();

    if (problemError) {
      console.error('Error resolving problem for notes:', problemError);
      return NextResponse.json(
        { error: 'Failed to resolve problem' },
        { status: 500 }
      );
    }

    if (!problem?.id) {
      return NextResponse.json({ message: 'Note deleted' });
    }

    const { data: solve, error: solveError } = await supabase
      .from(V2_TABLES.USER_SOLVES)
      .select('id')
      .eq('user_id', session.user.id)
      .eq('problem_id', problem.id)
      .maybeSingle();

    if (solveError) {
      console.error('Error resolving solve for notes:', solveError);
      return NextResponse.json(
        { error: 'Failed to resolve solve' },
        { status: 500 }
      );
    }

    if (!solve?.id) {
      return NextResponse.json({ message: 'Note deleted' });
    }

    const { error } = await supabase
      .from(V2_TABLES.USER_SOLVES)
      .update({ notes: null, updated_at: new Date().toISOString() })
      .eq('id', solve.id);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Notes DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
