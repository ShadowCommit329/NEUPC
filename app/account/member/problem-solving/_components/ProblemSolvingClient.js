/**
 * @file Problem Solving Client Component
 * @module ProblemSolvingClient
 *
 * Main client component for the problem solving tracking page.
 * Features a modern, professional UI with dashboard-style layout,
 * smooth animations, and intuitive navigation.
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  BarChart3,
  Users,
  AlertCircle,
  CheckCircle2,
  Code2,
  Target,
  Info,
  X,
  ChevronRight,
  Activity,
} from 'lucide-react';
import {
  useProblemSolving,
  useConnectHandle,
} from '@/app/_hooks/useProblemSolving';
import StatsOverview, { TopicMasteryCard } from './StatsOverview';
import PlatformAccounts from './PlatformAccounts';
import RatingChart from './RatingChart';
import ContestHistory from './ContestHistory';
import ActivityHeatmap from './ActivityHeatmap';
import RecentSubmissions from './RecentSubmissions';
import Leaderboard from './Leaderboard';
import ProblemList from './ProblemList';
import SyncModal from './SyncModal';
import ExtensionGuide from './ExtensionGuide';
import RecommendedProblems from './RecommendedProblems';

// Tab configuration with enhanced metadata
const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: 'Statistics & Progress',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'problems',
    label: 'Problems',
    icon: Code2,
    description: 'Solved Problems',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'recommended',
    label: 'Recommended',
    icon: Target,
    description: 'AI Suggestions',
    gradient: 'from-violet-500 to-blue-500',
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    icon: Users,
    description: 'Rankings',
    gradient: 'from-pink-500 to-rose-500',
  },
];

const TOAST_DURATION_MS = 4000;

const DEFAULT_PROBLEM_SOLVING_DATA = {
  handles: [],
  statistics: null,
  recentSubmissions: [],
  recentSolves: [],
  recentSolutions: [],
  dailyActivity: [],
  badges: [],
  leaderboard: null,
  ratingHistory: [],
  contestHistory: [],
};

const getErrorMessage = (error, fallbackMessage) => {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallbackMessage;
};

// Page Header Component with Hero Section - Fully Responsive
function PageHeader({ onSync, syncing }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-slate-900/90 via-slate-800/50 to-slate-900/70 shadow-2xl shadow-black/20 backdrop-blur-xl sm:rounded-3xl">
      {/* Animated background elements - scaled for different screens */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-blue-500/8 blur-3xl sm:-top-28 sm:-right-28 sm:h-72 sm:w-72" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-500/8 blur-3xl sm:-bottom-20 sm:-left-20 sm:h-56 sm:w-56" />
        <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/4 blur-2xl sm:h-36 sm:w-36" />
        {/* Additional decorative element for wider screens */}
        <div className="absolute top-0 right-1/4 hidden h-48 w-48 rounded-full bg-emerald-500/4 blur-3xl xl:block" />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
        {/* Top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative px-5 py-6 sm:px-7 sm:py-7 md:px-8 md:py-8 lg:px-10 lg:py-9 xl:px-12 2xl:px-14">
        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          {/* Title & Description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
              <div className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 shadow-lg ring-1 shadow-blue-500/25 ring-white/10 transition-all duration-300 hover:shadow-blue-500/40 sm:h-14 sm:w-14 sm:rounded-2xl lg:h-14 lg:w-14 xl:h-16 xl:w-16">
                <Activity className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110 sm:h-7 sm:w-7 xl:h-8 xl:w-8" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-3xl lg:text-4xl">
                  Problem Solving
                </h1>
                <p className="mt-0.5 truncate text-sm text-gray-400 sm:text-base lg:text-base xl:text-lg">
                  Track your Competitive Programming journey
                </p>
              </div>
            </div>
          </div>

          {/* Sync Button */}
          <div className="flex shrink-0">
            <button
              onClick={onSync}
              disabled={syncing}
              className="group relative flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-blue-500/30 bg-linear-to-r from-blue-500/20 to-cyan-500/10 px-6 py-3.5 shadow-lg shadow-blue-500/10 transition-all duration-200 hover:border-blue-500/50 hover:from-blue-500/30 hover:to-cyan-500/20 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:gap-3 sm:rounded-2xl sm:px-7 sm:py-4 md:px-8"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 shadow-md shadow-blue-500/30 transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11">
                <RefreshCw
                  className={`h-5 w-5 text-white sm:h-6 sm:w-6 ${syncing ? 'animate-spin' : ''}`}
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-blue-300 sm:text-base">
                  Sync All Platforms
                </p>
                <p className="hidden text-xs text-gray-500 md:block">
                  Update submissions & ratings
                </p>
              </div>
              <ChevronRight className="hidden h-5 w-5 text-blue-400 transition-transform duration-200 group-hover:translate-x-0.5 sm:block" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modern Tab Navigation Component - Fully Responsive
function TabNavigation({ activeTab, onTabChange }) {
  return (
    <div className="relative">
      {/* Background */}
      <div className="rounded-xl border border-white/6 bg-white/2 p-1.5 shadow-lg shadow-black/10 backdrop-blur-sm sm:rounded-2xl sm:p-2">
        <div className="relative flex gap-1 sm:gap-1.5">
          {/* Active Tab Indicator (Sliding Background) */}
          <motion.div
            className="absolute inset-y-1 rounded-lg bg-linear-to-r from-white/8 to-white/4 shadow-sm sm:inset-y-1 sm:rounded-xl"
            initial={false}
            animate={{
              left: `calc(${TABS.findIndex((t) => t.id === activeTab) * (100 / TABS.length)}% + 4px)`,
              width: `calc(${100 / TABS.length}% - 8px)`,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />

          {/* Tab Buttons */}
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 transition-all duration-200 sm:gap-2.5 sm:rounded-xl sm:px-5 sm:py-3.5 ${
                  isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-all duration-200 sm:h-5 sm:w-5 ${
                    isActive ? 'text-white' : ''
                  }`}
                />
                <span className="text-sm font-medium sm:text-sm">
                  {tab.label}
                </span>
                {/* Description tooltip on larger screens */}
                <span
                  className={`hidden text-xs xl:inline ${isActive ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  • {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Getting Started Card for New Users - Fully Responsive
function GettingStartedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-linear-to-br from-amber-500/8 via-orange-500/4 to-transparent shadow-xl shadow-amber-500/5 sm:rounded-3xl"
    >
      {/* Decorative elements - scaled for mobile */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl sm:-top-14 sm:-right-14 sm:h-52 sm:w-52" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-orange-500/10 blur-2xl sm:-bottom-10 sm:-left-10 sm:h-36 sm:w-36" />
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="relative px-6 py-10 text-center sm:px-10 sm:py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500/20 to-orange-500/10 shadow-lg ring-1 shadow-amber-500/10 ring-amber-500/20 sm:mb-5 sm:h-20 sm:w-20 sm:rounded-3xl">
          <Info className="h-8 w-8 text-amber-400 sm:h-10 sm:w-10" />
        </div>
        <h3 className="mb-2.5 text-xl font-bold text-white sm:mb-3 sm:text-2xl">
          Welcome to Problem Solving!
        </h3>
        <p className="mx-auto mb-6 max-w-lg text-sm text-gray-400 sm:mb-8 sm:text-base">
          Connect your platform handles to start tracking your competitive
          programming progress across Codeforces, AtCoder, LeetCode, SPOJ, and
          more.
        </p>
        {/* Steps - Vertical on mobile, horizontal on tablet+ */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <div className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/4 px-4 py-3 text-sm text-gray-400 shadow-sm ring-1 ring-white/5 sm:w-auto sm:px-5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">
              1
            </span>
            <span>Connect handle</span>
          </div>
          <ChevronRight className="hidden h-5 w-5 rotate-90 text-gray-600 sm:block sm:rotate-0" />
          <div className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/4 px-4 py-3 text-sm text-gray-400 shadow-sm ring-1 ring-white/5 sm:w-auto sm:px-5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              2
            </span>
            <span>Click Sync</span>
          </div>
          <ChevronRight className="hidden h-5 w-5 rotate-90 text-gray-600 sm:block sm:rotate-0" />
          <div className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/4 px-4 py-3 text-sm text-gray-400 shadow-sm ring-1 ring-white/5 sm:w-auto sm:px-5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400 ring-1 ring-purple-500/30">
              3
            </span>
            <span>Track progress</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Toast Notification Component - Mobile optimized
function Toast({ message, type, onClose }) {
  const config = {
    error: {
      icon: AlertCircle,
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      shadow: 'shadow-red-500/20',
    },
    warning: {
      icon: Info,
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      shadow: 'shadow-amber-500/20',
    },
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      shadow: 'shadow-emerald-500/20',
    },
    info: {
      icon: RefreshCw,
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      shadow: 'shadow-blue-500/20',
    },
  };

  const {
    icon: Icon,
    border,
    bg,
    text,
    shadow,
  } = config[type] || config.success;

  // Add spinning animation for info type (syncing)
  const iconClasses = `h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${text} ${type === 'info' ? 'animate-spin' : ''}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`fixed right-4 bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl border sm:right-6 sm:bottom-6 sm:left-auto sm:gap-3.5 sm:rounded-2xl ${border} ${bg} px-4 py-3.5 shadow-2xl ${shadow} backdrop-blur-xl sm:px-5 sm:py-4`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg} sm:h-9 sm:w-9`}
      >
        <Icon className={iconClasses} />
      </div>
      <span className="flex-1 text-sm font-medium text-white sm:text-sm">
        {message}
      </span>
      <button
        onClick={onClose}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-all duration-200 hover:bg-white/5 hover:text-white"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// Loading State Component - Responsive
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-32">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-white/10 sm:h-16 sm:w-16" />
        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-500 sm:h-16 sm:w-16" />
      </div>
      <p className="mt-4 text-xs text-gray-400 sm:mt-6 sm:text-sm">
        Loading your progress...
      </p>
    </div>
  );
}

// Error State Component - Responsive
function ErrorState({ error, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-4 py-20 text-center sm:py-32"
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 sm:mb-4 sm:h-20 sm:w-20 sm:rounded-3xl">
        <AlertCircle className="h-7 w-7 text-red-500 sm:h-10 sm:w-10" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-white sm:text-lg">
        Something went wrong
      </h3>
      <p className="mb-5 max-w-sm text-xs text-red-400 sm:mb-6 sm:text-sm">
        {error}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm"
      >
        <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Try again
      </button>
    </motion.div>
  );
}

// Main Component
export default function ProblemSolvingClient({ userId }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const [highlightedContestId, setHighlightedContestId] = useState(null);
  const toastTimeoutRef = useRef(null);
  const contestHistoryRef = useRef(null);

  // Sync modal state
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncType, setSyncType] = useState('quick');
  const [syncPlatformName, setSyncPlatformName] = useState(null);
  const [syncStage, setSyncStage] = useState('preparing');
  const [completedStages, setCompletedStages] = useState([]);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const {
    data,
    loading,
    error,
    syncing,
    syncingPlatform,
    sync,
    syncPlatform,
    syncContestHistory: _syncContestHistory,
    refetch,
  } = useProblemSolving();
  const {
    connect,
    disconnect,
    loading: handleLoading,
    error: handleError,
  } = useConnectHandle();

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const runWithToast = useCallback(
    async (action, successMessage, errorMessage) => {
      try {
        const result = await action();
        showToast(result?.message || successMessage);
        return result;
      } catch (err) {
        showToast(getErrorMessage(err, errorMessage), 'error');
        throw err;
      }
    },
    [showToast]
  );

  // Silent background sync - no modal, just toast notifications
  const handleBackgroundSync = useCallback(
    async (platform = null, manualHtml = null) => {
      // Show starting toast
      const syncLabel = platform
        ? `Syncing ${platform}...`
        : 'Syncing all platforms...';
      showToast(syncLabel, 'info');

      try {
        let result;
        if (platform) {
          // Platform sync should include historical submissions, not just incremental updates.
          result = await syncPlatform(platform, true, manualHtml);
        } else {
          result = await sync(true);
        }

        // Show success toast
        const successMsg =
          result?.message ||
          (platform
            ? `${platform} synced successfully!`
            : 'All platforms synced successfully!');
        showToast(successMsg, 'success');
        return result;
      } catch (err) {
        const errorMsg = getErrorMessage(
          err,
          platform ? `Failed to sync ${platform}` : 'Sync failed'
        );
        showToast(errorMsg, 'error');
      }
    },
    [sync, syncPlatform, showToast]
  );

  // Enhanced sync with modal (kept for optional detailed view)
  const _handleSyncWithModal = useCallback(
    async (platform = null) => {
      // Reset modal state
      setSyncType(platform ? 'platform' : 'full');
      setSyncPlatformName(platform);
      setSyncStage('preparing');
      setCompletedStages([]);
      setSyncResult(null);
      setSyncError(null);
      setSyncModalOpen(true);

      try {
        // Simulate stage progression for better UX
        await new Promise((resolve) => setTimeout(resolve, 300));
        setSyncStage('submissions');
        setCompletedStages(['preparing']);

        // Actually perform the sync
        let result;
        if (platform) {
          // Platform-specific sync
          result = await syncPlatform(platform, true);
        } else {
          // Full sync
          result = await sync(true);
        }

        // Show stages for full sync
        if (!platform) {
          setCompletedStages(['preparing', 'submissions']);
          setSyncStage('ratings');
          await new Promise((resolve) => setTimeout(resolve, 200));

          setCompletedStages(['preparing', 'submissions', 'ratings']);
          setSyncStage('contests');
          await new Promise((resolve) => setTimeout(resolve, 200));

          setCompletedStages([
            'preparing',
            'submissions',
            'ratings',
            'contests',
          ]);
          setSyncStage('saving');
          await new Promise((resolve) => setTimeout(resolve, 200));
        } else {
          setCompletedStages(['preparing', 'submissions']);
          setSyncStage('saving');
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Complete
        setCompletedStages(
          !platform
            ? ['preparing', 'submissions', 'ratings', 'contests', 'saving']
            : ['preparing', 'submissions', 'saving']
        );
        setSyncStage('complete');
        setSyncResult(result);
      } catch (err) {
        setSyncStage('error');
        setSyncError(getErrorMessage(err, 'Failed to sync'));
      }
    },
    [sync, syncPlatform]
  );

  const handleCloseSyncModal = useCallback(() => {
    setSyncModalOpen(false);
    // Reset state after close animation
    setTimeout(() => {
      setSyncStage('preparing');
      setCompletedStages([]);
      setSyncResult(null);
      setSyncError(null);
      setSyncPlatformName(null);
    }, 300);
  }, []);

  // Use background sync by default (silent, non-blocking)
  const handleSync = useCallback(
    () => handleBackgroundSync(),
    [handleBackgroundSync]
  );

  const handleSyncPlatform = useCallback(
    (platform, manualHtml = null) => {
      if (!platform) return;
      handleBackgroundSync(platform, manualHtml);
    },
    [handleBackgroundSync]
  );

  const handleConnect = useCallback(
    async (platform, handle) => {
      if (!platform || !handle) return;

      await runWithToast(
        () => connect(platform, handle),
        `Connected ${handle} on ${platform}`,
        'Failed to connect handle'
      );
      refetch();
    },
    [connect, refetch, runWithToast]
  );

  const handleDisconnect = useCallback(
    async (platform) => {
      if (!platform) return;

      try {
        await runWithToast(
          () => disconnect(platform),
          `Disconnected ${platform}`,
          'Failed to disconnect'
        );
        refetch();
      } catch {}
    },
    [disconnect, refetch, runWithToast]
  );

  // Handle tag click from Topic Mastery - switch to Problems tab with tag filter
  const handleTagClick = useCallback((tag) => {
    setSelectedTag(tag);
    setSelectedDate(null);
    setActiveTab('problems');
  }, []);

  // Handle day click from Activity Heatmap - switch to Problems tab with date filter
  const handleDayClick = useCallback((date) => {
    setSelectedDate(date);
    setSelectedTag(null);
    setActiveTab('problems');
  }, []);

  // Handle problem click from Contest History - switch to Problems tab with problem filter
  const handleProblemClick = useCallback((problem) => {
    // Try to extract problem identifier from the problem object
    const problemId = problem.problemId || problem.id || problem.label;
    const platform = problem.platform;

    // Set the problem search query - use problem name or ID
    if (problem.name) {
      setSelectedTag(null);
      setSelectedDate(null);
      setSelectedProblemId(`${platform || ''}:${problem.name}`);
    } else if (problemId) {
      setSelectedTag(null);
      setSelectedDate(null);
      setSelectedProblemId(`${platform || ''}:${problemId}`);
    }
    setActiveTab('problems');
  }, []);

  // Handle contest click from Rating Chart - scroll to contest in Contest History
  const handleContestClick = useCallback((ratingPoint) => {
    if (ratingPoint.contestId) {
      setHighlightedContestId(ratingPoint.contestId);
      // Scroll to Contest History section
      setTimeout(() => {
        contestHistoryRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, []);

  // Handle view all problems from Recent Submissions - switch to Problems tab
  const handleViewAllProblems = useCallback(() => {
    setSelectedTag(null);
    setSelectedDate(null);
    setSelectedProblemId(null);
    setActiveTab('problems');
  }, []);

  // Clear selected tag when switching tabs manually
  const handleTabChange = useCallback((tabId) => {
    if (tabId !== 'problems') {
      setSelectedTag(null);
      setSelectedDate(null);
      setSelectedProblemId(null);
    }
    // Clear highlight when switching tabs
    setHighlightedContestId(null);
    setActiveTab(tabId);
  }, []);

  // Extract data
  const problemSolvingData = useMemo(
    () => ({ ...DEFAULT_PROBLEM_SOLVING_DATA, ...(data || {}) }),
    [data]
  );

  const {
    handles,
    statistics,
    recentSubmissions,
    dailyActivity,
    badges,
    leaderboard: _leaderboard,
    ratingHistory,
    contestHistory,
  } = problemSolvingData;

  // Memoized check for connected accounts
  const hasConnectedAccounts = useMemo(() => handles.length > 0, [handles]);

  // Show dashboard sections when historical/synced data exists even if
  // handles are currently disconnected or missing.
  const hasProblemSolvingData = useMemo(() => {
    const totalSolved = Number(statistics?.total_solved || 0);
    const totalSubmissions = Number(statistics?.total_submissions || 0);

    const hasActivity = Array.isArray(dailyActivity)
      ? dailyActivity.some((day) => Number(day?.problems_solved || 0) > 0)
      : false;

    return (
      totalSolved > 0 ||
      totalSubmissions > 0 ||
      (Array.isArray(recentSubmissions) && recentSubmissions.length > 0) ||
      (Array.isArray(ratingHistory) && ratingHistory.length > 0) ||
      (Array.isArray(contestHistory) && contestHistory.length > 0) ||
      (Array.isArray(badges) && badges.length > 0) ||
      hasActivity
    );
  }, [
    badges,
    contestHistory,
    dailyActivity,
    ratingHistory,
    recentSubmissions,
    statistics?.total_solved,
    statistics?.total_submissions,
  ]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Page Header */}
      <PageHeader onSync={handleSync} syncing={syncing} />

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content with Smooth Transitions */}
      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-5 lg:space-y-6"
          >
            <PlatformAccounts
              handles={handles}
              statistics={statistics}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSyncPlatform={handleSyncPlatform}
              isConnecting={handleLoading}
              isSyncing={syncing || !!syncingPlatform}
              syncingPlatform={syncingPlatform}
              error={handleError}
              userId={userId}
            />

            {/* Browser Extension Guide */}
            <ExtensionGuide />

            {/* Getting Started Card for New Users */}
            {!hasConnectedAccounts && !hasProblemSolvingData && (
              <GettingStartedCard />
            )}

            {/* Content Grid for Connected Users */}
            {(hasConnectedAccounts || hasProblemSolvingData) && (
              <>
                {/* Stats Overview - with Difficulty Distribution and Badges */}
                <StatsOverview
                  statistics={statistics}
                  badges={badges}
                  onTagClick={handleTagClick}
                />

                {/* Activity Heatmap */}
                <ActivityHeatmap
                  data={dailyActivity}
                  onDayClick={handleDayClick}
                />

                {/* Topic Mastery Section */}
                <TopicMasteryCard onTagClick={handleTagClick} />

                {/* Recent Submissions and Rating History - 50/50 Split with Equal Heights */}
                <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
                  {/* Recent Submissions - Left Side (50%) */}
                  <div className="flex min-h-125 flex-col">
                    <RecentSubmissions
                      submissions={recentSubmissions}
                      onProblemClick={handleProblemClick}
                      onViewAllProblems={handleViewAllProblems}
                    />
                  </div>

                  {/* Rating History with Platform Stats - Right Side (50%) */}
                  <div className="flex min-h-125 flex-col">
                    <RatingChart
                      ratingHistory={ratingHistory}
                      contestHistory={contestHistory}
                      handles={handles}
                      className="h-full flex-1"
                      onContestClick={handleContestClick}
                    />
                  </div>
                </div>

                {/* Contest history at the bottom */}
                <div ref={contestHistoryRef}>
                  <ContestHistory
                    contestHistory={contestHistory}
                    handles={handles}
                    limit={5}
                    onSync={handleSync}
                    syncing={syncing}
                    onProblemClick={handleProblemClick}
                    highlightContestId={highlightedContestId}
                  />
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Problems Tab */}
        {activeTab === 'problems' && (
          <motion.div
            key="problems"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <ProblemList
              initialTag={selectedTag}
              initialDate={selectedDate}
              initialSearch={selectedProblemId}
              onTagClear={() => setSelectedTag(null)}
              onDateClear={() => setSelectedDate(null)}
              onSearchClear={() => setSelectedProblemId(null)}
            />
          </motion.div>
        )}

        {/* Recommended Tab */}
        {activeTab === 'recommended' && (
          <motion.div
            key="recommended"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {hasConnectedAccounts ? (
              <RecommendedProblems userId={userId} />
            ) : (
              <GettingStartedCard />
            )}
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <Leaderboard currentUserId={userId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Sync Modal */}
      <SyncModal
        isOpen={syncModalOpen}
        syncType={syncType}
        platformName={syncPlatformName}
        currentStage={syncStage}
        completedStages={completedStages}
        syncResult={syncResult}
        error={syncError}
        onClose={handleCloseSyncModal}
      />
    </div>
  );
}
