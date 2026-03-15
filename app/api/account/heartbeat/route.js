/**
 * @file Heartbeat API route.
 * Called by the client every 60 s while the tab is open.
 * Updates `last_seen` so the admin panel can derive a real-time
 * "is online" status without relying solely on the sign-out callback.
 *
 * POST /api/account/heartbeat
 *   → 200 { ok: true }
 *
 * @module HeartbeatRoute
 */

import { supabaseAdmin } from '@/app/_lib/supabase';
import { auth } from '@/app/_lib/auth';
import { getUserByEmail } from '@/app/_lib/data-service';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const blockedStatuses = [
      'inActive',
      'inactive',
      'pending',
      'suspended',
      'banned',
      'blocked',
      'locked',
      'rejected',
    ];
    const isBlocked = blockedStatuses.includes(user.account_status);

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        last_seen: new Date().toISOString(),
        ...(isBlocked ? {} : { is_online: true }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Heartbeat DB error:', error);
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Heartbeat route error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
