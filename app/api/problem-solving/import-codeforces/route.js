/**
 * Codeforces Data Import API
 * POST /api/problem-solving/import-codeforces
 *
 * Imports historical Codeforces data for a user including:
 * - All accepted submissions and problem solves
 * - Contest participation history and ratings
 * - Problem information and metadata
 *
 * This is designed for one-time historical data import.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import { scrapeUserData } from '@/app/_lib/codeforces-scraper';

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
    const { codeforcesHandle } = await request.json();

    // Validate required fields
    if (!codeforcesHandle || typeof codeforcesHandle !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid codeforcesHandle' },
        { status: 400 }
      );
    }

    // Validate handle format (basic validation)
    if (!/^[a-zA-Z0-9_-]{3,24}$/.test(codeforcesHandle)) {
      return NextResponse.json(
        { error: 'Invalid Codeforces handle format' },
        { status: 400 }
      );
    }

    console.log(
      `[CF-IMPORT] Starting import for user ${userId} with handle: ${codeforcesHandle}`
    );

    // Start the import process
    const importResults = await scrapeUserData(userId, codeforcesHandle);

    console.log(`[CF-IMPORT] Import completed:`, importResults);

    return NextResponse.json({
      success: true,
      message: `Successfully imported Codeforces data for ${codeforcesHandle}`,
      data: importResults,
    });
  } catch (error) {
    console.error('[CF-IMPORT] Import failed:', error);

    // Handle specific error types
    if (error.name === 'CodeforcesError') {
      return NextResponse.json(
        {
          error: `Codeforces API error: ${error.message}`,
          details: error.comment,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to import Codeforces data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
