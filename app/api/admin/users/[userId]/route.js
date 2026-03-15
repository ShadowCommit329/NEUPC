/**
 * @file [userId] API route
 * @module [userId]Route
 */

import { NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import { updateUser } from '@/app/_lib/data-service';

export async function PUT(request, { params }) {
  try {
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    const adminId = authResult.user.id;
    const { userId } = params;
    const { fullName, email, role } = await request.json();

    if (!fullName || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { success, error } = await updateUser(
      userId,
      { name: fullName, email, role },
      adminId
    );

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

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
