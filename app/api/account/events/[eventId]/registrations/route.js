/**
 * @file route
 * @module route
 */

import { auth } from '@/app/_lib/auth';
import { getUserRoles, getUserByEmail } from '@/app/_lib/data-service';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRoles = await getUserRoles(session.user.email);
  if (!userRoles.includes('executive') && !userRoles.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await getUserByEmail(session.user.email);
  if (user?.account_status !== 'active') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { eventId } = await params;

  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .select(
      `id, status, attended, registered_at, team_name,
       user:users!event_registrations_user_id_fkey(id, full_name, email, avatar_url)`
    )
    .eq('event_id', eventId)
    .order('registered_at', { ascending: false });

  if (error) {
    console.error('Event registrations fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
  return NextResponse.json({ registrations: data || [] });
}
