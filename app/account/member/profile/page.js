/**
 * @file Member profile page — displays the authenticated member’s
 *   account information and linked member profile data (student ID,
 *   session, department, competitive handles).
 * @module MemberProfilePage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import { getMemberProfileByUserId } from '@/app/_lib/data-service';
import { supabaseAdmin } from '@/app/_lib/supabase';
import MemberProfileClient from './_components/MemberProfileClient';

export const metadata = { title: 'Profile | Member | NEUPC' };

export default async function MemberProfilePage() {
  const { user } = await requireRole('member');

  const [memberProfile, { data: userHandles }] = await Promise.all([
    getMemberProfileByUserId(user.id).catch(() => null),
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
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <MemberProfileClient user={user} memberProfile={enrichedProfile} />
    </div>
  );
}
