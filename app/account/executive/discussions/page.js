/**
 * @file Executive Help Desk Page
 * Help desk management for executives.
 *
 * @module ExecutiveDiscussionsPage
 * @access executive
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getDiscussions,
  getStaffDiscussionStats,
} from '@/app/_lib/data-service';
import { StaffDiscussionsClient } from '@/app/_components/discussions';

export const metadata = { title: 'Help Desk | Executive | NEUPC' };

export default async function ExecutiveDiscussionsPage() {
  const { session, user } = await requireRole('executive');

  // Fetch initial data in parallel
  const [discussionsResult, stats] = await Promise.all([
    getDiscussions({ limit: 50 }).catch(() => ({
      data: [],
      total: 0,
    })),
    getStaffDiscussionStats().catch(() => ({})),
  ]);

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <StaffDiscussionsClient
        initialDiscussions={discussionsResult.data || []}
        initialStats={stats}
        userId={user.id}
        userEmail={session.user.email}
        userRole="executive"
      />
    </div>
  );
}
