/**
 * @file Enhanced Problem Card Component
 * @module EnhancedProblemCard
 *
 * Premium problem card component with comprehensive AI analysis display.
 * Features expert UI/UX design with all scraped data, multiple solutions,
 * approach comparisons, complexity analysis, and AI insights.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Code2,
  ExternalLink,
  Upload,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
  Tag,
  Clock,
  Target,
  FileCode,
  Hash,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Brain,
  Timer,
  HardDrive,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Cpu,
  GitCompare,
  Star,
  Code,
  GitBranch,
  Activity,
  BarChart3,
  Workflow,
  Copy,
  Bookmark,
  Info,
  Shield,
  AlertOctagon,
  Route,
  Flame,
  ArrowRight,
  RotateCcw,
  Maximize2,
  Users,
  User,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommunitySolutions } from '@/app/_hooks/useCommunity';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// Platform configurations with colors and icons
const PLATFORM_CONFIG = {
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
const DIFFICULTY_CONFIG = {
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
const TAG_PALETTE = [
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get consistent color for a tag based on its name
const getTagColor = (tag) => {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_PALETTE[hash % TAG_PALETTE.length];
};

// Format platform name for display
const formatPlatform = (platform) => {
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
const getCodeQualityColor = (quality) => {
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Section Header Component
function SectionHeader({ icon: Icon, title, color = 'blue', badge, action }) {
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
function ComplexityMeter({ label, value, rating }) {
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
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
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
function ApproachCard({
  approach,
  isUserApproach = false,
  isActive = false,
  onClick,
}) {
  const timeRating = getComplexityRating(
    approach.timeComplexity || approach.time_complexity
  );
  const spaceRating = getComplexityRating(
    approach.spaceComplexity || approach.space_complexity
  );

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
        isActive
          ? 'border-blue-500/40 bg-blue-500/10 shadow-lg shadow-blue-500/5'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]'
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
// MAIN COMPONENT
// ============================================================================

export default function EnhancedProblemCard({
  problem,
  onViewSolution,
  onUploadSolution,
  onDeleteSolution,
  onViewDetail,
  onRefresh,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
  const [activeSection, setActiveSection] = useState('overview'); // overview, approaches, insights, quality, community
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalysisError, setReanalysisError] = useState(null);

  const solutions = problem.problem_solutions || [];

  // Fetch community solutions for this problem
  const {
    solutions: communitySolutions,
    stats: communityStats,
    loading: communityLoading,
    error: communityError,
    loadMore: loadMoreCommunity,
    hasMore: hasMoreCommunity,
  } = useCommunitySolutions(
    activeSection === 'community' ? problem.problem_id : null,
    activeSection === 'community' ? problem.platform : null
  );
  const hasSolution = solutions.length > 0;
  const activeSolution = hasSolution ? solutions[activeSolutionIndex] : null;
  const analysisData = activeSolution?.analysis_data;

  const platformConfig =
    PLATFORM_CONFIG[problem.platform] || PLATFORM_CONFIG.default;
  const difficultyConfig = DIFFICULTY_CONFIG[problem.difficulty_tier];

  // Merge tags from problem and solution
  const problemTags = problem.tags || [];
  const solutionTags = activeSolution?.topics || [];
  const analysisTopics = analysisData?.topics || [];
  const allTags = [
    ...new Set([...problemTags, ...solutionTags, ...analysisTopics]),
  ];

  const solvedDate = new Date(problem.first_solved_at);
  const formattedDate = solvedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Extract all available data from analysis
  const userApproach = analysisData?.userApproach;
  const alternativeApproaches = analysisData?.alternativeApproaches || [];
  const keyInsights = analysisData?.keyInsights || [];
  const edgeCases = analysisData?.edgeCases || [];
  const commonMistakes = analysisData?.commonMistakes || [];
  const codeQuality = analysisData?.codeQuality;
  const similarProblems = analysisData?.similarProblems || [];
  const problemSummary = analysisData?.problemSummary || analysisData?.summary;
  const problemDescription = analysisData?.problemDescription;

  // Check if solution needs re-analysis (old format)
  const needsReanalysis = useMemo(() => {
    if (!analysisData) return false;

    // Old format (has 'summary' but not 'problemSummary')
    if (analysisData.summary && !analysisData.problemSummary) return true;

    // Missing new required fields
    if (!analysisData.userApproach || !analysisData.keyInsights) return true;

    // Check if userApproach has proper structure (not the fallback "Unknown" version)
    if (
      analysisData.userApproach?.name === 'Unknown' &&
      analysisData.userApproach?.explanation ===
        'Could not analyze the solution'
    ) {
      return true;
    }

    return false;
  }, [analysisData]);

  // Trigger re-analysis when card is expanded and needs it
  useEffect(() => {
    if (isExpanded && needsReanalysis && activeSolution && !isReanalyzing) {
      handleReanalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, needsReanalysis, activeSolution?.id]);

  // Handle re-analysis (works for both automatic and manual trigger)
  const handleReanalyze = async () => {
    if (!activeSolution || isReanalyzing) return;

    setIsReanalyzing(true);
    setReanalysisError(null);

    try {
      const response = await fetch('/api/problem-solving/solutions/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionId: activeSolution.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Re-analysis failed');
      }

      const result = await response.json();
      console.log('[Re-analysis]', result.message);

      // Refresh the problems list to get updated data
      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }
    } catch (error) {
      console.error('[Re-analysis] Error:', error);
      setReanalysisError(error.message);
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="group relative"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br ${platformConfig.color} shadow-lg shadow-black/5 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.1] hover:shadow-xl hover:shadow-black/10`}
      >
        {/* Top accent line */}
        <div
          className={`h-[2px] bg-gradient-to-r ${
            problem.platform === 'codeforces'
              ? 'from-blue-500/60 via-blue-400/40'
              : problem.platform === 'atcoder'
                ? 'from-emerald-500/60 via-emerald-400/40'
                : problem.platform === 'leetcode'
                  ? 'from-amber-500/60 via-amber-400/40'
                  : problem.platform === 'vjudge'
                    ? 'from-purple-500/60 via-purple-400/40'
                    : 'from-slate-500/60 via-slate-400/40'
          } to-transparent`}
        />

        {/* Subtle glow effect */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />

        <div className="relative p-5">
          {/* ===== HEADER SECTION ===== */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Problem Name */}
              <h3
                className="mb-2.5 cursor-pointer truncate text-lg font-semibold tracking-tight text-white transition-colors hover:text-blue-400"
                onClick={() => onViewDetail(problem)}
              >
                {problem.problem_name || `Problem ${problem.problem_id}`}
              </h3>

              {/* Meta Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Platform Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border ${platformConfig.border} ${platformConfig.bg} px-2.5 py-1 text-xs font-medium ${platformConfig.text} shadow-sm`}
                >
                  <Hash className="h-3 w-3" />
                  {formatPlatform(problem.platform)}
                </span>

                {/* Problem ID Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-gray-400">
                  <Code className="h-3 w-3" />
                  {problem.problem_id}
                </span>

                {/* Difficulty Badge */}
                {difficultyConfig && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border ${difficultyConfig.border} ${difficultyConfig.bg} px-2.5 py-1 text-xs font-medium ${difficultyConfig.color} shadow-sm`}
                  >
                    <Target className="h-3 w-3" />
                    {difficultyConfig.label}
                  </span>
                )}

                {/* Rating Badge */}
                {problem.difficulty_rating && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 shadow-sm">
                    <Zap className="h-3 w-3" />
                    {problem.difficulty_rating}
                  </span>
                )}

                {/* Solutions Count Badge */}
                {solutions.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400 shadow-sm">
                    <FileCode className="h-3 w-3" />
                    {solutions.length}{' '}
                    {solutions.length === 1 ? 'Solution' : 'Solutions'}
                  </span>
                )}

                {/* AI Analyzed Badge */}
                {analysisData && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/10 px-2.5 py-1 text-xs font-medium text-pink-400 shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    AI Analyzed
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {hasSolution ? (
                <>
                  <button
                    onClick={() => onViewSolution(problem, activeSolution)}
                    className="flex h-9 items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-400 shadow-sm transition-all duration-200 hover:border-blue-400/50 hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">View Code</span>
                  </button>
                  <button
                    onClick={() => onDeleteSolution(problem)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 shadow-sm transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/20"
                    title="Delete solution"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onUploadSolution(problem)}
                  className="flex h-9 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-400 shadow-sm transition-all duration-200 hover:border-emerald-400/50 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Solution</span>
                </button>
              )}
            </div>
          </div>

          {/* ===== COMPLEXITY QUICK VIEW ===== */}
          {activeSolution &&
            (activeSolution.time_complexity ||
              activeSolution.space_complexity) && (
              <div className="mb-4 grid gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2">
                {activeSolution.time_complexity && (
                  <ComplexityMeter
                    label="Time Complexity"
                    value={activeSolution.time_complexity}
                    rating={getComplexityRating(activeSolution.time_complexity)}
                  />
                )}
                {activeSolution.space_complexity && (
                  <ComplexityMeter
                    label="Space Complexity"
                    value={activeSolution.space_complexity}
                    rating={getComplexityRating(
                      activeSolution.space_complexity
                    )}
                  />
                )}
              </div>
            )}

          {/* ===== PROBLEM SUMMARY ===== */}
          {problemSummary && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-blue-400">
                  Problem Summary
                </h4>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p
                  className={`text-sm leading-relaxed text-gray-300 ${!isExpanded ? 'line-clamp-3' : ''}`}
                >
                  {problemSummary}
                </p>
                {problemSummary.length > 200 && !isExpanded && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300"
                  >
                    Read more...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===== TAGS SECTION ===== */}
          {allTags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag className="mr-1 h-3.5 w-3.5 text-gray-500" />
                {allTags.slice(0, 8).map((tag) => {
                  const tagColor = getTagColor(tag);
                  return (
                    <span
                      key={tag}
                      className={`inline-flex items-center rounded-md border ${tagColor.border} ${tagColor.bg} px-2 py-0.5 text-[11px] font-medium ${tagColor.text} shadow-sm`}
                    >
                      {tag}
                    </span>
                  );
                })}
                {allTags.length > 8 && (
                  <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    +{allTags.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ===== MULTIPLE SOLUTIONS SELECTOR (TABS/PILLS) ===== */}
          {solutions.length > 1 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-cyan-400">
                  Your Solutions ({solutions.length})
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {solutions.map((sol, idx) => (
                  <button
                    key={sol.id}
                    onClick={() => setActiveSolutionIndex(idx)}
                    className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
                      idx === activeSolutionIndex
                        ? 'border-blue-500/40 bg-blue-500/15 shadow-md shadow-blue-500/10'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]'
                    }`}
                  >
                    <FileCode
                      className={`h-4 w-4 ${idx === activeSolutionIndex ? 'text-blue-400' : 'text-gray-400'}`}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-xs font-medium ${idx === activeSolutionIndex ? 'text-white' : 'text-gray-300'}`}
                      >
                        {sol.language?.split(' ')[0] || `Solution ${idx + 1}`}
                      </span>
                      <div className="flex items-center gap-2 text-[10px]">
                        {sol.time_complexity && (
                          <span className="text-cyan-400">
                            {sol.time_complexity}
                          </span>
                        )}
                        {sol.analysis_data?.codeQuality?.efficiency && (
                          <span
                            className={`rounded px-1 py-0.5 ${getCodeQualityColor(sol.analysis_data.codeQuality.efficiency)}`}
                          >
                            {sol.analysis_data.codeQuality.efficiency}
                          </span>
                        )}
                      </div>
                    </div>
                    {idx === activeSolutionIndex && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== EXPANDABLE DETAILED ANALYSIS ===== */}
          {hasSolution && (
            <div className="mb-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm font-medium text-gray-400 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-pink-400" />
                  <span>
                    {analysisData
                      ? 'View Complete AI Analysis'
                      : 'View Details & Community'}
                  </span>
                  {analysisData && (
                    <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-medium text-pink-400">
                      {
                        [
                          userApproach && 'Approach',
                          alternativeApproaches.length > 0 && 'Alternatives',
                          keyInsights.length > 0 && 'Insights',
                          edgeCases.length > 0 && 'Edge Cases',
                          commonMistakes.length > 0 && 'Mistakes',
                          codeQuality && 'Quality',
                        ].filter(Boolean).length
                      }{' '}
                      sections
                    </span>
                  )}
                  {!analysisData && (
                    <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                      No AI analysis yet
                    </span>
                  )}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-4">
                      {/* Re-analysis status indicator */}
                      {isReanalyzing && (
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                          <div className="flex items-center gap-2 text-sm text-blue-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Updating analysis with AI...</span>
                          </div>
                        </div>
                      )}
                      {reanalysisError && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                          <div className="flex items-center gap-2 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                              Failed to update analysis: {reanalysisError}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Section Navigation Tabs */}
                      <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                        {[
                          {
                            id: 'overview',
                            icon: Info,
                            label: 'Overview',
                            show: true,
                          },
                          {
                            id: 'approaches',
                            icon: Route,
                            label: 'Approaches',
                            show:
                              userApproach || alternativeApproaches.length > 0,
                          },
                          {
                            id: 'insights',
                            icon: Lightbulb,
                            label: 'Insights',
                            show:
                              keyInsights.length > 0 ||
                              edgeCases.length > 0 ||
                              commonMistakes.length > 0,
                          },
                          {
                            id: 'quality',
                            icon: Star,
                            label: 'Code Quality',
                            show: codeQuality,
                          },
                          {
                            id: 'community',
                            icon: Users,
                            label: 'Community',
                            show: true,
                          },
                        ]
                          .filter((tab) => tab.show)
                          .map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveSection(tab.id)}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                                activeSection === tab.id
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
                              }`}
                            >
                              <tab.icon className="h-3.5 w-3.5" />
                              {tab.label}
                            </button>
                          ))}
                      </div>

                      {/* Overview Section */}
                      {activeSection === 'overview' && (
                        <div className="space-y-4">
                          {/* Full Problem Description */}
                          {problemDescription && (
                            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                              <SectionHeader
                                icon={BookOpen}
                                title="Problem Description"
                                color="blue"
                              />
                              <div className="prose prose-invert prose-sm max-w-none">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-300">
                                  {problemDescription.substring(0, 1000)}
                                  {problemDescription.length > 1000 && '...'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Detailed Complexity Analysis */}
                          {(activeSolution?.time_complexity ||
                            activeSolution?.space_complexity) && (
                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                              <SectionHeader
                                icon={Activity}
                                title="Complexity Analysis"
                                color="cyan"
                              />
                              <div className="grid gap-4 sm:grid-cols-2">
                                {activeSolution.time_complexity && (
                                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                    <div className="mb-2 flex items-center gap-2">
                                      <Timer className="h-4 w-4 text-cyan-400" />
                                      <span className="text-xs font-medium text-cyan-400">
                                        Time Complexity
                                      </span>
                                    </div>
                                    <div className="mb-2 flex items-center gap-2">
                                      <span className="font-mono text-lg font-bold text-white">
                                        {activeSolution.time_complexity}
                                      </span>
                                      {getComplexityRating(
                                        activeSolution.time_complexity
                                      ) && (
                                        <span
                                          className={`rounded px-2 py-0.5 text-xs font-medium ${getComplexityRating(activeSolution.time_complexity).class}`}
                                        >
                                          {
                                            getComplexityRating(
                                              activeSolution.time_complexity
                                            ).label
                                          }
                                        </span>
                                      )}
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${getComplexityRating(activeSolution.time_complexity)?.score || 50}%`,
                                        }}
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                      />
                                    </div>
                                  </div>
                                )}
                                {activeSolution.space_complexity && (
                                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                    <div className="mb-2 flex items-center gap-2">
                                      <HardDrive className="h-4 w-4 text-violet-400" />
                                      <span className="text-xs font-medium text-violet-400">
                                        Space Complexity
                                      </span>
                                    </div>
                                    <div className="mb-2 flex items-center gap-2">
                                      <span className="font-mono text-lg font-bold text-white">
                                        {activeSolution.space_complexity}
                                      </span>
                                      {getComplexityRating(
                                        activeSolution.space_complexity
                                      ) && (
                                        <span
                                          className={`rounded px-2 py-0.5 text-xs font-medium ${getComplexityRating(activeSolution.space_complexity).class}`}
                                        >
                                          {
                                            getComplexityRating(
                                              activeSolution.space_complexity
                                            ).label
                                          }
                                        </span>
                                      )}
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${getComplexityRating(activeSolution.space_complexity)?.score || 50}%`,
                                        }}
                                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Similar Problems / Related Topics */}
                          {similarProblems.length > 0 && (
                            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                              <SectionHeader
                                icon={Workflow}
                                title="Related Topics & Learning Path"
                                color="violet"
                                badge={`${similarProblems.length} topics`}
                              />
                              <div className="flex flex-wrap gap-2">
                                {similarProblems.map((topic, idx) => (
                                  <span
                                    key={idx}
                                    className="group inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-all duration-200 hover:border-violet-400/50 hover:bg-violet-500/20"
                                  >
                                    <GitBranch className="h-3 w-3" />
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* No Analysis Data - Show basic solution info */}
                          {!analysisData && activeSolution && (
                            <div className="space-y-4">
                              {/* Basic Solution Info */}
                              <div className="rounded-xl border border-gray-500/20 bg-gray-500/5 p-4">
                                <SectionHeader
                                  icon={FileCode}
                                  title="Solution Information"
                                  color="gray"
                                />
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {activeSolution.language && (
                                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                      <div className="mb-1 text-xs text-gray-500">
                                        Language
                                      </div>
                                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                                        <Code2 className="h-4 w-4 text-blue-400" />
                                        {activeSolution.language}
                                      </div>
                                    </div>
                                  )}
                                  {activeSolution.submission_time && (
                                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                      <div className="mb-1 text-xs text-gray-500">
                                        Submitted
                                      </div>
                                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                                        <Clock className="h-4 w-4 text-emerald-400" />
                                        {new Date(
                                          activeSolution.submission_time
                                        ).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {activeSolution.solution_type && (
                                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                      <div className="mb-1 text-xs text-gray-500">
                                        Source
                                      </div>
                                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                                        {activeSolution.solution_type ===
                                        'auto_fetched' ? (
                                          <>
                                            <Sparkles className="h-4 w-4 text-blue-400" />
                                            Auto-fetched
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="h-4 w-4 text-emerald-400" />
                                            Manually Uploaded
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* No AI Analysis Notice - WIRE UP REQUEST BUTTON */}
                              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                                    <Brain className="h-5 w-5 text-amber-400" />
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="mb-1 text-sm font-semibold text-amber-400">
                                      AI Analysis Not Available
                                    </h5>
                                    <p className="mb-3 text-xs leading-relaxed text-gray-400">
                                      This solution hasn't been analyzed by AI
                                      yet. Analysis includes approach
                                      explanation, complexity breakdown, key
                                      insights, edge cases, and code quality
                                      assessment.
                                    </p>
                                    <button
                                      className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-all duration-200 hover:border-amber-400/50 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={handleReanalyze}
                                      disabled={isReanalyzing}
                                    >
                                      {isReanalyzing ? (
                                        <>
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          Analyzing...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="h-3.5 w-3.5" />
                                          Request AI Analysis
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Approaches Section */}
                      {activeSection === 'approaches' && (
                        <div className="space-y-4">
                          {/* User's Approach */}
                          {userApproach && (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                              <SectionHeader
                                icon={Star}
                                title="Your Solution Approach"
                                color="emerald"
                              />
                              <ApproachCard
                                approach={userApproach}
                                isUserApproach={true}
                                isActive={true}
                              />
                            </div>
                          )}

                          {/* Alternative Approaches */}
                          {alternativeApproaches.length > 0 && (
                            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                              <SectionHeader
                                icon={Route}
                                title="Alternative Approaches"
                                color="violet"
                                badge={`${alternativeApproaches.length} alternatives`}
                              />
                              <div className="grid gap-3 sm:grid-cols-2">
                                {alternativeApproaches.map((approach, idx) => (
                                  <ApproachCard key={idx} approach={approach} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Approach Comparison Table */}
                          {(userApproach ||
                            alternativeApproaches.length > 0) && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                              <SectionHeader
                                icon={GitCompare}
                                title="Complexity Comparison"
                                color="amber"
                              />
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-white/[0.06]">
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                                        Approach
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                                        Time
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                                        Space
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {userApproach && (
                                      <tr className="border-b border-white/[0.04] bg-emerald-500/5">
                                        <td className="px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <Star className="h-3.5 w-3.5 text-emerald-400" />
                                            <span className="font-medium text-white">
                                              {userApproach.name}
                                            </span>
                                            <span className="text-[10px] text-emerald-400">
                                              (Your solution)
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2">
                                          <span className="font-mono text-cyan-400">
                                            {userApproach.timeComplexity ||
                                              activeSolution?.time_complexity ||
                                              '-'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2">
                                          <span className="font-mono text-violet-400">
                                            {userApproach.spaceComplexity ||
                                              activeSolution?.space_complexity ||
                                              '-'}
                                          </span>
                                        </td>
                                      </tr>
                                    )}
                                    {alternativeApproaches.map(
                                      (approach, idx) => (
                                        <tr
                                          key={idx}
                                          className="border-b border-white/[0.04]"
                                        >
                                          <td className="px-3 py-2">
                                            <span className="font-medium text-gray-300">
                                              {approach.name}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="font-mono text-cyan-400">
                                              {approach.timeComplexity || '-'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="font-mono text-violet-400">
                                              {approach.spaceComplexity || '-'}
                                            </span>
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Insights Section */}
                      {activeSection === 'insights' && (
                        <div className="space-y-4">
                          {/* Key Insights */}
                          {keyInsights.length > 0 && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                              <SectionHeader
                                icon={Lightbulb}
                                title="Key Learning Points"
                                color="amber"
                                badge={`${keyInsights.length} insights`}
                              />
                              <ul className="space-y-2">
                                {keyInsights.map((insight, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-3 text-sm text-gray-300"
                                  >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                    <span className="leading-relaxed">
                                      {insight}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Edge Cases */}
                          {edgeCases.length > 0 && (
                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                              <SectionHeader
                                icon={Shield}
                                title="Important Edge Cases"
                                color="cyan"
                                badge={`${edgeCases.length} cases`}
                              />
                              <ul className="space-y-2">
                                {edgeCases.map((edgeCase, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-3 text-sm text-gray-300"
                                  >
                                    <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
                                    <span className="leading-relaxed">
                                      {edgeCase}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Common Mistakes */}
                          {commonMistakes.length > 0 && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                              <SectionHeader
                                icon={AlertTriangle}
                                title="Common Pitfalls to Avoid"
                                color="red"
                                badge={`${commonMistakes.length} mistakes`}
                              />
                              <ul className="space-y-2">
                                {commonMistakes.map((mistake, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-3 text-sm text-gray-300"
                                  >
                                    <Flame className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                    <span className="leading-relaxed">
                                      {mistake}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Code Quality Section */}
                      {activeSection === 'quality' && codeQuality && (
                        <div className="space-y-4">
                          <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4">
                            <SectionHeader
                              icon={Star}
                              title="Code Quality Assessment"
                              color="pink"
                            />

                            {/* Quality Metrics */}
                            <div className="mb-4 grid gap-4 sm:grid-cols-2">
                              {codeQuality.efficiency && (
                                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                                  <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Cpu className="h-4 w-4 text-emerald-400" />
                                      <span className="text-sm font-medium text-white">
                                        Efficiency
                                      </span>
                                    </div>
                                    <span
                                      className={`rounded-lg px-2 py-1 text-xs font-medium ${getCodeQualityColor(codeQuality.efficiency)}`}
                                    >
                                      {codeQuality.efficiency}
                                    </span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{
                                        width:
                                          codeQuality.efficiency === 'optimal'
                                            ? '100%'
                                            : codeQuality.efficiency === 'good'
                                              ? '75%'
                                              : codeQuality.efficiency ===
                                                  'average'
                                                ? '50%'
                                                : codeQuality.efficiency ===
                                                    'suboptimal'
                                                  ? '35%'
                                                  : '25%',
                                      }}
                                      className={`h-full ${
                                        codeQuality.efficiency === 'optimal'
                                          ? 'bg-emerald-400'
                                          : codeQuality.efficiency === 'good'
                                            ? 'bg-blue-400'
                                            : codeQuality.efficiency ===
                                                'average'
                                              ? 'bg-amber-400'
                                              : 'bg-red-400'
                                      }`}
                                    />
                                  </div>
                                </div>
                              )}

                              {codeQuality.readability && (
                                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                                  <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Eye className="h-4 w-4 text-blue-400" />
                                      <span className="text-sm font-medium text-white">
                                        Readability
                                      </span>
                                    </div>
                                    <span
                                      className={`rounded-lg px-2 py-1 text-xs font-medium ${getCodeQualityColor(codeQuality.readability)}`}
                                    >
                                      {codeQuality.readability}
                                    </span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{
                                        width:
                                          codeQuality.readability ===
                                            'optimal' ||
                                          codeQuality.readability === 'good'
                                            ? '85%'
                                            : codeQuality.readability ===
                                                'average'
                                              ? '50%'
                                              : '25%',
                                      }}
                                      className={`h-full ${
                                        codeQuality.readability === 'optimal' ||
                                        codeQuality.readability === 'good'
                                          ? 'bg-blue-400'
                                          : codeQuality.readability ===
                                              'average'
                                            ? 'bg-amber-400'
                                            : 'bg-red-400'
                                      }`}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Improvement Suggestions */}
                            {codeQuality.suggestions?.length > 0 && (
                              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4 text-amber-400" />
                                  <span className="text-sm font-medium text-amber-400">
                                    Suggestions for Improvement
                                  </span>
                                </div>
                                <ul className="space-y-2">
                                  {codeQuality.suggestions.map(
                                    (suggestion, idx) => (
                                      <li
                                        key={idx}
                                        className="flex items-start gap-3 text-sm text-gray-300"
                                      >
                                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                        <span className="leading-relaxed">
                                          {suggestion}
                                        </span>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Community Section */}
                      {activeSection === 'community' && (
                        <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                          {/* Community Header */}
                          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-5 w-5 text-purple-400" />
                              <h4 className="text-base font-semibold text-white">
                                Community Solutions
                              </h4>
                            </div>
                            {communityStats && (
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {communityStats.totalMembers} members
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileCode className="h-3 w-3" />
                                  {communityStats.totalSolutions} solutions
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Loading State */}
                          {communityLoading && (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                            </div>
                          )}

                          {/* Error State */}
                          {communityError && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                              <div className="flex items-center gap-2 text-sm text-red-400">
                                <AlertCircle className="h-4 w-4" />
                                <span>Failed to load community solutions</span>
                              </div>
                            </div>
                          )}

                          {/* No Solutions State */}
                          {!communityLoading &&
                            !communityError &&
                            (!communitySolutions ||
                              communitySolutions.length === 0) && (
                              <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Users className="mb-3 h-12 w-12 text-gray-600" />
                                <p className="text-sm font-medium text-gray-400">
                                  No community solutions yet
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Be the first to share your approach!
                                </p>
                              </div>
                            )}

                          {/* Community Solutions Display */}
                          {!communityLoading &&
                            !communityError &&
                            communitySolutions &&
                            communitySolutions.length > 0 && (
                              <>
                                {/* Approach Statistics */}
                                {communityStats?.approachDistribution && (
                                  <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                      <BarChart3 className="h-4 w-4 text-purple-400" />
                                      <span className="text-sm font-medium text-purple-400">
                                        Popular Approaches
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {Object.entries(
                                        communityStats.approachDistribution
                                      )
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([approach, count]) => {
                                          const percentage = Math.round(
                                            (count /
                                              communityStats.totalSolutions) *
                                              100
                                          );
                                          return (
                                            <div
                                              key={approach}
                                              className="space-y-1"
                                            >
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-gray-300">
                                                  {approach}
                                                </span>
                                                <span className="text-gray-500">
                                                  {count} ({percentage}%)
                                                </span>
                                              </div>
                                              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                                <motion.div
                                                  initial={{ width: 0 }}
                                                  animate={{
                                                    width: `${percentage}%`,
                                                  }}
                                                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}

                                {/* Member Solutions Grid */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-300">
                                      Member Solutions
                                    </span>
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {communitySolutions.map((member) => (
                                      <div
                                        key={member.user_id}
                                        className="group/member rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
                                      >
                                        {/* Member Header */}
                                        <div className="mb-3 flex items-center gap-3">
                                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-sm font-medium text-purple-300">
                                            {member.username?.[0]?.toUpperCase() ||
                                              '?'}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium text-white">
                                              {member.username || 'Anonymous'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {member.solutions.length}{' '}
                                              {member.solutions.length === 1
                                                ? 'solution'
                                                : 'solutions'}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Solutions */}
                                        <div className="space-y-2">
                                          {member.solutions.map((sol, idx) => (
                                            <div
                                              key={idx}
                                              className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3"
                                            >
                                              {/* Approach */}
                                              {sol.approach && (
                                                <div className="mb-2 flex items-start gap-2">
                                                  <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                                                  <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-medium text-gray-400">
                                                      Approach
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-gray-300">
                                                      {sol.approach}
                                                    </div>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Complexity */}
                                              <div className="flex items-center gap-3 text-xs">
                                                {sol.time_complexity && (
                                                  <div className="flex items-center gap-1">
                                                    <Timer className="h-3 w-3 text-emerald-400" />
                                                    <span className="text-gray-500">
                                                      Time:
                                                    </span>
                                                    <span className="font-mono font-medium text-emerald-400">
                                                      {sol.time_complexity}
                                                    </span>
                                                  </div>
                                                )}
                                                {sol.space_complexity && (
                                                  <div className="flex items-center gap-1">
                                                    <HardDrive className="h-3 w-3 text-blue-400" />
                                                    <span className="text-gray-500">
                                                      Space:
                                                    </span>
                                                    <span className="font-mono font-medium text-blue-400">
                                                      {sol.space_complexity}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Language */}
                                              {sol.language && (
                                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                                  <Code2 className="h-3 w-3" />
                                                  {sol.language}
                                                </div>
                                              )}

                                              {/* Submission Time */}
                                              {sol.submission_time && (
                                                <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                                                  <Clock className="h-3 w-3" />
                                                  {new Date(
                                                    sol.submission_time
                                                  ).toLocaleDateString(
                                                    'en-US',
                                                    {
                                                      month: 'short',
                                                      day: 'numeric',
                                                    }
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Load More Button */}
                                {hasMoreCommunity && (
                                  <div className="flex justify-center pt-2">
                                    <button
                                      onClick={loadMoreCommunity}
                                      disabled={communityLoading}
                                      className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 transition-all duration-200 hover:border-purple-400/50 hover:bg-purple-500/20 disabled:opacity-50"
                                    >
                                      {communityLoading ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Loading...
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-4 w-4" />
                                          Load More
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                        </div>
                      )}

                      {/* Analysis Metadata Footer (WORKING RE-ANALYZE BUTTON) */}
                      {analysisData && (
                        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            {analysisData.analyzedBy && (
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-pink-500" />
                                Analyzed by {analysisData.analyzedBy}
                              </span>
                            )}
                            {analysisData.analyzedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(
                                  analysisData.analyzedAt
                                ).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(analysisData, null, 2)
                                )
                              }
                              className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-xs text-gray-500 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-gray-400"
                              title="Copy analysis JSON"
                            >
                              <Copy className="h-3 w-3" />
                              Copy
                            </button>
                            <button
                              onClick={handleReanalyze}
                              disabled={isReanalyzing}
                              className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-xs text-gray-500 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Re-analyze solution"
                            >
                              <RotateCcw
                                className={`h-3 w-3 ${isReanalyzing ? 'animate-spin' : ''}`}
                              />
                              Re-analyze
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ===== FOOTER SECTION ===== */}
          <div className="space-y-3 border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between">
              {/* Left side: Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-medium text-white">
                    {formattedDate}
                  </span>
                </span>
                {problem.attempt_count > 1 && (
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    <span className="font-medium text-amber-400">
                      {problem.attempt_count}
                    </span>{' '}
                    attempts
                  </span>
                )}
                {activeSolution?.language && (
                  <span className="flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5" />
                    <span className="font-medium text-gray-300">
                      {activeSolution.language.split(' ')[0]}
                    </span>
                  </span>
                )}
                {activeSolution?.solution_type && (
                  <span
                    className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${
                      activeSolution.solution_type === 'auto_fetched'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {activeSolution.solution_type === 'auto_fetched'
                      ? 'Auto-fetched'
                      : 'Uploaded'}
                  </span>
                )}
              </div>

              {/* Right side: Actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-gray-500 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-gray-400"
                    title="Bookmark problem"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onViewDetail(problem)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-gray-500 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-gray-400"
                    title="Expand view"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {problem.problem_url && (
                  <a
                    href={problem.problem_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 shadow-sm transition-all duration-200 hover:border-blue-400/50 hover:bg-blue-500/20"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Problem
                  </a>
                )}
              </div>
            </div>

            {/* Solution Progress */}
            {solutions.length > 1 && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Viewing Solution
                  </span>
                  <span className="text-xs font-medium text-white">
                    {activeSolutionIndex + 1} of {solutions.length}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    animate={{
                      width: `${((activeSolutionIndex + 1) / solutions.length) * 100}%`,
                    }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
