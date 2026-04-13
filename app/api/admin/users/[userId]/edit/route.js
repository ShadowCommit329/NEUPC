/**
 * @file Edit API route — secured with field whitelisting.
 * @module EditRoute
 */

import { NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import { updateUser } from '@/app/_lib/data-service';
import { pickAllowedFields } from '@/app/_lib/validation';

/** Fields that can be updated via this endpoint. */
const ALLOWED_USER_FIELDS = [
  'full_name',
  'email',
  'phone',
  'avatar_url',
  'bio',
  'account_status',
  'status_reason',
  'department',
  'session',
  'student_id',
  'linkedin',
  'github',
];

export async function POST(request, { params }) {
  try {
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    const { userId } = await params;
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Whitelist fields — prevent mass-assignment attacks
    const updates = pickAllowedFields(body, ALLOWED_USER_FIELDS);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      );
    }

    await updateUser(userId, updates, authResult.user.id);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error(`API Error [${new Date().toISOString()}]:`, error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
