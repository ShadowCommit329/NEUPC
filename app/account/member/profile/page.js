/**
 * @file Member profile page — displays the authenticated member’s
 *   account information and linked member profile data (student ID,
 *   session, department, competitive handles).
 * @module MemberProfilePage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import { supabaseAdmin } from '@/app/_lib/supabase';
import MemberProfileClient from './_components/MemberProfileClient';

export const metadata = { title: 'Profile | Member | NEUPC' };

export default async function MemberProfilePage() {
  const { user } = await requireRole('member');

  const [memberProfile, { data: userHandles }] = await Promise.all([
    supabaseAdmin
      .from('member_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('user_handles')
      .select('handle, platform:platform_id(code)')
      .eq('user_id', user.id),
  ]);

  const memberProfileData = memberProfile?.data ?? null;

  const handlesMap = {};
  (userHandles || []).forEach((h) => {
    if (h.platform?.code) handlesMap[`${h.platform.code}_handle`] = h.handle;
  });

  const enrichedProfile = memberProfileData
    ? {
        ...memberProfileData,
        session:
          memberProfileData.session ??
          memberProfileData.academic_session ??
          null,
        academic_session:
          memberProfileData.academic_session ??
          memberProfileData.session ??
          null,
        ...handlesMap,
      }
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8">
      <MemberProfileClient user={user} memberProfile={enrichedProfile} />
    </div>
  );
}
