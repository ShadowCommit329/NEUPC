/**
 * @file Release Log View Component
 * Displays resolved discussions as a changelog/release log.
 * Groups items by date/version and shows what was fixed or implemented.
 *
 * @module ReleaseLogView
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Bug,
  Lightbulb,
  Layout,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { getTypeConfig } from '@/app/_lib/discussion-config';
import { fetchReleaseLogAction } from '@/app/_lib/discussion-actions';
import { TypeBadge } from '@/app/_components/discussions';

// Type icons mapping
const TYPE_ICONS = {
  bug_report: Bug,
  feature_request: Lightbulb,
  ui_issue: Layout,
};

/**
 * Format date for grouping.
 */
function formatGroupDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 30) return 'This Month';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

/**
 * Get week key for grouping.
 */
function getGroupKey(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return 'this_week';
  if (diffDays < 30) return 'this_month';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Release item component.
 */
function ReleaseItem({ item, onClick }) {
  const typeConfig = getTypeConfig(item.type);
  const Icon = TYPE_ICONS[item.type] || CheckCircle;

  const getTypeLabel = () => {
    switch (item.type) {
      case 'bug_report':
        return 'Fixed';
      case 'feature_request':
        return 'Added';
      case 'ui_issue':
        return 'Improved';
      default:
        return 'Resolved';
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'bug_report':
        return 'text-red-400 bg-red-500/10';
      case 'feature_request':
        return 'text-green-400 bg-green-500/10';
      case 'ui_issue':
        return 'text-orange-400 bg-orange-500/10';
      default:
        return 'text-blue-400 bg-blue-500/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-white/[0.02]"
    >
      {/* Type indicator */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getTypeColor()}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`text-xs font-medium ${getTypeColor().split(' ')[0]}`}
          >
            {getTypeLabel()}
          </span>
          <TypeBadge type={item.type} size="xs" />
        </div>
        <h4 className="line-clamp-1 font-medium text-white group-hover:text-blue-300">
          {item.title}
        </h4>
        {item.tags?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Date */}
      <div className="shrink-0 text-right text-xs text-gray-500">
        {new Date(item.resolved_at || item.updated_at).toLocaleDateString()}
      </div>
    </motion.div>
  );
}

/**
 * Release group component.
 */
function ReleaseGroup({ title, items, isExpanded, onToggle, onItemClick }) {
  const bugFixes = items.filter((i) => i.type === 'bug_report').length;
  const features = items.filter((i) => i.type === 'feature_request').length;
  const uiImprovements = items.filter((i) => i.type === 'ui_issue').length;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Group header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
          <Calendar className="h-5 w-5 text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
            <span>{items.length} changes</span>
            {bugFixes > 0 && (
              <span className="text-red-400">{bugFixes} bug fixes</span>
            )}
            {features > 0 && (
              <span className="text-green-400">{features} features</span>
            )}
            {uiImprovements > 0 && (
              <span className="text-orange-400">
                {uiImprovements} UI improvements
              </span>
            )}
          </div>
        </div>
        <div className="text-gray-400">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>
      </button>

      {/* Group items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="divide-y divide-white/5 px-4">
              {items.map((item) => (
                <ReleaseItem
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick(item)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Main Release Log View component.
 */
export default function ReleaseLogView({ onItemClick }) {
  const [groups, setGroups] = useState({});
  const [expandedGroups, setExpandedGroups] = useState(
    new Set(['today', 'yesterday', 'this_week'])
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    bugFixes: 0,
    features: 0,
    uiImprovements: 0,
  });

  // Fetch release log data
  const fetchReleaseData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchReleaseLogAction({
        limit: 100,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const discussions = result.data || [];

      // Group by date
      const grouped = {};
      discussions.forEach((d) => {
        const key = getGroupKey(d.resolved_at || d.updated_at);
        if (!grouped[key]) {
          grouped[key] = {
            title: formatGroupDate(d.resolved_at || d.updated_at),
            items: [],
          };
        }
        grouped[key].items.push(d);
      });

      // Sort items within each group by date
      Object.values(grouped).forEach((group) => {
        group.items.sort((a, b) => {
          const dateA = new Date(a.resolved_at || a.updated_at);
          const dateB = new Date(b.resolved_at || b.updated_at);
          return dateB - dateA;
        });
      });

      setGroups(grouped);

      // Calculate stats
      const bugFixes = discussions.filter(
        (d) => d.type === 'bug_report'
      ).length;
      const features = discussions.filter(
        (d) => d.type === 'feature_request'
      ).length;
      const uiImprovements = discussions.filter(
        (d) => d.type === 'ui_issue'
      ).length;
      setStats({
        total: discussions.length,
        bugFixes,
        features,
        uiImprovements,
      });
    } catch (err) {
      console.error('Error fetching release log:', err);
      setError('Failed to load release log.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleaseData();
  }, [fetchReleaseData]);

  // Toggle group expansion
  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Handle item click
  const handleItemClick = (item) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={fetchReleaseData}
          className="mx-auto mt-4 flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/30"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  // Order for group display
  const groupOrder = ['today', 'yesterday', 'this_week', 'this_month'];
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    const indexA = groupOrder.indexOf(a);
    const indexB = groupOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return b.localeCompare(a); // Sort year-month keys descending
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Release Log</h2>
          <p className="mt-1 text-sm text-gray-400">
            Recent fixes, features, and improvements
          </p>
        </div>
        <button
          type="button"
          onClick={fetchReleaseData}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-white/20 hover:text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats summary */}
      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total Resolved</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-red-400">
              <Bug className="h-5 w-5" />
              {stats.bugFixes}
            </div>
            <div className="text-xs text-gray-400">Bug Fixes</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-400">
              <Lightbulb className="h-5 w-5" />
              {stats.features}
            </div>
            <div className="text-xs text-gray-400">Features</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-400">
              <Layout className="h-5 w-5" />
              {stats.uiImprovements}
            </div>
            <div className="text-xs text-gray-400">UI Improvements</div>
          </div>
        </div>
      )}

      {/* Release groups */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>
      ) : sortedGroupKeys.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] py-16 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <h3 className="text-lg font-semibold text-white">No releases yet</h3>
          <p className="mt-1 text-sm text-gray-400">
            Resolved issues and implemented features will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroupKeys.map((key) => (
            <ReleaseGroup
              key={key}
              title={groups[key].title}
              items={groups[key].items}
              isExpanded={expandedGroups.has(key)}
              onToggle={() => toggleGroup(key)}
              onItemClick={handleItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
