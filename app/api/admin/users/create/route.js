/**
 * @file Create API route
 * @module CreateRoute
 */

import { NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import { createAdminUser } from '@/app/_lib/data-service';
import { revalidatePath } from 'next/cache';

export async function POST(request) {
  try {
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    const adminId = authResult.user.id;
    const { fullName, email, role, profileData } = await request.json();

    if (!fullName || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { success, userId, error } = await createAdminUser(
      fullName,
      email,
      role,
      adminId,
      profileData || {}
    );

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    revalidatePath('/account/admin/users');
    revalidatePath('/account/admin/roles');

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId,
    });
  } catch (error) {
    console.error(`API Error [${new Date().toISOString()}]:`, error);
    return NextResponse.json(
      { error: error.message || 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
