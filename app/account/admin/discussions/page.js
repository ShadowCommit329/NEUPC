/**
 * @file Admin Help Desk Page
 * Full-featured help desk management for admins.
 *
 * @module AdminDiscussionsPage
 * @access admin
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getDiscussions,
  getStaffDiscussionStats,
} from '@/app/_lib/data-service';
import { StaffDiscussionsClient } from '@/app/_components/discussions';

export const metadata = { title: 'Help Desk | Admin | NEUPC' };

export default async function AdminDiscussionsPage() {
  const { session, user } = await requireRole('admin');

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
        userRole="admin"
      />
    </div>
  );
}
