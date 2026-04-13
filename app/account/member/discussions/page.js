/**
 * @file Member Help Desk Page
 * Full-featured help desk with tabs: All Post, Roadmap, Release Log,
 * Feature Requests, Self Troubleshoot.
 *
 * @module MemberDiscussionsPage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getDiscussions,
  getUserDiscussionStats,
  getUserBootcampEnrollments,
} from '@/app/_lib/data-service';
import { DiscussionErrorBoundary } from '@/app/_components/discussions';
import MemberHelpDeskClient from './_components/MemberHelpDeskClient';

export const metadata = { title: 'Help Desk | Member | NEUPC' };

export default async function MemberDiscussionsPage() {
  const { session, user } = await requireRole('member');

  // Fetch initial data in parallel with detailed error logging
  const [discussionsResult, stats, bootcamps] = await Promise.all([
    getDiscussions({ userId: user.id, limit: 50 }).catch((err) => {
      console.error('Error fetching discussions:', err.message);
      return { data: [], total: 0 };
    }),
    getUserDiscussionStats(user.id).catch((err) => {
      console.error('Error fetching user stats:', err.message);
      return {};
    }),
    getUserBootcampEnrollments(user.id).catch((err) => {
      console.error('Error fetching bootcamp enrollments:', err.message);
      return [];
    }),
  ]);

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <DiscussionErrorBoundary
        title="Help Desk Error"
        message="We encountered an issue loading the Help Desk. Please refresh the page or try again later."
      >
        <MemberHelpDeskClient
          initialDiscussions={discussionsResult.data || []}
          initialStats={stats}
          bootcamps={bootcamps}
          userId={user.id}
          userEmail={session.user.email}
        />
      </DiscussionErrorBoundary>
    </div>
  );
}
