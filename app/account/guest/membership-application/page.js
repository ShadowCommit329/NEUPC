/**
 * @file Guest membership application — allows guests to submit a request
 *   to become a full club member and displays the status of any existing
 *   application (pending / approved / rejected).
 * @module GuestMembershipApplicationPage
 * @access guest
 */

import { requireRole } from '@/app/_lib/auth-guard';
import { getJoinRequestByEmail } from '@/app/_lib/data-service';
import MembershipApplicationClient from './MembershipApplicationClient';

export const metadata = { title: 'Apply for Membership | Guest | NEUPC' };

export default async function GuestMembershipApplicationPage() {
  // Only users with actual roles (not guests) and active status can apply for membership
  const { session, user } = await requireRole([
    'member',
    'mentor',
    'advisor',
    'executive',
    'admin',
  ]);

  const joinRequests = await getJoinRequestByEmail(session.user.email).catch(
    () => []
  );
  const latestApplication = joinRequests?.[0] ?? null;

  return (
    <MembershipApplicationClient
      userData={user}
      latestApplication={latestApplication}
    />
  );
}
