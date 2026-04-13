/**
 * @file Member Profile Client Component
 * @module MemberProfileClient
 *
 * Displays another member's problem solving profile,
 * statistics, activity heatmap, and badges.
 */

'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Trophy,
  Flame,
  Target,
  TrendingUp,
  ExternalLink,
  Shield,
} from 'lucide-react';
import ActivityHeatmap from '../../_components/ActivityHeatmap';
import BadgesDisplay from '../../_components/BadgesDisplay';

const PLATFORM_CONFIG = {
  codeforces: {
    name: 'Codeforces',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    url: 'https://codeforces.com/profile/',
  },
  atcoder: {
    name: 'AtCoder',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    url: 'https://atcoder.jp/users/',
  },
  leetcode: {
    name: 'LeetCode',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    url: 'https://leetcode.com/',
  },
};

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}
      >
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-xl leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function RecentSolveRow({ solve }) {
  const platform =
    PLATFORM_CONFIG[solve.platform] || PLATFORM_CONFIG.codeforces;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-3 py-2.5">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${platform.border} ${platform.bg}`}
      >
        <span className={`text-[10px] font-bold ${platform.color}`}>
          {platform.name.substring(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={solve.problem_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 truncate text-sm font-medium text-white transition-colors hover:text-blue-400"
        >
          {solve.problem_name}
          <ExternalLink className="h-3 w-3 shrink-0 text-gray-600" />
        </a>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          {solve.difficulty_tier && (
            <span
              className={`rounded px-1 py-0.5 ${
                solve.difficulty_tier === 'easy'
                  ? 'bg-green-500/15 text-green-400'
                  : solve.difficulty_tier === 'medium'
                    ? 'bg-yellow-500/15 text-yellow-400'
                    : solve.difficulty_tier === 'hard'
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-purple-500/15 text-purple-400'
              }`}
            >
              {solve.difficulty_tier}
            </span>
          )}
          <span>
            {new Date(solve.first_solved_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MemberProfileClient({ data }) {
  const {
    profile,
    handles,
    statistics,
    recentSolves,
    dailyActivity,
    badges,
    leaderboard,
  } = data;

  const stats = statistics || {
    total_solved: 0,
    current_streak: 0,
    longest_streak: 0,
    solved_this_week: 0,
    solved_this_month: 0,
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/account/member/problem-solving"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Problem Solving
      </Link>

      {/* Profile Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-16 w-16 rounded-full border-2 border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/10 bg-white/5">
              <User className="h-8 w-8 text-gray-500" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              {profile.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {handles.map((h) => {
                const config = PLATFORM_CONFIG[h.platform];
                return (
                  <span
                    key={h.platform}
                    className={`flex items-center gap-1 rounded-lg border ${config?.border} ${config?.bg} px-2 py-0.5 text-[10px] font-medium ${config?.color}`}
                  >
                    {config?.name}
                    {h.is_verified && <Shield className="h-2.5 w-2.5" />}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leaderboard Rank */}
        {leaderboard && leaderboard.global_rank && (
          <div className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3">
            <Trophy className="h-6 w-6 text-purple-400" />
            <div>
              <p className="text-lg font-bold text-white">
                #{leaderboard.global_rank}
              </p>
              <p className="text-[10px] text-gray-500">Global Rank</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Total Solved"
          value={stats.total_solved}
          color="text-yellow-400"
          bg="bg-yellow-500/10"
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={`${stats.current_streak} days`}
          color="text-orange-400"
          bg="bg-orange-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="This Week"
          value={stats.solved_this_week}
          color="text-green-400"
          bg="bg-green-500/10"
        />
        <StatCard
          icon={Calendar}
          label="This Month"
          value={stats.solved_this_month}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
      </div>

      {/* Activity Heatmap */}
      <ActivityHeatmap data={dailyActivity} />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Solves */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-semibold text-white">Recent Solves</h3>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-gray-400">
              {recentSolves?.length || 0}
            </span>
          </div>
          {recentSolves && recentSolves.length > 0 ? (
            <div className="space-y-2">
              {recentSolves.map((solve, idx) => (
                <RecentSolveRow key={idx} solve={solve} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Target className="mb-2 h-8 w-8 text-gray-700" />
              <p className="text-sm text-gray-500">No recent solves</p>
            </div>
          )}
        </div>

        {/* Badges */}
        <BadgesDisplay badges={badges} compact />
      </div>
    </div>
  );
}
