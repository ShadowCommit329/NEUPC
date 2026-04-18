/**
 * @file Recent Submissions Component
 * @module RecentSubmissions
 *
 * Displays user's recent problem submissions with verdict,
 * platform, and problem details. Includes proper pagination.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Code2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { PROBLEM_SOLVING_PLATFORMS } from '@/app/_lib/problem-solving-platforms';

// Build platform config dynamically from registry
const PLATFORM_CONFIG = PROBLEM_SOLVING_PLATFORMS.reduce((acc, p) => {
  acc[p.id] = {
    name: p.ui.short || p.name.substring(0, 2).toUpperCase(),
    fullName: p.name,
    color: p.ui.color,
    bg: p.ui.bg,
    border: p.ui.border,
  };
  return acc;
}, {});

// Default config for unknown platforms
const DEFAULT_PLATFORM_CONFIG = {
  name: '??',
  fullName: 'Unknown',
  color: 'text-gray-400',
  bg: 'bg-gray-500/10',
  border: 'border-gray-500/20',
};

function getPlatformConfig(platformId) {
  return PLATFORM_CONFIG[platformId] || DEFAULT_PLATFORM_CONFIG;
}

const VERDICT_CONFIG = {
  accepted: {
    label: 'AC',
    fullLabel: 'Accepted',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    Icon: CheckCircle2,
  },
  wrong_answer: {
    label: 'WA',
    fullLabel: 'Wrong Answer',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    Icon: XCircle,
  },
  time_limit: {
    label: 'TLE',
    fullLabel: 'Time Limit Exceeded',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    Icon: Clock,
  },
  runtime_error: {
    label: 'RE',
    fullLabel: 'Runtime Error',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    Icon: AlertCircle,
  },
  compilation_error: {
    label: 'CE',
    fullLabel: 'Compilation Error',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    Icon: AlertCircle,
  },
  memory_limit: {
    label: 'MLE',
    fullLabel: 'Memory Limit Exceeded',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    Icon: AlertCircle,
  },
  idleness_limit: {
    label: 'ILE',
    fullLabel: 'Idleness Limit Exceeded',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    Icon: AlertCircle,
  },
  hacked: {
    label: 'HACK',
    fullLabel: 'Hacked',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    Icon: XCircle,
  },
  skipped: {
    label: 'SKIP',
    fullLabel: 'Skipped',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    Icon: AlertCircle,
  },
  partial: {
    label: 'PART',
    fullLabel: 'Partial',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    Icon: AlertCircle,
  },
};

function getVerdictConfig(verdict) {
  if (!verdict) return VERDICT_CONFIG.accepted; // Default fallback

  const v = verdict.toUpperCase().trim();

  // Direct match for common short codes
  if (v === 'AC' || v === 'OK') return VERDICT_CONFIG.accepted;
  if (v === 'WA') return VERDICT_CONFIG.wrong_answer;
  if (v === 'TLE') return VERDICT_CONFIG.time_limit;
  if (v === 'RE') return VERDICT_CONFIG.runtime_error;
  if (v === 'CE') return VERDICT_CONFIG.compilation_error;
  if (v === 'MLE') return VERDICT_CONFIG.memory_limit;
  if (v === 'ILE') return VERDICT_CONFIG.idleness_limit;
  if (v === 'HACKED') return VERDICT_CONFIG.hacked;
  if (v === 'SKIPPED') return VERDICT_CONFIG.skipped;
  if (v === 'PARTIAL') return VERDICT_CONFIG.partial;

  // Partial match for longer verdict strings
  const normalized = v.toLowerCase().replace(/[^a-z]/g, '_');

  if (normalized.includes('accept') || normalized === 'ok')
    return VERDICT_CONFIG.accepted;
  if (normalized.includes('wrong')) return VERDICT_CONFIG.wrong_answer;
  if (normalized.includes('time')) return VERDICT_CONFIG.time_limit;
  if (normalized.includes('runtime')) return VERDICT_CONFIG.runtime_error;
  if (normalized.includes('compil')) return VERDICT_CONFIG.compilation_error;
  if (normalized.includes('memory')) return VERDICT_CONFIG.memory_limit;
  if (normalized.includes('idleness')) return VERDICT_CONFIG.idleness_limit;
  if (normalized.includes('hack')) return VERDICT_CONFIG.hacked;
  if (normalized.includes('skip')) return VERDICT_CONFIG.skipped;
  if (normalized.includes('partial')) return VERDICT_CONFIG.partial;

  return {
    label: verdict?.substring(0, 4).toUpperCase() || '?',
    fullLabel: verdict || 'Unknown',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    Icon: AlertCircle,
  };
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Unknown';

  const date = new Date(dateStr);
  const now = new Date();

  // Get start of today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  // Calculate difference in days
  const diffMs = todayStart - dateStart;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If submitted today - show time
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // If within a week - show day name
  if (diffDays >= 1 && diffDays <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // If within a month - show "Xd ago"
  if (diffDays <= 30) {
    return `${diffDays}d ago`;
  }

  // Older than a month - show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function SubmissionRow({ submission, onProblemClick }) {
  const platform = getPlatformConfig(submission.platform);
  const verdict = getVerdictConfig(submission.verdict);
  const VerdictIcon = verdict.Icon;

  const handleClick = (e) => {
    // Don't trigger if clicking the external link
    if (e.target.closest('a')) return;
    if (onProblemClick) {
      onProblemClick({
        problemId: submission.problem_id,
        name: submission.problem_name || submission.problem_id,
        platform: submission.platform,
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex flex-col gap-2 rounded-xl border border-white/6 bg-white/2 px-3 py-2.5 transition-all duration-200 hover:border-white/12 hover:bg-white/4 hover:shadow-sm sm:flex-row sm:items-center sm:gap-3 ${onProblemClick ? 'cursor-pointer' : ''}`}
      title={onProblemClick ? 'Click to view problem details' : undefined}
    >
      {/* Platform badge */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-transform duration-200 group-hover:scale-105 ${platform.border} ${platform.bg}`}
        title={platform.fullName}
      >
        <span className={`text-[10px] font-bold ${platform.color}`}>
          {platform.name}
        </span>
      </div>

      {/* Problem info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm font-medium text-white transition-colors ${onProblemClick ? 'group-hover:text-blue-400' : ''}`}
          >
            {submission.problem_name || submission.problem_id}
          </span>
          {submission.problem_url && (
            <a
              href={submission.problem_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-gray-600 transition-colors hover:text-blue-400"
              title="Open problem on platform"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
          {submission.problem_id && (
            <span className="rounded-md bg-white/6 px-1.5 py-0.5 font-medium">
              {submission.problem_id}
            </span>
          )}
          {submission.language && (
            <span className="flex items-center gap-0.5">
              <Code2 className="h-2.5 w-2.5" />
              {submission.language}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {formatTimeAgo(submission.submitted_at)}
          </span>
        </div>
      </div>

      {/* Verdict */}
      <div
        className={`mt-0.5 flex shrink-0 items-center gap-1.5 rounded-lg border shadow-sm ${verdict.border} ${verdict.bg} px-2 py-1 sm:mt-0 sm:px-2.5 sm:py-1.5`}
        title={verdict.fullLabel}
      >
        <VerdictIcon className={`h-3.5 w-3.5 ${verdict.color}`} />
        <span className={`text-[10px] font-bold ${verdict.color}`}>
          {verdict.label}
        </span>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

export default function RecentSubmissions({
  submissions = [],
  onProblemClick,
  onViewAllProblems,
}) {
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (filter === 'all') return true;

      // Verdict filters
      if (filter === 'accepted') {
        const v = (s.verdict || '').toUpperCase();
        return v === 'AC' || v === 'OK' || v.includes('ACCEPT');
      }
      if (filter === 'wrong_answer') {
        const v = (s.verdict || '').toUpperCase();
        return v === 'WA' || v.includes('WRONG');
      }
      if (filter === 'time_limit') {
        const v = (s.verdict || '').toUpperCase();
        return v === 'TLE' || v.includes('TIME');
      }
      if (filter === 'runtime_error') {
        const v = (s.verdict || '').toUpperCase();
        return v === 'RE' || v.includes('RUNTIME');
      }
      if (filter === 'compilation_error') {
        const v = (s.verdict || '').toUpperCase();
        return v === 'CE' || v.includes('COMPIL');
      }
      if (filter === 'other_errors') {
        const v = (s.verdict || '').toUpperCase();
        return (
          v === 'MLE' ||
          v === 'ILE' ||
          v === 'HACKED' ||
          v === 'SKIPPED' ||
          v === 'PARTIAL' ||
          v.includes('MEMORY') ||
          v.includes('IDLENESS') ||
          v.includes('HACK')
        );
      }

      // Platform filter
      return s.platform === filter;
    });
  }, [submissions, filter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // Get unique platforms for filter
  const platforms = [...new Set(submissions.map((s) => s.platform))];

  // Get verdict counts for filter display
  const verdictCounts = useMemo(() => {
    const counts = { ac: 0, wa: 0, tle: 0, re: 0, ce: 0, other: 0 };
    submissions.forEach((s) => {
      const v = (s.verdict || '').toUpperCase();
      if (v === 'AC' || v === 'OK' || v.includes('ACCEPT')) counts.ac++;
      else if (v === 'WA' || v.includes('WRONG')) counts.wa++;
      else if (v === 'TLE' || v.includes('TIME')) counts.tle++;
      else if (v === 'RE' || v.includes('RUNTIME')) counts.re++;
      else if (v === 'CE' || v.includes('COMPIL')) counts.ce++;
      else counts.other++;
    });
    return counts;
  }, [submissions]);

  // Reset to page 1 when filter changes
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-white/6 bg-white/2 p-4 shadow-lg shadow-black/5 sm:p-5">
      {/* Top accent line */}
      <div className="absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl bg-linear-to-r from-blue-500 to-cyan-500" />

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 shadow-lg ring-2 shadow-blue-500/20 ring-blue-400/20">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Recent Submissions
            </h3>
            <span className="text-[10px] text-gray-500">
              {filteredSubmissions.length} submissions
            </span>
          </div>
        </div>

        {/* Filter dropdown */}
        {submissions.length > 0 && (
          <div className="relative">
            <Filter className="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-gray-500" />
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="min-w-33 appearance-none rounded-xl border border-white/8 bg-[#1a1a1a] py-1.5 pr-7 pl-7 text-[11px] text-white transition-all hover:bg-[#252525] focus:border-white/15 focus:outline-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="all" className="bg-[#1a1a1a] text-white">
                All ({submissions.length})
              </option>
              <optgroup
                label="By Verdict"
                className="bg-[#1a1a1a] text-gray-400"
              >
                <option value="accepted" className="bg-[#1a1a1a] text-white">
                  Accepted ({verdictCounts.ac})
                </option>
                <option
                  value="wrong_answer"
                  className="bg-[#1a1a1a] text-white"
                >
                  Wrong Answer ({verdictCounts.wa})
                </option>
                <option value="time_limit" className="bg-[#1a1a1a] text-white">
                  Time Limit ({verdictCounts.tle})
                </option>
                <option
                  value="runtime_error"
                  className="bg-[#1a1a1a] text-white"
                >
                  Runtime Error ({verdictCounts.re})
                </option>
                <option
                  value="compilation_error"
                  className="bg-[#1a1a1a] text-white"
                >
                  Compilation Error ({verdictCounts.ce})
                </option>
                {verdictCounts.other > 0 && (
                  <option
                    value="other_errors"
                    className="bg-[#1a1a1a] text-white"
                  >
                    Other ({verdictCounts.other})
                  </option>
                )}
              </optgroup>
              {platforms.length > 0 && (
                <optgroup
                  label="By Platform"
                  className="bg-[#1a1a1a] text-gray-400"
                >
                  {platforms.map((p) => (
                    <option
                      key={p}
                      value={p}
                      className="bg-[#1a1a1a] text-white"
                    >
                      {getPlatformConfig(p).fullName || p}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}
      </div>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/4">
            <Clock className="h-7 w-7 text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-400">
            No submissions yet
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            Connect your handles and sync to see your submissions
          </p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-gray-500">No matching submissions</p>
          <button
            onClick={() => handleFilterChange('all')}
            className="mt-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedSubmissions.map((submission, idx) => (
            <SubmissionRow
              key={
                submission.id ||
                `${submission.platform}-${submission.submission_id}-${idx}`
              }
              submission={submission}
              onProblemClick={onProblemClick}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (currentPage > 1) {
                    goToPage(currentPage - 1);
                  }
                }}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/3 px-3 py-1.5 text-[11px] font-medium text-gray-400 transition-all duration-200 hover:border-white/15 hover:bg-white/6 hover:text-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="flex items-center gap-1.5">
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      type="button"
                      key={pageNum}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        goToPage(pageNum);
                      }}
                      className={`h-7 w-7 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-white/12 text-white shadow-sm'
                          : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (currentPage < totalPages) {
                    goToPage(currentPage + 1);
                  } else if (currentPage === totalPages && onViewAllProblems) {
                    // When on last page, clicking Next goes to Problems tab
                    onViewAllProblems();
                  }
                }}
                className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/3 px-3 py-1.5 text-[11px] font-medium text-gray-400 transition-all duration-200 hover:border-white/15 hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  currentPage === totalPages ? 'View all problems' : 'Next page'
                }
              >
                <span className="hidden sm:inline">
                  {currentPage === totalPages ? 'View All' : 'Next'}
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
