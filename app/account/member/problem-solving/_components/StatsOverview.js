/**
 * @file Stats Overview Component (Redesigned)
 * @module StatsOverview
 *
 * Professional statistics dashboard displaying user's problem solving metrics.
 * Redesigned to eliminate redundancy - each metric shown exactly once.
 *
 * Features:
 * - Compact stats row (4 essential metrics)
 * - Difficulty distribution donut chart
 * - Topic mastery tag cloud with filtering
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Target,
  Flame,
  Zap,
  Tag,
  Loader2,
  Sparkles,
  PieChart,
  ChevronRight,
} from 'lucide-react';
import BadgesDisplay from './BadgesDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getTagStatisticsAction,
  updateMissingTagsAction,
} from '@/app/_lib/problem-solving-actions';

// Difficulty configuration
const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    color: 'text-emerald-400',
    glow: '#10b981',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-400',
    glow: '#f59e0b',
  },
  hard: {
    label: 'Hard',
    color: 'text-orange-400',
    glow: '#f97316',
  },
  expert: {
    label: 'Expert',
    color: 'text-rose-400',
    glow: '#f43f5e',
  },
};

// Tag color palette
const TAG_PALETTE = [
  {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/25',
    glow: '#06b6d4',
  },
  {
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    border: 'border-violet-500/25',
    glow: '#8b5cf6',
  },
  {
    bg: 'bg-pink-500/15',
    text: 'text-pink-400',
    border: 'border-pink-500/25',
    glow: '#ec4899',
  },
  {
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    border: 'border-teal-500/25',
    glow: '#14b8a6',
  },
  {
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/25',
    glow: '#6366f1',
  },
  {
    bg: 'bg-fuchsia-500/15',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/25',
    glow: '#d946ef',
  },
  {
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/25',
    glow: '#0ea5e9',
  },
  {
    bg: 'bg-lime-500/15',
    text: 'text-lime-400',
    border: 'border-lime-500/25',
    glow: '#84cc16',
  },
];

const DEFAULT_STATS = {
  total_solved: 0,
  total_submissions: 0,
  acceptance_rate: 0,
  current_streak: 0,
  longest_streak: 0,
  easy_solved: 0,
  medium_solved: 0,
  hard_solved: 0,
  expert_solved: 0,
  solved_this_week: 0,
  solved_this_month: 0,
  weighted_score: 0,
};

const getErrorMessage = (error, fallbackMessage) => {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallbackMessage;
};

const getTagColor = (tag) => {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_PALETTE[hash % TAG_PALETTE.length];
};

// Animated counter hook
function useAnimatedCounter(end, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }

    let startTime;
    let animationFrame;

    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = easeOutExpo(progress);
      setCount(Math.floor(easedProgress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

// Compact Stat Card Component
function CompactStatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  gradient,
  delay = 0,
}) {
  const animatedValue = useAnimatedCounter(
    typeof value === 'number' ? value : 0
  );
  const displayValue = typeof value === 'number' ? animatedValue : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className="group relative overflow-hidden rounded-xl border border-white/6 bg-white/2 p-4 transition-all duration-300 hover:border-white/12 hover:bg-white/4 hover:shadow-lg sm:rounded-2xl sm:p-5"
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 right-0 left-0 h-0.5 bg-linear-to-r ${gradient}`}
      />

      {/* Gradient background on hover */}
      <div
        className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.08]`}
      />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${gradient} shadow-lg ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="mb-1">
          <span className="text-2xl font-bold text-white tabular-nums sm:text-3xl">
            {displayValue}
          </span>
          {suffix && (
            <span className="ml-1 text-sm text-white/50 sm:text-base">
              {suffix}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-white/60 sm:text-sm">{label}</p>
      </div>
    </motion.div>
  );
}

// Difficulty Distribution Card with Donut Chart
function DifficultyDistributionCard({ statistics }) {
  const stats = useMemo(
    () => ({ ...DEFAULT_STATS, ...(statistics || {}) }),
    [statistics]
  );

  const data = [
    { key: 'easy', value: stats.easy_solved, config: DIFFICULTY_CONFIG.easy },
    {
      key: 'medium',
      value: stats.medium_solved,
      config: DIFFICULTY_CONFIG.medium,
    },
    { key: 'hard', value: stats.hard_solved, config: DIFFICULTY_CONFIG.hard },
    {
      key: 'expert',
      value: stats.expert_solved,
      config: DIFFICULTY_CONFIG.expert,
    },
  ].filter((d) => d.value > 0);

  const total =
    stats.easy_solved +
    stats.medium_solved +
    stats.hard_solved +
    stats.expert_solved;

  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  let currentOffset = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/6 bg-white/2 p-5 shadow-lg shadow-black/5 sm:rounded-3xl sm:p-6"
    >
      {/* Top accent line */}
      <div className="absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl bg-linear-to-r from-blue-500 to-indigo-500 sm:rounded-t-3xl" />

      <div className="mb-5 flex items-center gap-3 sm:mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-500 shadow-lg ring-2 shadow-blue-500/20 ring-blue-400/20 xl:h-11 xl:w-11">
          <PieChart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white xl:text-base">
            Difficulty Distribution
          </h3>
          <p className="text-xs text-gray-500">
            Problems solved by difficulty level
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8 xl:gap-12">
        {/* Donut Chart */}
        <div
          className="relative shrink-0 scale-90 sm:scale-100"
          style={{ width: size, height: size }}
        >
          <svg width={size} height={size} className="-rotate-90">
            {/* Background */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-white/4"
            />
            {/* Segments */}
            {data.map((segment, index) => {
              const percentage = total > 0 ? (segment.value / total) * 100 : 0;
              const dashLength = (percentage / 100) * circumference;
              const dashOffset = currentOffset;
              currentOffset += dashLength;

              return (
                <motion.circle
                  key={segment.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.config.glow}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${dashLength} ${circumference}`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: -dashOffset }}
                  transition={{
                    duration: 1.2,
                    delay: index * 0.15,
                    ease: 'easeOut',
                  }}
                />
              );
            })}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white tabular-nums sm:text-3xl xl:text-4xl">
              {total}
            </span>
            <span className="text-[10px] font-medium text-gray-500 sm:text-xs">
              Total
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 sm:gap-y-3 xl:gap-y-4">
          {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => {
            const count = stats[`${key}_solved`] || 0;
            const percentage =
              total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded-full shadow-lg sm:h-3.5 sm:w-3.5"
                  style={{
                    backgroundColor: config.glow,
                    boxShadow: `0 0 12px ${config.glow}40`,
                  }}
                />
                <span className="w-12 text-xs font-medium text-gray-400 sm:w-14 sm:text-sm xl:w-16 xl:text-base">
                  {config.label}
                </span>
                <span className="text-xs font-bold text-white tabular-nums sm:text-sm xl:text-base">
                  {count}
                </span>
                <span className="text-[10px] text-gray-600 tabular-nums sm:text-xs xl:text-sm">
                  ({percentage}%)
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Topic Mastery Card with Tag Statistics
function TopicMasteryCard({ onTagClick }) {
  const [tagStats, setTagStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchTagStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getTagStatisticsAction();
      if (result.success) {
        setTagStats(result.data?.tag_stats || null);
      } else {
        setError(result.error || 'Failed to load topic statistics');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load topic statistics'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTagStats();
  }, [fetchTagStats]);

  const handleUpdateMissingTags = async () => {
    try {
      setUpdating(true);
      const result = await updateMissingTagsAction(30);
      if (result.success) {
        await fetchTagStats();
      } else {
        setError(result.error || 'Failed to auto-detect tags');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to auto-detect tags'));
    } finally {
      setUpdating(false);
    }
  };

  const handleTagClick = (tag) => onTagClick?.(tag);

  const sortedTags = tagStats
    ? Object.entries(tagStats).sort((a, b) => b[1] - a[1])
    : [];
  const maxCount = sortedTags[0]?.[1] || 1;
  const totalTags = sortedTags.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/6 bg-white/2 p-5 shadow-lg shadow-black/5 sm:rounded-3xl sm:p-6"
    >
      {/* Top accent line */}
      <div className="absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl bg-linear-to-r from-cyan-500 to-teal-500 sm:rounded-t-3xl" />

      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-teal-500 shadow-lg ring-2 shadow-cyan-500/20 ring-cyan-400/20 xl:h-11 xl:w-11">
          <Tag className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white xl:text-base">
            Topic Mastery
          </h3>
          <p className="text-xs text-gray-500">
            Your problem-solving expertise by topic
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 sm:py-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500 sm:h-5 sm:w-5" />
            <span className="text-xs text-gray-500 sm:text-sm">
              Loading topics...
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="py-8 text-center sm:py-12">
          <p className="text-xs text-red-400 sm:text-sm">{error}</p>
          <button
            onClick={fetchTagStats}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 sm:mt-3 sm:text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (!tagStats || totalTags === 0) && (
        <div className="py-10 text-center sm:py-16">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/4 sm:mb-4 sm:h-16 sm:w-16 sm:rounded-2xl">
            <Tag className="h-6 w-6 text-gray-600 sm:h-8 sm:w-8" />
          </div>
          <p className="text-xs text-gray-400 sm:text-sm">
            No tag statistics available yet
          </p>
          <p className="mt-1 text-[10px] text-gray-600 sm:text-xs">
            Sync your submissions to see topic breakdown
          </p>
        </div>
      )}

      {!loading && !error && totalTags > 0 && (
        <div className="space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-[10px] font-semibold text-cyan-400 sm:px-3 sm:py-1.5 sm:text-xs">
                {totalTags} topics
              </span>
              {onTagClick && (
                <span className="hidden text-xs text-gray-500 sm:inline">
                  Click a tag to filter problems
                </span>
              )}
            </div>
            <button
              onClick={handleUpdateMissingTags}
              disabled={updating}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[10px] font-medium text-gray-400 transition-all hover:border-white/20 hover:bg-white/6 hover:text-white disabled:opacity-50 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-xs"
            >
              {updating ? (
                <Loader2 className="h-3 w-3 animate-spin sm:h-3.5 sm:w-3.5" />
              ) : (
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              )}
              Auto-detect tags
            </button>
          </div>

          {/* Tags Cloud */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <AnimatePresence>
              {sortedTags.map(([tag, count], index) => {
                const tagColor = getTagColor(tag);
                const percentage = Math.round((count / maxCount) * 100);

                return (
                  <motion.button
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.015 }}
                    onClick={() => handleTagClick(tag)}
                    className={`group relative flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all duration-200 hover:scale-105 hover:shadow-lg sm:gap-2 sm:rounded-xl sm:px-3.5 sm:py-2 ${tagColor.border} ${tagColor.bg}`}
                    style={{ boxShadow: 'none' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 4px 20px ${tagColor.glow}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span
                      className={`text-[10px] font-medium sm:text-xs ${tagColor.text}`}
                    >
                      {tag}
                    </span>
                    <span
                      className={`rounded-full bg-white/15 px-1.5 py-0.5 text-[8px] font-bold tabular-nums sm:px-2 sm:text-[10px] ${tagColor.text}`}
                    >
                      {count}
                    </span>
                    {/* Progress indicator */}
                    <div
                      className="absolute bottom-0 left-0 h-0.5 rounded-full opacity-50"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: tagColor.glow,
                      }}
                    />
                    {/* Hover arrow */}
                    <ChevronRight
                      className={`hidden h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 sm:block ${tagColor.text}`}
                    />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Export TopicMasteryCard for use in other components
export { TopicMasteryCard };

// Main Stats Overview Component (Redesigned)
export default function StatsOverview({ statistics, badges = [], onTagClick }) {
  const stats = useMemo(
    () => ({ ...DEFAULT_STATS, ...(statistics || {}) }),
    [statistics]
  );

  return (
    <div className="space-y-6">
      {/* Compact Stats Row - 4 essential metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <CompactStatCard
          icon={Trophy}
          label="Problems Solved"
          value={stats.total_solved}
          gradient="from-amber-500 to-orange-600"
          delay={0}
        />
        <CompactStatCard
          icon={Flame}
          label="Current Streak"
          value={stats.current_streak}
          suffix="days"
          gradient="from-rose-500 to-pink-600"
          delay={1}
        />
        <CompactStatCard
          icon={Target}
          label="Acceptance Rate"
          value={Math.round(stats.acceptance_rate)}
          suffix="%"
          gradient="from-emerald-500 to-teal-600"
          delay={2}
        />
        <CompactStatCard
          icon={Zap}
          label="Weighted Score"
          value={Math.round(stats.weighted_score)}
          gradient="from-violet-500 to-purple-600"
          delay={3}
        />
      </div>

      {/* Two Column: Difficulty Distribution + Badges */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DifficultyDistributionCard statistics={statistics} />
        <BadgesDisplay badges={badges} compact />
      </div>
    </div>
  );
}
