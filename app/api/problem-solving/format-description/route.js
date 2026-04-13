/**
 * Problem Solving API - Format Description Endpoint
 * POST /api/problem-solving/format-description
 *
 * Formats a problem description using AI and stores it in the database
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import { V2_TABLES } from '@/app/_lib/problem-solving-v2-helpers';
import { generateCompletion } from '@/app/_lib/llm';

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

    const { problemId, platform, description } = await request.json();

    if (!problemId || !platform || !description) {
      return NextResponse.json(
        {
          error: 'Missing required fields: problemId, platform, description',
        },
        { status: 400 }
      );
    }

    // Call LLM to format the description
    const { content: formattedDescription } = await generateCompletion([
      {
        role: 'user',
        content: `You are an expert problem formatter. Format this competitive programming problem description into clean, well-organized markdown.

Include these sections:
1. **Problem Statement** - Clear explanation of what needs to be done
2. **Input Specification** - Format and constraints of input
3. **Output Specification** - Expected output format
4. **Examples** - Example input/output with explanations
5. **Constraints** - Limitations and bounds
6. **Notes** - Any additional important information

Use markdown formatting with headers, code blocks, and bullet points. Keep formatting clean and readable. Preserve all original information.

Return ONLY the formatted markdown, no explanations.

Problem Description:
${description}`,
      },
    ]);

    if (!formattedDescription) {
      return NextResponse.json(
        { error: 'Failed to format description' },
        { status: 500 }
      );
    }

    // Get the problem from problems table
    const { data: problemData, error: problemError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('external_id', problemId)
      .limit(1)
      .maybeSingle();

    if (problemError || !problemData) {
      return NextResponse.json(
        { error: 'Problem not found in database' },
        { status: 404 }
      );
    }

    // Update the problems table with formatted description
    const { error: updateError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .update({
        description: formattedDescription,
        updated_at: new Date().toISOString(),
      })
      .eq('id', problemData.id);

    if (updateError) {
      console.error('Error updating problem description:', updateError);
      return NextResponse.json(
        { error: 'Failed to save formatted description' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      formattedDescription,
      message: 'Description formatted and saved successfully',
    });
  } catch (error) {
    console.error('Error formatting description:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to format description' },
      { status: 500 }
    );
  }
}
