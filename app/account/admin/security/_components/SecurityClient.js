/**
 * @file Security client — admin security dashboard for reviewing
 *   login attempts, active sessions, IP allowlists, and security
 *   audit logs.
 * @module AdminSecurityClient
 */

'use client';

import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Activity,
  LogIn,
  LogOut,
  UserX,
  AlertTriangle,
  Ban,
  Lock,
  Clock,
  Search,
  X,
  ChevronDown,
  Monitor,
  Globe,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Info,
  Fingerprint,
  KeyRound,
  UserCog,
  Wifi,
  AlertCircle,
  ChevronRight,
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

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.slice(0, 2) + '***@' + domain;
}

const ACTION_CONFIG = {
  login: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: LogIn,
  },
  logout: {
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    icon: LogOut,
  },
  login_failed: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: AlertTriangle,
  },
  create: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: CheckCircle2,
  },
  update: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: Activity,
  },
  delete: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: XCircle,
  },
  approve: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: CheckCircle2,
  },
  reject: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: XCircle,
  },
  assign_role: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: UserCog,
  },
  role_change: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: UserCog,
  },
  suspend: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: UserX,
  },
  ban: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: Ban,
  },
  default: {
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    icon: Info,
  },
};

function getActionConfig(action) {
  if (!action) return ACTION_CONFIG.default;
  const key = Object.keys(ACTION_CONFIG).find((k) =>
    action
      .toLowerCase()
      .replace(/[^a-z_]/g, '_')
      .includes(k)
  );
  return ACTION_CONFIG[key] || ACTION_CONFIG.default;
}

const THREAT_CONFIG = {
  suspended: {
    label: 'Suspended',
    color: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: UserX,
  },
  banned: {
    label: 'Banned',
    color: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: Ban,
  },
  locked: {
    label: 'Locked',
    color: 'text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: Lock,
  },
};

// ─── Overview Stat Card ───────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, colorClass, alert }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-4 backdrop-blur-sm ${
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

// ─── Tab Button ───────────────────────────────────────────────────────────────

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

// ─── Log Row ─────────────────────────────────────────────────────────────────

function LogRow({ log }) {
  const cfg = getActionConfig(log.action);
  const Icon = cfg.icon;
  const userName = log.users?.full_name || log.details?.name || 'System';
  const userEmail = log.users?.email;
  const label =
    log.details?.summary ||
    `${log.action}${log.entity_type ? ' · ' + log.entity_type.replace(/_/g, ' ') : ''}`;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/2 px-3.5 py-3 transition-colors hover:bg-white/4">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${cfg.bg} ${cfg.border} ${cfg.color}`}
          >
            {log.action || 'unknown'}
          </span>
          {log.entity_type && (
            <span className="text-[10px] text-gray-600">
              {log.entity_type.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-gray-300">
          {label}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
          <span className="flex items-center gap-1">
            <Users className="h-2.5 w-2.5" />
            {userName}
            {userEmail && (
              <span className="text-gray-700">({maskEmail(userEmail)})</span>
            )}
          </span>
          {log.ip_address && (
            <span className="flex items-center gap-1">
              <Globe className="h-2.5 w-2.5" />
              {log.ip_address}
            </span>
          )}
        </div>
      </div>
      <span className="mt-0.5 shrink-0 text-[10px] text-gray-700 tabular-nums">
        {timeAgo(log.created_at)}
      </span>
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({ user, index }) {
  const initials =
    user.full_name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  const isRecent =
    user.last_login &&
    Date.now() - new Date(user.last_login).getTime() < 30 * 60 * 1000;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-4 py-3 transition-colors hover:bg-white/4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
        {user.avatar_url &&
        (user.avatar_url.startsWith('http') ||
          user.avatar_url.startsWith('/api/image/')) ? (
          <img
            src={user.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-200">
          {user.full_name || '—'}
        </p>
        <p className="truncate text-[11px] text-gray-600">
          {maskEmail(user.email)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <Clock className="h-3 w-3" />
          {timeAgo(user.last_login)}
        </div>
        <div
          className={`flex h-2 w-2 rounded-full ${isRecent ? 'animate-pulse bg-green-400' : 'bg-gray-600'}`}
        />
      </div>
    </div>
  );
}

// ─── Threat Row ───────────────────────────────────────────────────────────────

function ThreatRow({ user }) {
  const cfg = THREAT_CONFIG[user.threatType] || THREAT_CONFIG.locked;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 ${cfg.color}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-200">
            {user.full_name || '—'}
          </p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.border} ${cfg.color}`}
          >
            {cfg.label}
          </span>
        </div>
        <p className="truncate text-[11px] text-gray-600">
          {maskEmail(user.email)}
        </p>
        {user.status_reason && (
          <p className="mt-1 text-[11px] text-gray-500">
            Reason: {user.status_reason}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-gray-700 tabular-nums">
        {timeAgo(user.status_changed_at)}
      </span>
    </div>
  );
}

// ─── Role Change Row ──────────────────────────────────────────────────────────

function RoleChangeRow({ log }) {
  const userName = log.users?.full_name || log.details?.name || 'Unknown user';

  return (
    <div className="flex items-start gap-3 rounded-xl border border-purple-500/15 bg-purple-500/5 px-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15">
        <UserCog className="h-3.5 w-3.5 text-purple-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-gray-200">
          {userName}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500 capitalize">
          {log.action?.replace(/_/g, ' ')}
          {log.details?.role && (
            <span className="ml-1 font-medium text-purple-400">
              → {log.details.role}
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-gray-700 tabular-nums">
        {timeAgo(log.created_at)}
      </span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function Empty({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <ShieldCheck className="mb-3 h-10 w-10 text-gray-700" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecurityClient({ data }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-yellow-600" />
        <h2 className="text-lg font-semibold text-white">
          Security data unavailable
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Check your database connection and try again.
        </p>
      </div>
    );
  }

  const {
    overview,
    activeSessions,
    threats,
    auditLogs,
    roleChangeLogs,
    loginLogs,
    recentRoleAssignments,
    logsByAction,
    generatedAt,
  } = data;

  // Unique action types for filter dropdown
  const actionTypes = useMemo(() => {
    const types = [
      ...new Set(auditLogs.map((l) => l.action).filter(Boolean)),
    ].sort();
    return types;
  }, [auditLogs]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchAction =
        logActionFilter === 'all' || log.action === logActionFilter;
      const q = logSearch.toLowerCase();
      const matchSearch =
        !q ||
        log.action?.toLowerCase().includes(q) ||
        log.entity_type?.toLowerCase().includes(q) ||
        log.users?.full_name?.toLowerCase().includes(q) ||
        log.users?.email?.toLowerCase().includes(q) ||
        log.ip_address?.toLowerCase().includes(q) ||
        JSON.stringify(log.details || {})
          .toLowerCase()
          .includes(q);
      return matchAction && matchSearch;
    });
  }, [auditLogs, logSearch, logActionFilter]);

  const hasThreats = threats.length > 0;
  const systemStatus =
    hasThreats || overview.failedLogins24h > 10 ? 'warning' : 'secure';

  // Top action type
  const topActions = Object.entries(logsByAction)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const totalLogActions = Object.values(logsByAction).reduce(
    (s, v) => s + v,
    0
  );

  const ACTION_BAR_COLORS = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
  ];

  return (
    <>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-emerald-500/8 blur-3xl" />
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
              <span className="font-medium text-gray-400">Security</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 ring-1 ring-green-500/25">
                <ShieldCheck className="h-5 w-5 text-green-400" />
              </div>
              Security
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Monitor platform security and audit trail
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                systemStatus === 'secure'
                  ? 'border-green-500/25 bg-green-500/10 text-green-300'
                  : 'border-yellow-500/25 bg-yellow-500/10 text-yellow-300'
              }`}
            >
              {systemStatus === 'secure' ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              {systemStatus === 'secure' ? 'System Secure' : 'Needs Attention'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-1.5">
        <TabBtn
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </TabBtn>
        <TabBtn
          active={activeTab === 'sessions'}
          onClick={() => setActiveTab('sessions')}
          count={overview.activeSessions}
        >
          Active Sessions
        </TabBtn>
        <TabBtn
          active={activeTab === 'audit'}
          onClick={() => setActiveTab('audit')}
          count={auditLogs.length}
        >
          Audit Log
        </TabBtn>
        <TabBtn
          active={activeTab === 'roles'}
          onClick={() => setActiveTab('roles')}
          count={roleChangeLogs.length}
        >
          Role Changes
        </TabBtn>
        <TabBtn
          active={activeTab === 'threats'}
          onClick={() => setActiveTab('threats')}
          count={threats.length}
          alert={hasThreats}
        >
          Threats
        </TabBtn>
        <TabBtn
          active={activeTab === 'logins'}
          onClick={() => setActiveTab('logins')}
          count={loginLogs.length}
        >
          Login Events
        </TabBtn>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: OVERVIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Overview stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              icon={Wifi}
              label="Active Sessions"
              value={overview.activeSessions}
              sub="users online now"
              colorClass="bg-green-500/15 text-green-400"
            />
            <StatCard
              icon={AlertTriangle}
              label="Failed Logins 24h"
              value={overview.failedLogins24h}
              sub="in last 24 hours"
              colorClass={
                overview.failedLogins24h > 5
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-yellow-500/15 text-yellow-400'
              }
              alert={overview.failedLogins24h > 5}
            />
            <StatCard
              icon={UserX}
              label="Suspended"
              value={overview.suspendedCount}
              sub="accounts suspended"
              colorClass="bg-orange-500/15 text-orange-400"
            />
            <StatCard
              icon={Ban}
              label="Banned"
              value={overview.bannedCount}
              sub="accounts banned"
              colorClass="bg-red-500/15 text-red-400"
            />
            <StatCard
              icon={Lock}
              label="Locked"
              value={overview.lockedCount}
              sub="accounts locked"
              colorClass="bg-yellow-500/15 text-yellow-400"
            />
            <StatCard
              icon={UserCog}
              label="Role Changes"
              value={overview.recentRoleChanges}
              sub="recent activity"
              colorClass="bg-purple-500/15 text-purple-400"
            />
          </div>

          {/* Activity breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Action distribution */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
                  <Activity className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <h2 className="text-sm font-semibold text-white">
                  Activity by Action Type
                </h2>
              </div>
              {topActions.length === 0 ? (
                <Empty message="No activity recorded yet" />
              ) : (
                <div className="space-y-3">
                  {topActions.map(([action, count], i) => {
                    const cfg = getActionConfig(action);
                    const p = totalLogActions
                      ? Math.round((count / totalLogActions) * 100)
                      : 0;
                    return (
                      <div key={action} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${ACTION_BAR_COLORS[i] || 'bg-gray-500'}`}
                            />
                            <span
                              className={`font-medium capitalize ${cfg.color}`}
                            >
                              {action.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex gap-2 tabular-nums">
                            <span className="font-semibold text-white">
                              {count}
                            </span>
                            <span className="w-6 text-right text-gray-600">
                              {p}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                          <div
                            className={`h-full rounded-full ${ACTION_BAR_COLORS[i] || 'bg-gray-500'}`}
                            style={{ width: `${p}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent role assignments */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
                  <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <h2 className="text-sm font-semibold text-white">
                  Recent Role Assignments
                </h2>
              </div>
              {recentRoleAssignments.length === 0 ? (
                <Empty message="No role assignments in the last 7 days" />
              ) : (
                <div className="scrollbar-none max-h-72 space-y-2 overflow-y-auto">
                  {recentRoleAssignments.map((ra) => (
                    <div
                      key={ra.id}
                      className="flex items-center gap-3 rounded-xl border border-purple-500/10 bg-purple-500/5 px-3 py-2.5"
                    >
                      <UserCog className="h-4 w-4 shrink-0 text-purple-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-200">
                          {ra.users?.full_name || '—'}
                        </p>
                        <p className="truncate text-[11px] text-gray-600">
                          {maskEmail(ra.users?.email)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {ra.roles?.name && (
                          <span className="rounded-full border border-purple-500/20 bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300 capitalize">
                            {ra.roles.name}
                          </span>
                        )}
                        <p className="mt-0.5 text-[10px] text-gray-700">
                          {timeAgo(ra.assigned_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Threats alert if any */}
          {hasThreats && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <h2 className="text-sm font-semibold text-red-300">
                  Flagged Accounts ({threats.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {threats.slice(0, 6).map((u) => (
                  <ThreatRow key={u.id} user={u} />
                ))}
              </div>
              {threats.length > 6 && (
                <button
                  onClick={() => setActiveTab('threats')}
                  className="mt-3 text-xs text-red-400 transition-colors hover:text-red-300"
                >
                  View all {threats.length} flagged accounts →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: ACTIVE SESSIONS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">
              Active Sessions
              <span className="ml-2 text-[11px] font-normal text-gray-500">
                ({activeSessions.length} users currently online)
              </span>
            </h2>
          </div>
          {activeSessions.length === 0 ? (
            <Empty message="No active sessions right now" />
          ) : (
            <div className="scrollbar-none max-h-150 space-y-2 overflow-y-auto">
              {activeSessions.map((user, i) => (
                <SessionRow key={user.id} user={user} index={i} />
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-white/6 pt-3 text-[11px] text-gray-600">
            Sessions are determined by{' '}
            <code className="text-gray-500">is_online = true</code> in the users
            table, updated on login/logout.
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: AUDIT LOG
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by action, user, IP, entity…"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-4 pl-9 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:bg-white/6 focus:outline-none"
              />
              {logSearch && (
                <button
                  onClick={() => setLogSearch('')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-3 text-sm text-white focus:border-white/20 focus:outline-none sm:w-44 [&>option]:bg-gray-900"
              >
                <option value="all">All Actions ({auditLogs.length})</option>
                {actionTypes.map((a) => (
                  <option key={a} value={a}>
                    {a} ({logsByAction[a] || 0})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          <div className="text-xs text-gray-600">
            Showing {filteredLogs.length} of {auditLogs.length} logs
          </div>

          {filteredLogs.length === 0 ? (
            <Empty message="No logs match your filters" />
          ) : (
            <div className="scrollbar-none max-h-175 space-y-2 overflow-y-auto pr-0.5">
              {filteredLogs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: ROLE CHANGES
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserCog className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">
                Role Change Activity
              </h2>
            </div>
            {roleChangeLogs.length === 0 ? (
              <Empty message="No role change activity recorded" />
            ) : (
              <div className="scrollbar-none max-h-150 space-y-2 overflow-y-auto">
                {roleChangeLogs.map((log) => (
                  <RoleChangeRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
          {recentRoleAssignments.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-white">
                  Recent Role Assignments (last 7 days)
                </h2>
              </div>
              <div className="space-y-2">
                {recentRoleAssignments.map((ra) => (
                  <div
                    key={ra.id}
                    className="flex items-center gap-3 rounded-xl border border-purple-500/15 bg-purple-500/5 px-4 py-3"
                  >
                    <UserCog className="h-4 w-4 shrink-0 text-purple-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-200">
                        {ra.users?.full_name || '—'}
                      </p>
                      <p className="text-[11px] text-gray-600">
                        {maskEmail(ra.users?.email)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {ra.roles?.name && (
                        <span className="rounded-full border border-purple-500/20 bg-purple-500/15 px-2.5 py-1 text-[11px] font-semibold text-purple-300 capitalize">
                          {ra.roles.name}
                        </span>
                      )}
                      <p className="mt-1 text-[10px] text-gray-700">
                        {fmtDate(ra.assigned_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: THREATS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'threats' && (
        <div className="space-y-4">
          {threats.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/5 py-20 text-center">
              <ShieldCheck className="mb-3 h-12 w-12 text-green-500" />
              <p className="text-sm font-semibold text-green-300">
                No Flagged Accounts
              </p>
              <p className="mt-1 text-xs text-gray-600">
                All accounts are in good standing
              </p>
            </div>
          ) : (
            <>
              {/* Group by threat type */}
              {['suspended', 'banned', 'locked'].map((type) => {
                const group = threats.filter((u) => u.threatType === type);
                if (group.length === 0) return null;
                const cfg = THREAT_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={type}
                    className="rounded-2xl border border-white/8 bg-white/3 p-5"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                      <h2 className={`text-sm font-semibold ${cfg.color}`}>
                        {cfg.label} Accounts ({group.length})
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {group.map((u) => (
                        <ThreatRow key={u.id} user={u} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: LOGIN EVENTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'logins' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center gap-2">
            <LogIn className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">
              Login Events (last 24h)
              <span className="ml-2 text-[11px] font-normal text-gray-500">
                {loginLogs.length} events
              </span>
            </h2>
          </div>
          {loginLogs.length === 0 ? (
            <Empty message="No login events in the last 24 hours" />
          ) : (
            <div className="scrollbar-none max-h-175 space-y-2 overflow-y-auto">
              {loginLogs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
