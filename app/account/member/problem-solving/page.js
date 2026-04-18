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
    <main className="relative min-h-screen bg-linear-to-b from-slate-950 via-slate-900/95 to-slate-950">
      {/* Ambient background effects for depth */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
        <div className="absolute top-1/4 -right-32 h-80 w-80 rounded-full bg-purple-500/3 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/2 blur-3xl" />
      </div>

      {/* Content container with refined responsive widths */}
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-350 2xl:max-w-400">
        <ProblemSolvingClient userId={user.id} />
      </div>
    </main>
  );
}
