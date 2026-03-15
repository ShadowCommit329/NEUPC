/**
 * @file Member profile page — displays the authenticated member’s
 *   account information and linked member profile data (student ID,
 *   session, department, competitive handles).
 * @module MemberProfilePage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import { getMemberProfileByUserId } from '@/app/_lib/data-service';
import MemberProfileClient from './_components/MemberProfileClient';

export const metadata = { title: 'Profile | Member | NEUPC' };

export default async function MemberProfilePage() {
  const { user } = await requireRole('member');
  const memberProfile = await getMemberProfileByUserId(user.id).catch(
    () => null
  );

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <MemberProfileClient user={user} memberProfile={memberProfile} />
    </div>
  );
}
