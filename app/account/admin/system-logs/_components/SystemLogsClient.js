/**
 * @file System logs client — admin interface for browsing, filtering,
 *   and searching platform audit and error logs with timestamp and
 *   severity indicators.
 * @module AdminSystemLogsClient
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ClipboardList,
  Activity,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Info,
  Users,
  FileText,
  Shield,
  Settings,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Globe,
  Clock,
  RefreshCw,
  Download,
  Filter,
  BarChart3,
  LogIn,
  LogOut,
  UserCog,
  Layers,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateFull(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.slice(0, 2) + '***@' + domain;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  info: {
    label: 'INFO',
    color: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
    icon: Info,
  },
  warning: {
    label: 'WARN',
    color: 'text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-400',
    icon: AlertTriangle,
  },
  error: {
    label: 'ERROR',
    color: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    icon: XCircle,
  },
};

const CATEGORY_CONFIG = {
  user_activity: {
    label: 'User Activity',
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    icon: Users,
  },
  content: {
    label: 'Content',
    color: 'text-green-300',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: FileText,
  },
  security: {
    label: 'Security',
    color: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: Shield,
  },
  system: {
    label: 'System',
    color: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: Settings,
  },
  other: {
    label: 'Other',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    icon: Layers,
  },
};

const MODULE_BAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-yellow-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, colorClass, alert }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-4 backdrop-blur-sm transition-colors ${
        alert ? 'border-red-500/25 bg-red-500/5' : 'border-white/8 bg-white/3'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wider text-gray-500 uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-2xl leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="mt-1 truncate text-[11px] text-gray-600">{sub}</p>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children, count, alert }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-white/12 text-white shadow-sm'
          : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
            alert
              ? 'bg-red-500/20 text-red-400'
              : active
                ? 'bg-white/15 text-white'
                : 'bg-white/6 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Empty({ message = 'No logs found' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ClipboardList className="mb-3 h-10 w-10 text-gray-700" />
      <p className="text-sm font-medium text-gray-500">{message}</p>
      <p className="mt-1 text-xs text-gray-700">Try adjusting your filters</p>
    </div>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
  const cat = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.other;
  const SevIcon = sev.icon;
  const userName = log.users?.full_name || log.details?.name || 'System';
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        log.severity === 'error'
          ? 'border-red-500/15 bg-red-500/3 hover:bg-red-500/5'
          : log.severity === 'warning'
            ? 'border-yellow-500/10 bg-yellow-500/3 hover:bg-yellow-500/5'
            : 'border-white/6 bg-white/2 hover:bg-white/4'
      }`}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-3.5 py-3">
        {/* Severity icon */}
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${sev.bg}`}
        >
          <SevIcon className={`h-3 w-3 ${sev.color}`} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Severity badge */}
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${sev.bg} ${sev.border} ${sev.color}`}
            >
              {sev.label}
            </span>
            {/* Category badge */}
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cat.bg} ${cat.border} ${cat.color}`}
            >
              {cat.label}
            </span>
            {/* Module badge */}
            {log.module && (
              <span className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[10px] text-gray-500">
                {log.module}
              </span>
            )}
          </div>
          {/* Action */}
          <p className="mt-1 text-xs font-semibold text-gray-200 capitalize">
            {(log.action || 'unknown').replace(/_/g, ' ')}
            {log.entity_type && (
              <span className="ml-2 text-[11px] font-normal text-gray-600">
                · {log.entity_type.replace(/_/g, ' ')}
              </span>
            )}
          </p>
          {/* Meta row */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
            {userName !== 'System' && (
              <span className="flex items-center gap-1">
                <Users className="h-2.5 w-2.5" />
                {userName}
                {log.users?.email && (
                  <span className="text-gray-700">
                    ({maskEmail(log.users.email)})
                  </span>
                )}
              </span>
            )}
            {log.ip_address && (
              <span className="flex items-center gap-1">
                <Globe className="h-2.5 w-2.5" />
                {log.ip_address}
              </span>
            )}
            {log.details?.summary && (
              <span className="max-w-xs truncate text-gray-600 italic">
                {log.details.summary}
              </span>
            )}
          </div>
        </div>

        {/* Right side: time + expand */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[10px] text-gray-700 tabular-nums">
            {timeAgo(log.created_at)}
          </span>
          {hasDetails && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] text-gray-600 transition-colors hover:bg-white/8 hover:text-gray-300"
            >
              {expanded ? 'hide' : 'details'}
              <ChevronRight
                className={`h-2.5 w-2.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="border-t border-white/6 px-3.5 pt-2.5 pb-3">
          <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
            Details
          </div>
          <pre className="scrollbar-none overflow-x-auto rounded-lg border border-white/6 bg-black/30 p-3 text-[11px] leading-relaxed text-gray-400">
            {JSON.stringify(log.details, null, 2)}
          </pre>
          {log.user_agent && (
            <p className="mt-2 truncate text-[10px] text-gray-700">
              <span className="text-gray-600">Agent:</span> {log.user_agent}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-gray-700">
            <span className="text-gray-600">Full timestamp:</span>{' '}
            {fmtDateFull(log.created_at)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Filters Bar ──────────────────────────────────────────────────────────────

function FiltersBar({
  search,
  onSearch,
  severityFilter,
  onSeverity,
  moduleFilter,
  onModule,
  moduleOptions,
  resultCount,
  totalCount,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search action, user, IP, module…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-9 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:bg-white/6 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Severity filter */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => onSeverity(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-7 pl-3 text-sm text-white focus:border-white/20 focus:outline-none sm:w-36 [&>option]:bg-gray-900"
            >
              <option value="all">All Severities</option>
              <option value="info">INFO</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>

          {/* Module filter */}
          {moduleOptions.length > 0 && (
            <div className="relative">
              <select
                value={moduleFilter}
                onChange={(e) => onModule(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-7 pl-3 text-sm text-white focus:border-white/20 focus:outline-none sm:w-36 [&>option]:bg-gray-900"
              >
                <option value="all">All Modules</option>
                {moduleOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            </div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-gray-700">
        Showing{' '}
        <span className="text-gray-400 tabular-nums">{resultCount}</span> of{' '}
        <span className="text-gray-400 tabular-nums">{totalCount}</span> logs
      </div>
    </div>
  );
}

// ─── Log List with filters ─────────────────────────────────────────────────────

function LogList({ logs }) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverity] = useState('all');
  const [moduleFilter, setModule] = useState('all');
  const [visibleCount, setVisibleCount] = useState(50);

  const moduleOptions = useMemo(
    () => [...new Set(logs.map((l) => l.module).filter(Boolean))].sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (severityFilter !== 'all' && log.severity !== severityFilter)
        return false;
      if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        log.action?.toLowerCase().includes(q) ||
        log.entity_type?.toLowerCase().includes(q) ||
        log.module?.toLowerCase().includes(q) ||
        log.users?.full_name?.toLowerCase().includes(q) ||
        log.users?.email?.toLowerCase().includes(q) ||
        log.ip_address?.toLowerCase().includes(q) ||
        JSON.stringify(log.details || {})
          .toLowerCase()
          .includes(q)
      );
    });
  }, [logs, search, severityFilter, moduleFilter]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      <FiltersBar
        search={search}
        onSearch={setSearch}
        severityFilter={severityFilter}
        onSeverity={setSeverity}
        moduleFilter={moduleFilter}
        onModule={setModule}
        moduleOptions={moduleOptions}
        resultCount={filtered.length}
        totalCount={logs.length}
      />
      {filtered.length === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="space-y-1.5">
            {visible.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
          {visible.length < filtered.length && (
            <button
              onClick={() => setVisibleCount((v) => v + 50)}
              className="w-full rounded-xl border border-white/8 bg-white/3 py-2.5 text-xs text-gray-500 transition-colors hover:bg-white/6 hover:text-gray-300"
            >
              Load more ({filtered.length - visible.length} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SystemLogsClient({ data }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-yellow-600" />
        <h2 className="text-lg font-semibold text-white">
          System logs unavailable
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Check your database connection and try again.
        </p>
      </div>
    );
  }

  const {
    overview,
    allLogs,
    categoryBreakdown,
    topModules,
    topActions,
    dailyActivity,
    generatedAt,
  } = data;

  // Per-category logs
  const logsByCategory = useMemo(
    () => ({
      user_activity: allLogs.filter((l) => l.category === 'user_activity'),
      content: allLogs.filter((l) => l.category === 'content'),
      security: allLogs.filter((l) => l.category === 'security'),
      system: allLogs.filter((l) => l.category === 'system'),
    }),
    [allLogs]
  );

  const maxDailyCount = Math.max(...dailyActivity.map((d) => d.count), 1);
  const maxModuleCount = topModules.length > 0 ? topModules[0][1] : 1;
  const totalTopActions = topActions.reduce((s, [, v]) => s + v, 0);

  return (
    <>
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-slate-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-500/8 blur-3xl" />
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
              <span className="font-medium text-gray-400">System Logs</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/15 ring-1 ring-slate-500/25">
                <ClipboardList className="h-5 w-5 text-slate-400" />
              </div>
              System Logs
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Full platform activity audit trail
              <span className="ml-1.5 inline-flex items-center gap-1 text-gray-600">
                <BarChart3 className="h-3 w-3" />
                {overview.totalLoaded.toLocaleString()} entries loaded
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
            <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-[11px] text-gray-600">
              <RefreshCw className="h-3 w-3" />
              {timeAgo(generatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-1.5">
        <TabBtn
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </TabBtn>
        <TabBtn
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          count={allLogs.length}
        >
          All Logs
        </TabBtn>
        <TabBtn
          active={activeTab === 'user_activity'}
          onClick={() => setActiveTab('user_activity')}
          count={categoryBreakdown.user_activity}
        >
          User Activity
        </TabBtn>
        <TabBtn
          active={activeTab === 'content'}
          onClick={() => setActiveTab('content')}
          count={categoryBreakdown.content}
        >
          Content
        </TabBtn>
        <TabBtn
          active={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
          count={categoryBreakdown.security}
          alert={categoryBreakdown.security > 0}
        >
          Security
        </TabBtn>
        <TabBtn
          active={activeTab === 'system'}
          onClick={() => setActiveTab('system')}
          count={categoryBreakdown.system}
        >
          System
        </TabBtn>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
           TAB: OVERVIEW
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={TrendingUp}
              label="Logs Today"
              value={overview.todayCount}
              sub="since midnight"
              colorClass="bg-blue-500/15 text-blue-400"
            />
            <StatCard
              icon={AlertTriangle}
              label="Warnings"
              value={overview.warningsCount}
              sub="in last 500 entries"
              colorClass="bg-yellow-500/15 text-yellow-400"
            />
            <StatCard
              icon={XCircle}
              label="Errors"
              value={overview.errorsCount}
              sub="in last 500 entries"
              colorClass="bg-red-500/15 text-red-400"
              alert={overview.errorsCount > 0}
            />
            <StatCard
              icon={Activity}
              label="Failed Actions"
              value={overview.failedCount}
              sub="across all types"
              colorClass="bg-orange-500/15 text-orange-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Unique Users"
              value={overview.uniqueUsers}
              sub="in last 500 entries"
              colorClass="bg-cyan-500/15 text-cyan-400"
            />
            <StatCard
              icon={Globe}
              label="Unique IPs"
              value={overview.uniqueIPs}
              sub="in last 500 entries"
              colorClass="bg-green-500/15 text-green-400"
            />
            <StatCard
              icon={Shield}
              label="Security Events"
              value={categoryBreakdown.security}
              sub="flagged logs"
              colorClass={
                categoryBreakdown.security > 5
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-purple-500/15 text-purple-400'
              }
              alert={categoryBreakdown.security > 5}
            />
            <StatCard
              icon={ClipboardList}
              label="Total Loaded"
              value={overview.totalLoaded}
              sub="max 500 from DB"
              colorClass="bg-gray-500/15 text-gray-400"
            />
          </div>

          {/* Daily Activity Chart */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
                <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">
                Daily Activity — Last 7 Days
              </h2>
            </div>
            <div className="flex h-32 items-end gap-1.5 sm:gap-2">
              {dailyActivity.map((day) => {
                const pct =
                  maxDailyCount > 0 ? (day.count / maxDailyCount) * 100 : 0;
                return (
                  <div
                    key={day.date}
                    className="group flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="relative flex w-full items-end justify-center"
                      style={{ height: '96px' }}
                    >
                      <div
                        className="relative w-full rounded-t-md bg-blue-500/40 transition-all group-hover:bg-blue-500/60"
                        style={{ height: `${Math.max(pct, 3)}%` }}
                      >
                        {day.count > 0 && (
                          <span className="absolute -top-5 right-0 left-0 text-center text-[9px] text-blue-300 tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                            {day.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="w-full truncate text-center text-[9px] text-gray-700">
                      {day.label.split(',')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Module & Action Breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top modules */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
                  <Layers className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <h2 className="text-sm font-semibold text-white">
                  Top Modules
                </h2>
              </div>
              {topModules.length === 0 ? (
                <p className="text-xs text-gray-600">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {topModules.map(([module, count], i) => {
                    const pct = Math.round((count / maxModuleCount) * 100);
                    return (
                      <div key={module} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${MODULE_BAR_COLORS[i] || 'bg-gray-500'}`}
                            />
                            <span className="font-medium text-gray-300">
                              {module}
                            </span>
                          </div>
                          <div className="flex gap-2 tabular-nums">
                            <span className="font-semibold text-white">
                              {count}
                            </span>
                            <span className="w-6 text-right text-gray-700">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                          <div
                            className={`h-full rounded-full ${MODULE_BAR_COLORS[i] || 'bg-gray-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top actions */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
                  <Activity className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <h2 className="text-sm font-semibold text-white">
                  Top Actions
                </h2>
              </div>
              {topActions.length === 0 ? (
                <p className="text-xs text-gray-600">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {topActions.map(([action, count]) => {
                    const pct =
                      totalTopActions > 0
                        ? Math.round((count / totalTopActions) * 100)
                        : 0;
                    const cfg = SEVERITY_CONFIG.info;
                    return (
                      <div
                        key={action}
                        className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/2 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-gray-300 capitalize">
                            {action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-blue-500/60"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-semibold text-white tabular-nums">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Category distribution */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">
                Category Distribution
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const count = categoryBreakdown[key] || 0;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (key !== 'other') setActiveTab(key);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${cfg.border} ${cfg.bg} hover:opacity-80`}
                  >
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                    <div>
                      <p
                        className={`text-lg font-bold tabular-nums ${cfg.color}`}
                      >
                        {count}
                      </p>
                      <p className="text-[10px] text-gray-600">{cfg.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
           TAB: ALL LOGS
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'all' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-white">
                All Activity Logs
              </h2>
            </div>
          </div>
          <LogList logs={allLogs} />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
           TAB: USER ACTIVITY
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'user_activity' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">
              User Activity Logs
            </h2>
            <span className="ml-auto rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
              {logsByCategory.user_activity.length} entries
            </span>
          </div>
          <LogList logs={logsByCategory.user_activity} />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
           TAB: CONTENT
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'content' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-5 flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">Content Logs</h2>
            <span className="ml-auto rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-300">
              {logsByCategory.content.length} entries
            </span>
          </div>
          <LogList logs={logsByCategory.content} />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
           TAB: SECURITY
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div className="rounded-2xl border border-red-500/10 bg-red-500/3 p-5">
          <div className="mb-5 flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-white">Security Logs</h2>
            <span className="ml-auto rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
              {logsByCategory.security.length} entries
            </span>
          </div>
          {logsByCategory.security.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Shield className="mb-3 h-10 w-10 text-green-700" />
              <p className="text-sm font-semibold text-green-400">
                No Security Events
              </p>
              <p className="mt-1 text-xs text-gray-700">
                No suspicious activity detected
              </p>
            </div>
          ) : (
            <LogList logs={logsByCategory.security} />
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
           TAB: SYSTEM
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'system' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-5 flex items-center gap-2">
            <Settings className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">System Logs</h2>
            <span className="ml-auto rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
              {logsByCategory.system.length} entries
            </span>
          </div>
          <LogList logs={logsByCategory.system} />
        </div>
      )}
    </>
  );
}
