/**
 * @file member contests actions
 * @module member-contests-actions
 */

'use server';

import { supabaseAdmin } from './supabase';
import { revalidatePath } from 'next/cache';
import { requireActionSession } from './action-guard';

/** Register the current user as a participant in a contest. */
export async function joinContestAction(contestId) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!contestId) return { error: 'Missing contest ID.' };

  // Verify contest exists and is joinable
  const { data: contest, error: cErr } = await supabaseAdmin
    .from('contests')
    .select('id, title, status')
    .eq('id', contestId)
    .single();

  if (cErr || !contest) return { error: 'Contest not found.' };
  if (contest.status === 'finished')
    return { error: 'This contest has already finished.' };

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from('contest_participants')
    .select('id')
    .eq('contest_id', contestId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing)
    return { error: 'You are already registered for this contest.' };

  const { error: insErr } = await supabaseAdmin
    .from('contest_participants')
    .insert({
      contest_id: contestId,
      user_id: userId,
      registered_at: new Date().toISOString(),
    });

  if (insErr) {
    console.error('Contest join error:', insErr);
    return { error: 'Failed to join contest.' };
  }
  revalidatePath('/account/member/problem-solving');
  revalidatePath('/account/executive/contests/manage');
  return { success: true };
}

/** Remove the current user's registration from a contest. */
export async function leaveContestAction(contestId) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!contestId) return { error: 'Missing contest ID.' };

  const { data: contest } = await supabaseAdmin
    .from('contests')
    .select('status')
    .eq('id', contestId)
    .maybeSingle();

  if (contest?.status === 'running')
    return { error: 'Cannot leave a contest that is currently running.' };

  const { error } = await supabaseAdmin
    .from('contest_participants')
    .delete()
    .eq('contest_id', contestId)
    .eq('user_id', userId);

  if (error) {
    console.error('Contest leave error:', error);
    return { error: 'Failed to leave contest.' };
  }
  revalidatePath('/account/member/problem-solving');
  revalidatePath('/account/executive/contests/manage');
  return { success: true };
}
