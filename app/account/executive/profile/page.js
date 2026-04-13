/**
 * @file Executive profile page — displays the authenticated executive’s
 *   personal info, member profile details, and current committee position
 *   so they can review or update their data.
 * @module ExecutiveProfilePage
 * @access executive | admin
 */

import { requireRole } from '@/app/_lib/auth-guard';
import { supabaseAdmin } from '@/app/_lib/supabase';
import ExecutiveProfileClient from './_components/ExecutiveProfileClient';

export const metadata = { title: 'Profile | Executive | NEUPC' };

export default async function ExecutiveProfilePage() {
  const { user } = await requireRole(['executive', 'admin']);

  const [{ data: memberProfile }, { data: committeeInfo }, { data: userHandles }] = await Promise.all([
    supabaseAdmin
      .from('member_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('committee_members')
      .select(
        `id, term_start, term_end, is_current, bio,
        position:committee_positions(title, category)`
      )
      .eq('user_id', user.id)
      .eq('is_current', true)
      .maybeSingle(),
    supabaseAdmin
      .from('user_handles')
      .select('platform, handle')
      .eq('user_id', user.id),
  ]);

  // Merge handles into memberProfile for backward compatibility
  const handlesMap = {};
  (userHandles || []).forEach((h) => {
    handlesMap[`${h.platform}_handle`] = h.handle;
  });

  const enrichedProfile = memberProfile
    ? { ...memberProfile, ...handlesMap }
    : null;

  return (
    <ExecutiveProfileClient
      user={user}
      memberProfile={enrichedProfile}
      committeeInfo={committeeInfo}
    />
  );
}
