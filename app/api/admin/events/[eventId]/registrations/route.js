/**
 * @file route
 * @module route
 */

import { auth } from '@/app/_lib/auth';
import { getUserRoles, getEventRegistrations } from '@/app/_lib/data-service';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = await getUserRoles(session.user.email);
    if (
      !userRoles.includes('admin') &&
      !userRoles.includes('executive') &&
      !userRoles.includes('advisor')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { eventId } = await params;
    const registrations = await getEventRegistrations(eventId);

    // Resolve team_members UUIDs → user objects for team registrations
    const allMemberIds = [
      ...new Set(
        registrations.flatMap((r) => r.team_members ?? []).filter(Boolean)
      ),
    ];

    let memberMap = {};
    if (allMemberIds.length > 0) {
      const { data: members } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', allMemberIds);
      memberMap = Object.fromEntries((members ?? []).map((u) => [u.id, u]));
    }

    // Fetch acceptance rows for all team registrations in one query
    const teamRegIds = registrations
      .filter((r) => r.team_members && r.team_members.length > 0)
      .map((r) => r.id);

    let acceptanceMap = {}; // { registrationId: [ { user_id, status, is_leader } ] }
    if (teamRegIds.length > 0) {
      const { data: acceptanceRows } = await supabaseAdmin
        .from('event_registration_members')
        .select('registration_id, user_id, status, is_leader, responded_at')
        .in('registration_id', teamRegIds);
      for (const row of acceptanceRows ?? []) {
        if (!acceptanceMap[row.registration_id])
          acceptanceMap[row.registration_id] = [];
        acceptanceMap[row.registration_id].push({
          ...row,
          user: memberMap[row.user_id] ?? { full_name: 'Unknown', email: null },
        });
      }
    }

    const enriched = registrations.map((r) => ({
      ...r,
      team_member_details: (r.team_members ?? []).map(
        (id) => memberMap[id] ?? { id, full_name: 'Unknown', email: null }
      ),
      member_acceptances: acceptanceMap[r.id] ?? [],
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event registrations' },
      { status: 500 }
    );
  }
}
