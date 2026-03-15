/**
 * @file Guest notifications client — full notification centre with
 *   filtering, read/unread management, and bulk actions.
 * @module GuestNotificationsClient
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScrollLock } from '@/app/_lib/hooks';
import {
  Bell,
  BellOff,
  Pin,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
  Paperclip,
  X,
  Search,
  Sparkles,
  Lock,
  Trophy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const READ_KEY = 'neupc_guest_read_notices';

const PRIORITY_META = {
  low: { label: 'Low', dot: 'bg-white/25', border: 'border-white/8', bar: '' },
  medium: {
    label: 'Medium',
    dot: 'bg-blue-400',
    border: 'border-blue-400/12',
    bar: 'bg-blue-400',
  },
  high: {
    label: 'High',
    dot: 'bg-amber-400 animate-pulse',
    border: 'border-amber-400/20',
    bar: 'bg-amber-400',
  },
  critical: {
    label: 'Critical',
    dot: 'bg-red-400 animate-pulse',
    border: 'border-red-400/30',
    bar: 'bg-red-400',
  },
};

const TYPE_META = {
  general: {
    label: 'General',
    icon: Info,
    color: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  },
  urgent: {
    label: 'Urgent',
    icon: AlertTriangle,
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
  },
  event: {
    label: 'Event',
    icon: Calendar,
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  },
  deadline: {
    label: 'Deadline',
    icon: Clock,
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  achievement: {
    label: 'Achievement',
    icon: Trophy,
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isThisWeek(iso) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 7 * 86400000;
}

// ─── Critical Banner ──────────────────────────────────────────────────────────
function CriticalBanner({ notice, onDismiss, onView }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-400/30 bg-red-400/8 p-5">
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-red-400" />
      <div className="flex items-start gap-3 pl-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-red-400/25 bg-red-400/15">
          <AlertTriangle className="size-4 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-red-400 uppercase">
              Critical
            </span>
            {notice.is_pinned && <Pin className="size-3 text-red-400/60" />}
          </div>
          <p className="text-sm font-semibold text-white/90">{notice.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-white/50">
            {notice.content}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => onView(notice)}
            className="rounded-lg border border-red-400/25 bg-red-400/15 px-3 py-1 text-xs font-medium text-red-300 transition hover:bg-red-400/22"
          >
            View
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg p-1 text-white/30 transition hover:bg-white/6 hover:text-white/60"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notice Card ──────────────────────────────────────────────────────────────
function NoticeCard({ notice, isRead, onRead, onOpen }) {
  const pm = PRIORITY_META[notice.priority] ?? PRIORITY_META.low;
  const tm = TYPE_META[notice.notice_type] ?? TYPE_META.general;
  const TypeIcon = tm.icon;

  const isExpiringSoon =
    notice.expires_at &&
    new Date(notice.expires_at) > new Date() &&
    new Date(notice.expires_at) - new Date() < 3 * 86400000;

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 hover:bg-white/5 ${
        !isRead ? `${pm.border} bg-white/4` : 'border-white/6 bg-white/2'
      }`}
      onClick={() => {
        onRead(notice.id);
        onOpen(notice);
      }}
    >
      {/* priority left bar */}
      {pm.bar && (
        <div
          className={`absolute inset-y-0 left-0 w-0.5 rounded-l-2xl ${pm.bar}`}
        />
      )}

      <div className="flex items-start gap-3 p-4 pl-5">
        {/* icon */}
        <div
          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border ${tm.color}`}
        >
          <TypeIcon className="size-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          {/* top row */}
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {!isRead && (
                <span className="inline-block size-1.5 shrink-0 rounded-full bg-blue-400" />
              )}
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tm.color}`}
              >
                {tm.label}
              </span>
              {notice.is_pinned && (
                <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
                  <Pin className="size-2.5" />
                  Pinned
                </span>
              )}
              {notice.priority === 'critical' && (
                <span className="flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  <span className={`size-1 rounded-full ${pm.dot}`} />
                  Critical
                </span>
              )}
              {notice.priority === 'high' && (
                <span className="flex items-center gap-1 rounded-full border border-amber-400/15 bg-amber-400/8 px-2 py-0.5 text-[10px] text-amber-400">
                  High
                </span>
              )}
            </div>
            <span className="shrink-0 text-[11px] text-white/25">
              {timeAgo(notice.created_at)}
            </span>
          </div>

          {/* title */}
          <p
            className={`text-sm leading-snug ${!isRead ? 'font-semibold text-white/90' : 'font-medium text-white/60'}`}
          >
            {notice.title}
          </p>

          {/* preview */}
          <p
            className={`mt-0.5 line-clamp-2 text-xs leading-relaxed ${!isRead ? 'text-white/50' : 'text-white/35'}`}
          >
            {notice.content}
          </p>

          {/* footer meta */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/25">
            {notice.users?.full_name && (
              <span>By {notice.users.full_name}</span>
            )}
            {notice.attachments?.length > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="size-3" />
                {notice.attachments.length} attachment
                {notice.attachments.length > 1 ? 's' : ''}
              </span>
            )}
            {isExpiringSoon && (
              <span className="flex items-center gap-1 text-amber-400/70">
                <Clock className="size-3" />
                Expires {formatDate(notice.expires_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function NoticeModal({ notice, onClose }) {
  useScrollLock(!!notice);
  if (!notice) return null;
  const pm = PRIORITY_META[notice.priority] ?? PRIORITY_META.low;
  const tm = TYPE_META[notice.notice_type] ?? TYPE_META.general;
  const TypeIcon = tm.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0d0d0f] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* priority stripe */}
        {pm.bar && <div className={`h-1 w-full ${pm.bar}`} />}

        {/* header */}
        <div className="flex items-start gap-3 border-b border-white/6 p-5">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${tm.color}`}
          >
            <TypeIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tm.color}`}
              >
                {tm.label}
              </span>
              {notice.priority !== 'low' && (
                <span
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${pm.bar === 'bg-red-400' ? 'border-red-400/20 bg-red-400/10 text-red-400' : pm.bar === 'bg-amber-400' ? 'border-amber-400/20 bg-amber-400/10 text-amber-400' : 'border-blue-400/20 bg-blue-400/10 text-blue-400'}`}
                >
                  <span className={`size-1.5 rounded-full ${pm.dot}`} />
                  {pm.label}
                </span>
              )}
              {notice.is_pinned && (
                <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-xs text-amber-400">
                  <Pin className="size-3" />
                  Pinned
                </span>
              )}
            </div>
            <h2 className="text-base leading-snug font-bold text-white">
              {notice.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-white/35 transition hover:bg-white/8 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* body */}
        <div className="space-y-4 overflow-y-auto p-5">
          <p className="text-sm leading-relaxed whitespace-pre-line text-white/60">
            {notice.content}
          </p>

          {/* meta grid */}
          <div className="grid grid-cols-2 gap-2">
            {notice.users?.full_name && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                <p className="mb-0.5 text-[10px] tracking-wider text-white/25 uppercase">
                  Posted by
                </p>
                <p className="text-xs text-white/60">
                  {notice.users.full_name}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <p className="mb-0.5 text-[10px] tracking-wider text-white/25 uppercase">
                Posted
              </p>
              <p className="text-xs text-white/60">
                {formatDate(notice.created_at)}
              </p>
            </div>
            {notice.expires_at && (
              <div
                className={`rounded-xl border p-3 ${new Date(notice.expires_at) < new Date() ? 'border-red-400/20 bg-red-400/5' : 'border-white/8 bg-white/3'}`}
              >
                <p className="mb-0.5 text-[10px] tracking-wider text-white/25 uppercase">
                  Expires
                </p>
                <p
                  className={`text-xs ${new Date(notice.expires_at) < new Date() ? 'text-red-400' : 'text-white/60'}`}
                >
                  {formatDate(notice.expires_at)}
                </p>
              </div>
            )}
            {notice.target_audience?.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                <p className="mb-1 text-[10px] tracking-wider text-white/25 uppercase">
                  Audience
                </p>
                <div className="flex flex-wrap gap-1">
                  {notice.target_audience.map((a) => (
                    <span
                      key={a}
                      className="rounded border border-white/8 bg-white/4 px-1.5 py-0.5 text-[10px] text-white/50 capitalize"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* attachments */}
          {notice.attachments?.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-white/30 uppercase">
                Attachments
              </p>
              <div className="space-y-1.5">
                {notice.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-xs text-white/50 transition hover:bg-white/6 hover:text-white/80"
                  >
                    <Paperclip className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {att.split('/').pop() || `Attachment ${i + 1}`}
                    </span>
                    <ExternalLink className="ml-auto size-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/6 p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-white/8 bg-white/4 py-2.5 text-sm text-white/50 transition hover:bg-white/8 hover:text-white/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuestNotificationsClient({ notices }) {
  const [readIds, setReadIds] = useState(new Set());
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [criticalDismissed, setCriticalDismissed] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Hydrate read state from localStorage after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(READ_KEY);
      if (raw) setReadIds(new Set(JSON.parse(raw)));
    } catch {}
    setMounted(true);
  }, []);

  function markRead(id) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  function markAllRead() {
    const ids = notices.map((n) => n.id);
    const next = new Set([...readIds, ...ids]);
    setReadIds(next);
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...next]));
    } catch {}
  }

  const isRead = (id) => !mounted || readIds.has(id);

  // derived counts
  const unreadCount = mounted
    ? notices.filter((n) => !readIds.has(n.id)).length
    : 0;
  const thisWeekCount = notices.filter((n) => isThisWeek(n.created_at)).length;
  const criticalNotice = notices.find(
    (n) => n.priority === 'critical' && !isRead(n.id)
  );

  // available types in current data
  const presentTypes = [
    'all',
    ...new Set(notices.map((n) => n.notice_type).filter(Boolean)),
  ];

  const filtered = useMemo(() => {
    return notices.filter((n) => {
      const matchSearch =
        !search ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        (n.content ?? '').toLowerCase().includes(search.toLowerCase());

      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'unread' && mounted && !readIds.has(n.id)) ||
        (activeTab === 'pinned' && n.is_pinned) ||
        (activeTab === 'critical' && n.priority === 'critical');

      const matchType = typeFilter === 'all' || n.notice_type === typeFilter;
      return matchSearch && matchTab && matchType;
    });
  }, [notices, search, activeTab, typeFilter, readIds, mounted]);

  const TABS = [
    { key: 'all', label: 'All', count: notices.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    {
      key: 'pinned',
      label: 'Pinned',
      count: notices.filter((n) => n.is_pinned).length,
    },
    {
      key: 'critical',
      label: 'Critical',
      count: notices.filter((n) => n.priority === 'critical').length,
    },
  ].filter((t) => t.key === 'all' || t.count > 0);

  return (
    <>
      <NoticeModal notice={selected} onClose={() => setSelected(null)} />

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Notifications
          </h1>
          <p className="text-sm text-white/40">
            Stay updated with important club announcements
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white/50 transition hover:bg-white/8 hover:text-white/70 sm:self-auto"
          >
            <CheckCircle2 className="size-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total',
            value: notices.length,
            icon: Bell,
            color: 'text-blue-400',
          },
          {
            label: 'Unread',
            value: unreadCount,
            icon: Bell,
            color: 'text-violet-400',
          },
          {
            label: 'This Week',
            value: thisWeekCount,
            icon: Calendar,
            color: 'text-emerald-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5">
              <Icon className={`size-4 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Critical banner ── */}
      {criticalNotice && !criticalDismissed && (
        <CriticalBanner
          notice={criticalNotice}
          onDismiss={() => setCriticalDismissed(true)}
          onView={(n) => {
            markRead(n.id);
            setSelected(n);
          }}
        />
      )}

      {/* ── Search + type filter ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications…"
            className="w-full rounded-xl border border-white/8 bg-white/4 py-2.5 pr-4 pl-9 text-sm text-white placeholder-white/30 transition outline-none focus:border-white/20 focus:bg-white/6"
          />
        </div>
        {presentTypes.length > 2 && (
          <div className="flex flex-wrap gap-1.5">
            {presentTypes.map((t) => {
              const m = TYPE_META[t];
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    typeFilter === t
                      ? t === 'all'
                        ? 'border-white/20 bg-white/12 text-white'
                        : m?.color
                      : 'border-white/8 bg-white/3 text-white/40 hover:text-white/70'
                  }`}
                >
                  {t === 'all' ? 'All Types' : (m?.label ?? t)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex w-fit gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              activeTab === tab.key
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === tab.key ? 'bg-white/15 text-white/80' : 'bg-white/6 text-white/30'}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Notices list ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/3 py-16">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
            <BellOff className="size-6 text-white/20" />
          </div>
          <div className="text-center">
            <p className="font-medium text-white/55">No notifications found</p>
            <p className="mt-1 text-sm text-white/30">
              {notices.length === 0
                ? 'Check back later for club announcements.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
          {(search || typeFilter !== 'all' || activeTab !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
                setActiveTab('all');
              }}
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2 text-xs text-white/50 transition hover:bg-white/8"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              isRead={isRead(notice.id)}
              onRead={markRead}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}

      {/* ── Locked member features ── */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/2">
        <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10">
            <Lock className="size-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/70">
              Unlock Advanced Notifications
            </h3>
            <p className="text-xs text-white/35">Available for club members</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          {[
            'Contest updates & reminders',
            'Leaderboard rank change alerts',
            'Achievement unlock notifications',
            'Exclusive workshop invitations',
            'Personalized event recommendations',
            'Mentor session alerts',
          ].map((feat) => (
            <div
              key={feat}
              className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-4 py-3"
            >
              <Lock className="size-3.5 shrink-0 text-white/20" />
              <span className="text-sm text-white/35">{feat}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-white/6 px-5 py-4">
          <p className="text-xs text-white/35">
            Members receive targeted, role-specific notifications.
          </p>
        </div>
      </div>
    </>
  );
}
