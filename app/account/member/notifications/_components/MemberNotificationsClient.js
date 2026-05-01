/**
 * @file Member Notifications Client — redesigned to match Linear/Vercel dark UI.
 * @module MemberNotificationsClient
 */

'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Bell,
  BellOff,
  Calendar,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Zap,
  BookOpen,
  MessageSquare,
  Settings,
  Check,
  CheckCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  markAsReadAction,
  markAllAsReadAction,
  deleteNotificationAction,
} from '@/app/_lib/notification-actions';

// ─── Mock data ────────────────────────────────────────────────────────────────

const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();

const MOCK_NOTIFICATIONS = [
  { id: 'n1', notification_type: 'event',       title: 'Web3 Workshop starts in 2 hours',             message: 'Reminder for your registered event on Mar 20 at 2:00 PM.', created_at: ago(0.05), is_read: false, link: null },
  { id: 'n2', notification_type: 'mention',     title: 'Sajid Hossain replied to your thread',         message: '"How to debug Express middleware order?"',                  created_at: ago(0.2),  is_read: false, link: null },
  { id: 'n3', notification_type: 'achievement', title: "You earned the 'Open-Source Contributor' badge", message: '5 PRs merged in NEUPC repos.',                           created_at: ago(72),   is_read: true,  link: null },
  { id: 'n4', notification_type: 'system',      title: 'Codeforces sync completed',                    message: '+12 new submissions imported.',                           created_at: ago(5),    is_read: true,  link: null },
  { id: 'n5', notification_type: 'event',       title: "Spring Cup '26 registration opens tomorrow",   message: 'Save your seat — limited to 500 participants.',           created_at: ago(24),   is_read: true,  link: null },
  { id: 'n6', notification_type: 'system',      title: 'New lesson available: JWT Authentication',     message: 'In Full-Stack Web Development bootcamp.',                 created_at: ago(48),   is_read: true,  link: null },
  { id: 'n7', notification_type: 'mention',     title: 'Nusrat Jahan mentioned you in a thread',       message: '"Best resources for graph algorithms?" — check it out.',  created_at: ago(36),   is_read: true,  link: null },
  { id: 'n8', notification_type: 'achievement', title: "30-day streak milestone reached!",             message: "You've solved problems 30 days in a row. Keep it up!",   created_at: ago(96),   is_read: true,  link: null },
];

// ─── Type → icon + tone ───────────────────────────────────────────────────────

const TYPE_CONFIG = {
  event:       { icon: Calendar,      tone: 'accent',   label: 'Events'  },
  mention:     { icon: MessageSquare, tone: 'info',     label: 'Mentions'},
  achievement: { icon: Trophy,        tone: 'warning',  label: 'System'  },
  system:      { icon: Zap,           tone: 'default',  label: 'System'  },
  info:        { icon: AlertCircle,   tone: 'info',     label: 'System'  },
  success:     { icon: CheckCircle2,  tone: 'success',  label: 'System'  },
  lesson:      { icon: BookOpen,      tone: 'accent',   label: 'System'  },
};

const TONE_ICON = {
  accent:  'bg-indigo-500/15 text-indigo-300  border border-indigo-500/25',
  info:    'bg-blue-500/15   text-blue-300    border border-blue-500/25',
  warning: 'bg-yellow-500/15 text-yellow-300  border border-yellow-500/25',
  success: 'bg-green-500/15  text-green-300   border border-green-500/25',
  danger:  'bg-red-500/15    text-red-300     border border-red-500/25',
  default: 'bg-white/8       text-gray-300    border border-white/10',
};

function cfg(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.system;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all',      label: 'All'      },
  { id: 'unread',   label: 'Unread'   },
  { id: 'mentions', label: 'Mentions' },
  { id: 'events',   label: 'Events'   },
  { id: 'system',   label: 'System'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return 'now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function tabCount(notifs, tabId) {
  if (tabId === 'all')      return notifs.length;
  if (tabId === 'unread')   return notifs.filter(n => !n.is_read).length;
  if (tabId === 'mentions') return notifs.filter(n => n.notification_type === 'mention').length;
  if (tabId === 'events')   return notifs.filter(n => n.notification_type === 'event').length;
  if (tabId === 'system')   return notifs.filter(n => ['system','achievement','info','success','lesson'].includes(n.notification_type)).length;
  return 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MemberNotificationsClient({
  notifications: serverNotifs = [],
  unreadCount: _initialUnread = 0,
}) {
  const useMock = serverNotifs.length === 0;
  const [notifs, setNotifs] = useState(useMock ? MOCK_NOTIFICATIONS : serverNotifs);
  const [tab, setTab] = useState('all');
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const filtered = useMemo(() => {
    if (tab === 'all')      return notifs;
    if (tab === 'unread')   return notifs.filter(n => !n.is_read);
    if (tab === 'mentions') return notifs.filter(n => n.notification_type === 'mention');
    if (tab === 'events')   return notifs.filter(n => n.notification_type === 'event');
    if (tab === 'system')   return notifs.filter(n => ['system','achievement','info','success','lesson'].includes(n.notification_type));
    return notifs;
  }, [notifs, tab]);

  const markRead = (id) => {
    startTransition(async () => {
      if (!useMock) await markAsReadAction(id).catch(() => {});
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    });
  };

  const markAllRead = () => {
    startTransition(async () => {
      if (!useMock) await markAllAsReadAction().catch(() => {});
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    });
  };

  const del = (id) => {
    startTransition(async () => {
      if (!useMock) await deleteNotificationAction(id).catch(() => {});
      setNotifs(prev => prev.filter(n => n.id !== id));
    });
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">
            Inbox
          </h1>
          <p className="mt-1 text-[13px] text-white/40">
            {unreadCount > 0 ? `${unreadCount} unread · all caught up after that` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.09)', color: 'var(--text-2, #b4b6bd)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Check className="h-3.5 w-3.5" /> Mark all as read
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.09)', color: 'var(--text-2, #b4b6bd)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Settings className="h-3.5 w-3.5" /> Preferences
          </button>
        </div>
      </div>

      {/* Underline tabs */}
      <div className="flex gap-0 mb-5 overflow-x-auto scrollbar-none" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(({ id, label }) => {
          const count = tabCount(notifs, id);
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="relative flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors"
              style={{ color: active ? 'var(--text-1, #ededee)' : 'var(--text-3, #8a8d96)', border: 0, background: 'transparent' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-1, #ededee)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-3, #8a8d96)'; }}
            >
              {label}
              <span
                className="rounded-full px-1.5 py-px text-[10.5px] font-medium tabular-nums"
                style={{
                  background: active ? 'rgba(124,131,255,0.12)' : 'rgba(255,255,255,0.06)',
                  border: active ? '1px solid rgba(124,131,255,0.20)' : '1px solid rgba(255,255,255,0.06)',
                  color: active ? '#aab0ff' : 'var(--text-3, #8a8d96)',
                }}
              >
                {count}
              </span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t-full" style={{ background: 'var(--accent, #7c83ff)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <BellOff className="h-10 w-10 mb-3" style={{ color: 'var(--text-4, #5b5e66)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-3, #8a8d96)' }}>No notifications here</p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-2, #121317)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {filtered.map((n, i) => {
            const { icon: Icon, tone } = cfg(n.notification_type);
            const isLast = i === filtered.length - 1;
            return (
              <NotifRow
                key={n.id}
                notif={n}
                Icon={Icon}
                tone={tone}
                isLast={isLast}
                isPending={isPending}
                onMarkRead={() => markRead(n.id)}
                onDelete={() => del(n.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── NotifRow ─────────────────────────────────────────────────────────────────

function NotifRow({ notif, Icon, tone, isLast, isPending, onMarkRead, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group"
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto 8px',
        gap: '14px',
        alignItems: 'center',
        padding: '12px 18px',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        background: hovered
          ? 'var(--bg-3, #181a1f)'
          : notif.is_read
            ? 'transparent'
            : 'rgba(124,131,255,0.04)',
        transition: 'background .12s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div
        className={`flex items-center justify-center rounded-lg ${TONE_ICON[tone] || TONE_ICON.default}`}
        style={{ width: 32, height: 32 }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Body */}
      <div className="min-w-0 flex flex-col gap-0.5">
        <div
          className="text-[13px] font-medium leading-snug"
          style={{ color: notif.is_read ? 'var(--text-2, #b4b6bd)' : 'var(--text-1, #ededee)' }}
        >
          {notif.title}
        </div>
        {notif.message && (
          <div
            className="text-[11.5px] truncate"
            style={{ color: 'var(--text-3, #8a8d96)' }}
          >
            {notif.message}
          </div>
        )}
        {/* Inline actions — show on hover */}
        {hovered && (
          <div className="flex items-center gap-2 mt-1">
            {!notif.is_read && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-2, #b4b6bd)' }}
              >
                <Check className="h-2.5 w-2.5" /> Mark read
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-3, #8a8d96)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = '#fca5a5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-3, #8a8d96)'; }}
            >
              <Trash2 className="h-2.5 w-2.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Time */}
      <div
        className="text-[11.5px] tabular-nums shrink-0 whitespace-nowrap"
        style={{ color: 'var(--text-3, #8a8d96)' }}
      >
        {timeAgo(notif.created_at)}
      </div>

      {/* Unread dot */}
      <div className="flex items-center justify-center">
        {!notif.is_read && (
          <span
            className="rounded-full"
            style={{ width: 6, height: 6, background: 'var(--accent, #7c83ff)', display: 'block' }}
          />
        )}
      </div>
    </div>
  );
}
