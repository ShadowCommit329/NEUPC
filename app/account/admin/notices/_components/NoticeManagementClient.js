/**
 * @file Notice management client — admin interface for listing,
 *   creating, editing, pinning, and archiving club announcements
 *   with audience targeting and priority controls.
 * @module AdminNoticeManagementClient
 */

'use client';

import { useState, useMemo } from 'react';
import {
  NOTICE_TYPES,
  PRIORITIES,
  TABS,
  getStatCards,
  getTypeConfig,
  getPriorityConfig,
  isExpired,
} from './noticeConfig';
import NoticeRow from './NoticeRow';
import NoticeFormModal from './NoticeFormModal';
import { Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function StatCard({ card }) {
  return (
    <div
      className={`bg-linear-to-br ${card.color} flex items-center gap-3 rounded-xl border p-4`}
    >
      <span className="text-2xl">{card.icon}</span>
      <div>
        <p className="text-xs tracking-wide text-slate-400 uppercase">
          {card.label}
        </p>
        <p className={`text-xl font-bold ${card.text}`}>{card.value}</p>
      </div>
    </div>
  );
}

export default function NoticeManagementClient({ initialNotices, stats }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const filtered = useMemo(() => {
    let list = initialNotices;

    // Tab filter
    if (tab === 'active') list = list.filter((n) => !isExpired(n.expires_at));
    if (tab === 'pinned') list = list.filter((n) => n.is_pinned);
    if (tab === 'critical')
      list = list.filter((n) => n.priority === 'critical');
    if (tab === 'expired') list = list.filter((n) => isExpired(n.expires_at));

    // Type
    if (typeFilter) list = list.filter((n) => n.notice_type === typeFilter);

    // Priority
    if (priorityFilter)
      list = list.filter((n) => n.priority === priorityFilter);

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.notice_type.toLowerCase().includes(q)
      );
    }

    return list;
  }, [initialNotices, tab, search, typeFilter, priorityFilter]);

  const statCards = getStatCards(stats);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">Notices</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-500/25">
                <Bell className="h-5 w-5 text-sky-400" />
              </div>
              Notice Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage, pin, and schedule notices for club members.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
            <button
              onClick={() => setAddOpen(true)}
              className="group flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-900/30 transition-all hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-xl hover:shadow-sky-900/40"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              Post Notice
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((c) => (
          <StatCard key={c.label} card={c} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-700/50 pb-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'border-sky-500 bg-sky-900/20 text-sky-400'
                : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or content…"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 pr-4 pl-9 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
        >
          <option value="">All Types</option>
          {NOTICE_TYPES.map((t) => {
            const c = getTypeConfig(t);
            return (
              <option key={t} value={t}>
                {c.emoji} {c.label}
              </option>
            );
          })}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => {
            const c = getPriorityConfig(p);
            return (
              <option key={p} value={p}>
                {c.emoji} {c.label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-400">{filtered.length}</span>{' '}
        of{' '}
        <span className="font-semibold text-slate-400">
          {initialNotices.length}
        </span>{' '}
        notices
      </p>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((notice) => (
            <NoticeRow key={notice.id} notice={notice} onEdit={setEditItem} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-5xl">📭</span>
          <h3 className="mb-1 text-lg font-semibold text-slate-300">
            No notices found
          </h3>
          <p className="mb-6 text-sm text-slate-500">
            {search || typeFilter || priorityFilter
              ? 'Try adjusting your filters.'
              : 'Be the first to post a notice for your club.'}
          </p>
          {!search && !typeFilter && !priorityFilter && (
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
            >
              ➕ Post First Notice
            </button>
          )}
        </div>
      )}

      {/* Add modal */}
      {addOpen && <NoticeFormModal onClose={() => setAddOpen(false)} />}

      {/* Edit modal */}
      {editItem && (
        <NoticeFormModal notice={editItem} onClose={() => setEditItem(null)} />
      )}
    </div>
  );
}
