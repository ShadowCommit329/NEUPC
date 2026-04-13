/**
 * @file Compact Problem Card Component
 * @module CompactProblemCard
 *
 * Modern, sleek problem card design with glassmorphism effects.
 * Features smooth animations, clear hierarchy, and intuitive interactions.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Eye,
  Trash2,
  Code2,
  Clock,
  ChevronRight,
  Star,
  CheckCircle,
  Zap,
  Hash,
  Upload,
  Timer,
  HardDrive,
  RotateCcw,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

// Platform configurations
const PLATFORM_CONFIG = {
  codeforces: {
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    glow: 'shadow-blue-500/25',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    code: 'CF',
    name: 'Codeforces',
    icon: '🏆',
  },
  leetcode: {
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    glow: 'shadow-amber-500/25',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    code: 'LC',
    name: 'LeetCode',
    icon: '💡',
  },
  atcoder: {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    glow: 'shadow-emerald-500/25',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    code: 'AT',
    name: 'AtCoder',
    icon: '⚡',
  },
  vjudge: {
    gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
    glow: 'shadow-purple-500/25',
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    code: 'VJ',
    name: 'VJudge',
    icon: '🎯',
  },
  default: {
    gradient: 'from-slate-500 via-slate-600 to-slate-700',
    glow: 'shadow-slate-500/25',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    code: '--',
    name: 'Unknown',
    icon: '📝',
  },
};

// Difficulty configurations with rating ranges and tiers
const getDifficultyConfig = (rating, tier) => {
  // If we have a numerical rating, use the Codeforces-style tiers
  if (rating && typeof rating === 'number') {
    if (rating < 1200) {
      return {
        label: rating.toString(), // or 'Newbie'
        color: 'text-gray-300',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        glow: '',
        gradient: 'from-gray-400 to-gray-500',
      };
    }
    if (rating < 1400) {
      return {
        label: rating.toString(), // or 'Pupil'
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/20',
        gradient: 'from-emerald-400 to-emerald-600',
      };
    }
    if (rating < 1600) {
      return {
        label: rating.toString(), // or 'Specialist'
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        glow: 'shadow-cyan-500/20',
        gradient: 'from-cyan-400 to-cyan-600',
      };
    }
    if (rating < 1900) {
      return {
        label: rating.toString(), // or 'Expert'
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/20',
        gradient: 'from-blue-400 to-blue-600',
      };
    }
    if (rating < 2100) {
      return {
        label: rating.toString(), // or 'CM'
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/30',
        glow: 'shadow-violet-500/20',
        gradient: 'from-violet-400 to-violet-600',
      };
    }
    if (rating < 2400) {
      return {
        label: rating.toString(), // or 'Master'
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/20',
        gradient: 'from-amber-400 to-orange-500',
      };
    }
    return {
      label: rating.toString(), // or 'GM+'
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/30',
      gradient: 'from-red-400 to-rose-600',
    };
  }

  // If no rating, map based on tier (easy, medium, hard)
  const normalizedTier = (tier || '').toLowerCase();
  if (normalizedTier === 'easy' || normalizedTier === 'beginner') {
    return {
      label: 'Easy',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      glow: '',
      gradient: 'from-emerald-400 to-emerald-600',
    };
  }
  if (normalizedTier === 'medium' || normalizedTier === 'intermediate') {
    return {
      label: 'Medium',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      glow: '',
      gradient: 'from-amber-400 to-orange-500',
    };
  }
  if (
    normalizedTier === 'hard' ||
    normalizedTier === 'advanced' ||
    normalizedTier === 'expert'
  ) {
    return {
      label: 'Hard',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/20',
      gradient: 'from-red-400 to-rose-600',
    };
  }

  // Fallback for unrated / no tier
  return {
    label: rating
      ? rating.toString()
      : tier
        ? tier.charAt(0).toUpperCase() + tier.slice(1)
        : 'Unrated',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    glow: '',
    gradient: 'from-gray-500 to-gray-600',
  };
};

// Format relative time with full date option
function formatRelativeTime(date, showFullDate = false) {
  if (!date) return 'Unknown';

  const dateObj = new Date(date);
  const now = new Date();
  const diff = now - dateObj;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  // Format full date as "Jan 15, 2024"
  const fullDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (showFullDate) {
    return fullDate;
  }

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return fullDate; // Show full date for older items
}

// Tag color palette
const TAG_COLORS = [
  'bg-pink-500/15 text-pink-400 border-pink-500/25',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  'bg-violet-500/15 text-violet-400 border-violet-500/25',
  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'bg-rose-500/15 text-rose-400 border-rose-500/25',
  'bg-sky-500/15 text-sky-400 border-sky-500/25',
  'bg-lime-500/15 text-lime-400 border-lime-500/25',
];

const getTagColor = (tagInput) => {
  const tag =
    typeof tagInput === 'string'
      ? tagInput
      : tagInput?.name || tagInput?.code || String(tagInput);
  if (!tag) return TAG_COLORS[0];
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
};

// Format milliseconds to readable time
const formatTime = (ms) => {
  if (!ms) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

// Format kilobytes to readable size
const formatMemory = (kb) => {
  if (!kb) return null;
  if (kb < 1024) return `${kb}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
};

// Verdict badge config
const getVerdictConfig = (verdict) => {
  if (!verdict) return null;
  const v = verdict.toLowerCase();
  if (v === 'accepted' || v === 'ac') {
    return {
      label: 'AC',
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      icon: CheckCircle2,
    };
  }
  if (v.includes('wrong') || v === 'wa') {
    return {
      label: 'WA',
      color: 'text-red-400 bg-red-500/15 border-red-500/30',
      icon: XCircle,
    };
  }
  if (v.includes('time') || v === 'tle') {
    return {
      label: 'TLE',
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      icon: Timer,
    };
  }
  if (v.includes('memory') || v === 'mle') {
    return {
      label: 'MLE',
      color: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
      icon: HardDrive,
    };
  }
  if (v.includes('runtime') || v === 're') {
    return {
      label: 'RE',
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
      icon: AlertCircle,
    };
  }
  return {
    label: verdict.toUpperCase().slice(0, 3),
    color: 'text-gray-400 bg-gray-500/15 border-gray-500/30',
    icon: AlertCircle,
  };
};

/**
 * Main Compact Problem Card Component
 */
export default function CompactProblemCard({
  problem,
  onClick,
  onDelete,
  onViewSolution,
  onUploadSolution,
  isFavorite = false,
  onToggleFavorite,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const platformConfig =
    PLATFORM_CONFIG[problem.platform?.toLowerCase()] || PLATFORM_CONFIG.default;
  const difficultyConfig = getDifficultyConfig(
    problem.difficulty_rating,
    problem.difficulty_tier
  );

  const solutions = Array.isArray(problem.problem_solutions)
    ? problem.problem_solutions
    : [];
  const solutionCount =
    typeof problem.solution_count === 'number'
      ? problem.solution_count
      : solutions.length;
  const hasSolution =
    typeof problem.has_solution === 'boolean'
      ? problem.has_solution
      : solutionCount > 0;
  const isUnsolvedProblem = problem.is_unsolved_problem === true;
  const timelineTimestamp = isUnsolvedProblem
    ? problem.latest_unsolved_submission_at
    : problem.first_solved_at;
  const timelineLabel = isUnsolvedProblem ? 'Latest attempt' : 'First solved';
  // Primary solution first, then first available
  const primarySolution =
    solutions.find((s) => s.is_primary) || solutions[0] || null;
  const verdictConfig = primarySolution
    ? getVerdictConfig(primarySolution.verdict)
    : null;

  // Use tag_details for proper display names, fallback to raw tags
  const tagDetails = problem.tag_details || [];
  const tagList =
    tagDetails.length > 0
      ? tagDetails
      : (problem.tags || []).map((t) => ({ code: t, name: t }));

  const handleCopyId = useCallback(
    (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(problem.problem_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [problem.problem_id]
  );

  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      if (
        confirm(
          `Remove solution for "${problem.problem_name || problem.problem_id}"?`
        )
      ) {
        onDelete(problem);
      }
    },
    [problem, onDelete]
  );

  const handleViewSolution = useCallback(
    (e) => {
      e.stopPropagation();
      if (!hasSolution) return;
      onViewSolution(problem, primarySolution || null);
    },
    [problem, primarySolution, onViewSolution, hasSolution]
  );

  const handleUploadSolution = useCallback(
    (e) => {
      e.stopPropagation();
      if (onUploadSolution) onUploadSolution(problem);
    },
    [problem, onUploadSolution]
  );

  const handleToggleFavorite = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!onToggleFavorite || favoriteLoading) return;
      setFavoriteLoading(true);
      try {
        await onToggleFavorite(problem, !isFavorite);
      } finally {
        setFavoriteLoading(false);
      }
    },
    [problem, isFavorite, onToggleFavorite, favoriteLoading]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(problem)}
      className="group relative cursor-pointer"
    >
      {/* Main Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/6 bg-linear-to-r from-white/2 to-white/1 backdrop-blur-sm transition-all duration-300 ease-out hover:border-white/12 hover:bg-linear-to-r hover:from-white/4 hover:to-white/2 hover:shadow-xl hover:shadow-black/20 ${isHovered ? 'scale-[1.005]' : ''} `}
      >
        {/* Subtle gradient overlay on hover */}
        <div
          className={`absolute inset-0 bg-linear-to-r opacity-0 transition-opacity duration-300 ${platformConfig.gradient} ${isHovered ? 'opacity-[0.03]' : ''} `}
        />

        <div className="relative flex items-start gap-4 px-5 py-4">
          {/* Platform Badge */}
          <div className="relative shrink-0">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${platformConfig.gradient} shadow-lg ${platformConfig.glow} transition-transform duration-300 ${isHovered ? 'scale-105' : ''} `}
            >
              <span className="text-base font-bold tracking-tight text-white">
                {platformConfig.code}
              </span>
            </div>

            {/* Solution indicator dot */}
            {hasSolution && (
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50">
                <CheckCircle className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Problem Name Row */}
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="truncate text-[15px] font-semibold text-gray-100 transition-colors group-hover:text-white"
                title={problem.problem_name || problem.problem_id}
              >
                {problem.problem_name ||
                  problem.problem_id ||
                  'Unnamed Problem'}
              </h3>

              {/* Problem ID Badge with copy */}
              {problem.problem_id && (
                <button
                  onClick={handleCopyId}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] transition-all duration-200 ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/4 text-gray-500 hover:bg-white/8 hover:text-gray-300'
                  } `}
                  title={copied ? 'Copied!' : 'Copy ID'}
                >
                  {copied ? (
                    <CheckCircle className="h-2.5 w-2.5" />
                  ) : (
                    <Hash className="h-2.5 w-2.5" />
                  )}
                  <span>{problem.problem_id}</span>
                </button>
              )}

              {/* Difficulty rating badge (inline, always visible) */}
              {problem.difficulty_rating && (
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums ${difficultyConfig.bg} ${difficultyConfig.color} ${difficultyConfig.border}`}
                >
                  {problem.difficulty_rating}
                </span>
              )}

              {/* Verdict badge from primary solution */}
              {verdictConfig && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${verdictConfig.color}`}
                  title={primarySolution?.verdict}
                >
                  <verdictConfig.icon className="h-2.5 w-2.5" />
                  {verdictConfig.label}
                </span>
              )}

              {/* Language badge */}
              {primarySolution?.language && (
                <span className="rounded-md bg-white/4 px-2 py-0.5 font-mono text-[10px] text-gray-400">
                  {primarySolution.language}
                </span>
              )}

              {/* Problem status badge */}
              {isUnsolvedProblem && (
                <span className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                  <XCircle className="h-2.5 w-2.5" />
                  UNSOLVED
                </span>
              )}
            </div>

            {/* Contest / Solve stats row */}
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {problem.contest_id && (
                <span className="text-[11px] text-gray-500">
                  Contest #{problem.contest_id}
                </span>
              )}
              {/* Solve count */}
              {problem.solve_count > 0 && (
                <span
                  className="flex items-center gap-1 text-[11px] text-gray-500"
                  title="Times solved"
                >
                  <RotateCcw className="h-3 w-3" />
                  {problem.solve_count}x solved
                </span>
              )}
              {/* Attempt count */}
              {problem.attempt_count > 0 && (
                <span
                  className="flex items-center gap-1 text-[11px] text-gray-500"
                  title="Total attempts"
                >
                  <Activity className="h-3 w-3" />
                  {problem.attempt_count} attempts
                </span>
              )}
              {/* Best runtime */}
              {problem.best_time_ms && (
                <span
                  className="flex items-center gap-1 text-[11px] text-gray-500"
                  title="Best runtime"
                >
                  <Timer className="h-3 w-3" />
                  {formatTime(problem.best_time_ms)}
                </span>
              )}
              {/* Best memory */}
              {problem.best_memory_kb && (
                <span
                  className="flex items-center gap-1 text-[11px] text-gray-500"
                  title="Best memory"
                >
                  <HardDrive className="h-3 w-3" />
                  {formatMemory(problem.best_memory_kb)}
                </span>
              )}
              {/* Problem limits */}
              {(problem.time_limit_ms || problem.memory_limit_kb) && (
                <span
                  className="text-[11px] text-gray-600"
                  title="Problem limits"
                >
                  {problem.time_limit_ms
                    ? `${formatTime(problem.time_limit_ms)} limit`
                    : ''}
                  {problem.time_limit_ms && problem.memory_limit_kb
                    ? ' · '
                    : ''}
                  {problem.memory_limit_kb
                    ? `${formatMemory(problem.memory_limit_kb)} mem`
                    : ''}
                </span>
              )}
            </div>

            {/* Tags Row - use tag_details for proper names */}
            {tagList.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {tagList.map((tag, index) => {
                  const tagText = tag.name || tag.code || String(tag);
                  return (
                    <span
                      key={index}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${getTagColor(tagText)} `}
                    >
                      {tagText}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Side Info */}
          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            {/* Difficulty Badge */}
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${difficultyConfig.bg} ${difficultyConfig.border} transition-all duration-300 ${isHovered ? `shadow-lg ${difficultyConfig.glow}` : ''} `}
            >
              <Zap className={`h-3.5 w-3.5 ${difficultyConfig.color}`} />
              <div className="flex flex-col items-end">
                {problem.difficulty_rating && (
                  <span
                    className={`text-sm font-bold tabular-nums ${difficultyConfig.color}`}
                  >
                    {problem.difficulty_rating}
                  </span>
                )}
                <span className="text-[10px] text-gray-500">
                  {difficultyConfig.label}
                </span>
              </div>
            </div>

            {/* Solution Count */}
            {hasSolution && (
              <div
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5"
                title={`${solutionCount} solution${solutionCount > 1 ? 's' : ''}`}
              >
                <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">
                  {solutionCount}
                </span>
              </div>
            )}

            {/* Solve Date */}
            <div
              className="hidden flex-col items-end md:flex"
              title={`${timelineLabel}: ${formatRelativeTime(timelineTimestamp, true)}`}
            >
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {formatRelativeTime(timelineTimestamp)}
                </span>
              </div>
              {timelineTimestamp && (
                <span className="text-[10px] text-gray-600">
                  {formatRelativeTime(timelineTimestamp, true)}
                </span>
              )}
            </div>
          </div>

          {/* Actions (appear on hover) */}
          <div
            className={`flex shrink-0 items-center gap-1 transition-all duration-300 ease-out ${isHovered ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'} `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Favorite Button */}
            {onToggleFavorite && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                  isFavorite
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/4 text-gray-500 hover:bg-amber-500/10 hover:text-amber-400'
                } `}
                title={isFavorite ? 'Remove favorite' : 'Add favorite'}
              >
                {favoriteLoading ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                ) : (
                  <Star
                    className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`}
                  />
                )}
              </motion.button>
            )}

            {/* View Solution */}
            {hasSolution && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleViewSolution}
                className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:bg-blue-500/20"
                title="View solution"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">View</span>
              </motion.button>
            )}

            {/* Upload Solution (when no solution exists) */}
            {!hasSolution && onUploadSolution && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUploadSolution}
                className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 transition-all hover:bg-violet-500/20"
                title="Upload solution"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Upload</span>
              </motion.button>
            )}

            {/* Open Problem */}
            {problem.problem_url && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={problem.problem_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-white/4 px-3 py-1.5 text-xs font-medium text-gray-400 transition-all hover:bg-white/8 hover:text-white"
                onClick={(e) => e.stopPropagation()}
                title="Open problem"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Open</span>
              </motion.a>
            )}

            {/* Delete Solution */}
            {hasSolution && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/4 text-gray-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                title="Delete solution"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </div>

          {/* Chevron indicator */}
          <motion.div
            animate={{
              x: isHovered ? 0 : -8,
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
