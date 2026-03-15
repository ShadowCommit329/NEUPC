/**
 * @file Member notices client — filterable list of club announcements
 *   and alerts with read / dismiss functionality.
 * @module MemberNoticesClient
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useScrollLock } from '@/app/_lib/hooks';
import {
  Bell,
  Pin,
  AlertTriangle,
  Search,
  X,
  Paperclip,
  Eye,
  Calendar,
  User,
  ChevronRight,
  Clock,
  Megaphone,
  Trophy,
  CalendarDays,
  BellRing,
  CheckCheck,
  ExternalLink,
  Tag,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LS_KEY = 'neupc_read_notices';

function getReadSet() {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function saveReadSet(set) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
}

function timeAgo(str) {
  if (!str) return '';
  const diff = Math.floor((Date.now() - new Date(str)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isThisWeek(str) {
  if (!str) return false;
  return Date.now() - new Date(str) < 7 * 86400 * 1000;
}

function isExpired(str) {
  if (!str) return false;
  return new Date(str) < new Date();
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY = {
  critical: {
    label: 'Critical',
    dot: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-400 border-red-500/25',
    border: 'border-red-500/30',
    ring: 'ring-1 ring-red-500/20',
  },
  high: {
    label: 'High',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    border: 'border-orange-500/20',
    ring: '',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-amber-400',
    badge: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
    border: 'border-white/8',
    ring: '',
  },
  low: {
    label: 'Low',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
    border: 'border-white/8',
    ring: '',
  },
};

const TYPE_CONFIG = {
  urgent: {
    label: 'Urgent',
    icon: BellRing,
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
  },
  event: {
    label: 'Event',
    icon: CalendarDays,
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  },
  deadline: {
    label: 'Deadline',
    icon: Clock,
    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  },
  achievement: {
    label: 'Achievement',
    icon: Trophy,
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  general: {
    label: 'General',
    icon: Megaphone,
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  },
};

function getBadge(priority) {
  return PRIORITY[priority] ?? PRIORITY.medium;
}
function getTypeConfig(type) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.general;
}

// ─── Notice Detail Modal ──────────────────────────────────────────────────────

function NoticeModal({ notice, onClose }) {
  useScrollLock();
  const badge = getBadge(notice.priority);
  const typeConf = getTypeConfig(notice.notice_type);
  const TypeIcon = typeConf.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stripe by priority */}
        <div className={`h-1 w-full rounded-t-2xl ${badge.dot}`} />

        <div className="space-y-5 p-5 sm:p-6">
          {/* Top row */}
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${typeConf.color}`}
                >
                  <TypeIcon size={10} />
                  {typeConf.label}
                </span>
                {notice.is_pinned && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                    <Pin size={10} /> Pinned
                  </span>
                )}
                {isExpired(notice.expires_at) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-xs text-white/30">
                    Expired
                  </span>
                )}
              </div>
              {/* Title */}
              <h2 className="text-lg leading-snug font-bold text-white sm:text-xl">
                {notice.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/8 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-3 border-t border-b border-white/8 py-3 text-xs text-white/50">
            {notice.users?.full_name && (
              <span className="flex items-center gap-1.5">
                <User size={12} /> {notice.users.full_name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={12} /> {fmtDate(notice.created_at)}
            </span>
            {notice.views > 0 && (
              <span className="flex items-center gap-1.5">
                <Eye size={12} /> {notice.views} views
              </span>
            )}
            {notice.expires_at && (
              <span
                className={`flex items-center gap-1.5 ${isExpired(notice.expires_at) ? 'text-red-400' : 'text-amber-400'}`}
              >
                <Clock size={12} /> Expires {fmtDate(notice.expires_at)}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-white/75">
            {notice.content}
          </div>

          {/* Target audience */}
          {notice.target_audience?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold tracking-wider text-white/40 uppercase">
                Target Audience
              </p>
              <div className="flex flex-wrap gap-1.5">
                {notice.target_audience.map((role) => (
                  <span
                    key={role}
                    className="rounded-md border border-white/8 bg-white/5 px-2 py-0.5 text-xs text-white/50 capitalize"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {notice.attachments?.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-white/40 uppercase">
                <Paperclip size={11} /> Attachments ({notice.attachments.length}
                )
              </p>
              <div className="space-y-1.5">
                {notice.attachments.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 text-sm text-violet-400 transition-colors hover:text-violet-300"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="truncate">
                      {url.split('/').pop() || `Attachment ${i + 1}`}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Notice Card ──────────────────────────────────────────────────────────────

function NoticeCard({ notice, isRead, onClick }) {
  const badge = getBadge(notice.priority);
  const typeConf = getTypeConfig(notice.notice_type);
  const TypeIcon = typeConf.icon;
  const expired = isExpired(notice.expires_at);

  return (
    <button
      onClick={() => onClick(notice)}
      className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 sm:p-5 ${!isRead ? `bg-white/4 ${badge.border} ${badge.ring} hover:bg-white/6` : 'border-white/6 bg-white/2 hover:border-white/10 hover:bg-white/4'} ${expired ? 'opacity-60' : ''} `}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Priority dot + type icon */}
        <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${badge.dot} ${!isRead ? 'opacity-80 ring-2 ring-current ring-offset-1 ring-offset-transparent' : 'opacity-50'}`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {notice.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-1.5 py-0.5 text-xs text-white/50">
                <Pin size={9} /> Pinned
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${typeConf.color}`}
            >
              <TypeIcon size={9} /> {typeConf.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${badge.badge}`}
            >
              {badge.label}
            </span>
            {!isRead && (
              <span className="rounded-full border border-violet-500/25 bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-400">
                New
              </span>
            )}
            {expired && (
              <span className="rounded-full border border-white/8 bg-white/5 px-1.5 py-0.5 text-xs text-white/30">
                Expired
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className={`line-clamp-2 text-sm leading-snug transition-colors group-hover:text-violet-300 ${!isRead ? 'font-semibold text-white' : 'font-medium text-white/70'}`}
          >
            {notice.title}
          </h3>

          {/* Content preview */}
          <p className="line-clamp-2 text-xs leading-relaxed text-white/45">
            {notice.content}
          </p>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/35">
            {notice.users?.full_name && (
              <span className="flex items-center gap-1">
                <User size={10} /> {notice.users.full_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} /> {timeAgo(notice.created_at)}
            </span>
            {notice.views > 0 && (
              <span className="flex items-center gap-1">
                <Eye size={10} /> {notice.views}
              </span>
            )}
            {notice.attachments?.length > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip size={10} /> {notice.attachments.length}
              </span>
            )}
            {notice.expires_at && !expired && (
              <span className="flex items-center gap-1 text-amber-400/70">
                <Calendar size={10} /> Expires {fmtDate(notice.expires_at)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          size={15}
          className="mt-1 shrink-0 text-white/20 transition-colors group-hover:text-white/50"
        />
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'critical', label: 'Critical' },
];

export default function MemberNoticesClient({ notices = [] }) {
  const [readSet, setReadSet] = useState(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [criticalDismissed, setCriticalDismissed] = useState(false);

  // Load read state from localStorage after mount
  useEffect(() => {
    setReadSet(getReadSet());
    setHydrated(true);
  }, []);

  function markRead(id) {
    setReadSet((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadSet(next);
      return next;
    });
  }

  function markAllRead() {
    const next = new Set(notices.map((n) => n.id));
    setReadSet(next);
    saveReadSet(next);
  }

  function openNotice(notice) {
    markRead(notice.id);
    setSelected(notice);
  }

  // Critical unread banner
  const criticalBanner = useMemo(
    () =>
      notices.find(
        (n) =>
          n.priority === 'critical' &&
          !readSet.has(n.id) &&
          !isExpired(n.expires_at)
      ),
    [notices, readSet]
  );

  // Filter pipeline
  const filtered = useMemo(() => {
    let list = [...notices];

    // Tab
    if (activeTab === 'unread') list = list.filter((n) => !readSet.has(n.id));
    else if (activeTab === 'pinned') list = list.filter((n) => n.is_pinned);
    else if (activeTab === 'critical')
      list = list.filter((n) => n.priority === 'critical');

    // Type
    if (typeFilter !== 'all')
      list = list.filter((n) => n.notice_type === typeFilter);

    // Priority
    if (priorityFilter !== 'all')
      list = list.filter((n) => n.priority === priorityFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q) ||
          n.users?.full_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [notices, activeTab, typeFilter, priorityFilter, search, readSet]);

  // Stats
  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: notices.length,
      unread: hydrated ? notices.filter((n) => !readSet.has(n.id)).length : 0,
      critical: notices.filter((n) => n.priority === 'critical').length,
      thisWeek: notices.filter((n) => isThisWeek(n.created_at)).length,
      pinned: notices.filter((n) => n.is_pinned).length,
    };
  }, [notices, readSet, hydrated]);

  const types = useMemo(
    () => [...new Set(notices.map((n) => n.notice_type).filter(Boolean))],
    [notices]
  );
  const priorities = useMemo(
    () => [...new Set(notices.map((n) => n.priority).filter(Boolean))],
    [notices]
  );

  const tabCounts = useMemo(
    () => ({
      all: notices.length,
      unread: stats.unread,
      pinned: stats.pinned,
      critical: stats.critical,
    }),
    [notices, stats]
  );

  return (
    <>
      {selected && (
        <NoticeModal notice={selected} onClose={() => setSelected(null)} />
      )}

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Notices &amp; Announcements
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Important updates from the club administration
            </p>
          </div>
          {hydrated && stats.unread > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/60 transition-colors hover:bg-white/8 hover:text-white sm:self-auto"
            >
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
        </div>

        {/* Critical banner */}
        {criticalBanner && !criticalDismissed && (
          <div className="relative flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/8 p-4">
            <div className="shrink-0 rounded-xl bg-red-500/20 p-2 text-red-400">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-xs font-semibold tracking-wider text-red-400 uppercase">
                Critical Notice
              </p>
              <p className="line-clamp-1 text-sm font-semibold text-white">
                {criticalBanner.title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-white/50">
                {criticalBanner.content}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => openNotice(criticalBanner)}
                className="rounded-lg border border-red-500/25 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
              >
                View
              </button>
              <button
                onClick={() => setCriticalDismissed(true)}
                className="p-1 text-white/30 transition-colors hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {[
            {
              label: 'Total',
              value: stats.total,
              icon: Bell,
              color: 'text-violet-400',
            },
            {
              label: 'Unread',
              value: hydrated ? stats.unread : '—',
              icon: BellRing,
              color: 'text-blue-400',
            },
            {
              label: 'Critical',
              value: stats.critical,
              icon: AlertTriangle,
              color: 'text-red-400',
            },
            {
              label: 'This Week',
              value: stats.thisWeek,
              icon: CalendarDays,
              color: 'text-emerald-400',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 p-3 backdrop-blur-sm sm:gap-3 sm:p-4"
            >
              <Icon size={18} className={`${color} shrink-0`} />
              <div>
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-xs text-white/40">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border border-violet-500/30 bg-violet-600/20 text-violet-300'
                  : 'border border-white/8 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
              }`}
            >
              {tab.label}
              {hydrated && tabCounts[tab.id] > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === tab.id ? 'bg-violet-500/30 text-violet-200' : 'bg-white/10 text-white/40'}`}
                >
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notices…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-9 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-white/30 transition-colors hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Type filter */}
          {types.length > 1 && (
            <div className="flex flex-wrap gap-1.5 sm:flex-nowrap">
              {['all', ...types].map((t) => {
                const conf = t === 'all' ? null : getTypeConfig(t);
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`shrink-0 rounded-xl border px-2.5 py-2 text-xs capitalize transition-colors ${
                      typeFilter === t
                        ? 'border-violet-500/30 bg-violet-600/20 text-violet-300'
                        : 'border-white/8 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {t === 'all' ? 'All types' : conf?.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Priority filter */}
          {priorities.length > 1 && (
            <div className="flex flex-wrap gap-1.5 sm:flex-nowrap">
              {['all', ...priorities].map((p) => {
                const b = p === 'all' ? null : getBadge(p);
                return (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`shrink-0 rounded-xl border px-2.5 py-2 text-xs capitalize transition-colors ${
                      priorityFilter === p
                        ? 'border-violet-500/30 bg-violet-600/20 text-violet-300'
                        : 'border-white/8 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {p === 'all' ? 'All priorities' : b?.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-white/35">
          {filtered.length} {filtered.length === 1 ? 'notice' : 'notices'}
          {search ? ` matching "${search}"` : ''}
        </p>

        {/* List */}
        {notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 bg-white/2 py-24">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Bell size={24} className="text-white/20" />
            </div>
            <div className="space-y-1 text-center">
              <p className="font-medium text-white/50">No Notices Available</p>
              <p className="text-sm text-white/30">You're all caught up!</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 bg-white/2 py-16">
            <Search size={24} className="text-white/20" />
            <p className="text-sm text-white/40">
              No notices match your filters.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
                setPriorityFilter('all');
                setActiveTab('all');
              }}
              className="text-sm text-violet-400 transition-colors hover:text-violet-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                isRead={hydrated && readSet.has(notice.id)}
                onClick={openNotice}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
