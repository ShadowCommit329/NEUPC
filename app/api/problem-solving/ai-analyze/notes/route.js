/**
 * @file Personal Notes API Route
 * @module api/problem-solving/ai-analyze/notes
 *
 * API for saving personal notes on solutions
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Extension-Token',
};

function jsonResponse(data, options = {}) {
  return NextResponse.json(data, {
    status: options.status || 200,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * PUT - Save personal notes for a solution
 */
export async function PUT(request) {
  try {
    let userId = null;
    const session = await auth();

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      const authHeader = request.headers.get('Authorization');
      const extensionToken = authHeader?.replace('Bearer ', '');
      if (extensionToken) {
        const { data: tokenUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('extension_token', extensionToken)
          .maybeSingle();
        if (tokenUser) {
          userId = tokenUser.id;
        }
      }
    }

    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { submissionId, personalNotes } = body;

    if (!submissionId) {
      return jsonResponse(
        { success: false, error: 'No submissionId provided' },
        { status: 400 }
      );
    }

    // Find the solution and verify ownership
    const { data: existingSolution, error: findError } = await supabaseAdmin
      .from('solutions')
      .select(
        `
        id,
        user_problem_solve_id,
        user_problem_solves!inner (
          user_id
        )
      `
      )
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding solution:', findError);
      return jsonResponse(
        { success: false, error: 'Failed to find solution' },
        { status: 500 }
      );
    }

    if (!existingSolution) {
      return jsonResponse(
        { success: false, error: 'Solution not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingSolution.user_problem_solves?.user_id !== userId) {
      return jsonResponse(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Update personal notes
    const { error: updateError } = await supabaseAdmin
      .from('solutions')
      .update({
        personal_notes: personalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSolution.id);

    if (updateError) {
      console.error('Failed to save personal notes:', updateError);
      return jsonResponse(
        { success: false, error: 'Failed to save notes' },
        { status: 500 }
      );
    }

    return jsonResponse({
      success: true,
      message: 'Notes saved successfully',
    });
  } catch (error) {
    console.error('Save notes error:', error);
    return jsonResponse(
      { success: false, error: error.message || 'Failed to save notes' },
      { status: 500 }
    );
  }
}
