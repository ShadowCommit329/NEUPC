/**
 * @file Admin registration status management — PATCH to confirm, mark attended, or cancel.
 * @module AdminRegistrationRoute
 */

import { auth } from '@/app/_lib/auth';
import { getUserRoles } from '@/app/_lib/data-service';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

const ALLOWED_STATUSES = ['registered', 'confirmed', 'attended', 'cancelled'];

export async function PATCH(request, { params }) {
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

    const { eventId, registrationId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify the registration belongs to this event
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('event_registrations')
      .select('id, event_id, status, team_members')
      .eq('id', registrationId)
      .eq('event_id', eventId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: 'Registration not found.' },
        { status: 404 }
      );
    }

    const updates = { status };

    // When confirming a team registration, ensure all members have accepted
    if (status === 'confirmed') {
      const { data: memberRows } = await supabaseAdmin
        .from('event_registration_members')
        .select('user_id, status, is_leader')
        .eq('registration_id', registrationId)
        .eq('is_leader', false);

      if (memberRows && memberRows.length > 0) {
        const notAccepted = memberRows.filter((m) => m.status !== 'accepted');
        if (notAccepted.length > 0) {
          return NextResponse.json(
            {
              error: `${notAccepted.length} team member(s) have not yet accepted the invitation.`,
            },
            { status: 422 },
          );
        }
      }
    }

    // keep `attended` boolean in sync with status
    if (status === 'attended') {
      updates.attended = true;
    } else if (status === 'cancelled' || status === 'registered') {
      updates.attended = false;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('event_registrations')
      .update(updates)
      .eq('id', registrationId)
      .select('id, status, attended')
      .single();

    if (updateErr) {
      console.error('Registration update error:', updateErr);
      return NextResponse.json(
        { error: 'Failed to update registration.' },
        { status: 500 }
      );
    }

    // When admin cancels a team registration, clean up member acceptance rows
    if (
      status === 'cancelled' &&
      existing.team_members &&
      existing.team_members.length > 0
    ) {
      await supabaseAdmin
        .from('event_registration_members')
        .delete()
        .eq('registration_id', registrationId);
    }

    // Revalidate affected pages
    revalidatePath(`/events/${eventId}`);
    revalidatePath('/account/member/events');
    revalidatePath('/account/member/participation');
    revalidatePath('/account/admin/events', 'layout');

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
