/**
 * @file Roadmap View Component (Kanban Board)
 * Displays a public-facing kanban board showing feature/bug status.
 * Members can view progress but cannot drag/modify items.
 *
 * @module RoadmapView
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Circle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  KANBAN_COLUMNS,
  DISCUSSION_STATUSES,
  getStatusConfig,
  getTypeConfig,
  getPriorityConfig,
} from '@/app/_lib/discussion-config';
import { formatRelativeTime } from '@/app/_lib/utils';
import { fetchDiscussionsAction } from '@/app/_lib/discussion-actions';
import { TypeBadge, PriorityBadge } from '@/app/_components/discussions';

// Column icons and colors
const COLUMN_CONFIG = {
  open: {
    label: 'Open',
    icon: Circle,
    color: 'border-sky-500/30 bg-sky-500/5',
    headerColor: 'text-sky-400',
    dotColor: 'bg-sky-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'border-blue-500/30 bg-blue-500/5',
    headerColor: 'text-blue-400',
    dotColor: 'bg-blue-400',
  },
  acknowledged: {
    label: 'Acknowledged',
    icon: ChevronRight,
    color: 'border-indigo-500/30 bg-indigo-500/5',
    headerColor: 'text-indigo-400',
    dotColor: 'bg-indigo-400',
  },
  done: {
    label: 'Done',
    icon: CheckCircle,
    color: 'border-green-500/30 bg-green-500/5',
    headerColor: 'text-green-400',
    dotColor: 'bg-green-400',
  },
};

/**
 * Kanban card component.
 */
function KanbanCard({ item, onClick }) {
  const typeConfig = getTypeConfig(item.type);
  const priorityConfig = getPriorityConfig(item.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20"
    >
      {/* Type and priority badges */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <TypeBadge type={item.type} size="xs" />
        {item.priority && item.priority !== 'normal' && (
          <PriorityBadge priority={item.priority} size="xs" />
        )}
      </div>

      {/* Title */}
      <h4 className="mb-2 line-clamp-2 text-sm font-medium text-white">
        {item.title}
      </h4>

      {/* Meta info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatRelativeTime(item.created_at)}</span>
        <div className="flex items-center gap-2">
          {item.reply_count > 0 && <span>{item.reply_count} replies</span>}
          {item.views > 0 && <span>{item.views} views</span>}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Kanban column component.
 */
function KanbanColumn({ columnKey, items, onItemClick }) {
  const config = COLUMN_CONFIG[columnKey] || COLUMN_CONFIG.open;
  const Icon = config.icon;

  return (
    <div className="flex min-w-[280px] flex-col rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Column header */}
      <div
        className={`flex items-center gap-2 border-b border-white/10 p-4 ${config.color}`}
      >
        <div className={`h-2 w-2 rounded-full ${config.dotColor}`} />
        <h3 className={`font-medium ${config.headerColor}`}>{config.label}</h3>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">
          {items.length}
        </span>
      </div>

      {/* Column items */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No items</div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              onClick={() => onItemClick(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Main Roadmap View component.
 */
export default function RoadmapView({ onItemClick }) {
  const [columns, setColumns] = useState({
    open: [],
    in_progress: [],
    acknowledged: [],
    done: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch and organize discussions
  const fetchRoadmapData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch discussions that are relevant for roadmap
      // (bugs, features, UI issues)
      const result = await fetchDiscussionsAction({
        types: ['bug_report', 'feature_request', 'ui_issue'],
        limit: 100,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const discussions = result.data || [];

      // Organize by kanban columns (matches DB constraint values)
      const organized = {
        open: [],
        in_progress: [],
        acknowledged: [],
        done: [],
      };

      discussions.forEach((d) => {
        if (['new', 'open'].includes(d.status)) {
          organized.open.push(d);
        } else if (['in_progress', 'investigating'].includes(d.status)) {
          organized.in_progress.push(d);
        } else if (['acknowledged'].includes(d.status)) {
          organized.acknowledged.push(d);
        } else if (['resolved', 'closed'].includes(d.status)) {
          organized.done.push(d);
        }
      });

      // Sort each column by priority then date
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      Object.keys(organized).forEach((key) => {
        organized[key].sort((a, b) => {
          const pA = priorityOrder[a.priority] ?? 2;
          const pB = priorityOrder[b.priority] ?? 2;
          if (pA !== pB) return pA - pB;
          return new Date(b.created_at) - new Date(a.created_at);
        });
      });

      setColumns(organized);
    } catch (err) {
      console.error('Error fetching roadmap data:', err);
      setError('Failed to load roadmap data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoadmapData();
  }, [fetchRoadmapData]);

  // Handle item click - could open detail view or show modal
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
          onClick={fetchRoadmapData}
          className="mx-auto mt-4 flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/30"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Development Roadmap
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Track the progress of bugs, features, and improvements
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRoadmapData}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-white/20 hover:text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2">
        <span className="text-xs font-medium text-gray-400">Status:</span>
        {Object.entries(COLUMN_CONFIG).map(([key, config]) => (
          <div
            key={key}
            className="flex items-center gap-1.5 text-xs text-gray-400"
          >
            <div className={`h-2 w-2 rounded-full ${config.dotColor}`} />
            {config.label}
          </div>
        ))}
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-96 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>
      ) : (
        <div className="scrollbar-thin -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {Object.entries(columns).map(([key, items]) => (
            <KanbanColumn
              key={key}
              columnKey={key}
              items={items}
              onItemClick={handleItemClick}
            />
          ))}
        </div>
      )}

      {/* Summary stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-sky-400">
              {columns.open.length}
            </div>
            <div className="text-xs text-gray-400">Open</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {columns.in_progress.length}
            </div>
            <div className="text-xs text-gray-400">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-400">
              {columns.acknowledged.length}
            </div>
            <div className="text-xs text-gray-400">Acknowledged</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {columns.done.length}
            </div>
            <div className="text-xs text-gray-400">Done</div>
          </div>
        </div>
      )}
    </div>
  );
}
