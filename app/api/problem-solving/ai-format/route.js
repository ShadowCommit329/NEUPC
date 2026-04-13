/**
 * @file AI Code Formatting API Route
 * @module api/problem-solving/ai-format
 *
 * Uses AI to properly format source code (indentation, spacing only).
 * Does NOT modify logic, fix bugs, or change functionality.
 * Saves formatted code back to database.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { generateCompletion, isLLMAvailable } from '@/app/_lib/llm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function POST(request) {
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

    if (!isLLMAvailable()) {
      return jsonResponse(
        { success: false, error: 'AI formatting not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { code, language, submissionId } = body;

    if (!code) {
      return jsonResponse(
        { success: false, error: 'No code provided' },
        { status: 400 }
      );
    }

    // Normalize escaped characters from database
    const normalizedCode = code
      .replace(/\\\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\\\t/g, '\t')
      .replace(/\\t/g, '\t');

    const langName = getLanguageName(language);

    // Strict formatting-only prompt
    const messages = [
      {
        role: 'system',
        content: `You are a code FORMATTER only. Your ONLY job is to fix indentation and spacing.

STRICT RULES:
- Add proper indentation (4 spaces per level)
- Add spaces around operators (=, +, -, etc.)
- Add newlines between logical blocks
- Use K&R brace style (opening brace on same line)

DO NOT:
- Fix any bugs or errors
- Change any variable names
- Add or remove any code
- Modify logic in any way
- Add comments
- "Improve" the code

The formatted code must be EXACTLY equivalent to the input - only whitespace changes allowed.

Return ONLY the formatted code inside a markdown code block. No explanations.`,
      },
      {
        role: 'user',
        content: `Format this ${langName} code (whitespace/indentation only):\n\`\`\`\n${normalizedCode}\n\`\`\``,
      },
    ];

    const response = await generateCompletion(messages, {
      maxTokens: 4000,
      temperature: 0, // Zero temperature for deterministic formatting
    });

    if (!response || !response.content) {
      return jsonResponse(
        { success: false, error: 'AI formatting failed - no response' },
        { status: 500 }
      );
    }

    // Extract code from markdown block
    const codeBlockMatch = response.content.match(/```[\w]*\n?([\s\S]*?)```/);
    const formattedCode = codeBlockMatch
      ? codeBlockMatch[1].trim()
      : response.content.trim();

    // Save formatted code to database if submissionId provided
    if (submissionId) {
      // First, verify the solution exists and belongs to the user
      // solutions table doesn't have user_id directly - it's linked via user_problem_solves
      const { data: existingSolution, error: findError } = await supabaseAdmin
        .from('solutions')
        .select(
          `
          id,
          submission_id,
          source_code,
          original_source_code,
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
        return jsonResponse({
          success: true,
          formattedCode,
          saved: false,
          saveError: 'Failed to find solution: ' + findError.message,
        });
      }

      if (!existingSolution) {
        console.error('No solution found for submission_id:', submissionId);
        return jsonResponse({
          success: true,
          formattedCode,
          saved: false,
          saveError: 'No solution found for this submission',
        });
      }

      // Verify ownership
      if (existingSolution.user_problem_solves?.user_id !== userId) {
        console.error('User does not own this solution');
        return jsonResponse({
          success: true,
          formattedCode,
          saved: false,
          saveError: 'You do not have permission to update this solution',
        });
      }

      // Prepare update data
      const updateData = {
        source_code: formattedCode,
        updated_at: new Date().toISOString(),
      };

      // Save original code only if not already saved (first time formatting)
      if (!existingSolution.original_source_code) {
        updateData.original_source_code = existingSolution.source_code;
      }

      // Now update the solution
      const { error: updateError } = await supabaseAdmin
        .from('solutions')
        .update(updateData)
        .eq('id', existingSolution.id);

      if (updateError) {
        console.error('Failed to save formatted code:', updateError);
        return jsonResponse({
          success: true,
          formattedCode,
          saved: false,
          saveError: updateError.message,
        });
      }

      return jsonResponse({
        success: true,
        formattedCode,
        saved: true,
        hasOriginal: true,
        originalCode:
          existingSolution.original_source_code || existingSolution.source_code,
      });
    }

    return jsonResponse({ success: true, formattedCode, saved: false });
  } catch (error) {
    console.error('AI Format error:', error);
    return jsonResponse(
      { success: false, error: error.message || 'AI formatting failed' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Revert to original source code
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
    const { submissionId } = body;

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
        source_code,
        original_source_code,
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

    // Check if original code exists
    if (!existingSolution.original_source_code) {
      return jsonResponse(
        { success: false, error: 'No original code to revert to' },
        { status: 400 }
      );
    }

    // Revert to original code
    const { error: updateError } = await supabaseAdmin
      .from('solutions')
      .update({
        source_code: existingSolution.original_source_code,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSolution.id);

    if (updateError) {
      console.error('Failed to revert code:', updateError);
      return jsonResponse(
        { success: false, error: 'Failed to revert code' },
        { status: 500 }
      );
    }

    return jsonResponse({
      success: true,
      originalCode: existingSolution.original_source_code,
      reverted: true,
    });
  } catch (error) {
    console.error('Revert error:', error);
    return jsonResponse(
      { success: false, error: error.message || 'Failed to revert' },
      { status: 500 }
    );
  }
}

function getLanguageName(language) {
  const lang = language?.toLowerCase() || '';
  if (lang.includes('c++') || lang.includes('cpp') || lang.includes('gnu c'))
    return 'C++';
  if (lang.includes('python') || lang.includes('pypy')) return 'Python';
  if (lang.includes('java') && !lang.includes('javascript')) return 'Java';
  if (lang.includes('javascript') || lang.includes('node')) return 'JavaScript';
  if (lang.includes('rust')) return 'Rust';
  if (lang.includes('go') || lang === 'golang') return 'Go';
  if (lang === 'c') return 'C';
  return 'C++';
}
