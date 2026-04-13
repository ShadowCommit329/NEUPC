/**
 * @file Contest History Component
 * @module ContestHistory
 *
 * Displays recent contest participation history with rank progress bar,
 * problem badges, rating changes, and platform information - inspired by clist.by
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Calendar,
  ExternalLink,
  ChevronDown,
  Clock,
  Check,
  X,
  Minus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
} from 'lucide-react';
import { PROBLEM_SOLVING_PLATFORMS } from '@/app/_lib/problem-solving-platforms';

// Platform configurations
const PLATFORM_CONFIG = PROBLEM_SOLVING_PLATFORMS.reduce((acc, platform) => {
  acc[platform.id] = {
    name: platform.name,
    short: platform.ui.short,
    color: platform.ui.color,
    bg: platform.ui.bg,
    border: platform.ui.border,
  };
  return acc;
}, {});

// Get rank percentile color based on performance
function getRankPercentileColor(percentile) {
  if (percentile <= 1) return { bar: 'bg-red-500', text: 'text-red-400' };
  if (percentile <= 5) return { bar: 'bg-orange-500', text: 'text-orange-400' };
  if (percentile <= 10) return { bar: 'bg-amber-500', text: 'text-amber-400' };
  if (percentile <= 25)
    return { bar: 'bg-yellow-500', text: 'text-yellow-400' };
  if (percentile <= 50)
    return { bar: 'bg-emerald-500', text: 'text-emerald-400' };
  if (percentile <= 75) return { bar: 'bg-cyan-500', text: 'text-cyan-400' };
  return { bar: 'bg-blue-500', text: 'text-blue-400' };
}

// Get rating color based on rating value (Codeforces-style)
function getRatingColor(rating) {
  if (!rating) return { color: 'text-gray-400', bg: 'bg-gray-500' };
  if (rating >= 3000) return { color: 'text-red-600', bg: 'bg-red-600' };
  if (rating >= 2600) return { color: 'text-red-500', bg: 'bg-red-500' };
  if (rating >= 2400) return { color: 'text-red-400', bg: 'bg-red-400' };
  if (rating >= 2300) return { color: 'text-orange-400', bg: 'bg-orange-400' };
  if (rating >= 2100) return { color: 'text-orange-500', bg: 'bg-orange-500' };
  if (rating >= 1900) return { color: 'text-violet-400', bg: 'bg-violet-400' };
  if (rating >= 1600) return { color: 'text-blue-400', bg: 'bg-blue-400' };
  if (rating >= 1400) return { color: 'text-cyan-400', bg: 'bg-cyan-400' };
  if (rating >= 1200)
    return { color: 'text-emerald-400', bg: 'bg-emerald-400' };
  return { color: 'text-gray-400', bg: 'bg-gray-400' };
}

// Format time as HH:MM:SS or MM:SS
function formatPenaltyTime(seconds) {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Format duration
function formatDuration(minutes) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Parse numeric values that may arrive as formatted strings (e.g. "12,345").
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return null;

    // Handle values like "123/4567" by taking the first numeric portion.
    if (normalized.includes('/')) {
      const left = normalized.split('/')[0]?.trim();
      const leftParsed = Number(left.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(leftParsed)) return leftParsed;
    }

    // Remove common formatting tokens like commas, #, and text suffixes.
    const numericOnly = normalized.replace(/[^0-9.-]/g, '');
    if (!numericOnly) return null;

    const parsed = Number(numericOnly);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseRankAndTotal(rankValue, totalValue, participantsValue) {
  let rank = toNumber(rankValue);
  let total = toNumber(totalValue) || toNumber(participantsValue);

  if (typeof rankValue === 'string' && rankValue.includes('/')) {
    const [rankPart, totalPart] = rankValue.split('/');
    rank = rank ?? toNumber(rankPart);
    total = total ?? toNumber(totalPart);
  }

  return { rank, total };
}

function hasAttemptInProblemEntry(problem) {
  if (!problem || typeof problem !== 'object') return false;

  if (problem.attempted === true) return true;
  if (problem.solved === true || problem.solvedDuringContest === true) {
    return true;
  }

  if (problem.time !== null && problem.time !== undefined) return true;

  if (Array.isArray(problem.submissions) && problem.submissions.length > 0) {
    return true;
  }

  const result = problem.result;
  if (typeof result === 'string') {
    const normalized = result.trim();
    if (
      normalized &&
      normalized !== '-' &&
      normalized !== '?' &&
      normalized.toLowerCase() !== 'n/a'
    ) {
      return true;
    }
  } else if (typeof result === 'number' && Number.isFinite(result)) {
    return true;
  }

  return false;
}

function hasAttemptInProblemsPayload(value) {
  if (!value) return false;

  let payload = value;
  if (typeof payload === 'string') {
    const raw = payload.trim();
    if (!raw || raw === '[]' || raw === '{}') return false;

    try {
      payload = JSON.parse(raw);
    } catch {
      return false;
    }
  }

  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return false;
    }
  }

  if (Array.isArray(payload)) {
    return payload.some((problem) => hasAttemptInProblemEntry(problem));
  }

  if (payload && typeof payload === 'object') {
    return Object.values(payload).some((problem) =>
      hasAttemptInProblemEntry(problem)
    );
  }

  return false;
}

function isLiveParticipationContest(contest) {
  const attempts = toNumber(
    contest.problemsAttempted ?? contest.problems_attempted
  );
  const hasSolved =
    (contest.solved != null && contest.solved > 0) ||
    (contest.score != null && contest.score > 0);
  const hasAttempt =
    (attempts != null && attempts > 0) ||
    hasAttemptInProblemsPayload(contest.problems ?? contest.problems_data);
  const isVirtual = contest.isVirtual === true || contest.is_virtual === true;
  return !isVirtual && (hasAttempt || hasSolved);
}

function isRatedContest(contest) {
  const ratingChange = contest.ratingChange || 0;
  return contest.isRated !== false && (ratingChange !== 0 || contest.newRating);
}

// Vertical Rank Progress Bar Component (like clist.by)
function RankProgressBar({ rank, total, className = '' }) {
  const safeRank = toNumber(rank);
  const safeTotal = toNumber(total);

  if (!safeRank || !safeTotal || safeTotal <= 0) {
    return (
      <div
        className={`relative ${className}`}
        title="Rank percentile unavailable"
      >
        <div className="relative h-10 w-2.5 overflow-hidden rounded-full bg-white/10" />
      </div>
    );
  }

  const rawPercentile = (safeRank / safeTotal) * 100;
  const percentile = Math.max(0, Math.min(rawPercentile, 100));
  const progressPercent = 100 - percentile; // Inverted for visual (higher = better)
  const colors = getRankPercentileColor(percentile);

  return (
    <div
      className={`group/progress relative ${className}`}
      title={`Top ${percentile.toFixed(1)}% | Rank: ${safeRank} | Total: ${safeTotal.toLocaleString()}`}
    >
      {/* Vertical progress bar container */}
      <div className="relative h-10 w-2.5 overflow-hidden rounded-full bg-white/10">
        {/* Progress fill (from bottom) */}
        <div
          className={`absolute right-0 bottom-0 left-0 ${colors.bar} transition-all duration-300`}
          style={{ height: `${progressPercent}%` }}
        />
      </div>
      {/* Tooltip on hover */}
      <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-[10px] whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover/progress:opacity-100">
        Top {percentile.toFixed(1)}%
      </div>
    </div>
  );
}

// Rating Circle Component (like clist.by)
function RatingCircle({ rating, size = 18 }) {
  if (!rating) return null;

  const colors = getRatingColor(rating);
  // Calculate fill percentage (simplified - max rating ~3500)
  const fillPercent = Math.min((rating / 3500) * 100, 100);

  return (
    <div
      className="group/rating relative inline-flex items-center justify-center"
      title={`Rating: ${rating}`}
    >
      <svg viewBox="-0.5 -0.5 17 17" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx="8"
          cy="8"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className={colors.color}
        />
        {/* Fill from bottom */}
        <clipPath id={`rating-clip-${rating}`}>
          <rect
            x="0"
            y={16 - (16 * fillPercent) / 100}
            width="16"
            height={(16 * fillPercent) / 100}
          />
        </clipPath>
        <circle
          cx="8"
          cy="8"
          r="6.5"
          fill="currentColor"
          className={colors.color}
          clipPath={`url(#rating-clip-${rating})`}
        />
      </svg>
    </div>
  );
}

// Problem Badge Component (clist.by style - solid colored badges)
function ProblemBadge({ problem, index, onProblemClick }) {
  // Check for different solve states
  // Note: solvedDuringContest and upsolve are explicitly set by the enrichment functions
  // If neither is set, we fall back to the generic "solved" state (green)
  const isSolvedDuringContest = problem.solvedDuringContest === true;
  const isUpsolve = problem.upsolve === true;
  const isSolved = problem.solved === true || problem.result?.includes('+');

  // Extract wrong attempts - prioritize wrongAttempts field, fallback to parsing result
  const wrongCount =
    problem.wrongAttempts ||
    (isSolved
      ? Number(problem.result?.match(/\+(\d+)/)?.[1] || 0)
      : Number(problem.result?.match(/-(\d+)/)?.[1] || 0));

  const time = problem.time || problem.solveTime;

  // Attempted = has wrongAttempts OR has result string OR explicitly marked as attempted
  const isAttempted =
    problem.attempted === true ||
    wrongCount > 0 ||
    (problem.result && problem.result.trim() !== '');

  const label = problem.label || problem.index || `Q${index + 1}`;

  // Badge color priority:
  // 1. Solved during contest -> Green
  // 2. Upsolve (solved after contest) -> Yellow/Amber
  // 3. Generic solved (old data without timing) -> Green
  // 4. Attempted but failed -> Red
  // 5. Not attempted -> Gray dashed
  // Use inline styles to ensure colors are applied
  // Colors are chosen to be distinctly different:
  // - Green (#10b981 emerald) = solved during contest
  // - Orange (#f97316) = upsolve (clearly different from green)
  // - Red (#ef4444) = attempted but failed
  // - Gray dashed = not attempted
  let inlineStyle = {};
  if (isSolvedDuringContest) {
    // Bright emerald green for live contest solves
    inlineStyle = {
      backgroundColor: '#10b981',
      color: 'white',
      borderColor: '#059669',
    };
  } else if (isUpsolve) {
    // Yellow for upsolves
    inlineStyle = {
      backgroundColor: '#facc15',
      color: '#1f2937',
      borderColor: '#eab308',
    };
  } else if (isSolved) {
    // Emerald green for generic solved (fallback)
    inlineStyle = {
      backgroundColor: '#10b981',
      color: 'white',
      borderColor: '#059669',
    };
  } else if (isAttempted) {
    // Red for failed attempts
    inlineStyle = {
      backgroundColor: '#ef4444',
      color: 'white',
      borderColor: '#dc2626',
    };
  } else {
    // Gray dashed for not attempted
    inlineStyle = {
      backgroundColor: 'transparent',
      color: '#6b7280',
      borderColor: '#4b5563',
      borderStyle: 'dashed',
    };
  }

  // Handle click - if onProblemClick is provided and problem is solved, navigate to problems tab
  const handleClick = (e) => {
    if (onProblemClick && (isSolved || isSolvedDuringContest || isUpsolve)) {
      e.preventDefault();
      onProblemClick(problem);
    }
    // If not solved or no callback, let the default anchor behavior work (open problem URL)
  };

  return (
    <a
      href={problem.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      style={inlineStyle}
      className={`group/badge relative inline-flex min-w-7 items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-bold transition-all duration-150 hover:scale-110 hover:brightness-110`}
    >
      {label}
      {/* Tooltip with detailed info - positioned above the badge */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2.5 text-left text-[11px] whitespace-nowrap text-white opacity-0 shadow-xl ring-1 ring-white/10 transition-opacity group-hover/badge:opacity-100">
        {/* Problem header */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
          <span className="font-bold">{label}</span>
          {problem.name && (
            <span className="max-w-40 truncate text-gray-400">
              {problem.name}
            </span>
          )}
        </div>
        {/* Status */}
        <div className="mt-1.5 space-y-1">
          {isSolvedDuringContest ? (
            <>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span className="font-semibold">Solved during contest</span>
                <span className="text-gray-400">
                  ({wrongCount > 0 ? `+${wrongCount} wrong` : 'clean'})
                </span>
              </div>
              {time && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="h-3 w-3" />
                  Time: {formatPenaltyTime(time)}
                </div>
              )}
            </>
          ) : isUpsolve ? (
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Check className="h-3.5 w-3.5" />
              <span className="font-semibold">Upsolved</span>
              <span className="text-gray-400">(after contest)</span>
            </div>
          ) : isSolved ? (
            <>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span className="font-semibold">Solved</span>
                <span className="text-gray-400">
                  ({wrongCount > 0 ? `+${wrongCount} wrong` : 'clean'})
                </span>
              </div>
              {time && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="h-3 w-3" />
                  Time: {formatPenaltyTime(time)}
                </div>
              )}
            </>
          ) : isAttempted ? (
            <div className="flex items-center gap-1.5 text-red-400">
              <X className="h-3.5 w-3.5" />
              <span className="font-semibold">Failed</span>
              <span className="text-gray-400">
                ({wrongCount || '?'} wrong attempt{wrongCount !== 1 ? 's' : ''})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Minus className="h-3.5 w-3.5" />
              <span>Not attempted</span>
            </div>
          )}
          {/* Show click hint if solved and callback is provided */}
          {onProblemClick &&
            (isSolved || isSolvedDuringContest || isUpsolve) && (
              <div className="mt-1 border-t border-white/10 pt-1 text-[10px] text-blue-400">
                Click to view in Problems tab
              </div>
            )}
        </div>
      </div>
    </a>
  );
}

// Contest Row Component (clist.by inspired)
function ContestRow({ contest, index, onProblemClick, isHighlighted }) {
  const [expanded, setExpanded] = useState(false);
  const config = PLATFORM_CONFIG[contest.platform] || {};

  const { rank, total: totalParticipants } = parseRankAndTotal(
    contest.rank,
    contest.totalParticipants,
    contest.participants
  );

  const contestDate = new Date(contest.date);
  const formattedDate = contestDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      contestDate.getFullYear() !== new Date().getFullYear()
        ? 'numeric'
        : undefined,
  });
  const formattedTime = contestDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const ratingChange = contest.ratingChange || 0;
  const isRated =
    contest.isRated !== false && (ratingChange !== 0 || contest.newRating);

  // Calculate percentile properly - lower rank is better, so we show "top X%"
  const percentileRaw =
    rank !== null && totalParticipants !== null && totalParticipants > 0
      ? (rank / totalParticipants) * 100
      : null;
  const percentile =
    percentileRaw !== null && Number.isFinite(percentileRaw)
      ? Math.max(0.01, Math.min(percentileRaw, 100))
      : null;
  const hasPercentile = percentile !== null;
  const percentileColors = hasPercentile
    ? getRankPercentileColor(percentile)
    : null;
  const ratingColors = getRatingColor(contest.newRating);

  // Generate problem badges from contest.problems, contest.addition, or contest.solved/totalProblems
  const problems = useMemo(() => {
    const platformCode = contest.platform || contest.platforms?.code;

    // If we have explicit problems array with actual data, use it
    if (
      contest.problems &&
      Array.isArray(contest.problems) &&
      contest.problems.length > 0
    ) {
      return contest.problems;
    }

    // Check if addition field has problem data (from clist API)
    if (contest.addition?.problems) {
      const problemsData = contest.addition.problems;
      if (typeof problemsData === 'object') {
        const extracted = Object.entries(problemsData).map(([key, value]) => {
          const result = value?.result || '';
          const isSolved = result.includes('+') || value?.solved === true;

          // Extract wrong attempts from result string
          // Format: "+2" = solved with 2 wrong attempts
          // Format: "-3" = 3 failed attempts (not solved)
          let wrongAttempts = 0;
          if (isSolved) {
            // Extract from "+2" format
            wrongAttempts = Number(result.match(/\+(\d+)/)?.[1] || 0);
          } else if (result.includes('-')) {
            // Extract from "-3" format
            wrongAttempts = Number(result.match(/-(\d+)/)?.[1] || 0);
          }

          return {
            label: key,
            solved: isSolved,
            // CLIST doesn't provide upsolve info, so mark as solvedDuringContest if solved
            solvedDuringContest: isSolved,
            upsolve: false,
            attempted: result ? true : false,
            time: value?.time,
            wrongAttempts: wrongAttempts,
            result: result, // Keep original result for reference
            url: value?.url || contest.url,
            name: value?.name || value?.short,
          };
        });
        return extracted;
      }
    }

    // PRIORITY: CodeChef fallback - show participation badge when user has rank but no solve data
    // This is checked BEFORE totalProblems placeholder because CodeChef CLIST data often has
    // totalProblems but problems_solved=0 even when user participated and solved problems
    if (platformCode === 'codechef' && contest.rank && contest.rank > 0) {
      // If we have score, estimate problems solved from it (CodeChef score is often problems * 100)
      if (contest.score && contest.score > 0) {
        const estimatedSolved = Math.ceil(contest.score / 100) || 1;
        const totalProblems = contest.totalProblems || estimatedSolved;
        // Show estimated solved problems as green, rest as gray
        return Array.from({ length: totalProblems }, (_, i) => ({
          label: String.fromCharCode(65 + i), // A, B, C, D, E...
          solved: i < estimatedSolved,
          solvedDuringContest: i < estimatedSolved,
          upsolve: false,
          attempted: i < estimatedSolved,
          url: contest.url,
          name: `Problem ${String.fromCharCode(65 + i)}`,
        }));
      }

      // Show a single green badge with problem count indicating participation
      const problemCount = contest.totalProblems || '?';
      return [
        {
          label: `${problemCount}`,
          solved: true,
          solvedDuringContest: true,
          upsolve: false,
          attempted: true,
          url: contest.url,
          name: `Participated (${problemCount} problems)`,
          isParticipationIndicator: true,
        },
      ];
    }

    // Generate placeholder problems if we have totalProblems (for other platforms)
    if (contest.totalProblems && contest.totalProblems > 0) {
      return Array.from({ length: contest.totalProblems }, (_, i) => ({
        label: `Q${i + 1}`,
        solved: i < (contest.solved || 0),
        // For placeholder, assume solved problems were solved during contest
        solvedDuringContest: i < (contest.solved || 0),
        upsolve: false,
        attempted: i < (contest.solved || 0),
        url: contest.url,
      }));
    }

    // If we only have solved count (no totalProblems), generate badges for solved problems only
    if (contest.solved && contest.solved > 0) {
      return Array.from({ length: contest.solved }, (_, i) => ({
        label: `Q${i + 1}`,
        solved: true,
        solvedDuringContest: true,
        upsolve: false,
        attempted: true,
        url: contest.url,
      }));
    }

    return [];
  }, [contest]);

  // Calculate problem statistics
  const problemStats = useMemo(() => {
    const solved = problems.filter(
      (p) => p.solved || p.solvedDuringContest
    ).length;
    const upsolves = problems.filter((p) => p.upsolve).length;
    const attempted = problems.filter(
      (p) => p.attempted && !p.solved && !p.solvedDuringContest
    ).length;
    const total = contest.totalProblems || problems.length;
    const unattempted = Math.max(0, total - solved - attempted);
    const wrongAttempts = problems.reduce(
      (sum, p) => sum + (p.wrongAttempts || 0),
      0
    );

    return { solved, upsolves, attempted, total, unattempted, wrongAttempts };
  }, [problems, contest.totalProblems]);

  const solvedCount = contest.solved ?? problemStats.solved;
  const unsolvedCount = problemStats.total - solvedCount;

  // Get display name for contest - prefer full name, fallback to ID-based name
  const contestDisplayName = useMemo(() => {
    // If name looks like "Contest #12345", try to generate a better name
    if (contest.name?.match(/^Contest #\d+$/)) {
      // Use contestId or external_contest_id if available
      const id = contest.contestId || contest.external_contest_id;
      if (id) {
        // For Codeforces, we can construct a better name
        if (contest.platform === 'codeforces') {
          return `Codeforces Round (ID: ${id})`;
        }
        if (contest.platform === 'atcoder') {
          return `AtCoder Contest (ID: ${id})`;
        }
        // For other platforms, just show the ID more clearly
        return `${config.name || contest.platform} Contest #${id}`;
      }
    }
    return contest.name || 'Unknown Contest';
  }, [
    contest.name,
    contest.contestId,
    contest.external_contest_id,
    contest.platform,
    config.name,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className="group"
    >
      <div
        className={`rounded-xl border transition-all duration-200 ${
          isHighlighted
            ? 'border-amber-500/50 bg-amber-500/10 ring-2 ring-amber-400/30'
            : expanded
              ? 'border-white/10 bg-white/4 shadow-lg shadow-black/10'
              : 'border-white/4 bg-white/2 hover:border-white/8 hover:bg-white/3'
        }`}
      >
        {/* Main Row */}
        <div className="flex items-stretch gap-0">
          {/* Rank Progress Bar (Desktop) */}
          <div className="flex items-center justify-center border-r border-white/4 px-1.5 sm:px-2.5">
            <RankProgressBar rank={rank} total={totalParticipants} />
          </div>

          {/* Rank Column */}
          <div className="flex w-14 shrink-0 flex-col items-center justify-center border-r border-white/4 py-3 sm:w-16">
            <a
              href={contest.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-bold text-gray-400 tabular-nums transition-colors hover:text-blue-400 sm:text-lg"
              title={`Handle: ${contest.handle || 'N/A'}${
                contest.penalty
                  ? `\nPenalty: ${formatPenaltyTime(contest.penalty)}`
                  : ''
              }${hasPercentile ? `\nTop ${percentile.toFixed(1)}%` : ''}`}
            >
              {rank || '—'}
            </a>
            {/* Top percentage - show below rank */}
            {hasPercentile && (
              <span
                className={`mt-0.5 text-[9px] font-semibold tabular-nums ${percentileColors?.text || 'text-gray-500'}`}
                title={`Top ${percentile.toFixed(1)}%`}
              >
                {percentile.toFixed(1)}%
              </span>
            )}
          </div>

          {/* Score Column */}
          <div className="flex w-12 shrink-0 flex-col items-center justify-center border-r border-white/4 py-3 sm:w-14">
            <span className="text-sm font-semibold text-white tabular-nums">
              {contest.score ?? solvedCount}
            </span>
            <span className="text-[9px] text-gray-600">
              {contest.maxScore ? `/${contest.maxScore}` : 'pts'}
            </span>
          </div>

          {/* Rating Column (Desktop) */}
          <div className="hidden w-24 shrink-0 flex-col items-center justify-center border-r border-white/4 py-3 md:flex">
            {isRated ? (
              <div className="flex items-center gap-1.5">
                <RatingCircle rating={contest.newRating} />
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-bold tabular-nums ${ratingColors.color}`}
                  >
                    {contest.newRating || '—'}
                  </span>
                  {ratingChange !== 0 && (
                    <span
                      className={`flex items-center text-[10px] font-semibold tabular-nums ${
                        ratingChange > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {ratingChange > 0 ? (
                        <TrendingUp className="mr-0.5 h-3 w-3" />
                      ) : (
                        <TrendingDown className="mr-0.5 h-3 w-3" />
                      )}
                      {ratingChange > 0 ? '+' : ''}
                      {ratingChange}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-600">Unrated</span>
            )}
          </div>

          {/* Date Column */}
          <div className="hidden w-24 shrink-0 flex-col items-center justify-center border-r border-white/4 py-3 lg:flex">
            <span className="text-xs font-medium text-white">
              {formattedDate}
            </span>
            <span className="text-[10px] text-gray-500">{formattedTime}</span>
          </div>

          {/* Contest Info & Problems Column - clist.by style: title + problems on same line */}
          <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5 sm:px-4">
            {/* Platform + Contest Name + Problems (all inline like clist.by) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {/* Platform icon/badge */}
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${config.bg} ${config.border} border ${config.color}`}
              >
                {config.short}
              </span>

              {/* Contest Name */}
              <a
                href={contest.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link inline-flex items-center gap-1 text-sm font-medium text-white transition-colors duration-200 hover:text-blue-400"
                title={
                  contest.name !== contestDisplayName ? contest.name : undefined
                }
              >
                <span>{contestDisplayName}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
              </a>

              {/* Problem Badges - inline with contest name like clist.by */}
              {problems.length > 0 && (
                <span className="inline-flex flex-wrap items-center gap-1">
                  {problems.map((problem, i) => (
                    <ProblemBadge
                      key={problem.id || problem.label || i}
                      problem={{
                        ...problem,
                        url: problem.url || contest.url,
                        platform: contest.platform,
                      }}
                      index={i}
                      onProblemClick={onProblemClick}
                    />
                  ))}
                </span>
              )}
            </div>

            {/* Mobile: Date + Rating info */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 md:hidden">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </span>
              {isRated && (
                <span
                  className={`flex items-center gap-1 font-semibold ${
                    ratingChange > 0
                      ? 'text-emerald-400'
                      : ratingChange < 0
                        ? 'text-red-400'
                        : 'text-gray-400'
                  }`}
                >
                  {contest.newRating}
                  {ratingChange !== 0 && (
                    <>
                      {ratingChange > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {ratingChange > 0 ? '+' : ''}
                      {ratingChange}
                    </>
                  )}
                </span>
              )}
              {/* Solved/Unsolved summary for mobile */}
              {problems.length > 0 && (
                <span className="flex items-center gap-1.5 text-[10px]">
                  <span className="flex items-center gap-0.5 font-semibold text-emerald-400">
                    <Check className="h-3 w-3" />
                    {solvedCount}
                  </span>
                  <span className="text-gray-600">/</span>
                  <span className="flex items-center gap-0.5 font-semibold text-red-400">
                    <X className="h-3 w-3" />
                    {unsolvedCount}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Mobile Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex shrink-0 items-center justify-center border-l border-white/4 px-3 text-gray-500 transition-colors hover:bg-white/4 hover:text-white md:hidden"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Expanded Details (Mobile) */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/6"
            >
              <div className="space-y-3 p-3">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {/* Rank Percentile */}
                  <div className="flex items-center gap-2 rounded-lg bg-white/3 p-2.5 ring-1 ring-white/4">
                    <RankProgressBar rank={rank} total={totalParticipants} />
                    <div>
                      {hasPercentile ? (
                        <>
                          <div
                            className={`text-sm font-bold ${percentileColors?.text}`}
                          >
                            Top {percentile.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {rank}/{totalParticipants?.toLocaleString()}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-bold text-gray-400">
                            Rank percentile unavailable
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Missing rank/participants data
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  {isRated && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/3 p-2.5 ring-1 ring-white/4">
                      <RatingCircle rating={contest.newRating} size={24} />
                      <div>
                        <div
                          className={`text-sm font-bold ${ratingColors.color}`}
                        >
                          {contest.newRating}
                        </div>
                        <div
                          className={`text-[10px] font-semibold ${
                            ratingChange > 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {ratingChange > 0 ? '+' : ''}
                          {ratingChange}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Solved/Unsolved Summary */}
                  <div className="rounded-lg bg-white/3 p-2.5 ring-1 ring-white/4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-1">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-bold text-emerald-400">
                          {solvedCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <X className="h-4 w-4 text-red-400" />
                        <span className="text-sm font-bold text-red-400">
                          {unsolvedCount}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-center text-[10px] text-gray-500">
                      Solved / Unsolved
                    </div>
                  </div>

                  {/* Duration/Penalty */}
                  {(contest.duration || contest.penalty) && (
                    <div className="rounded-lg bg-white/3 p-2.5 text-center ring-1 ring-white/4">
                      <div className="text-sm font-bold text-white">
                        {contest.penalty
                          ? formatPenaltyTime(contest.penalty)
                          : formatDuration(contest.duration)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {contest.penalty ? 'Penalty' : 'Duration'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Problems Detail - Expanded view */}
                {problems.length > 0 && (
                  <div className="rounded-lg bg-white/3 p-3 ring-1 ring-white/4">
                    <div className="mb-2 text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                      Problems
                    </div>
                    <div className="space-y-1.5">
                      {problems.map((problem, i) => {
                        const isSolved =
                          problem.solved || problem.result?.includes('+');
                        const isAttempted =
                          problem.attempted ||
                          problem.wrongAttempts > 0 ||
                          problem.result?.includes('-');
                        const wrongCount =
                          problem.wrongAttempts ||
                          problem.result?.match(/\+(\d+)/)?.[1] ||
                          0;
                        const time = problem.time || problem.solveTime;
                        const label =
                          problem.label || problem.index || `Q${i + 1}`;

                        return (
                          <a
                            key={i}
                            href={problem.url || contest.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-between rounded-md p-2 transition-colors ${
                              isSolved
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20'
                                : isAttempted
                                  ? 'bg-red-500/10 hover:bg-red-500/20'
                                  : 'bg-white/2 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {/* Status icon */}
                              {isSolved ? (
                                <Check className="h-4 w-4 text-emerald-400" />
                              ) : isAttempted ? (
                                <X className="h-4 w-4 text-red-400" />
                              ) : (
                                <Minus className="h-4 w-4 text-gray-500" />
                              )}
                              {/* Problem label & name */}
                              <span
                                className={`font-semibold ${
                                  isSolved
                                    ? 'text-emerald-400'
                                    : isAttempted
                                      ? 'text-red-400'
                                      : 'text-gray-500'
                                }`}
                              >
                                {label}
                              </span>
                              {problem.name && (
                                <span className="max-w-30 truncate text-xs text-gray-400">
                                  {problem.name}
                                </span>
                              )}
                            </div>
                            {/* Result & Time */}
                            <div className="flex items-center gap-2 text-xs">
                              {isSolved && (
                                <span className="font-semibold text-emerald-400">
                                  {wrongCount > 0 ? `+${wrongCount}` : '+'}
                                </span>
                              )}
                              {isAttempted && !isSolved && (
                                <span className="font-semibold text-red-400">
                                  -{wrongCount || '?'}
                                </span>
                              )}
                              {time && (
                                <span className="text-gray-500">
                                  {formatPenaltyTime(time)}
                                </span>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Summary Stats Cards
function ContestSummary({ contests }) {
  const stats = useMemo(() => {
    if (!contests || contests.length === 0) {
      return {
        total: 0,
        wins: 0,
        avgRank: 0,
        bestRank: 0,
        totalGain: 0,
        avgPercentile: 0,
      };
    }

    const total = contests.length;
    const wins = contests.filter((c) => toNumber(c.rank) === 1).length;
    const rankedContests = contests
      .map((c) => {
        const parsed = parseRankAndTotal(
          c.rank,
          c.totalParticipants,
          c.participants
        );
        return {
          rank: parsed.rank,
          totalParticipants: parsed.total,
        };
      })
      .filter(
        (c) =>
          c.rank !== null &&
          c.totalParticipants !== null &&
          c.totalParticipants > 0
      );
    const avgRank = rankedContests.length
      ? Math.round(
          rankedContests.reduce((sum, c) => sum + c.rank, 0) /
            rankedContests.length
        )
      : 0;
    const bestRank = Math.min(...rankedContests.map((c) => c.rank || Infinity));
    const totalGain = contests.reduce(
      (sum, c) => sum + (c.ratingChange || 0),
      0
    );
    const avgPercentile = rankedContests.length
      ? rankedContests.reduce(
          (sum, c) => sum + (c.rank / c.totalParticipants) * 100,
          0
        ) / rankedContests.length
      : 0;

    return {
      total,
      wins,
      avgRank,
      bestRank: bestRank === Infinity ? 0 : bestRank,
      totalGain,
      avgPercentile,
    };
  }, [contests]);

  const avgPercentileColors = getRankPercentileColor(stats.avgPercentile);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      <div className="rounded-xl bg-white/3 p-3 text-center ring-1 ring-white/4 transition-all duration-200 hover:bg-white/5">
        <div className="text-xl font-bold text-white tabular-nums">
          {stats.total}
        </div>
        <div className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
          Contests
        </div>
      </div>
      <div className="rounded-xl bg-amber-500/8 p-3 text-center ring-1 ring-amber-400/15 transition-all duration-200 hover:bg-amber-500/12">
        <div className="text-xl font-bold text-amber-400 tabular-nums">
          {stats.wins}
        </div>
        <div className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
          Wins
        </div>
      </div>
      <div className="rounded-xl bg-blue-500/8 p-3 text-center ring-1 ring-blue-400/15 transition-all duration-200 hover:bg-blue-500/12">
        <div className="text-xl font-bold text-blue-400 tabular-nums">
          {stats.bestRank ? `#${stats.bestRank}` : '—'}
        </div>
        <div className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
          Best Rank
        </div>
      </div>
      <div className="rounded-xl bg-violet-500/8 p-3 text-center ring-1 ring-violet-400/15 transition-all duration-200 hover:bg-violet-500/12">
        <div className="text-xl font-bold text-violet-400 tabular-nums">
          {stats.avgRank ? `#${stats.avgRank}` : '—'}
        </div>
        <div className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
          Avg Rank
        </div>
      </div>
      <div
        className={`rounded-xl p-3 text-center ring-1 transition-all duration-200 ${
          stats.avgPercentile
            ? `${avgPercentileColors.text.replace('text-', 'bg-')}/8 ring-${avgPercentileColors.text.replace('text-', '')}/15`
            : 'bg-gray-500/8 ring-gray-400/15'
        }`}
      >
        <div
          className={`text-xl font-bold tabular-nums ${avgPercentileColors.text}`}
        >
          {stats.avgPercentile ? `${stats.avgPercentile.toFixed(0)}%` : '—'}
        </div>
        <div className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
          Avg Top %
        </div>
      </div>
      <div
        className={`rounded-xl p-3 text-center ring-1 transition-all duration-200 ${
          stats.totalGain >= 0
            ? 'bg-emerald-500/8 ring-emerald-400/15 hover:bg-emerald-500/12'
            : 'bg-red-500/8 ring-red-400/15 hover:bg-red-500/12'
        }`}
      >
        <div
          className={`text-xl font-bold tabular-nums ${
            stats.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {stats.totalGain >= 0 ? '+' : ''}
          {stats.totalGain}
        </div>
        <div className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
          Rating Δ
        </div>
      </div>
    </div>
  );
}

// Main Contest History Component
export default function ContestHistory({
  contestHistory = [],
  handles: _handles = [],
  compact = false,
  limit: _limit = 10,
  onSync,
  syncing = false,
  onProblemClick,
  highlightContestId = null,
}) {
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [showRatedOnly, setShowRatedOnly] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');

  // Page size options
  const pageSizeOptions = [5, 10, 20, 50, 100];

  // Get base filtered contests (live participation + rated filter applied)
  const baseFilteredContests = useMemo(() => {
    let filtered = contestHistory.filter(isLiveParticipationContest);

    if (showRatedOnly) {
      filtered = filtered.filter(isRatedContest);
    }

    return filtered;
  }, [contestHistory, showRatedOnly]);

  // Get available platforms from filtered contests (respects rated filter)
  const availablePlatforms = useMemo(() => {
    const platformsFromContests = [
      ...new Set(baseFilteredContests.map((c) => c.platform)),
    ];
    // Sort by platform config order or alphabetically
    return platformsFromContests.sort((a, b) => {
      const configA = PLATFORM_CONFIG[a];
      const configB = PLATFORM_CONFIG[b];
      if (configA && configB) {
        return (configA.name || a).localeCompare(configB.name || b);
      }
      return a.localeCompare(b);
    });
  }, [baseFilteredContests]);

  const contestCountByPlatform = useMemo(() => {
    const countMap = {};
    baseFilteredContests.forEach((contest) => {
      countMap[contest.platform] = (countMap[contest.platform] || 0) + 1;
    });
    return countMap;
  }, [baseFilteredContests]);

  // Filter contests (applies platform filter and search on top of base)
  const filteredContests = useMemo(() => {
    let filtered = baseFilteredContests;

    if (selectedPlatform !== 'all') {
      filtered = filtered.filter((c) => c.platform === selectedPlatform);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const contestName = (c.name || c.contestName || '').toLowerCase();
        const contestId = (c.contestId || c.external_contest_id || '')
          .toString()
          .toLowerCase();
        return contestName.includes(query) || contestId.includes(query);
      });
    }

    // Sort by date (most recent first)
    filtered = [...filtered].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return filtered;
  }, [baseFilteredContests, selectedPlatform, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredContests.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayedContests = filteredContests.slice(startIndex, endIndex);

  // Generate page numbers to display (show 7 buttons max with ellipsis)
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 7; // Total page buttons to show

    if (totalPages <= maxButtons) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near start: 1 2 3 4 ... last
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end: 1 ... last-3 last-2 last-1 last
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Middle: 1 ... current-1 current current+1 ... last
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  // Ref for scrolling to highlighted contest
  const highlightedContestRef = useRef(null);

  // When highlightContestId changes, also search for that contest
  useEffect(() => {
    if (highlightContestId) {
      // Find the contest in the full contest history to get its name
      const contest = contestHistory.find(
        (c) => (c.contestId || c.external_contest_id) === highlightContestId
      );
      if (contest) {
        const contestName = contest.name || contest.contestName || '';
        if (contestName) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Highlight navigation intentionally updates local search input.
          setSearchQuery(contestName);
        }
      }
    }
  }, [highlightContestId, contestHistory]);

  // Scroll to highlighted contest when it changes
  useEffect(() => {
    if (highlightContestId && highlightedContestRef.current) {
      // Find the contest and navigate to its page
      const contestIndex = filteredContests.findIndex(
        (c) => (c.contestId || c.external_contest_id) === highlightContestId
      );
      if (contestIndex >= 0) {
        const targetPage = Math.floor(contestIndex / pageSize) + 1;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Highlight navigation intentionally jumps to the page containing the target contest.
        setCurrentPage(targetPage);
        // Scroll after a short delay to allow page change
        setTimeout(() => {
          highlightedContestRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 100);
      }
    }
  }, [highlightContestId, filteredContests, pageSize]);

  // Empty state
  if (!contestHistory || contestHistory.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-white/6 bg-white/2 shadow-lg shadow-black/5"
      >
        <div className="h-0.5 bg-linear-to-r from-amber-500/60 via-orange-500/40 to-transparent" />
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500/20 to-orange-500/10 shadow-lg ring-2 shadow-amber-500/10 ring-amber-400/20">
                <Trophy className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold text-white">Contest History</h3>
            </div>
            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
                />
                {syncing ? 'Syncing...' : 'Sync Contests'}
              </button>
            )}
          </div>
          <div className="flex h-37.5 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/3 ring-1 ring-white/4">
              <Trophy className="h-8 w-8 text-gray-600" />
            </div>
            <p className="text-sm text-gray-400">
              No contest history available
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {onSync
                ? 'Click "Sync Contests" to fetch your contest history'
                : 'Participate in contests to see your history here'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-white/6 bg-white/2 shadow-lg shadow-black/5"
    >
      <div className="h-0.5 bg-linear-to-r from-amber-500/60 via-orange-500/40 to-transparent" />

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500/20 to-orange-500/10 shadow-lg ring-2 shadow-amber-500/10 ring-amber-400/20">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Contest History</h3>
              <span className="text-xs text-gray-500">
                {filteredContests.length} contest
                {filteredContests.length !== 1 ? 's' : ''}
                {availablePlatforms.length > 1 &&
                  ` across ${availablePlatforms.length} platforms`}
              </span>
            </div>
          </div>

          {/* Search + Sync Button + Rated Filter + Platform Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search contests..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 w-40 rounded-lg border border-white/6 bg-white/3 pr-3 pl-8 text-xs text-white placeholder-gray-500 transition-all focus:border-amber-400/30 focus:bg-white/5 focus:ring-1 focus:ring-amber-400/20 focus:outline-none sm:w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Sync Button */}
            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
                />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            )}

            {/* Rated Only Toggle */}
            <button
              onClick={() => {
                setShowRatedOnly(!showRatedOnly);
                setSelectedPlatform('all'); // Reset platform filter when toggling rated
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                showRatedOnly
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-400/30'
                  : 'bg-white/3 text-gray-400 hover:bg-white/5 hover:text-gray-300'
              }`}
              title={
                showRatedOnly
                  ? 'Showing rated contests only'
                  : 'Show all contests'
              }
            >
              {showRatedOnly ? '★ Rated Only' : 'All Types'}
            </button>

            {/* Platform Filter */}
            {availablePlatforms.length > 1 && (
              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/6 bg-white/3 p-1 shadow-sm">
                <button
                  onClick={() => {
                    setSelectedPlatform('all');
                    setCurrentPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 sm:px-3 ${
                    selectedPlatform === 'all'
                      ? 'bg-white/8 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  All
                </button>
                {availablePlatforms.map((platform) => {
                  const config = PLATFORM_CONFIG[platform];
                  const contestCount = contestCountByPlatform[platform] || 0;
                  return (
                    <button
                      key={platform}
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setCurrentPage(1);
                      }}
                      title={`${config?.name || platform}: ${contestCount} contest${contestCount !== 1 ? 's' : ''}`}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 sm:px-3 ${
                        selectedPlatform === platform
                          ? `bg-white/8 ${config?.color || 'text-white'} shadow-sm`
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {config?.short || platform}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {!compact && (
          <div className="mb-4 sm:mb-5">
            <ContestSummary contests={filteredContests} />
          </div>
        )}

        {/* Column Headers (Desktop) */}
        <div className="mb-2 hidden items-center gap-0 text-[10px] font-medium tracking-wider text-gray-500 uppercase md:flex">
          <div className="w-8 text-center">%</div>
          <div className="w-16 text-center">Rank</div>
          <div className="w-14 text-center">Score</div>
          <div className="w-24 text-center">Rating</div>
          <div className="hidden w-24 text-center lg:block">Date</div>
          <div className="flex-1 pl-4">Contest</div>
        </div>

        {/* Contest List */}
        <div className="space-y-1.5">
          {displayedContests.map((contest, index) => {
            const contestId = contest.contestId || contest.external_contest_id;
            const isHighlighted =
              highlightContestId && contestId === highlightContestId;
            return (
              <div
                key={`${contest.platform}-${contestId}-${index}`}
                ref={isHighlighted ? highlightedContestRef : null}
              >
                <ContestRow
                  contest={contest}
                  index={index}
                  onProblemClick={onProblemClick}
                  isHighlighted={isHighlighted}
                />
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            {/* Info text and page size selector */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs text-gray-500">
                Showing {startIndex + 1}-
                {Math.min(endIndex, filteredContests.length)} of{' '}
                {filteredContests.length} contests
              </div>

              {/* Page size selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-white/6 bg-white/3 px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:border-white/10 hover:bg-white/5 focus:border-amber-400/30 focus:bg-amber-500/10 focus:ring-1 focus:ring-amber-400/20 focus:outline-none"
                >
                  {pageSizeOptions.map((size) => (
                    <option
                      key={size}
                      value={size}
                      className="bg-gray-900 text-white"
                    >
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1">
              {/* Previous button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/6 bg-white/3 text-gray-400 transition-all duration-200 hover:border-white/10 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/6 disabled:hover:bg-white/3 disabled:hover:text-gray-400"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((page, idx) => {
                  if (page === 'ellipsis') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="flex h-8 w-8 items-center justify-center text-gray-600"
                      >
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-all duration-200 ${
                        currentPage === page
                          ? 'border-amber-400/30 bg-amber-500/10 text-amber-400 shadow-sm'
                          : 'border-white/6 bg-white/3 text-gray-400 hover:border-white/10 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Next button */}
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/6 bg-white/3 text-gray-400 transition-all duration-200 hover:border-white/10 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/6 disabled:hover:bg-white/3 disabled:hover:text-gray-400"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
