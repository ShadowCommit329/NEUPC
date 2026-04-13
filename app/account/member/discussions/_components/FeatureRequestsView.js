/**
 * @file Feature Requests View Component
 * Displays feature requests with voting functionality.
 * Members can upvote/downvote and see top requested features.
 *
 * @module FeatureRequestsView
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  TrendingUp,
  Clock,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  getStatusConfig,
  getPriorityConfig,
  DISCUSSION_STATUSES,
} from '@/app/_lib/discussion-config';
import { formatRelativeTime } from '@/app/_lib/utils';
import { fetchFeatureRequestsAction } from '@/app/_lib/discussion-actions';
import {
  useVotableItems,
  getVoteScore,
  getVoteScoreColor,
} from '@/app/_hooks/useVoting';
import { StatusBadge, PriorityBadge } from '@/app/_components/discussions';

// Sort options
const SORT_OPTIONS = [
  { key: 'votes', label: 'Most Voted', icon: TrendingUp },
  { key: 'newest', label: 'Newest', icon: Clock },
  { key: 'oldest', label: 'Oldest', icon: Calendar },
];

// Filter options
const FILTER_OPTIONS = [
  { key: 'all', label: 'All Requests' },
  { key: 'open', label: 'Open' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

/**
 * Vote controls component.
 */
function VoteControls({ item, onVote, isPending }) {
  const score = getVoteScore(item);
  const userVote = item.user_vote;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => onVote(item.id, 'upvote', userVote)}
        disabled={isPending}
        className={`rounded-lg p-1.5 transition-colors ${
          userVote === 'upvote'
            ? 'bg-green-500/20 text-green-400'
            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
      <span className={`text-lg font-bold ${getVoteScoreColor(score)}`}>
        {score}
      </span>
      <button
        type="button"
        onClick={() => onVote(item.id, 'downvote', userVote)}
        disabled={isPending}
        className={`rounded-lg p-1.5 transition-colors ${
          userVote === 'downvote'
            ? 'bg-red-500/20 text-red-400'
            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <ArrowDown className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Feature request card component.
 */
function FeatureRequestCard({ item, onVote, isPending, onClick }) {
  const statusConfig = getStatusConfig(item.status);
  const isCompleted = ['resolved', 'closed'].includes(item.status);
  const isAcknowledged = item.status === 'acknowledged';
  const isInProgress = ['in_progress', 'investigating'].includes(item.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 rounded-xl border p-4 transition-colors ${
        isCompleted
          ? 'border-green-500/20 bg-green-500/5'
          : isAcknowledged
            ? 'border-indigo-500/20 bg-indigo-500/5'
            : isInProgress
              ? 'border-blue-500/20 bg-blue-500/5'
              : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      }`}
    >
      {/* Vote controls */}
      <VoteControls item={item} onVote={onVote} isPending={isPending} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {item.priority && item.priority !== 'normal' && (
            <PriorityBadge priority={item.priority} />
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
              <CheckCircle className="h-3 w-3" />
              Implemented
            </span>
          )}
        </div>

        <h3
          onClick={onClick}
          className="mb-2 cursor-pointer text-lg font-semibold text-white hover:text-blue-300"
        >
          {item.title}
        </h3>

        {/* Preview of content */}
        <p className="mb-3 line-clamp-2 text-sm text-gray-400">
          {item.content?.replace(/<[^>]*>/g, '').slice(0, 200)}
        </p>

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(item.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {item.reply_count || 0} comments
          </span>
          <span>
            by{' '}
            {item.author?.full_name ||
              item.author?.email?.split('@')[0] ||
              'Anonymous'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Main Feature Requests View component.
 */
export default function FeatureRequestsView({
  userId,
  onItemClick,
  onCreateNew,
}) {
  const [sortBy, setSortBy] = useState('votes');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Use the voting hook for optimistic updates
  const {
    items: requests,
    setItems: setRequests,
    handleVote,
    isPending,
    error: voteError,
  } = useVotableItems([], {
    onVoteError: (err) => console.error('Vote error:', err),
  });

  // Fetch feature requests
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const result = await fetchFeatureRequestsAction({
        sortBy,
        status: filterStatus === 'all' ? null : filterStatus,
        limit: 50,
      });

      if (result.error) {
        setFetchError(result.error);
        return;
      }

      setRequests(result.data || []);
    } catch (err) {
      console.error('Error fetching feature requests:', err);
      setFetchError('Failed to load feature requests.');
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, filterStatus, setRequests]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle item click
  const handleItemClick = (item) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // Count stats
  const stats = {
    total: requests.length,
    open: requests.filter((r) => ['new', 'open'].includes(r.status)).length,
    acknowledged: requests.filter((r) => r.status === 'acknowledged').length,
    inProgress: requests.filter((r) =>
      ['in_progress', 'investigating'].includes(r.status)
    ).length,
    completed: requests.filter((r) => ['resolved', 'closed'].includes(r.status))
      .length,
  };

  if (fetchError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">{fetchError}</p>
        <button
          type="button"
          onClick={fetchRequests}
          className="mx-auto mt-4 flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/30"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            Feature Requests
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Vote on features you'd like to see implemented
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRequests}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-white/20 hover:text-gray-300 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
          {onCreateNew && (
            <button
              type="button"
              onClick={onCreateNew}
              className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-500"
            >
              <Plus className="h-4 w-4" />
              Suggest Feature
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            {
              key: 'all',
              label: 'Total',
              value: stats.total,
              color: 'text-white',
            },
            {
              key: 'open',
              label: 'Open',
              value: stats.open,
              color: 'text-sky-400',
            },
            {
              key: 'acknowledged',
              label: 'Acknowledged',
              value: stats.acknowledged,
              color: 'text-indigo-400',
            },
            {
              key: 'in_progress',
              label: 'In Progress',
              value: stats.inProgress,
              color: 'text-blue-400',
            },
            {
              key: 'completed',
              label: 'Completed',
              value: stats.completed,
              color: 'text-green-400',
            },
          ].map((stat) => (
            <button
              key={stat.key}
              type="button"
              onClick={() =>
                setFilterStatus(
                  stat.key === 'completed' ? 'resolved' : stat.key
                )
              }
              className={`rounded-lg border p-3 text-center transition-colors ${
                filterStatus === stat.key ||
                (stat.key === 'completed' && filterStatus === 'resolved')
                  ? 'border-white/20 bg-white/5'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/15'
              }`}
            >
              <div className={`text-xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Sort:</span>
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSortBy(option.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  sortBy === option.key
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <option.icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature request list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] py-16 text-center">
          <Lightbulb className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <h3 className="text-lg font-semibold text-white">
            No feature requests
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {filterStatus === 'all'
              ? 'Be the first to suggest a feature!'
              : 'No requests match this filter.'}
          </p>
          {onCreateNew && filterStatus === 'all' && (
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-500"
            >
              <Plus className="h-4 w-4" />
              Suggest Feature
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((item) => (
            <FeatureRequestCard
              key={item.id}
              item={item}
              onVote={handleVote}
              isPending={isPending}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
