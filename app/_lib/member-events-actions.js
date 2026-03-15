/**
 * @file member events actions
 * @module member-events-actions
 */

'use server';

import { supabaseAdmin } from './supabase';
import { revalidatePath } from 'next/cache';
import { requireActionSession } from './action-guard';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Helpers                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Get role names for a user id. Returns string[] like ['member']. */
async function getRoleNamesForUser(userId) {
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId);
  return data?.map((r) => r.roles?.name).filter(Boolean) ?? [];
}

/** Resolve a role UUID → role name. Returns null if not found. */
async function getRoleNameById(roleId) {
  const { data } = await supabaseAdmin
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .single();
  return data?.name ?? null;
}

/** Check whether a user has an eligible role for the event. */
async function checkEligibility(userId, eligibility) {
  if (!eligibility || eligibility === 'all') return true;

  const requiredRoleName = await getRoleNameById(eligibility);
  if (!requiredRoleName) return true; // role not found → allow by default

  const userRoles = await getRoleNamesForUser(userId);
  return userRoles.includes(requiredRoleName);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Register for event (individual OR team)                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Register the current user for an event.
 *
 * @param {string}  eventId
 * @param {object}  [teamData]               - Required for team events
 * @param {string}  [teamData.teamName]       - Team name
 * @param {string[]} [teamData.teamMembers]   - Array of user IDs (including registrant)
 */
export async function registerForEventAction(eventId, teamData) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!eventId) return { error: 'Missing event ID.' };

  // ── Fetch event ────────────────────────────────────────────────────────────
  const { data: event, error: evErr } = await supabaseAdmin
    .from('events')
    .select(
      'id, title, status, registration_required, registration_deadline, max_participants, eligibility, participation_type, team_size'
    )
    .eq('id', eventId)
    .single();

  if (evErr || !event) return { error: 'Event not found.' };
  if (!['upcoming', 'ongoing'].includes(event.status))
    return { error: 'Registration is closed for this event.' };
  if (
    event.registration_deadline &&
    new Date(event.registration_deadline) < new Date()
  ) {
    return { error: 'Registration deadline has passed.' };
  }

  // ── Eligibility check ─────────────────────────────────────────────────────
  const eligible = await checkEligibility(userId, event.eligibility);
  if (!eligible) {
    return { error: 'You are not eligible to register for this event.' };
  }

  // ── Team registration path ────────────────────────────────────────────────
  if (event.participation_type === 'team') {
    if (!teamData?.teamName?.trim()) return { error: 'Team name is required.' };
    if (
      !teamData.teamMembers ||
      !Array.isArray(teamData.teamMembers) ||
      teamData.teamMembers.length === 0
    )
      return { error: 'Team members are required.' };

    // Ensure registrant is included in the team
    const memberIds = [...new Set(teamData.teamMembers)];
    if (!memberIds.includes(userId)) memberIds.push(userId);

    // Validate team size
    if (event.team_size && memberIds.length !== event.team_size) {
      return {
        error: `Team must have exactly ${event.team_size} members (got ${memberIds.length}).`,
      };
    }

    // Check eligibility for all team members when role-specific
    if (event.eligibility && event.eligibility !== 'all') {
      for (const memberId of memberIds) {
        const memberEligible = await checkEligibility(
          memberId,
          event.eligibility
        );
        if (!memberEligible) {
          const { data: memberUser } = await supabaseAdmin
            .from('users')
            .select('full_name')
            .eq('id', memberId)
            .single();
          return {
            error: `Team member "${memberUser?.full_name || memberId}" does not have the required role for this event.`,
          };
        }
      }
    }

    // Check if any team member is already a registration leader (non-cancelled)
    const { data: existingRegs } = await supabaseAdmin
      .from('event_registrations')
      .select('id, user_id, team_name, status')
      .eq('event_id', eventId)
      .in('user_id', memberIds)
      .neq('status', 'cancelled');

    if (existingRegs && existingRegs.length > 0) {
      return {
        error:
          'One or more team members are already registered for this event.',
      };
    }

    // Also check if any memberIds already appear inside another team's team_members array
    const { data: allTeamRegs } = await supabaseAdmin
      .from('event_registrations')
      .select('id, team_name, team_members')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
      .not('team_members', 'is', null);

    if (allTeamRegs && allTeamRegs.length > 0) {
      const memberSet = new Set(memberIds);
      const conflict = allTeamRegs.find((r) =>
        (r.team_members ?? []).some((id) => memberSet.has(id))
      );
      if (conflict) {
        return {
          error: `One or more members are already part of team "${conflict.team_name}" for this event.`,
        };
      }
    }

    // Check capacity
    if (event.max_participants) {
      const { count } = await supabaseAdmin
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .neq('status', 'cancelled');
      if ((count ?? 0) >= event.max_participants) {
        return { error: 'This event is fully booked.' };
      }
    }

    // Insert registration for the team leader (registrant)
    const { data: newReg, error: insErr } = await supabaseAdmin
      .from('event_registrations')
      .insert({
        event_id: eventId,
        user_id: userId,
        status: 'registered',
        team_name: teamData.teamName.trim(),
        team_members: memberIds,
        registered_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('Team registration error:', insErr);
      return { error: 'Failed to register team for event.' };
    }

    // Seed per-member acceptance rows
    // Leader is auto-accepted; other members start as 'pending'
    const now = new Date().toISOString();
    const memberRows = memberIds.map((mid) => ({
      registration_id: newReg.id,
      user_id: mid,
      is_leader: mid === userId,
      status: mid === userId ? 'accepted' : 'pending',
      responded_at: mid === userId ? now : null,
    }));
    await supabaseAdmin.from('event_registration_members').insert(memberRows);

    revalidatePath('/account/member/events');
    revalidatePath('/account/executive/registrations');
    revalidatePath(`/events/${eventId}`);
    return { success: true };
  }

  // ── Individual registration path ──────────────────────────────────────────

  // Check if already registered
  const { data: existing } = await supabaseAdmin
    .from('event_registrations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'cancelled') {
      // Re-activate
      const { error: reErr } = await supabaseAdmin
        .from('event_registrations')
        .update({
          status: 'registered',
          registered_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (reErr) {
        console.error('Event re-registration error:', reErr);
        return { error: 'Failed to re-register for event.' };
      }
      revalidatePath('/account/member/events');
      revalidatePath('/account/executive/registrations');
      revalidatePath(`/events/${eventId}`);
      return { success: true };
    }
    return { error: 'You are already registered for this event.' };
  }

  // Check capacity
  if (event.max_participants) {
    const { count } = await supabaseAdmin
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .neq('status', 'cancelled');
    if (count >= event.max_participants)
      return { error: 'This event is fully booked.' };
  }

  const { error: insErr } = await supabaseAdmin
    .from('event_registrations')
    .insert({
      event_id: eventId,
      user_id: userId,
      status: 'registered',
      registered_at: new Date().toISOString(),
    });

  if (insErr) {
    console.error('Event registration error:', insErr);
    return { error: 'Failed to register for event.' };
  }
  revalidatePath('/account/member/events');
  revalidatePath('/account/executive/registrations');
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Cancel registration                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Cancel the current user's registration for an event. */
export async function cancelEventRegistrationAction(eventId) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!eventId) return { error: 'Missing event ID.' };

  // Only the team leader (the row owner) can cancel.
  const { data: reg } = await supabaseAdmin
    .from('event_registrations')
    .select('id, status, team_members')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!reg) {
    // See if user is a non-leader team member
    const { data: teamReg } = await supabaseAdmin
      .from('event_registrations')
      .select('id, team_name')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
      .contains('team_members', [userId])
      .maybeSingle();

    if (teamReg) {
      return {
        error: `You are a member of "${teamReg.team_name}". Only the team leader can cancel. Please contact the club.`,
      };
    }
    return { error: 'Registration not found.' };
  }

  if (reg.status === 'confirmed' || reg.status === 'attended') {
    return {
      error:
        'Your registration has been confirmed. Please contact the club to cancel.',
    };
  }

  const { error } = await supabaseAdmin
    .from('event_registrations')
    .update({ status: 'cancelled' })
    .eq('id', reg.id);

  if (error) {
    console.error('Event cancellation error:', error);
    return { error: 'Failed to cancel registration.' };
  }

  // Clean up event_registration_members rows for team registrations
  if (reg.team_members && reg.team_members.length > 0) {
    await supabaseAdmin
      .from('event_registration_members')
      .delete()
      .eq('registration_id', reg.id);
  }

  revalidatePath('/account/member/events');
  revalidatePath('/account/member/participation');
  revalidatePath('/account/executive/registrations');
  revalidatePath('/account/admin/events', 'layout');
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Respond to team invitation (accept / decline)                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Accept or decline a team invitation.
 * Only non-leader team members can call this.
 * A declined member can re-accept as long as the registration is not cancelled/confirmed.
 *
 * @param {string}  registrationId
 * @param {boolean} accept
 */
export async function respondToTeamInviteAction(registrationId, accept) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!registrationId) return { error: 'Missing registration ID.' };

  // Find this user's member row
  const { data: memberRow } = await supabaseAdmin
    .from('event_registration_members')
    .select('id, status, is_leader')
    .eq('registration_id', registrationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!memberRow) return { error: 'Team invitation not found.' };
  if (memberRow.is_leader)
    return { error: 'Team leader cannot respond to their own invite.' };

  // Fetch registration to validate state and get event_id
  const { data: reg } = await supabaseAdmin
    .from('event_registrations')
    .select('id, event_id, status')
    .eq('id', registrationId)
    .single();

  if (!reg) return { error: 'Registration not found.' };
  if (reg.status === 'cancelled')
    return { error: 'This team registration has been cancelled.' };
  if (reg.status === 'confirmed' || reg.status === 'attended')
    return { error: 'Registration is already confirmed — contact the club.' };

  const newStatus = accept ? 'accepted' : 'declined';
  const { error: updateErr } = await supabaseAdmin
    .from('event_registration_members')
    .update({
      status: newStatus,
      responded_at: new Date().toISOString(),
    })
    .eq('id', memberRow.id);

  if (updateErr) {
    console.error('Team invite response error:', updateErr);
    return { error: 'Failed to respond to invitation.' };
  }

  revalidatePath(`/events/${reg.event_id}`);
  revalidatePath('/account/member/events');
  revalidatePath('/account/admin/events', 'layout');
  return { success: true, status: newStatus };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Search users for team building                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Search users by name or email for adding to a team.
 * Optionally filter by role when event eligibility is role-specific.
 * Excludes users already registered (as leader or team member) for the event.
 *
 * @param {string}  query       - Search term (name or email)
 * @param {string}  [roleId]    - If provided, only return users with this role
 * @param {string}  [eventId]   - If provided, exclude already-registered users
 * @returns {{ users: Array<{ id, full_name, email, avatar_url }> }}
 */
export async function searchUsersForTeamAction(query, roleId, eventId) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };

  if (!query || query.trim().length < 2)
    return { error: 'Search query too short.' };

  const term = `%${query.trim()}%`;

  // If role filter, get user IDs with that role first
  let userIds = null;
  if (roleId && roleId !== 'all') {
    const { data: roleUsers } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role_id', roleId);
    if (!roleUsers || roleUsers.length === 0) return { users: [] };
    userIds = roleUsers.map((r) => r.user_id);
  }

  // Collect already-registered user IDs for this event (leaders + team members)
  let excludeIds = new Set();
  if (eventId) {
    const { data: regs } = await supabaseAdmin
      .from('event_registrations')
      .select('user_id, team_members')
      .eq('event_id', eventId)
      .neq('status', 'cancelled');
    if (regs) {
      for (const r of regs) {
        excludeIds.add(r.user_id);
        for (const mid of r.team_members ?? []) excludeIds.add(mid);
      }
    }
  }
  // Always exclude the current user themselves
  excludeIds.add(authResult.user.id);

  let q = supabaseAdmin
    .from('users')
    .select('id, full_name, email, avatar_url')
    .eq('account_status', 'active')
    .or(`full_name.ilike.${term},email.ilike.${term}`)
    .limit(20);

  if (userIds) {
    q = q.in('id', userIds);
  }

  const { data, error } = await q;
  if (error) {
    console.error('User search error:', error);
    return { error: 'Search failed.' };
  }

  return {
    users: (data ?? []).filter((u) => !excludeIds.has(u.id)),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Get my registration status                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get current user's registration status for an event.
 */
export async function getMyRegistrationAction(eventId) {
  const authResult = await requireActionSession();
  if (authResult.error) return { registration: null };
  const userId = authResult.user.id;

  // Check if the user is the team leader / individual registrant
  const { data: ownReg } = await supabaseAdmin
    .from('event_registrations')
    .select('id, status, team_name, team_members, registered_at')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ownReg) {
    // For team events, fetch per-member acceptance rows so the leader can see who responded
    let memberAcceptances = [];
    if (ownReg.team_members && ownReg.team_members.length > 0) {
      const { data: rows } = await supabaseAdmin
        .from('event_registration_members')
        .select(
          'user_id, status, is_leader, responded_at, users(full_name, avatar_url)'
        )
        .eq('registration_id', ownReg.id);
      memberAcceptances = rows ?? [];
    }
    return {
      registration: { ...ownReg, isTeamLeader: true, memberAcceptances },
    };
  }

  // Check if user is a non-leader member inside another team's team_members array
  const { data: memberReg } = await supabaseAdmin
    .from('event_registrations')
    .select('id, status, team_name, team_members, registered_at')
    .eq('event_id', eventId)
    .neq('status', 'cancelled')
    .contains('team_members', [userId])
    .maybeSingle();

  if (memberReg) {
    // Get this user's individual acceptance status
    const { data: memberRow } = await supabaseAdmin
      .from('event_registration_members')
      .select('status')
      .eq('registration_id', memberReg.id)
      .eq('user_id', userId)
      .maybeSingle();

    const myAcceptance = memberRow?.status ?? 'pending';
    return {
      registration: { ...memberReg, isTeamLeader: false, myAcceptance },
    };
  }

  return { registration: null };
}
