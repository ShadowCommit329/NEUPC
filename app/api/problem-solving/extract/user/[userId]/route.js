/**
 * API Endpoint: Extract User Problem Solving Data
 * GET /api/problem-solving/extract/user/[userId]
 *
 * Extracts all-time problem solving statistics for a specific user
 */

import { NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import { extractUserAllTimeData } from '@/app/_lib/problem-solving-extraction';

export async function GET(request, { params }) {
  try {
    // Require admin role to extract other user's data
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Extract data
    const data = await extractUserAllTimeData(userId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in extract user endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract user data' },
      { status: 500 }
    );
  }
}
