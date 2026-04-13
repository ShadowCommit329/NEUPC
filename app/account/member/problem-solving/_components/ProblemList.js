/**
 * @file Problem List Component
 * @module ProblemList
 *
 * Premium problem list with comprehensive information display.
 * Features expert UI/UX design with all scraped data, multiple solutions,
 * approach comparisons, complexity analysis, and AI insights.
 */

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  Code2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Tag,
  Target,
  ArrowUpDown,
  FileCode,
  Hash,
  Timer,
  HardDrive,
  CheckCircle2,
  Star,
  Route,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProblems, useSolution } from '@/app/_hooks/useProblems';
import SolutionModal from './SolutionModal';
import ProblemDetailModal from './ProblemDetailModal';
import AnalyticsHeader from './AnalyticsHeader';
import CompactProblemCard from './CompactProblemCard';
import SmartFilters from './SmartFilters';
import GoalsWidget from './GoalsWidget';

// Platform configurations with colors and icons
const _PLATFORM_CONFIG = {
  codeforces: {
    color: 'from-blue-500/20 to-blue-600/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    accent: 'blue',
  },
  atcoder: {
    color: 'from-emerald-500/20 to-emerald-600/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    accent: 'emerald',
  },
  leetcode: {
    color: 'from-amber-500/20 to-amber-600/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    accent: 'amber',
  },
  vjudge: {
    color: 'from-purple-500/20 to-purple-600/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    accent: 'purple',
  },
  default: {
    color: 'from-slate-500/20 to-slate-600/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    bg: 'bg-slate-500/10',
    accent: 'slate',
  },
};

// Difficulty configurations
const _DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
  },
  hard: {
    label: 'Hard',
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/20',
  },
  expert: {
    label: 'Expert',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
  },
};

// Tag color palette (consistent hashing for same tags)
const _TAG_PALETTE = [
  { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25' },
  { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/25' },
  {
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    border: 'border-violet-500/25',
  },
  { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/25' },
  { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25' },
  { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/25' },
  {
    bg: 'bg-fuchsia-500/15',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/25',
  },
  { bg: 'bg-lime-500/15', text: 'text-lime-400', border: 'border-lime-500/25' },
];

// Get consistent color for a tag based on its name
const _getTagColor = (tag) => {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return _TAG_PALETTE[hash % _TAG_PALETTE.length];
};

// Format platform name for display
const formatPlatform = (platform) => {
  // Handle non-string inputs gracefully
  if (!platform) return 'Unknown';
  if (typeof platform !== 'string') {
    // If it's an object with name or code, use that
    if (platform.name) return platform.name;
    if (platform.code) platform = platform.code;
    else return 'Unknown';
  }

  const names = {
    codeforces: 'Codeforces',
    atcoder: 'AtCoder',
    leetcode: 'LeetCode',
    vjudge: 'VJudge',
    toph: 'Toph',
    cses: 'CSES',
    codechef: 'CodeChef',
    hackerrank: 'HackerRank',
    kattis: 'Kattis',
  };
  return (
    names[platform] || platform.charAt(0).toUpperCase() + platform.slice(1)
  );
};

// Format difficulty for display
const formatDifficulty = (difficulty) => {
  if (!difficulty) return 'Unknown';

  const labels = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    newbie: 'Newbie',
    pupil: 'Pupil',
    specialist: 'Specialist',
    expert: 'Expert',
    candidate_master: 'Candidate Master',
    master: 'Master',
    international_master: 'International Master',
    grandmaster: 'Grandmaster',
    international_grandmaster: 'International Grandmaster',
    legendary_grandmaster: 'Legendary Grandmaster',
  };

  return (
    labels[difficulty.toLowerCase()] ||
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
  );
};

// Get complexity rating and styling
const getComplexityRating = (complexity) => {
  if (!complexity) return null;
  const normalized = complexity.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.includes('o1') || normalized === 'o1') {
    return {
      label: 'Constant',
      class: 'text-emerald-400 bg-emerald-500/15',
      score: 100,
    };
  } else if (normalized.includes('ologn') || normalized.includes('logn')) {
    return {
      label: 'Logarithmic',
      class: 'text-emerald-400 bg-emerald-500/15',
      score: 90,
    };
  } else if (
    normalized.includes('on)') ||
    normalized === 'on' ||
    normalized.includes('linear')
  ) {
    return {
      label: 'Linear',
      class: 'text-blue-400 bg-blue-500/15',
      score: 75,
    };
  } else if (normalized.includes('onlogn') || normalized.includes('nlogn')) {
    return {
      label: 'Linearithmic',
      class: 'text-blue-400 bg-blue-500/15',
      score: 65,
    };
  } else if (
    normalized.includes('on2') ||
    normalized.includes('n2') ||
    normalized.includes('quadratic')
  ) {
    return {
      label: 'Quadratic',
      class: 'text-amber-400 bg-amber-500/15',
      score: 40,
    };
  } else if (
    normalized.includes('on3') ||
    normalized.includes('n3') ||
    normalized.includes('cubic')
  ) {
    return {
      label: 'Cubic',
      class: 'text-orange-400 bg-orange-500/15',
      score: 25,
    };
  } else if (
    normalized.includes('o2n') ||
    normalized.includes('2n') ||
    normalized.includes('exponential')
  ) {
    return {
      label: 'Exponential',
      class: 'text-red-400 bg-red-500/15',
      score: 10,
    };
  }
  return { label: 'Unknown', class: 'text-gray-400 bg-gray-500/15', score: 50 };
};

// Code quality indicator
const _getCodeQualityColor = (quality) => {
  const colors = {
    optimal: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    good: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    average: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    suboptimal: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
    inefficient: 'text-red-400 bg-red-500/15 border-red-500/30',
    poor: 'text-red-400 bg-red-500/15 border-red-500/30',
  };
  return colors[quality?.toLowerCase()] || colors.average;
};

// Section Header Component
function _SectionHeader({ icon: Icon, title, color = 'blue', badge, action }) {
  const colorClasses = {
    blue: {
      icon: 'text-blue-400',
      title: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-400',
    },
    emerald: {
      icon: 'text-emerald-400',
      title: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-400',
    },
    violet: {
      icon: 'text-violet-400',
      title: 'text-violet-400',
      badge: 'bg-violet-500/20 text-violet-400',
    },
    amber: {
      icon: 'text-amber-400',
      title: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-400',
    },
    cyan: {
      icon: 'text-cyan-400',
      title: 'text-cyan-400',
      badge: 'bg-cyan-500/20 text-cyan-400',
    },
    pink: {
      icon: 'text-pink-400',
      title: 'text-pink-400',
      badge: 'bg-pink-500/20 text-pink-400',
    },
    red: {
      icon: 'text-red-400',
      title: 'text-red-400',
      badge: 'bg-red-500/20 text-red-400',
    },
    gray: {
      icon: 'text-gray-400',
      title: 'text-gray-400',
      badge: 'bg-gray-500/20 text-gray-400',
    },
  };
  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${colors.icon}`} />
        <h4 className={`text-sm font-semibold ${colors.title}`}>{title}</h4>
        {badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}
          >
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

// Complexity Meter Component
function _ComplexityMeter({ label, value, rating }) {
  const score = rating?.score || 50;
  return (
    <div className="flex-1">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-white">
            {value}
          </span>
          {rating && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${rating.class}`}
            >
              {rating.label}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${
            score >= 75
              ? 'bg-emerald-400'
              : score >= 50
                ? 'bg-blue-400'
                : score >= 25
                  ? 'bg-amber-400'
                  : 'bg-red-400'
          }`}
        />
      </div>
    </div>
  );
}

// Approach Card Component (for both user and alternative approaches)
function _ApproachCard({
  approach,
  isUserApproach = false,
  isActive = false,
  onClick,
}) {
  const _timeRating = getComplexityRating(
    approach.timeComplexity || approach.time_complexity
  );
  const _spaceRating = getComplexityRating(
    approach.spaceComplexity || approach.space_complexity
  );

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
        isActive
          ? 'border-blue-500/40 bg-blue-500/10 shadow-lg shadow-blue-500/5'
          : 'border-white/6 bg-white/2 hover:border-white/10 hover:bg-white/4'
      }`}
    >
      {/* Approach Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isUserApproach ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20">
              <Star className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/20">
              <Route className="h-3.5 w-3.5 text-violet-400" />
            </div>
          )}
          <div>
            <h5 className="text-sm font-semibold text-white">
              {approach.name || 'Unknown Approach'}
            </h5>
            {isUserApproach && (
              <span className="text-[10px] font-medium text-emerald-400">
                Your Solution
              </span>
            )}
          </div>
        </div>
        {isActive && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
      </div>

      {/* Explanation */}
      {approach.explanation && (
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-gray-400">
          {approach.explanation}
        </p>
      )}

      {/* Why It Works (for user approach) */}
      {isUserApproach && approach.whyItWorks && (
        <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
          <p className="text-xs leading-relaxed text-emerald-300">
            <span className="font-medium">Why it works: </span>
            {approach.whyItWorks}
          </p>
        </div>
      )}

      {/* Tradeoffs (for alternative approaches) */}
      {!isUserApproach && approach.tradeoffs && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
          <p className="text-xs leading-relaxed text-amber-300">
            <span className="font-medium">Trade-offs: </span>
            {approach.tradeoffs}
          </p>
        </div>
      )}

      {/* Complexity Badges */}
      <div className="flex flex-wrap gap-2">
        {(approach.timeComplexity || approach.time_complexity) && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-400">
            <Timer className="h-3 w-3" />
            {approach.timeComplexity || approach.time_complexity}
          </span>
        )}
        {(approach.spaceComplexity || approach.space_complexity) && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-400">
            <HardDrive className="h-3 w-3" />
            {approach.spaceComplexity || approach.space_complexity}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// NOTE: ProblemCard has been extracted to EnhancedProblemCard.js
// Import EnhancedProblemCard if you need the detailed card view with full AI analysis.
// ============================================================================

// Active Filter Chip Component
function FilterChip({ label, value, onRemove }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 py-1 pr-1.5 pl-3 text-xs font-medium text-blue-400 shadow-sm shadow-blue-500/5"
    >
      <span className="text-gray-500">{label}:</span>
      {value}
      <button
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/20 transition-all duration-200 hover:bg-blue-500/30"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  );
}

// Filter Select Component
function FilterSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
}) {
  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-medium tracking-wider text-gray-400 uppercase">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-white/8 bg-[#1a1a1a] pr-10 pl-10 text-sm text-white shadow-sm ring-1 ring-white/2 transition-all duration-200 hover:border-white/12 hover:bg-[#252525] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          style={{ colorScheme: 'dark' }}
        >
          <option value="" className="bg-[#1a1a1a] text-white">
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[#1a1a1a] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronLeft className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 -rotate-90 text-gray-500" />
      </div>
    </div>
  );
}

// Search and Filter Bar Component
function SearchFilterBar({
  filters,
  onFilterChange,
  platforms,
  tags,
  totalCount,
  onTagClear,
  onDateClear,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.platform) count++;
    if (filters.difficulty) count++;
    if (filters.tag) count++;
    if (filters.solvedDate) count++;
    if (filters.problemStatus && filters.problemStatus !== 'solved') count++;
    if (filters.hasCode) count++;
    return count;
  }, [filters]);

  // platforms is an array of {code, name} objects from the API
  const platformOptions = platforms.map((p) => ({
    value: typeof p === 'string' ? p : p.code,
    label:
      typeof p === 'string'
        ? formatPlatform(p)
        : p.name || formatPlatform(p.code),
  }));
  const difficultyOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
    { value: 'newbie', label: 'Newbie (800-1199)' },
    { value: 'pupil', label: 'Pupil (1200-1399)' },
    { value: 'specialist', label: 'Specialist (1400-1599)' },
    { value: 'expert', label: 'Expert (1600-1899)' },
    { value: 'candidate_master', label: 'Candidate Master (1900-2099)' },
    { value: 'master', label: 'Master (2100-2299)' },
    {
      value: 'international_master',
      label: 'International Master (2300-2399)',
    },
    { value: 'grandmaster', label: 'Grandmaster (2400-2599)' },
    {
      value: 'international_grandmaster',
      label: 'International Grandmaster (2600-2999)',
    },
    { value: 'legendary_grandmaster', label: 'Legendary Grandmaster (3000+)' },
  ];
  const tagOptions = tags
    .map((tag) => {
      if (typeof tag === 'string') {
        return { value: tag, label: tag };
      }

      const value = tag?.code || tag?.name;
      if (!value) return null;

      return {
        value,
        label: tag?.name || tag?.code || value,
      };
    })
    .filter(Boolean);

  const selectedTagLabel =
    tagOptions.find((option) => option.value === filters.tag)?.label ||
    filters.tag;
  const solutionOptions = [
    { value: 'true', label: 'With Solution' },
    { value: 'false', label: 'Without Solution' },
  ];
  const problemStatusOptions = [
    { value: 'solved', label: 'Solved' },
    { value: 'unsolved', label: 'Unsolved' },
  ];
  const sortOptions = [
    { value: 'date_desc', label: 'Newest First' },
    { value: 'date_asc', label: 'Oldest First' },
    { value: 'difficulty_asc', label: 'Easiest First' },
    { value: 'difficulty_desc', label: 'Hardest First' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by problem name or tag..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="h-12 w-full rounded-2xl border border-white/8 bg-white/3 pr-4 pl-12 text-sm text-white placeholder-gray-500 shadow-lg shadow-black/5 transition-all duration-200 hover:border-white/12 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 transition-colors duration-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ sortBy: e.target.value })}
            className="h-12 w-full appearance-none rounded-2xl border border-white/8 bg-[#1a1a1a] pr-10 pl-4 text-sm text-white shadow-lg shadow-black/5 transition-all duration-200 hover:border-white/12 hover:bg-[#252525] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 focus:outline-none sm:w-44"
            style={{ colorScheme: 'dark' }}
          >
            {sortOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-[#1a1a1a] text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
          <ArrowUpDown className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex h-12 items-center gap-2 rounded-2xl border px-5 text-sm font-medium shadow-lg shadow-black/5 transition-all duration-200 ${
            showAdvanced || activeFilterCount > 0
              ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-blue-500/5'
              : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/12 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-sm">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-xs font-medium text-gray-500">
              Active filters:
            </span>
            {filters.platform && (
              <FilterChip
                label="Platform"
                value={formatPlatform(filters.platform)}
                onRemove={() => onFilterChange({ platform: '' })}
              />
            )}
            {filters.difficulty && (
              <FilterChip
                label="Difficulty"
                value={formatDifficulty(filters.difficulty)}
                onRemove={() => onFilterChange({ difficulty: '' })}
              />
            )}
            {filters.tag && (
              <FilterChip
                label="Tag"
                value={selectedTagLabel}
                onRemove={() => {
                  onFilterChange({ tag: '' });
                  if (onTagClear) onTagClear();
                }}
              />
            )}
            {filters.solvedDate && (
              <FilterChip
                label="Date"
                value={new Date(
                  `${filters.solvedDate}T00:00:00`
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                onRemove={() => {
                  onFilterChange({ solvedDate: '' });
                  if (onDateClear) onDateClear();
                }}
              />
            )}
            {filters.problemStatus && filters.problemStatus !== 'solved' && (
              <FilterChip
                label="Status"
                value={
                  filters.problemStatus === 'unsolved' ? 'Unsolved' : 'Solved'
                }
                onRemove={() => onFilterChange({ problemStatus: 'solved' })}
              />
            )}
            {filters.hasCode && (
              <FilterChip
                label="Solution"
                value={filters.hasCode === 'true' ? 'With' : 'Without'}
                onRemove={() => onFilterChange({ hasCode: '' })}
              />
            )}
            <button
              onClick={() => {
                onFilterChange({
                  platform: '',
                  difficulty: '',
                  tag: '',
                  solvedDate: '',
                  problemStatus: 'solved',
                  hasCode: '',
                });
                if (onTagClear) onTagClear();
                if (onDateClear) onDateClear();
              }}
              className="text-xs font-medium text-gray-500 transition-colors duration-200 hover:text-white"
            >
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 rounded-2xl border border-white/6 bg-white/2 p-5 shadow-lg shadow-black/5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              <FilterSelect
                label="Platform"
                icon={Hash}
                value={filters.platform}
                onChange={(value) => onFilterChange({ platform: value })}
                options={platformOptions}
                placeholder="All Platforms"
              />
              <FilterSelect
                label="Difficulty"
                icon={Target}
                value={filters.difficulty}
                onChange={(value) => onFilterChange({ difficulty: value })}
                options={difficultyOptions}
                placeholder="All Levels"
              />
              <FilterSelect
                label="Tag"
                icon={Tag}
                value={filters.tag}
                onChange={(value) => onFilterChange({ tag: value })}
                options={tagOptions}
                placeholder="All Tags"
              />
              <FilterSelect
                label="Problem Status"
                icon={CheckCircle2}
                value={filters.problemStatus || 'solved'}
                onChange={(value) =>
                  onFilterChange({ problemStatus: value || 'solved' })
                }
                options={problemStatusOptions}
                placeholder="Solved Problems"
              />
              <FilterSelect
                label="Solution Status"
                icon={FileCode}
                value={filters.hasCode}
                onChange={(value) => onFilterChange({ hasCode: value })}
                options={solutionOptions}
                placeholder="Any Status"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-white">{totalCount}</span>{' '}
          {totalCount === 1 ? 'problem' : 'problems'}
        </p>
      </div>
    </div>
  );
}

// Pagination Component
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  loading,
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/2 px-5 py-4 shadow-lg shadow-black/5">
      <button
        onClick={onPrev}
        disabled={!hasPrev || loading}
        className="flex h-10 items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-4 text-sm font-medium text-gray-400 shadow-sm transition-all duration-200 hover:border-white/12 hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">
          Page <span className="font-semibold text-white">{currentPage}</span>{' '}
          of <span className="font-semibold text-white">{totalPages}</span>
        </span>
        <span className="hidden rounded-lg bg-white/4 px-2 py-0.5 text-xs text-gray-600 sm:inline">
          {totalItems} total
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={!hasNext || loading}
        className="flex h-10 items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-4 text-sm font-medium text-gray-400 shadow-sm transition-all duration-200 hover:border-white/12 hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// Empty State Component
function EmptyState({ hasFilters, onClearFilters }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/6 bg-white/2 py-20 shadow-lg shadow-black/5"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-white/4 to-white/2 shadow-lg ring-1 shadow-black/10 ring-white/6">
        <Code2 className="h-10 w-10 text-gray-600" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">
        {hasFilters ? 'No matching problems' : 'No problems yet'}
      </h3>
      <p className="mb-6 max-w-sm text-center text-sm text-gray-500">
        {hasFilters
          ? "Try adjusting your filters or search query to find what you're looking for."
          : 'Start solving problems on your connected platforms to see them here.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-sm font-medium text-blue-400 shadow-sm shadow-blue-500/5 transition-all duration-200 hover:border-blue-400/50 hover:bg-blue-500/20"
        >
          <X className="h-4 w-4" />
          Clear all filters
        </button>
      )}
    </motion.div>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/6 bg-white/2 py-20 shadow-lg shadow-black/5">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 shadow-lg ring-2 shadow-blue-500/10 ring-blue-400/20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
      <p className="text-sm text-gray-500">Loading problems...</p>
    </div>
  );
}

// Error State Component
function ErrorState({ error, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5 py-20 shadow-lg shadow-red-500/5"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 shadow-lg ring-2 shadow-red-500/10 ring-red-400/20">
        <AlertCircle className="h-10 w-10 text-red-500" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">
        Something went wrong
      </h3>
      <p className="mb-6 max-w-sm text-center text-sm text-red-400">{error}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-400 shadow-sm shadow-red-500/5 transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/20"
      >
        Try again
      </button>
    </motion.div>
  );
}

// Main ProblemList Component
export default function ProblemList({
  initialTag,
  initialDate,
  initialSearch,
  onTagClear,
  onDateClear,
  onSearchClear,
}) {
  const {
    problems,
    loading,
    error,
    metadata,
    filters,
    updateFilters,
    nextPage,
    prevPage,
    refetch,
  } = useProblems({
    ...(initialTag ? { tag: initialTag } : {}),
    ...(initialDate ? { solvedDate: initialDate } : {}),
  });
  const { deleteSolution } = useSolution();

  const [selectedProblem, setSelectedProblem] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [detailProblem, setDetailProblem] = useState(null);
  const [smartFilter, setSmartFilter] = useState(null);
  const [favorites, setFavorites] = useState(new Set());

  // Fetch favorites on mount
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/problem-solving/favorites');
        if (res.ok) {
          const data = await res.json();
          const favSet = new Set(
            data.favorites?.map(
              (f) => `${f.platform.toLowerCase()}-${f.problem_id}`
            ) || []
          );
          setFavorites(favSet);
        }
      } catch (error) {
        console.error('Failed to fetch favorites:', error);
      }
    };
    fetchFavorites();
  }, []);

  // Check if a problem is favorited
  const isProblemFavorite = useCallback(
    (problem) =>
      favorites.has(`${problem.platform.toLowerCase()}-${problem.problem_id}`),
    [favorites]
  );

  // Toggle favorite
  const handleToggleFavorite = async (problem, shouldBeFavorite) => {
    const key = `${problem.platform.toLowerCase()}-${problem.problem_id}`;
    try {
      const method = shouldBeFavorite ? 'POST' : 'DELETE';
      const res = await fetch('/api/problem-solving/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: problem.problem_id,
          platform: problem.platform,
        }),
      });
      if (res.ok) {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (shouldBeFavorite) {
            next.add(key);
          } else {
            next.delete(key);
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Filter problems based on smart filter
  const filteredProblems = useMemo(() => {
    // First, add is_favorite property to problems
    const problemsWithFavorites = problems.map((p) => ({
      ...p,
      is_favorite: isProblemFavorite(p),
    }));

    if (!smartFilter) return problemsWithFavorites;

    const now = new Date();

    return problemsWithFavorites.filter((problem) => {
      const solveDate = new Date(problem.first_solved_at);
      const daysDiff = Math.floor((now - solveDate) / (1000 * 60 * 60 * 24));

      switch (smartFilter) {
        case 'recent':
          return daysDiff <= 7;
        case 'needs-review':
          return daysDiff > 30;
        case 'struggled':
          // Problems with more than 1 attempt before solving
          return (problem.attempt_count || 0) > 1;
        case 'favorites':
          return problem.is_favorite;
        default:
          return true;
      }
    });
  }, [problems, smartFilter, isProblemFavorite]);

  useEffect(() => {
    if (initialTag && filters.tag !== initialTag) {
      updateFilters({ tag: initialTag });
    }
  }, [initialTag, filters.tag, updateFilters]);

  useEffect(() => {
    if (initialDate && filters.solvedDate !== initialDate) {
      updateFilters({ solvedDate: initialDate });
    }
  }, [initialDate, filters.solvedDate, updateFilters]);

  // Handle initialSearch prop - for navigation from Contest History problem badges
  useEffect(() => {
    if (initialSearch && filters.search !== initialSearch) {
      // Extract just the problem name from "platform:name" format
      const searchTerm = initialSearch.includes(':')
        ? initialSearch.split(':').slice(1).join(':')
        : initialSearch;
      updateFilters({ search: searchTerm });
    }
  }, [initialSearch, filters.search, updateFilters]);

  const handleViewDetail = (problem) => {
    setDetailProblem(problem);
  };

  const getSolutionCode = (solution) => {
    if (!solution) return '';
    return (
      solution.source_code ||
      solution.sourceCode ||
      solution.code ||
      solution.submission?.source_code ||
      solution.submissions?.source_code ||
      ''
    );
  };

  const handleViewSolution = async (problem, solution) => {
    try {
      let resolvedSolution = solution;
      let resolvedCode = getSolutionCode(resolvedSolution);

      // Fallback: fetch from API when list payload is missing solution details/code
      if (
        (!resolvedSolution || !resolvedCode) &&
        problem?.problem_id &&
        problem?.platform
      ) {
        const params = new URLSearchParams({
          problemId: problem.problem_id,
          platform: problem.platform,
        });
        const response = await fetch(
          `/api/problem-solving/solutions?${params}`
        );

        if (response.ok) {
          const data = await response.json();
          const candidates = [
            data?.solution,
            ...(Array.isArray(data?.solutions) ? data.solutions : []).filter(
              Boolean
            ),
          ].filter(Boolean);

          resolvedSolution =
            candidates.find((s) => {
              const code = getSolutionCode(s);
              return typeof code === 'string' && code.trim().length > 0;
            }) ||
            candidates[0] ||
            null;

          resolvedCode = getSolutionCode(resolvedSolution);
        }
      }

      if (!resolvedSolution) {
        alert('Solution details could not be loaded for this problem.');
        return;
      }

      setSelectedProblem({ ...problem, solution: resolvedSolution });
      setModalMode('view');
    } catch {
      alert('Failed to load solution details. Please try again.');
    }
  };

  const handleUploadSolution = (problem) => {
    setSelectedProblem({ ...problem });
    setModalMode('upload');
  };

  const handleDeleteSolution = async (problem) => {
    if (!confirm('Are you sure you want to delete this solution?')) return;

    try {
      await deleteSolution(problem.problem_id, problem.platform);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseModal = () => {
    setSelectedProblem(null);
    setModalMode(null);
    refetch();
  };

  const handleClearFilters = () => {
    updateFilters({
      search: '',
      platform: '',
      difficulty: '',
      tag: '',
      solvedDate: '',
      problemStatus: 'solved',
      hasCode: '',
    });
    if (onTagClear) onTagClear();
    if (onDateClear) onDateClear();
    if (onSearchClear) onSearchClear();
  };

  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(metadata.total / filters.limit);
  const hasNextPage = filters.offset + filters.limit < metadata.total;
  const hasPrevPage = filters.offset > 0;

  const hasActiveFilters =
    filters.search ||
    filters.platform ||
    filters.difficulty ||
    filters.tag ||
    filters.solvedDate ||
    filters.problemStatus === 'unsolved' ||
    filters.hasCode;

  if (loading && problems.length === 0) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }
  return (
    <div className="space-y-6">
      {/* Analytics Header with Goals Widget */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <AnalyticsHeader
            problems={problems}
            totalCount={metadata.total}
            dailyGoal={5}
          />
        </div>
        <div className="lg:col-span-1">
          <GoalsWidget problems={problems} />
        </div>
      </div>

      {/* Search and Filter Bar */}
      <SearchFilterBar
        filters={filters}
        onFilterChange={updateFilters}
        platforms={metadata.platforms || []}
        tags={metadata.tags || []}
        totalCount={metadata.total}
        onTagClear={onTagClear}
        onDateClear={onDateClear}
      />

      {/* Smart Filters */}
      <SmartFilters
        problems={problems}
        activeFilter={smartFilter}
        onFilterChange={setSmartFilter}
      />

      {filteredProblems.length === 0 ? (
        <EmptyState
          hasFilters={hasActiveFilters || smartFilter}
          onClearFilters={() => {
            handleClearFilters();
            setSmartFilter(null);
          }}
        />
      ) : (
        <>
          <motion.div layout className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredProblems.map((problem) => (
                <CompactProblemCard
                  key={`${problem.platform}-${problem.problem_id}`}
                  problem={problem}
                  onClick={handleViewDetail}
                  onDelete={handleDeleteSolution}
                  onViewSolution={handleViewSolution}
                  onUploadSolution={handleUploadSolution}
                  isFavorite={problem.is_favorite}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={metadata.total}
              onPrev={prevPage}
              onNext={nextPage}
              hasPrev={hasPrevPage}
              hasNext={hasNextPage}
              loading={loading}
            />
          )}
        </>
      )}

      {selectedProblem && (
        <SolutionModal
          problem={selectedProblem}
          mode={modalMode}
          onClose={handleCloseModal}
        />
      )}

      {detailProblem && (
        <ProblemDetailModal
          problem={detailProblem}
          onClose={() => setDetailProblem(null)}
        />
      )}
    </div>
  );
}
