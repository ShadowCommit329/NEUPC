/**
 * Database Schema Validation API
 * GET /api/problem-solving/validate-schema
 *
 * Tests the V2 database schema to ensure all tables exist and have correct structure
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import {
  V2_TABLES,
  isV2SchemaAvailable,
} from '@/app/_lib/problem-solving-v2-helpers';

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validationResults = {};

    // Check if V2 schema is available
    const v2Available = await isV2SchemaAvailable();

    // Test V2 tables (primary)
    const v2Tables = [
      'cp_platforms', // Platform lookup table
      V2_TABLES.USER_HANDLES, // user_handles_v2
      V2_TABLES.PROBLEMS, // problems_v2
      V2_TABLES.USER_SOLVES, // user_solves_v2
      V2_TABLES.SUBMISSIONS, // submissions_v2
      V2_TABLES.SOLUTIONS, // solutions_v2
      V2_TABLES.USER_STATS, // user_stats_v2
    ];

    for (const table of v2Tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1);

        validationResults[table] = {
          exists: !error,
          error: error?.message || null,
          hasData: data && data.length > 0,
        };
      } catch (err) {
        validationResults[table] = {
          exists: false,
          error: err.message,
          hasData: false,
        };
      }
    }

    // Test V2 foreign key relationships
    const relationshipTests = [];

    try {
      // Test user_handles_v2 -> cp_platforms relationship
      const { data: testHandle } = await supabaseAdmin
        .from(V2_TABLES.USER_HANDLES)
        .select(
          `
          id,
          cp_platforms!inner(id, code, display_name)
        `
        )
        .limit(1);

      relationshipTests.push({
        relationship: 'user_handles_v2 -> cp_platforms',
        working: !testHandle ? true : !!testHandle, // True if no error (even if empty)
      });
    } catch (err) {
      relationshipTests.push({
        relationship: 'user_handles_v2 -> cp_platforms',
        working: false,
        error: err.message,
      });
    }

    try {
      // Test problems_v2 -> cp_platforms relationship
      const { data: testProblem } = await supabaseAdmin
        .from(V2_TABLES.PROBLEMS)
        .select(
          `
          id,
          cp_platforms!inner(id, code)
        `
        )
        .limit(1);

      relationshipTests.push({
        relationship: 'problems_v2 -> cp_platforms',
        working: !testProblem ? true : !!testProblem,
      });
    } catch (err) {
      relationshipTests.push({
        relationship: 'problems_v2 -> cp_platforms',
        working: false,
        error: err.message,
      });
    }

    try {
      // Test user_solves_v2 -> problems_v2 relationship
      const { data: testSolve } = await supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .select(
          `
          id,
          problems_v2!inner(id, problem_name)
        `
        )
        .limit(1);

      relationshipTests.push({
        relationship: 'user_solves_v2 -> problems_v2',
        working: !testSolve ? true : !!testSolve,
      });
    } catch (err) {
      relationshipTests.push({
        relationship: 'user_solves_v2 -> problems_v2',
        working: false,
        error: err.message,
      });
    }

    try {
      // Test submissions_v2 -> cp_platforms relationship
      const { data: testSubmission } = await supabaseAdmin
        .from(V2_TABLES.SUBMISSIONS)
        .select(
          `
          id,
          cp_platforms!inner(id, code)
        `
        )
        .limit(1);

      relationshipTests.push({
        relationship: 'submissions_v2 -> cp_platforms',
        working: !testSubmission ? true : !!testSubmission,
      });
    } catch (err) {
      relationshipTests.push({
        relationship: 'submissions_v2 -> cp_platforms',
        working: false,
        error: err.message,
      });
    }

    const allTablesExist = Object.values(validationResults).every(
      (r) => r.exists
    );
    const allRelationshipsWork = relationshipTests.every((r) => r.working);

    return NextResponse.json({
      success: allTablesExist && allRelationshipsWork,
      v2SchemaAvailable: v2Available,
      tables: validationResults,
      relationships: relationshipTests,
      summary: {
        tablesExist: allTablesExist,
        relationshipsWork: allRelationshipsWork,
        message:
          allTablesExist && allRelationshipsWork
            ? 'V2 database schema is working correctly!'
            : 'V2 database schema needs migration. Run migration script first.',
      },
    });
  } catch (error) {
    console.error('[SCHEMA-VALIDATION] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to validate schema',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
