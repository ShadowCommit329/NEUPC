/**
 * @file Actions API route
 * @module ActionsRoute
 */

import { NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/app/_lib/api-guard';
import {
  suspendUser,
  activateUser,
  banUser,
  deleteUser,
  approveMember,
} from '@/app/_lib/data-service';

export async function POST(request) {
  try {
    const authResult = await requireApiAuth('admin');
    if (isAuthError(authResult)) return authResult;

    const adminId = authResult.user.id;
    const { action, userId, reason } = await request.json();

    if (!action || !userId) {
      return NextResponse.json(
        { error: 'Missing action or userId' },
        { status: 400 }
      );
    }

    // Prevent admin from performing destructive actions on themselves
    if (['suspend', 'ban', 'delete'].includes(action) && adminId === userId) {
      return NextResponse.json(
        { error: 'You cannot perform this action on your own account' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'suspend':
        await suspendUser(userId, adminId, reason);
        return NextResponse.json({
          success: true,
          message: 'User suspended successfully',
        });

      case 'activate':
        await activateUser(userId, adminId, reason);
        return NextResponse.json({
          success: true,
          message: 'User activated successfully',
        });

      case 'ban':
        await banUser(userId, adminId, reason);
        return NextResponse.json({
          success: true,
          message: 'User banned successfully',
        });

      case 'delete':
        await deleteUser(userId, adminId, reason);
        return NextResponse.json({
          success: true,
          message: 'User deleted successfully',
        });

      case 'approve':
        await approveMember(userId, adminId);
        return NextResponse.json({
          success: true,
          message: 'User approved successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error(`API Error [${new Date().toISOString()}]:`, error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
