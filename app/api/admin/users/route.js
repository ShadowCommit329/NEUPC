/**
 * @file route
 * @module route
 */

import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import {
  getAllUsers,
  getUserStats,
} from '@/app/_lib/data-service';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Check authentication + admin role + account status
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle different actions
    if (action === 'stats') {
      const stats = await getUserStats();
      return NextResponse.json(stats);
    }

    // Default: return all users
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
