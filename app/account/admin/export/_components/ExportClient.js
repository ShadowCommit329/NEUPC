/**
 * @file Export client — admin data-export tool for generating CSV / JSON
 *   downloads of users, events, blogs, and other platform data.
 * @module AdminExportClient
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Download,
  Users,
  FileText,
  Calendar,
  Trophy,
  Image,
  Mail,
  Bell,
  Activity,
  BookOpen,
  ChevronRight,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileJson,
  Table2,
  RefreshCw,
  Database,
} from 'lucide-react';
import Link from 'next/link';
import {
  exportUsersAction,
  exportJoinRequestsAction,
  exportBlogsAction,
  exportEventsAction,
  exportAchievementsAction,
  exportGalleryAction,
  exportContactsAction,
  exportNoticesAction,
  exportActivityLogsAction,
  exportResourcesAction,
} from '@/app/_lib/export-actions';

// ─── CSV Helpers ─────────────────────────────────────────────────────────────

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCSV(row[h])).join(',')),
  ];
  return lines.join('\n');
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Module Registry ─────────────────────────────────────────────────────────

const MODULES = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    action: exportUsersAction,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    description: 'All platform users with status and account info',
    filters: [
      {
        key: 'status',
        label: 'Account Status',
        type: 'select',
        options: [
          'all',
          'active',
          'pending',
          'suspended',
          'banned',
          'locked',
          'rejected',
        ],
      },
    ],
  },
  {
    id: 'join_requests',
    label: 'Join Requests',
    icon: Users,
    action: exportJoinRequestsAction,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    description: 'Membership applications with student details',
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['all', 'pending', 'approved', 'rejected'],
      },
    ],
  },
  {
    id: 'blogs',
    label: 'Blog Posts',
    icon: FileText,
    action: exportBlogsAction,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    border: 'border-green-500/20',
    description: 'Blog posts with author info, views and status',
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['all', 'draft', 'published', 'archived'],
      },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    icon: Calendar,
    action: exportEventsAction,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    description: 'Events with dates, location and registration info',
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          'all',
          'draft',
          'upcoming',
          'ongoing',
          'completed',
          'cancelled',
        ],
      },
    ],
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Trophy,
    action: exportAchievementsAction,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    description: 'Contest achievements and competitive results',
    filters: [
      {
        key: 'category',
        label: 'Category',
        type: 'text',
        placeholder: 'e.g. ICPC',
      },
    ],
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: Image,
    action: exportGalleryAction,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    description: 'Gallery items with uploader info and metadata',
    filters: [
      {
        key: 'category',
        label: 'Category',
        type: 'text',
        placeholder: 'e.g. Events',
      },
    ],
  },
  {
    id: 'contacts',
    label: 'Contact Messages',
    icon: Mail,
    action: exportContactsAction,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    description: 'Contact form submissions with reply status',
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['all', 'new', 'read', 'replied', 'archived'],
      },
    ],
  },
  {
    id: 'notices',
    label: 'Notices',
    icon: Bell,
    action: exportNoticesAction,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    border: 'border-red-500/20',
    description: 'Platform notices and announcements',
    filters: [
      {
        key: 'notice_type',
        label: 'Type',
        type: 'select',
        options: [
          'all',
          'general',
          'urgent',
          'event',
          'deadline',
          'achievement',
        ],
      },
    ],
  },
  {
    id: 'activity_logs',
    label: 'Activity Logs',
    icon: Activity,
    action: exportActivityLogsAction,
    color: 'text-gray-300',
    bgColor: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    description: 'Full audit trail with user and IP info',
    filters: [
      {
        key: 'action',
        label: 'Action Filter',
        type: 'text',
        placeholder: 'e.g. login',
      },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: BookOpen,
    action: exportResourcesAction,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    description: 'Learning resources, articles and course links',
    filters: [
      {
        key: 'category',
        label: 'Category',
        type: 'text',
        placeholder: 'e.g. CP',
      },
    ],
  },
];

const DATE_PRESETS = [
  { label: 'All time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d', value: '30d' },
  { label: 'Last 90d', value: '90d' },
  { label: 'Custom', value: 'custom' },
];

function presetToDates(preset) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (preset === 'today') {
    const s = fmt(now);
    return { dateFrom: s, dateTo: s };
  }
  if (preset === '7d') {
    const d = new Date(now - 7 * 864e5);
    return { dateFrom: fmt(d), dateTo: fmt(now) };
  }
  if (preset === '30d') {
    const d = new Date(now - 30 * 864e5);
    return { dateFrom: fmt(d), dateTo: fmt(now) };
  }
  if (preset === '90d') {
    const d = new Date(now - 90 * 864e5);
    return { dateFrom: fmt(d), dateTo: fmt(now) };
  }
  return { dateFrom: '', dateTo: '' };
}

// ─── ModulePanel ─────────────────────────────────────────────────────────────

function ModulePanel({ mod, onExportDone }) {
  const [datePreset, setDatePreset] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [extraFilters, setExtraFilters] = useState({});
  const [limit, setLimit] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg: string }

  const setFilter = (key, val) =>
    setExtraFilters((f) => ({ ...f, [key]: val }));

  const { dateFrom, dateTo } =
    datePreset === 'custom'
      ? { dateFrom: customFrom, dateTo: customTo }
      : presetToDates(datePreset);

  const runExport = useCallback(
    async (fmt) => {
      setLoading(true);
      setStatus(null);
      try {
        const result = await mod.action({
          dateFrom,
          dateTo,
          limit,
          ...extraFilters,
        });
        if (result.error) throw new Error(result.error);
        const rows = result.data;
        if (!rows || rows.length === 0) {
          setStatus({
            type: 'warning',
            msg: 'No data found for the selected filters.',
          });
          return;
        }

        const ts = new Date()
          .toISOString()
          .slice(0, 16)
          .replace('T', '_')
          .replace(':', '-');
        const filename = `${mod.id}_${ts}`;

        let content, mimeType, ext, sizeBytes;
        if (fmt === 'csv') {
          content = toCSV(rows);
          mimeType = 'text/csv';
          ext = 'csv';
        } else {
          content = JSON.stringify(rows, null, 2);
          mimeType = 'application/json';
          ext = 'json';
        }
        sizeBytes = new Blob([content]).size;
        downloadBlob(content, `${filename}.${ext}`, mimeType);

        setStatus({
          type: 'success',
          msg: `Exported ${rows.length} records (${fmtBytes(sizeBytes)})`,
        });
        onExportDone({
          module: mod.label,
          format: fmt.toUpperCase(),
          rows: rows.length,
          size: sizeBytes,
          time: new Date().toISOString(),
        });
      } catch (err) {
        setStatus({
          type: 'error',
          msg: err.message || 'Export failed. Try again.',
        });
      } finally {
        setLoading(false);
      }
    },
    [mod, dateFrom, dateTo, limit, extraFilters, onExportDone]
  );

  return (
    <div className="space-y-5">
      {/* Description */}
      <p className="text-sm text-gray-500">{mod.description}</p>

      {/* Date range */}
      <div className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
          <Clock className="h-3.5 w-3.5" />
          Date Range
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setDatePreset(value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                datePreset === value
                  ? `${mod.border} ${mod.bgColor} ${mod.color}`
                  : 'border-white/8 bg-white/3 text-gray-500 hover:bg-white/6 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] tracking-wider text-gray-600 uppercase">
                From
              </label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm text-white scheme-dark focus:border-white/20 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] tracking-wider text-gray-600 uppercase">
                To
              </label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm text-white scheme-dark focus:border-white/20 focus:outline-none"
              />
            </div>
          </div>
        )}
        {dateFrom && dateTo && (
          <p className="text-[11px] text-gray-600">
            {dateFrom} → {dateTo}
          </p>
        )}
      </div>

      {/* Extra filters */}
      {mod.filters.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mod.filters.map((f) => (
              <div key={f.key}>
                <label className="mb-1.5 block text-[11px] font-medium text-gray-500">
                  {f.label}
                </label>
                {f.type === 'select' ? (
                  <div className="relative">
                    <select
                      value={extraFilters[f.key] || 'all'}
                      onChange={(e) => setFilter(f.key, e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/10 bg-white/4 py-2 pr-7 pl-3 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
                    >
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o === 'all'
                            ? 'All'
                            : o.charAt(0).toUpperCase() + o.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-gray-500" />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={f.placeholder || ''}
                    value={extraFilters[f.key] || ''}
                    onChange={(e) => setFilter(f.key, e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-white/20 focus:outline-none"
                  />
                )}
              </div>
            ))}
            {/* Row limit */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-gray-500">
                Max Rows
              </label>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/4 py-2 pr-7 pl-3 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
                >
                  {[100, 500, 1000, 5000].map((n) => (
                    <option key={n} value={n}>
                      {n.toLocaleString()} rows
                    </option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* row limit if no extra filters */}
      {mod.filters.length === 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <label className="mb-1.5 block text-[11px] font-medium text-gray-500">
            Max Rows
          </label>
          <div className="relative">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-white/10 bg-white/4 py-2 pr-7 pl-3 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
            >
              {[100, 500, 1000, 5000].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString()} rows
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-gray-500" />
          </div>
        </div>
      )}

      {/* Status message */}
      {status && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
            status.type === 'success'
              ? 'border-green-500/20 bg-green-500/8 text-green-300'
              : status.type === 'warning'
                ? 'border-yellow-500/20 bg-yellow-500/8 text-yellow-300'
                : 'border-red-500/20 bg-red-500/8 text-red-300'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {status.msg}
        </div>
      )}

      {/* Export buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => runExport('csv')}
          disabled={loading}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all disabled:opacity-50 ${mod.border} ${mod.bgColor} ${mod.color} hover:opacity-80`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Table2 className="h-4 w-4" />
          )}
          Export CSV
        </button>
        <button
          onClick={() => runExport('json')}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/4 py-3 text-sm font-semibold text-gray-300 transition-all hover:bg-white/8 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileJson className="h-4 w-4" />
          )}
          Export JSON
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExportClient({ adminId, adminName }) {
  const [activeModule, setActiveModule] = useState('users');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const addHistory = useCallback((entry) => {
    setHistory((h) => [entry, ...h].slice(0, 50));
  }, []);

  const mod = MODULES.find((m) => m.id === activeModule);
  const Icon = mod?.icon || Database;

  return (
    <>
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
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
              <span className="font-medium text-gray-400">Export Center</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/25">
                <Download className="h-5 w-5 text-blue-400" />
              </div>
              Export Center
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Download platform data as CSV or JSON
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
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              <Clock className="h-3.5 w-3.5" />
              Export History
              {history.length > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Export History (collapsible) ─────────────────────────────────── */}
      {showHistory && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Clock className="h-4 w-4 text-gray-400" />
            Session Export History
            <span className="ml-auto text-[11px] font-normal text-gray-600">
              Not persistent — resets on page reload
            </span>
          </h2>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">
              No exports yet this session
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-125 text-left text-xs">
                <thead>
                  <tr className="border-b border-white/6 text-[11px] tracking-wider text-gray-600 uppercase">
                    <th className="pr-4 pb-2">Module</th>
                    <th className="pr-4 pb-2">Format</th>
                    <th className="pr-4 pb-2">Rows</th>
                    <th className="pr-4 pb-2">Size</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {history.map((h, i) => (
                    <tr key={i} className="text-gray-400">
                      <td className="py-2 pr-4 font-medium text-gray-200">
                        {h.module}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            h.format === 'CSV'
                              ? 'border-green-500/20 bg-green-500/10 text-green-300'
                              : 'border-blue-500/20 bg-blue-500/10 text-blue-300'
                          }`}
                        >
                          {h.format}
                        </span>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {h.rows.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {fmtBytes(h.size)}
                      </td>
                      <td className="py-2 text-gray-600">{fmtDate(h.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Main Layout ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        {/* Sidebar — module list */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-2">
          <div className="mb-2 px-2 pt-1 text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
            Data Sources
          </div>
          <nav className="space-y-0.5">
            {MODULES.map((m) => {
              const MIcon = m.icon;
              const isActive = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    isActive
                      ? `${m.bgColor} ${m.border} border ${m.color}`
                      : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
                  }`}
                >
                  <MIcon
                    className={`h-4 w-4 shrink-0 ${isActive ? m.color : 'text-gray-600'}`}
                  />
                  <span className="truncate">{m.label}</span>
                  {isActive && (
                    <ChevronRight
                      className={`ml-auto h-3.5 w-3.5 ${m.color}`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right panel */}
        {mod && (
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            {/* Panel header */}
            <div className="mb-5 flex items-center gap-3 border-b border-white/6 pb-5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.bgColor}`}
              >
                <Icon className={`h-5 w-5 ${mod.color}`} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{mod.label}</h2>
                <p className="text-[11px] text-gray-600">
                  Configure filters and export
                </p>
              </div>
            </div>

            <ModulePanel key={mod.id} mod={mod} onExportDone={addHistory} />
          </div>
        )}
      </div>

      {/* ── Quick export chips ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Download className="h-4 w-4 text-gray-400" />
          Quick Exports — All Time, All Records (CSV)
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {MODULES.filter((m) =>
            ['users', 'join_requests', 'blogs', 'events', 'contacts'].includes(
              m.id
            )
          ).map((m) => {
            const MIcon = m.icon;
            return (
              <QuickExportBtn key={m.id} mod={m} onExportDone={addHistory} />
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Quick Export Button ──────────────────────────────────────────────────────

function QuickExportBtn({ mod, onExportDone }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const Icon = mod.icon;

  const handleQuick = async () => {
    setLoading(true);
    try {
      const result = await mod.action({
        dateFrom: '',
        dateTo: '',
        limit: 5000,
      });
      if (result.error || !result.data?.length) return;
      const content = toCSV(result.data);
      const ts = new Date().toISOString().slice(0, 10);
      downloadBlob(content, `${mod.id}_${ts}.csv`, 'text/csv');
      const size = new Blob([content]).size;
      onExportDone({
        module: mod.label,
        format: 'CSV',
        rows: result.data.length,
        size,
        time: new Date().toISOString(),
      });
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleQuick}
      disabled={loading}
      className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-xs font-medium transition-all hover:opacity-80 disabled:opacity-60 ${mod.border} ${mod.bgColor} ${mod.color}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : done ? (
        <CheckCircle2 className="h-5 w-5" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
      {mod.label}
    </button>
  );
}
