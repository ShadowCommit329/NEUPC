/**
 * @file Event management client — full-featured admin interface for
 *   listing, filtering, creating, editing, archiving, and featuring
 *   club events with stats, registration data, and grid / table views.
 * @module AdminEventManagementClient
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Star,
  Search,
  PlusCircle,
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Zap,
  LayoutGrid,
  LayoutList,
  Filter,
  ArrowUpDown,
  Eye,
  Edit3,
  Trash2,
  Loader2,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { driveImageUrl } from '@/app/_lib/utils';
import EventCard from './EventCard';
import EventFormPanel from './EventFormPanel';
import RegistrationsModal from './RegistrationsModal';
import {
  getStatusConfig,
  getCategoryConfig,
  formatEventDate,
  CATEGORIES,
  STATUSES,
} from './eventConfig';
import { deleteEventAction } from '@/app/_lib/event-actions';

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'title', label: 'Title A–Z' },
  { key: 'registrations', label: 'Most Registrations' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
  accentGradient,
  sub,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/6 hover:shadow-lg hover:shadow-black/20">
      {/* Subtle gradient accent */}
      <div
        className={`absolute -top-12 -right-12 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40 ${accentGradient || 'bg-blue-500'}`}
      />
      <div className="relative flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl leading-none font-bold tracking-tight text-white tabular-nums">
            {value}
          </p>
          <p className="mt-1.5 truncate text-xs font-medium text-gray-500">
            {label}
          </p>
          {sub && (
            <p className="mt-0.5 truncate text-[10px] text-gray-600">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab, onCreate }) {
  const messages = {
    all: {
      icon: CalendarDays,
      title: 'No events yet',
      sub: 'Create your first event to get started with your community.',
      gradient: 'from-blue-500/20 to-cyan-500/20',
    },
    draft: {
      icon: FileEdit,
      title: 'No draft events',
      sub: 'Events saved without publishing will appear here.',
      gradient: 'from-gray-500/20 to-slate-500/20',
    },
    upcoming: {
      icon: Clock,
      title: 'No upcoming events',
      sub: 'Schedule your next event to see it here.',
      gradient: 'from-emerald-500/20 to-teal-500/20',
    },
    ongoing: {
      icon: Zap,
      title: 'No ongoing events',
      sub: 'Events that are currently running will appear here.',
      gradient: 'from-amber-500/20 to-orange-500/20',
    },
    completed: {
      icon: CheckCircle2,
      title: 'No completed events',
      sub: 'Finished events will be archived here.',
      gradient: 'from-green-500/20 to-emerald-500/20',
    },
    cancelled: {
      icon: XCircle,
      title: 'No cancelled events',
      sub: 'Cancelled events will be listed here.',
      gradient: 'from-red-500/20 to-rose-500/20',
    },
  };
  const { icon: Icon, title, sub, gradient } = messages[tab] ?? messages.all;
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/2 py-24 text-center">
      {/* Background decoration */}
      <div
        className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-30 blur-3xl`}
      />
      <div className="relative">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/8 bg-white/5 shadow-inner">
          <Icon className="h-10 w-10 text-gray-600" strokeWidth={1.5} />
        </div>
        <p className="text-lg font-bold text-gray-200">{title}</p>
        {sub && (
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
            {sub}
          </p>
        )}
        {tab === 'all' && (
          <button
            onClick={onCreate}
            className="mt-8 flex items-center gap-2.5 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-900/40"
          >
            <PlusCircle className="h-4 w-4" />
            Create Your First Event
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventManagementClient({
  initialEvents,
  stats,
  roles = [],
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('grid');
  const [viewRegEvent, setViewRegEvent] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [tableDeleteId, setTableDeleteId] = useState(null);
  const [tableDeletePending, setTableDeletePending] = useState(false);

  // ── live stats ──────────────────────────────────────────────────────────────
  const liveStats = useMemo(
    () => ({
      total: events.length,
      draft: events.filter((e) => e.status === 'draft').length,
      upcoming: events.filter((e) => e.status === 'upcoming').length,
      ongoing: events.filter((e) => e.status === 'ongoing').length,
      completed: events.filter((e) => e.status === 'completed').length,
      cancelled: events.filter((e) => e.status === 'cancelled').length,
      featured: events.filter((e) => e.is_featured).length,
      totalRegistrations: events.reduce(
        (s, e) => s + (e.registrationCount ?? 0),
        0
      ),
    }),
    [events]
  );

  // ── filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = events;
    if (activeTab !== 'all') list = list.filter((e) => e.status === activeTab);
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          e.description?.toLowerCase().includes(term) ||
          e.location?.toLowerCase().includes(term) ||
          e.category?.toLowerCase().includes(term)
      );
    }
    if (categoryFilter)
      list = list.filter((e) => e.category === categoryFilter);

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.start_date) - new Date(b.start_date);
        case 'title':
          return (a.title ?? '').localeCompare(b.title ?? '');
        case 'registrations':
          return (b.registrationCount ?? 0) - (a.registrationCount ?? 0);
        default:
          return new Date(b.start_date) - new Date(a.start_date);
      }
    });
    return list;
  }, [events, activeTab, search, categoryFilter, sortBy]);

  // ── table delete handler ────────────────────────────────────────────────────
  async function handleTableDelete(eventId) {
    setTableDeletePending(true);
    const fd = new FormData();
    fd.set('id', eventId);
    const result = await deleteEventAction(fd);
    setTableDeletePending(false);
    setTableDeleteId(null);
    if (!result?.error) router.refresh();
  }

  const statusTabs = [
    { key: 'all', label: 'All', count: liveStats.total, icon: CalendarDays },
    { key: 'draft', label: 'Draft', count: liveStats.draft, icon: FileEdit },
    {
      key: 'upcoming',
      label: 'Upcoming',
      count: liveStats.upcoming,
      icon: Clock,
    },
    { key: 'ongoing', label: 'Ongoing', count: liveStats.ongoing, icon: Zap },
    {
      key: 'completed',
      label: 'Completed',
      count: liveStats.completed,
      icon: CheckCircle2,
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: liveStats.cancelled,
      icon: XCircle,
    },
  ];

  const hasActiveFilters = search || categoryFilter || activeTab !== 'all';

  return (
    <>
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-500/8 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* Breadcrumb */}
            <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">Events</span>
            </nav>

            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/25">
                <CalendarDays className="h-5 w-5 text-blue-400" />
              </div>
              Event Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage, create, and monitor all club events in one place.
              <span className="ml-1 inline-flex items-center gap-1 text-gray-600">
                <BarChart3 className="h-3 w-3" />
                {liveStats.total} event{liveStats.total !== 1 ? 's' : ''} ·{' '}
                {liveStats.totalRegistrations} registration
                {liveStats.totalRegistrations !== 1 ? 's' : ''}
              </span>
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
              onClick={() => setCreateOpen(true)}
              className="group flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-900/40"
            >
              <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              New Event
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Total Events"
          value={liveStats.total}
          colorClass="bg-blue-500/15 text-blue-400"
          accentGradient="bg-blue-500"
        />
        <StatCard
          icon={Users}
          label="Total Registrations"
          value={liveStats.totalRegistrations}
          colorClass="bg-emerald-500/15 text-emerald-400"
          accentGradient="bg-emerald-500"
        />
        <StatCard
          icon={Zap}
          label="Ongoing / Upcoming"
          value={liveStats.ongoing + liveStats.upcoming}
          sub={`${liveStats.ongoing} live · ${liveStats.upcoming} scheduled`}
          colorClass="bg-amber-500/15 text-amber-400"
          accentGradient="bg-amber-500"
        />
        <StatCard
          icon={Star}
          label="Featured"
          value={liveStats.featured}
          sub={`${liveStats.completed} completed`}
          colorClass="bg-purple-500/15 text-purple-400"
          accentGradient="bg-purple-500"
        />
      </div>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-3 backdrop-blur-sm sm:p-4">
        {/* Row 1: Tabs + View Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 overflow-x-auto">
            {statusTabs.map(({ key, label, count, icon: Icon }) => {
              const active = activeTab === key;
              const sc = key !== 'all' ? getStatusConfig(key) : null;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
                    active
                      ? 'bg-white/12 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                  }`}
                >
                  {sc ? (
                    <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {label}
                  <span
                    className={`min-w-5 rounded-md px-1.5 py-0.5 text-center text-[10px] tabular-nums ${
                      active ? 'bg-white/10 text-gray-200' : 'text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/8 bg-white/3 p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                view === 'grid'
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                view === 'table'
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search + Filters + Sort */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events by title, location, or category…"
              className="w-full rounded-xl border border-white/8 bg-white/4 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500/30 focus:bg-white/6 focus:ring-1 focus:ring-blue-500/15"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 text-gray-500 transition-colors hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 shrink-0 text-gray-600" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 pr-8 text-sm text-gray-400 scheme-dark transition-all outline-none focus:border-white/20 focus:text-white"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-gray-600" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 pr-8 text-sm text-gray-400 scheme-dark transition-all outline-none focus:border-white/20 focus:text-white"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Result count (only when filters are active) */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/2 px-3 py-2">
            <p className="text-xs text-gray-600">
              Showing{' '}
              <span className="font-semibold text-gray-300">
                {filtered.length}
              </span>{' '}
              of <span className="tabular-nums">{events.length}</span> events
            </p>
            {(search || categoryFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('');
                  setActiveTab('all');
                }}
                className="flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
              >
                <X className="h-3 w-3" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState tab={activeTab} onCreate={() => setCreateOpen(true)} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={(e) => setEditEvent(e)}
              onViewRegistrations={(e) => setViewRegEvent(e)}
            />
          ))}
        </div>
      ) : (
        /* ── Table view ─────────────────────────────────── */
        <div className="overflow-hidden rounded-2xl border border-white/8 shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8 bg-white/4">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    Event
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-400 uppercase md:table-cell">
                    Category
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-400 uppercase lg:table-cell">
                    Date
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-gray-400 uppercase md:table-cell">
                    Registrations
                  </th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((event) => {
                  const sc = getStatusConfig(event.status);
                  const cc = getCategoryConfig(event.category);
                  const isDeleting = tableDeleteId === event.id;
                  return (
                    <tr
                      key={event.id}
                      className="group transition-colors duration-150 hover:bg-white/4"
                    >
                      {/* Event info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/8">
                            {event.cover_image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={driveImageUrl(event.cover_image)}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src =
                                    '/placeholder-event.svg';
                                }}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            ) : (
                              <div
                                className={`flex h-full w-full items-center justify-center bg-linear-to-br text-lg ${cc.placeholder}`}
                              >
                                {cc.icon}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-white">
                                {event.title}
                              </p>
                              {event.is_featured && (
                                <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                              )}
                            </div>
                            {event.location && (
                              <p className="mt-0.5 truncate text-xs text-gray-600">
                                {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="hidden px-5 py-3.5 md:table-cell">
                        {event.category && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold ${cc.badge}`}
                          >
                            {cc.icon} {event.category}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${sc.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${sc.dot}`}
                          />
                          {sc.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="hidden px-5 py-3.5 text-xs text-gray-400 lg:table-cell">
                        {formatEventDate(event.start_date)}
                        {event.end_date &&
                          event.end_date !== event.start_date && (
                            <span className="text-gray-600">
                              {' '}
                              → {formatEventDate(event.end_date)}
                            </span>
                          )}
                      </td>

                      {/* Registrations */}
                      <td className="hidden px-5 py-3.5 md:table-cell">
                        <span className="text-sm font-semibold text-white tabular-nums">
                          {event.registrationCount ?? 0}
                        </span>
                        {event.max_participants && (
                          <span className="text-xs text-gray-600">
                            {' '}
                            / {event.max_participants}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {isDeleting ? (
                            <>
                              <button
                                onClick={() => handleTableDelete(event.id)}
                                disabled={tableDeletePending}
                                className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-red-400 transition-colors hover:bg-red-500/30"
                              >
                                {tableDeletePending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Confirm'
                                )}
                              </button>
                              <button
                                onClick={() => setTableDeleteId(null)}
                                className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[10px] text-gray-500 transition-colors hover:bg-white/8"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setViewRegEvent(event)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all duration-150 hover:bg-white/8 hover:text-white"
                                title="View registrations"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditEvent(event)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all duration-150 hover:bg-blue-500/15 hover:text-blue-400"
                                title="Edit event"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setTableDeleteId(event.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all duration-150 hover:bg-red-500/15 hover:text-red-400"
                                title="Delete event"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/6 bg-white/2 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="mr-1 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
            Status Lifecycle
          </p>
          <div className="h-3 w-px bg-white/8" />
          {STATUSES.map((s) => {
            const sc = getStatusConfig(s);
            return (
              <div
                key={s}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors ${sc.cardBg} ${sc.cardBorder}`}
              >
                <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                <span className={`text-xs font-semibold ${sc.text}`}>
                  {sc.label}
                </span>
              </div>
            );
          })}
          <span className="ml-auto text-[10px] text-gray-600">
            Change status via card dropdown or edit panel
          </span>
        </div>
      </div>

      {/* ── Panels / Modals ─────────────────────────────── */}
      {createOpen && (
        <EventFormPanel
          roles={roles}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      )}

      {editEvent && (
        <EventFormPanel
          event={editEvent}
          roles={roles}
          onClose={() => setEditEvent(null)}
          onSaved={() => {
            setEditEvent(null);
            router.refresh();
          }}
        />
      )}

      {viewRegEvent && (
        <RegistrationsModal
          event={viewRegEvent}
          onClose={() => setViewRegEvent(null)}
        />
      )}
    </>
  );
}
