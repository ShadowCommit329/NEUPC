/**
 * @file Staff Discussions Client Component
 * Shared Help Desk client for staff roles (admin, mentor, advisor, executive).
 * Includes additional staff features: assignment, status changes, priority,
 * Kanban board with drag-drop, and staff statistics.
 *
 * @module StaffDiscussionsClient
 */

'use client';

import { useState, useCallback, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Map,
  FileText,
  Lightbulb,
  BookOpen,
  RefreshCw,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  MoreVertical,
  UserPlus,
  Flag,
  Lock,
  Pin,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  HELPDESK_TABS,
  DISCUSSION_STATUSES,
  DISCUSSION_PRIORITIES,
  KANBAN_COLUMNS,
  getStatusConfig,
  getPriorityConfig,
  STAFF_ROLES,
} from '@/app/_lib/discussion-config';
import {
  fetchDiscussionsAction,
  fetchStaffStatsAction,
  fetchKanbanAction,
  fetchAssignableStaffAction,
  updateStatusAction,
  updatePriorityAction,
  assignDiscussionAction,
  togglePinAction,
  toggleLockAction,
  deleteDiscussionAction,
  fetchDiscussionDetailAction,
} from '@/app/_lib/discussion-actions';
import {
  DiscussionCard,
  StaffStats,
  DiscussionFilters,
  StatusBadge,
  TypeBadge,
  PriorityBadge,
  RoleBadge,
} from '@/app/_components/discussions';

// Tab icons mapping
const TAB_ICONS = {
  all_posts: MessageSquare,
  kanban: Map,
  assigned: UserPlus,
  urgent: AlertTriangle,
};

// Staff-specific tabs
const STAFF_TABS = {
  all_posts: {
    key: 'all_posts',
    label: 'All Discussions',
    icon: 'MessageSquare',
  },
  kanban: {
    key: 'kanban',
    label: 'Kanban Board',
    icon: 'Map',
  },
  assigned: {
    key: 'assigned',
    label: 'Assigned to Me',
    icon: 'UserPlus',
  },
  urgent: {
    key: 'urgent',
    label: 'Urgent',
    icon: 'AlertTriangle',
  },
};

/**
 * Tab button component.
 */
function TabButton({ tab, isActive, onClick, count }) {
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
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Staff action menu for a discussion.
 */
function StaffActionMenu({
  discussion,
  staffList,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onTogglePin,
  onToggleLock,
  onDelete,
  isLoading,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full right-0 z-20 mt-1 w-56 rounded-xl border border-white/10 bg-gray-900 py-2 shadow-xl"
          >
            {/* Status */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                  Change Status
                </span>
                <StatusBadge status={discussion.status} size="xs" />
              </button>
              {showStatusMenu && (
                <div className="border-t border-white/5 py-1">
                  {Object.values(DISCUSSION_STATUSES).map((status) => (
                    <button
                      key={status.key}
                      type="button"
                      onClick={() => {
                        onStatusChange(discussion.id, status.key);
                        setShowStatusMenu(false);
                        setIsOpen(false);
                      }}
                      disabled={isLoading}
                      className={`flex w-full items-center gap-2 px-6 py-1.5 text-left text-sm ${
                        discussion.status === status.key
                          ? 'bg-white/5 text-white'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                      }`}
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${status.dotColor}`}
                      />
                      {status.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-gray-500" />
                  Set Priority
                </span>
                <PriorityBadge priority={discussion.priority} size="xs" />
              </button>
              {showPriorityMenu && (
                <div className="border-t border-white/5 py-1">
                  {Object.values(DISCUSSION_PRIORITIES).map((priority) => (
                    <button
                      key={priority.key}
                      type="button"
                      onClick={() => {
                        onPriorityChange(discussion.id, priority.key);
                        setShowPriorityMenu(false);
                        setIsOpen(false);
                      }}
                      disabled={isLoading}
                      className={`flex w-full items-center gap-2 px-6 py-1.5 text-left text-sm ${
                        discussion.priority === priority.key
                          ? 'bg-white/5 text-white'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assign */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-gray-500" />
                  Assign
                </span>
              </button>
              {showAssignMenu && (
                <div className="max-h-40 overflow-y-auto border-t border-white/5 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onAssign(discussion.id, null);
                      setShowAssignMenu(false);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-6 py-1.5 text-left text-sm text-gray-400 hover:bg-white/5"
                  >
                    Unassign
                  </button>
                  {staffList.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        onAssign(discussion.id, staff.id);
                        setShowAssignMenu(false);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-6 py-1.5 text-left text-sm ${
                        discussion.assigned_to === staff.id
                          ? 'bg-white/5 text-white'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                      }`}
                    >
                      {staff.full_name || staff.email?.split('@')[0]}
                      {staff.role && (
                        <span className="text-xs text-gray-500">
                          ({staff.role})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="my-1 border-t border-white/5" />

            {/* Pin/Unpin */}
            <button
              type="button"
              onClick={() => {
                onTogglePin(discussion.id, !discussion.is_pinned);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
            >
              <Pin
                className={`h-4 w-4 ${discussion.is_pinned ? 'text-yellow-400' : 'text-gray-500'}`}
              />
              {discussion.is_pinned ? 'Unpin' : 'Pin'}
            </button>

            {/* Lock/Unlock */}
            <button
              type="button"
              onClick={() => {
                onToggleLock(discussion.id, !discussion.is_locked);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
            >
              <Lock
                className={`h-4 w-4 ${discussion.is_locked ? 'text-red-400' : 'text-gray-500'}`}
              />
              {discussion.is_locked ? 'Unlock' : 'Lock'}
            </button>

            <div className="my-1 border-t border-white/5" />

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                if (
                  confirm('Are you sure you want to delete this discussion?')
                ) {
                  onDelete(discussion.id);
                  setIsOpen(false);
                }
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Kanban column component.
 */
function KanbanColumn({ title, status, items, onItemClick, onStatusChange }) {
  const statusConfig = getStatusConfig(status);

  return (
    <div className="flex min-w-[300px] flex-col rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <div className={`h-2 w-2 rounded-full ${statusConfig.dotColor}`} />
        <h3 className="font-medium text-white">{title}</h3>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div
        className="flex-1 space-y-2 overflow-y-auto p-3"
        style={{ maxHeight: '60vh' }}
      >
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No items</div>
        ) : (
          items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20"
              onClick={() => onItemClick(item)}
            >
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <TypeBadge type={item.type} size="xs" />
                {item.priority && item.priority !== 'normal' && (
                  <PriorityBadge priority={item.priority} size="xs" />
                )}
              </div>
              <h4 className="line-clamp-2 text-sm font-medium text-white">
                {item.title}
              </h4>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {item.author?.full_name ||
                    item.author?.email?.split('@')[0] ||
                    'User'}
                </span>
                <span>{item.reply_count || 0} replies</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Kanban board view.
 */
function KanbanView({ onItemClick }) {
  const [columns, setColumns] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchKanbanData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchKanbanAction();
    if (result.grouped) {
      setColumns(result.grouped);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchKanbanData();
  }, [fetchKanbanData]);

  const handleStatusChange = async (threadId, newStatus) => {
    await updateStatusAction({ threadId, status: newStatus });
    fetchKanbanData();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-96 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Kanban Board</h2>
        <button
          type="button"
          onClick={fetchKanbanData}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-white/20"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="scrollbar-thin -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
        <KanbanColumn
          title="Open"
          status="open"
          items={[...(columns.new || []), ...(columns.open || [])]}
          onItemClick={onItemClick}
          onStatusChange={handleStatusChange}
        />
        <KanbanColumn
          title="In Progress"
          status="in_progress"
          items={[
            ...(columns.investigating || []),
            ...(columns.in_progress || []),
            ...(columns.acknowledged || []),
          ]}
          onItemClick={onItemClick}
          onStatusChange={handleStatusChange}
        />
        <KanbanColumn
          title="Done"
          status="resolved"
          items={[...(columns.resolved || []), ...(columns.closed || [])]}
          onItemClick={onItemClick}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}

/**
 * Staff discussion row with actions.
 */
function StaffDiscussionRow({
  discussion,
  staffList,
  onSelect,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onTogglePin,
  onToggleLock,
  onDelete,
  isLoading,
}) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20">
      {/* Main content */}
      <div className="min-w-0 flex-1" onClick={() => onSelect(discussion)}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {discussion.is_pinned && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
          {discussion.is_locked && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
          <StatusBadge status={discussion.status} />
          <TypeBadge type={discussion.type} />
          {discussion.priority && discussion.priority !== 'normal' && (
            <PriorityBadge priority={discussion.priority} />
          )}
        </div>

        <h3 className="mb-1 cursor-pointer font-semibold text-white hover:text-blue-300">
          {discussion.title}
        </h3>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span>
            by{' '}
            {discussion.author?.full_name ||
              discussion.author?.email?.split('@')[0]}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(discussion.created_at).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {discussion.reply_count || 0} replies
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {discussion.views || 0} views
          </span>
          {discussion.assignee && (
            <span className="flex items-center gap-1 text-blue-400">
              <UserPlus className="h-3 w-3" />
              {discussion.assignee.full_name ||
                discussion.assignee.email?.split('@')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <StaffActionMenu
        discussion={discussion}
        staffList={staffList}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        onAssign={onAssign}
        onTogglePin={onTogglePin}
        onToggleLock={onToggleLock}
        onDelete={onDelete}
        isLoading={isLoading}
      />
    </div>
  );
}

/**
 * Main Staff Discussions Client Component.
 */
export default function StaffDiscussionsClient({
  initialDiscussions = [],
  initialStats = {},
  userId,
  userEmail,
  userRole,
}) {
  // State
  const [activeTab, setActiveTab] = useState('all_posts');
  const [discussions, setDiscussions] = useState(initialDiscussions);
  const [stats, setStats] = useState(initialStats);
  const [staffList, setStaffList] = useState([]);
  const [filters, setFilters] = useState({ sortBy: 'newest' });
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Fetch discussions
  const fetchDiscussions = useCallback(
    async (newFilters = filters) => {
      setIsLoading(true);
      try {
        let result;
        if (activeTab === 'assigned') {
          result = await fetchDiscussionsAction({
            ...newFilters,
            assignedTo: userId,
            limit: 50,
          });
        } else if (activeTab === 'urgent') {
          result = await fetchDiscussionsAction({
            ...newFilters,
            priority: 'urgent',
            limit: 50,
          });
        } else {
          result = await fetchDiscussionsAction({
            ...newFilters,
            limit: 50,
          });
        }
        if (result.data) {
          setDiscussions(result.data);
        }
      } catch (error) {
        console.error('Error fetching discussions:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, activeTab, userId]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await fetchStaffStatsAction();
      if (result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch assignable staff
  const fetchStaff = useCallback(async () => {
    try {
      const result = await fetchAssignableStaffAction();
      if (result.staff) {
        setStaffList(result.staff);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchStaff();
  }, [fetchStats, fetchStaff]);

  // Fetch discussions when tab changes
  useEffect(() => {
    if (activeTab !== 'kanban') {
      fetchDiscussions();
    }
  }, [activeTab, fetchDiscussions]);

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

  // Staff actions
  const handleStatusChange = useCallback(
    async (threadId, status) => {
      const result = await updateStatusAction({ threadId, status });
      if (result.success) {
        fetchDiscussions();
        fetchStats();
      }
    },
    [fetchDiscussions, fetchStats]
  );

  const handlePriorityChange = useCallback(
    async (threadId, priority) => {
      const result = await updatePriorityAction({ threadId, priority });
      if (result.success) {
        fetchDiscussions();
      }
    },
    [fetchDiscussions]
  );

  const handleAssign = useCallback(
    async (threadId, assigneeId) => {
      const result = await assignDiscussionAction({ threadId, assigneeId });
      if (result.success) {
        fetchDiscussions();
      }
    },
    [fetchDiscussions]
  );

  const handleTogglePin = useCallback(
    async (threadId, isPinned) => {
      const result = await togglePinAction({ threadId, isPinned });
      if (result.success) {
        fetchDiscussions();
      }
    },
    [fetchDiscussions]
  );

  const handleToggleLock = useCallback(
    async (threadId, isLocked) => {
      const result = await toggleLockAction({ threadId, isLocked });
      if (result.success) {
        fetchDiscussions();
      }
    },
    [fetchDiscussions]
  );

  const handleDelete = useCallback(
    async (threadId) => {
      const result = await deleteDiscussionAction({ threadId });
      if (result.success) {
        fetchDiscussions();
        fetchStats();
      }
    },
    [fetchDiscussions, fetchStats]
  );

  // Refresh data
  const handleRefresh = useCallback(() => {
    fetchDiscussions();
    fetchStats();
  }, [fetchDiscussions, fetchStats]);

  // Render tab content
  const renderTabContent = () => {
    if (activeTab === 'kanban') {
      return <KanbanView onItemClick={setSelectedDiscussion} />;
    }

    return (
      <div className="space-y-4">
        {/* Filters */}
        <DiscussionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          showAdvanced
          showStaffFilters
        />

        {/* Discussion list */}
        <div className="space-y-3">
          {isLoading || isPending ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]"
                />
              ))}
            </div>
          ) : discussions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] py-16">
              <MessageSquare className="mb-4 h-12 w-12 text-gray-600" />
              <h3 className="text-lg font-semibold text-white">
                No discussions found
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {activeTab === 'assigned'
                  ? 'No discussions assigned to you'
                  : activeTab === 'urgent'
                    ? 'No urgent discussions'
                    : 'No discussions match your filters'}
              </p>
            </div>
          ) : (
            discussions.map((discussion) => (
              <StaffDiscussionRow
                key={discussion.id}
                discussion={discussion}
                staffList={staffList}
                onSelect={setSelectedDiscussion}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onAssign={handleAssign}
                onTogglePin={handleTogglePin}
                onToggleLock={handleToggleLock}
                onDelete={handleDelete}
                isLoading={isPending}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  // Get counts for tabs
  const assignedCount = stats.assignedToMe || 0;
  const urgentCount = stats.urgentCount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Help Desk Management
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage discussions, respond to members, and track issues
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
        </div>
      </div>

      {/* Stats */}
      <StaffStats stats={stats} />

      {/* Tabs */}
      <div className="scrollbar-none -mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {Object.values(STAFF_TABS).map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
            count={
              tab.key === 'assigned'
                ? assignedCount
                : tab.key === 'urgent'
                  ? urgentCount
                  : undefined
            }
          />
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
