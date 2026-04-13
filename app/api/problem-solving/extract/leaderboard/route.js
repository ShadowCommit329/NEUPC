/**
 * API Endpoint: Extract Leaderboard Data
 * GET /api/problem-solving/extract/leaderboard
 *
 * Extracts leaderboard data with all-time statistics
 */

import { NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import {
  extractLeaderboardData,
  exportToCSV,
} from '@/app/_lib/problem-solving-extraction';

export async function GET(request) {
  try {
    // Require admin role
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overall'; // 'overall', 'weekly', 'monthly'
    const limit = parseInt(searchParams.get('limit') || '100');
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    // Extract data
    const result = await extractLeaderboardData({ type, limit });

    // Return CSV if requested
    if (format === 'csv') {
      const csv = exportToCSV(result.data, 'leaderboard');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="leaderboard-${type}-${Date.now()}.csv"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in extract leaderboard endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract leaderboard data' },
      { status: 500 }
    );
  }
}
