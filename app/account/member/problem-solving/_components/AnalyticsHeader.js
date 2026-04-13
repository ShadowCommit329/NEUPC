/**
 * @file Analytics Header Component
 * @module AnalyticsHeader
 *
 * Displays aggregate statistics, solve streak, and progress visualizations
 * at the top of the problem-solving dashboard.
 */

'use client';

import { useMemo } from 'react';
import { Flame, TrendingUp, Target, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Calculate solve streak from daily activity
 */
function calculateStreak(problems) {
  if (!problems || problems.length === 0) return 0;

  // Sort problems by solve date (most recent first)
  const sortedProblems = [...problems].sort(
    (a, b) => new Date(b.first_solved_at) - new Date(a.first_solved_at)
  );

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const problem of sortedProblems) {
    const solveDate = new Date(problem.first_solved_at);
    solveDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate - solveDate) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === streak) {
      streak++;
    } else if (daysDiff > streak) {
      break;
    }
  }

  return streak;
}

/**
 * Get difficulty distribution
 */
function getDifficultyStats(problems) {
  const stats = { easy: 0, medium: 0, hard: 0, expert: 0 };

  problems.forEach((problem) => {
    const tier = problem.difficulty_tier?.toLowerCase() || 'medium';
    if (stats[tier] !== undefined) {
      stats[tier]++;
    } else {
      stats.medium++;
    }
  });

  return stats;
}

/**
 * Get today's solve count
 */
function getTodaySolves(problems) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return problems.filter((problem) => {
    const solveDate = new Date(problem.first_solved_at);
    solveDate.setHours(0, 0, 0, 0);
    return solveDate.getTime() === today.getTime();
  }).length;
}

/**
 * Get last 30 days activity for sparkline
 */
function getLast30DaysActivity(problems) {
  const activity = new Array(30).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  problems.forEach((problem) => {
    const solveDate = new Date(problem.first_solved_at);
    solveDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - solveDate) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 0 && daysDiff < 30) {
      activity[29 - daysDiff]++;
    }
  });

  return activity;
}

/**
 * Sparkline mini chart
 */
function Sparkline({ data }) {
  const max = Math.max(...data, 1);

  return (
    <div className="flex h-8 items-end gap-[2px]">
      {data.map((value, index) => (
        <motion.div
          key={index}
          initial={{ height: 0 }}
          animate={{ height: `${(value / max) * 100}%` }}
          transition={{ delay: index * 0.02, duration: 0.3 }}
          className="flex-1 rounded-sm bg-blue-500/40 transition-colors hover:bg-blue-500/60"
          style={{ minHeight: value > 0 ? '4px' : '2px' }}
          title={`${value} problem${value !== 1 ? 's' : ''}`}
        />
      ))}
    </div>
  );
}

/**
 * Stat card component
 */
function StatCard({ icon: Icon, label, value, color = 'blue', sublabel }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]">
      <div
        className={`rounded-lg bg-${color}-500/10 p-2 text-${color}-400 border border-${color}-500/20`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sublabel && (
          <div className="text-[10px] text-gray-500">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Difficulty bar component
 */
function DifficultyBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-xs text-gray-400">{label}</div>
      <div className="flex-1">
        <div className="relative h-6 overflow-hidden rounded-lg border border-white/[0.04] bg-white/[0.02]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${color}`}
          />
          <div className="absolute inset-0 flex items-center justify-end px-2">
            <span className="text-xs font-medium text-white drop-shadow-lg">
              {count}
            </span>
          </div>
        </div>
      </div>
      <div className="w-12 text-right text-xs text-gray-500">
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
}

export default function AnalyticsHeader({
  problems = [],
  totalCount = 0,
  dailyGoal = 5,
}) {
  const stats = useMemo(() => {
    const streak = calculateStreak(problems);
    const difficulty = getDifficultyStats(problems);
    const todaySolves = getTodaySolves(problems);
    const activity = getLast30DaysActivity(problems);
    const total = totalCount || problems.length;

    return {
      streak,
      total,
      todaySolves,
      difficulty,
      activity,
    };
  }, [problems, totalCount]);

  const goalPercentage = (stats.todaySolves / dailyGoal) * 100;

  return (
    <div className="mb-6 space-y-4">
      {/* Main Stats Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={stats.streak}
          color="orange"
          sublabel={stats.streak > 0 ? 'Keep it up! 🔥' : 'Start today!'}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Solved"
          value={stats.total}
          color="blue"
          sublabel="All time"
        />
        <StatCard
          icon={Target}
          label="Today's Goal"
          value={`${stats.todaySolves}/${dailyGoal}`}
          color="emerald"
          sublabel={`${goalPercentage.toFixed(0)}% complete`}
        />
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="mb-2 text-xs text-gray-400">Last 30 Days</div>
          <Sparkline data={stats.activity} />
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
          <Award className="h-4 w-4" />
          Difficulty Distribution
        </div>
        <div className="space-y-2">
          <DifficultyBar
            label="Easy"
            count={stats.difficulty.easy}
            total={stats.total}
            color="from-emerald-500/60 to-emerald-600/40"
          />
          <DifficultyBar
            label="Medium"
            count={stats.difficulty.medium}
            total={stats.total}
            color="from-amber-500/60 to-amber-600/40"
          />
          <DifficultyBar
            label="Hard"
            count={stats.difficulty.hard}
            total={stats.total}
            color="from-red-500/60 to-red-600/40"
          />
          {stats.difficulty.expert > 0 && (
            <DifficultyBar
              label="Expert"
              count={stats.difficulty.expert}
              total={stats.total}
              color="from-purple-500/60 to-purple-600/40"
            />
          )}
        </div>
      </div>
    </div>
  );
}
