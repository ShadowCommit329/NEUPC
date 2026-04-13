/**
 * @file Member Help Desk Client Component (Redesigned)
 * Full-featured help desk UI with tabs: All Post, Roadmap, Release Log,
 * Feature Requests, Self Troubleshoot.
 * Includes real-time updates via Supabase Realtime.
 *
 * @module MemberHelpDeskClient
 */

'use client';

import {
  useState,
  useCallback,
  useEffect,
  useTransition,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Map,
  FileText,
  Lightbulb,
  BookOpen,
  RefreshCw,
  ChevronRight,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  HELPDESK_TABS,
  DISCUSSION_TYPES,
  DISCUSSION_TYPE_KEYS,
  getDefaultTab,
} from '@/app/_lib/discussion-config';
import {
  fetchDiscussionsAction,
  fetchUserStatsAction,
  fetchFeatureRequestsAction,
  fetchReleaseLogAction,
  fetchFAQsAction,
  fetchUserBootcampsAction,
  createDiscussionAction,
  fetchDiscussionDetailAction,
} from '@/app/_lib/discussion-actions';
import {
  DiscussionCard,
  MemberStats,
  DiscussionFilters,
} from '@/app/_components/discussions';
import { useDiscussionRealtime } from '@/app/_hooks/useDiscussionRealtime';
import CreateDiscussionModal from './CreateDiscussionModal';
import DiscussionDetailView from './DiscussionDetailView';
import RoadmapView from './RoadmapView';
import ReleaseLogView from './ReleaseLogView';
import FeatureRequestsView from './FeatureRequestsView';
import SelfTroubleshootView from './SelfTroubleshootView';

// Tab icons mapping
const TAB_ICONS = {
  all_posts: MessageSquare,
  roadmap: Map,
  release_log: FileText,
  feature_requests: Lightbulb,
  self_troubleshoot: BookOpen,
};

/**
 * Tab button component.
 */
function TabButton({ tab, isActive, onClick }) {
  const Icon = TAB_ICONS[tab.key] || MessageSquare;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
        isActive
          ? 'bg-blue-500/20 text-blue-300'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{tab.label}</span>
    </button>
  );
}

/**
 * Main Help Desk Client Component.
 */
export default function MemberHelpDeskClient({
  initialDiscussions = [],
  initialStats = {},
  bootcamps = [],
  userId,
  userEmail,
}) {
  // State
  const [activeTab, setActiveTab] = useState('all_posts');
  const [discussions, setDiscussions] = useState(initialDiscussions);
  const [stats, setStats] = useState(initialStats);
  const [filters, setFilters] = useState({ sortBy: 'newest' });
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  // Real-time callbacks
  const handleThreadInsert = useCallback((newThread) => {
    // Add new thread to the top of the list
    setDiscussions((prev) => {
      // Avoid duplicates
      if (prev.some((d) => d.id === newThread.id)) return prev;
      return [newThread, ...prev];
    });
    // Update stats
    setStats((prev) => ({
      ...prev,
      total: (prev.total || 0) + 1,
    }));
  }, []);

  const handleThreadUpdate = useCallback(
    (updatedThread) => {
      // Update thread in list
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === updatedThread.id ? { ...d, ...updatedThread } : d
        )
      );
      // Update selected discussion if it's the same thread
      if (selectedDiscussion?.id === updatedThread.id) {
        setSelectedDiscussion((prev) => ({ ...prev, ...updatedThread }));
      }
    },
    [selectedDiscussion?.id]
  );

  const handleThreadDelete = useCallback(
    (deletedThread) => {
      setDiscussions((prev) => prev.filter((d) => d.id !== deletedThread.id));
      // Close detail view if viewing deleted thread
      if (selectedDiscussion?.id === deletedThread.id) {
        setSelectedDiscussion(null);
      }
      // Update stats
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, (prev.total || 0) - 1),
      }));
    },
    [selectedDiscussion?.id]
  );

  // Subscribe to real-time updates
  const { isConnected } = useDiscussionRealtime({
    onThreadInsert: handleThreadInsert,
    onThreadUpdate: handleThreadUpdate,
    onThreadDelete: handleThreadDelete,
    enabled: activeTab === 'all_posts',
  });

  // Fetch discussions with filters
  const fetchDiscussions = useCallback(
    async (newFilters = filters) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchDiscussionsAction({
          ...newFilters,
          myPostsOnly: newFilters.myPostsOnly || false,
          limit: 50,
        });
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setDiscussions(result.data);
        }
      } catch (error) {
        console.error('Error fetching discussions:', error);
        setError(
          error.message || 'Failed to fetch discussions. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await fetchUserStatsAction();
      if (result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      startTransition(() => {
        fetchDiscussions(newFilters);
      });
    },
    [fetchDiscussions]
  );

  // Handle tab change
  const handleTabChange = useCallback((tabKey) => {
    setActiveTab(tabKey);
    setSelectedDiscussion(null);
  }, []);

  // Handle discussion select
  const handleDiscussionSelect = useCallback((discussion) => {
    setSelectedDiscussion(discussion);
  }, []);

  // Handle back from detail view
  const handleBackToList = useCallback(() => {
    setSelectedDiscussion(null);
  }, []);

  // Handle discussion created
  const handleDiscussionCreated = useCallback(
    (newDiscussion) => {
      setDiscussions((prev) => [newDiscussion, ...prev]);
      setShowCreateModal(false);
      fetchStats();
    },
    [fetchStats]
  );

  // Refresh data
  const handleRefresh = useCallback(() => {
    fetchDiscussions();
    fetchStats();
  }, [fetchDiscussions, fetchStats]);

  // Initial load
  useEffect(() => {
    if (initialDiscussions.length === 0) {
      fetchDiscussions();
    }
    if (Object.keys(initialStats).length === 0) {
      fetchStats();
    }
  }, []);

  // Render tab content
  const renderTabContent = () => {
    // If a discussion is selected, show detail view
    if (selectedDiscussion) {
      return (
        <DiscussionDetailView
          discussion={selectedDiscussion}
          onBack={handleBackToList}
          userId={userId}
          onUpdate={handleRefresh}
        />
      );
    }

    switch (activeTab) {
      case 'all_posts':
        return (
          <div className="space-y-4">
            {/* Filters */}
            <DiscussionFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              showAdvanced
            />

            {/* Discussion list */}
            <div className="space-y-3">
              {error ? (
                // Error state
                <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 py-16">
                  <WifiOff className="mb-4 h-12 w-12 text-red-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Failed to fetch discussions
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">{error}</p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              ) : isLoading || isPending ? (
                // Loading skeleton
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]"
                    />
                  ))}
                </div>
              ) : discussions.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] py-16">
                  <MessageSquare className="mb-4 h-12 w-12 text-gray-600" />
                  <h3 className="text-lg font-semibold text-white">
                    No discussions yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Be the first to start a discussion!
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    <Plus className="h-4 w-4" />
                    New Discussion
                  </button>
                </div>
              ) : (
                // Discussion cards
                discussions.map((discussion) => (
                  <DiscussionCard
                    key={discussion.id}
                    discussion={discussion}
                    onClick={() => handleDiscussionSelect(discussion)}
                  />
                ))
              )}
            </div>
          </div>
        );

      case 'roadmap':
        return <RoadmapView />;

      case 'release_log':
        return <ReleaseLogView />;

      case 'feature_requests':
        return <FeatureRequestsView userId={userId} />;

      case 'self_troubleshoot':
        return <SelfTroubleshootView />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Help Desk</h1>
            {/* Real-time connection indicator */}
            {activeTab === 'all_posts' && (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                  isConnected
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-yellow-500/10 text-yellow-400'
                }`}
                title={
                  isConnected ? 'Real-time updates active' : 'Connecting...'
                }
              >
                {isConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {isConnected ? 'Live' : 'Connecting'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Get help, report issues, and suggest features
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-white/20 hover:text-gray-300 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            New Discussion
          </button>
        </div>
      </div>

      {/* Stats */}
      <MemberStats stats={stats} />

      {/* Tabs */}
      <div className="scrollbar-none -mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {Object.values(HELPDESK_TABS).map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
          />
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (selectedDiscussion?.id || '')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>

      {/* Create Discussion Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDiscussionModal
            bootcamps={bootcamps}
            onClose={() => setShowCreateModal(false)}
            onCreated={handleDiscussionCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
