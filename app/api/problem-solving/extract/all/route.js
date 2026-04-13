/**
 * API Endpoint: Extract All Users Problem Solving Data
 * GET /api/problem-solving/extract/all
 *
 * Extracts all-time problem solving statistics for all users
 * Supports query parameters for filtering
 */

import { NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import {
  extractAllUsersData,
  exportToCSV,
} from '@/app/_lib/problem-solving-extraction';

export async function GET(request) {
  try {
    // Require admin role
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const minSolved = parseInt(searchParams.get('minSolved') || '0');
    const platforms =
      searchParams.get('platforms')?.split(',').filter(Boolean) || null;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit'))
      : null;
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    // Extract data
    const result = await extractAllUsersData({
      includeInactive,
      minSolved,
      platforms,
      limit,
    });

    // Return CSV if requested
    if (format === 'csv') {
      const csv = exportToCSV(result.data, 'summary');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="problem-solving-all-users-${Date.now()}.csv"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in extract all users endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract users data' },
      { status: 500 }
    );
  }
}
