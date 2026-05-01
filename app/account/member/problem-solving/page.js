/**
 * @file Problem Solving Tracking Page
 * @module ProblemSolvingPage
 * @access member
 *
 * Allows members to connect their online judge handles (Codeforces,
 * AtCoder, LeetCode, SPOJ, and others), track daily problem solving
 * activity, view
 * statistics, and see leaderboard rankings.
 *
 * Features:
 * - Multi-platform handle connection
 * - Real-time sync with competitive programming platforms
 * - Activity heatmap visualization
 * - Rating chart and contest history
 * - Problem-wise solution management
 * - Global and weekly leaderboards
 * - Badge and achievement system
 */

import { requireRole } from '@/app/_lib/auth-guard';
import ProblemSolvingClient from './_components/ProblemSolvingClient';

export const metadata = {
  title: 'Problem Solving | Member Dashboard | NEUPC',
  description:
    'Track your competitive programming progress, connect multiple platforms, view statistics, and climb the leaderboard.',
  keywords: [
    'competitive programming',
    'problem solving',
    'codeforces',
    'leetcode',
    'atcoder',
    'progress tracking',
    'leaderboard',
  ],
};

export default async function ProblemSolvingPage() {
  const { user } = await requireRole('member');

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8">
      <ProblemSolvingClient userId={user.id} />
    </div>
  );
}
