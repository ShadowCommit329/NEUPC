/**
 * API Endpoint: Extract Platform-Specific Data
 * GET /api/problem-solving/extract/platform/[platform]
 *
 * Extracts all-time problem solving statistics for a specific platform across all users
 */

import { NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import { extractPlatformData } from '@/app/_lib/problem-solving-extraction';

export async function GET(request, { params }) {
  try {
    // Require admin role
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    const { platform } = params;

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    // Extract data
    const result = await extractPlatformData(platform);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in extract platform endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract platform data' },
      { status: 500 }
    );
  }
}
