/**
 * @file Contact submissions client — admin interface for reviewing,
 *   filtering, and responding to user-submitted contact messages.
 * @module AdminContactSubmissionsClient
 */

'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Mail,
  Search,
  Clock,
  Eye,
  MessageSquare,
  Archive,
  CheckCircle2,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Filter,
  SquareCheck,
  Square,
  X,
  ChevronRight,
  Phone,
  MapPin,
  Globe,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import SubmissionDetailModal from './SubmissionDetailModal';
import { getStatusConfig, ALL_STATUSES } from './contactConfig';
import {
  updateContactStatusAction,
  deleteContactSubmissionAction,
  bulkUpdateContactStatusAction,
  bulkDeleteContactSubmissionsAction,
  markContactReadAction,
} from '@/app/_lib/contact-actions';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, colorClass, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left backdrop-blur-sm transition-all ${
        active
          ? 'border-white/20 bg-white/8 shadow-lg shadow-black/20'
          : 'border-white/8 bg-white/4 hover:border-white/12 hover:bg-white/6'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-gray-500">{label}</p>
      </div>
    </button>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children, count }) {
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
            active ? 'bg-white/15 text-white' : 'bg-white/6 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────────

function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatus,
  onBulkDelete,
  isPending,
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <SquareCheck className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-semibold text-blue-300">
          {selectedCount} selected
        </span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          onClick={() => onBulkStatus('read')}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
        >
          <Eye className="h-3 w-3" /> Mark Read
        </button>
        <button
          onClick={() => onBulkStatus('replied')}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300 transition-colors hover:bg-green-500/20 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3 w-3" /> Mark Replied
        </button>
        <button
          onClick={() => onBulkStatus('archived')}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-300 transition-colors hover:bg-yellow-500/20 disabled:opacity-50"
        >
          <Archive className="h-3 w-3" /> Archive
        </button>
        {deleteConfirm ? (
          <>
            <span className="text-xs text-gray-400">
              Delete {selectedCount}?
            </span>
            <button
              onClick={() => {
                setDeleteConfirm(false);
                onBulkDelete();
              }}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" /> Confirm Delete
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-1 py-1.5 text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        )}
        <button
          onClick={onClearSelection}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/8 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Submission Row ───────────────────────────────────────────────────────────

function SubmissionRow({
  sub,
  selected,
  onToggleSelect,
  onOpen,
  onStatusChange,
  onDelete,
}) {
  const sc = getStatusConfig(sub.status);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dateStr = sub.created_at
    ? new Date(sub.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const timeStr = sub.created_at
    ? new Date(sub.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  function handleStatusChange(newStatus) {
    setStatusOpen(false);
    if (newStatus === sub.status) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', sub.id);
      fd.set('status', newStatus);
      await updateContactStatusAction(fd);
      onStatusChange?.();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', sub.id);
      await deleteContactSubmissionAction(fd);
      onDelete?.();
    });
  }

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-2xl border bg-white/3 px-4 py-4 transition-all hover:border-white/12 hover:bg-white/6 sm:items-center ${
        selected ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/8'
      } ${sc.rowClass}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleSelect(sub.id)}
        className="mt-0.5 shrink-0 text-gray-500 transition-colors hover:text-blue-400 sm:mt-0"
      >
        {selected ? (
          <SquareCheck className="h-4 w-4 text-blue-400" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>

      {/* New dot */}
      {sub.status === 'new' && (
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-400 sm:mt-0" />
      )}

      {/* Main content — clickable */}
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => onOpen(sub)}
      >
        {/* Top row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <span className="truncate text-sm font-semibold text-white">
              {sub.name}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Mail className="h-3 w-3 shrink-0 text-gray-600" />
            <span className="truncate text-xs text-gray-400">{sub.email}</span>
          </div>
        </div>

        {/* Subject */}
        {sub.subject && (
          <p className="mt-1 truncate text-sm font-medium text-gray-300">
            {sub.subject}
          </p>
        )}

        {/* Message preview */}
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
          {sub.message}
        </p>

        {/* Date */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[11px] text-gray-600">
            {dateStr} · {timeStr}
          </span>
        </div>
      </div>

      {/* Right side — badges + actions */}
      <div className="ml-2 flex shrink-0 flex-col items-end gap-2">
        {/* Status badge with dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStatusOpen((v) => !v);
            }}
            disabled={isPending}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-95 ${sc.badgeClass}`}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <sc.icon className="h-3 w-3" />
            )}
            {sc.label}
            <ChevronDown
              className={`h-2.5 w-2.5 transition-transform ${statusOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {statusOpen && (
            <div
              className="absolute top-full right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-white/12 bg-gray-950 shadow-2xl shadow-black/60"
              onMouseLeave={() => setStatusOpen(false)}
            >
              {ALL_STATUSES.map((st) => {
                const cfg = getStatusConfig(st);
                return (
                  <button
                    key={st}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(st);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-white/6 ${
                      st === sub.status
                        ? 'font-semibold text-white'
                        : 'text-gray-400'
                    }`}
                  >
                    <cfg.icon className="h-3 w-3" />
                    {cfg.label}
                    {st === sub.status && (
                      <CheckCircle2 className="ml-auto h-3 w-3 text-green-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete */}
        {deleteConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm(false);
                handleDelete();
              }}
              disabled={isPending}
              className="rounded border border-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400 hover:bg-red-500/10"
            >
              Delete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm(false);
              }}
              className="rounded px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-300"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(true);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab }) {
  const msgs = {
    all: {
      title: 'No submissions yet',
      sub: 'Contact form submissions will appear here.',
    },
    new: { title: 'No new messages', sub: 'All messages have been reviewed.' },
    read: { title: 'No read messages', sub: '' },
    replied: { title: 'No replied messages', sub: '' },
    archived: { title: 'No archived messages', sub: '' },
  };

  const { title, sub } = msgs[tab] ?? msgs.all;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
      <Mail className="mb-4 h-12 w-12 text-gray-700" />
      <p className="text-sm font-semibold text-gray-400">{title}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

// ─── Contact Page Live Info Panel ────────────────────────────────────────────

function ContactInfoPanel({ contactInfo, socialLinks, faqs }) {
  const [open, setOpen] = useState(true);

  const hasSocials = socialLinks && Object.values(socialLinks).some(Boolean);

  const SOCIAL_LABELS = {
    facebook: 'FB',
    linkedin: 'LI',
    github: 'GH',
    youtube: 'YT',
    twitter: 'X',
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <Globe className="h-3.5 w-3.5 text-blue-400" />
          Contact Page Live Info
          <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">
            Public
          </span>
        </span>
        <div className="flex items-center gap-3">
          <a
            href="/contact"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-gray-500 transition-colors hover:text-gray-300"
          >
            View page <ExternalLink className="h-3 w-3" />
          </a>
          {open ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/8 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo?.email && (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/3 px-3.5 py-3">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                    Email
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-300">
                    {contactInfo.email}
                  </p>
                </div>
              </div>
            )}
            {contactInfo?.phone && (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/3 px-3.5 py-3">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                    Phone
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-300">
                    {contactInfo.phone}
                  </p>
                </div>
              </div>
            )}
            {contactInfo?.officeHours && (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/3 px-3.5 py-3">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                    Hours
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-300">
                    {contactInfo.officeHours}
                  </p>
                </div>
              </div>
            )}
            {contactInfo?.address && (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/3 px-3.5 py-3">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                    Address
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-300">
                    {contactInfo.address}
                  </p>
                </div>
              </div>
            )}
          </div>

          {(hasSocials || (faqs && faqs.length > 0)) && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {hasSocials && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                    Social:
                  </span>
                  <div className="flex gap-1.5">
                    {Object.entries(socialLinks).map(([key, url]) =>
                      url ? (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-400 transition-colors hover:border-white/20 hover:text-gray-200"
                        >
                          {SOCIAL_LABELS[key] ?? key}
                        </a>
                      ) : null
                    )}
                  </div>
                </div>
              )}
              {faqs && faqs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="h-3 w-3 text-gray-600" />
                  <span className="text-[11px] text-gray-500">
                    {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} published
                  </span>
                </div>
              )}
            </div>
          )}

          {!contactInfo?.email &&
            !contactInfo?.phone &&
            !contactInfo?.address && (
              <p className="text-xs text-gray-600">
                No contact info configured yet.{' '}
                <a
                  href="/account/admin/settings"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  Configure in Settings
                </a>
              </p>
            )}
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function ContactSubmissionsClient({
  initialSubmissions,
  contactInfo,
  socialLinks,
  faqs,
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions ?? []);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailSub, setDetailSub] = useState(null);
  const [bulkPending, startBulkTransition] = useTransition();
  const [flashMsg, setFlashMsg] = useState(null);

  function flash(msg, type = 'success') {
    setFlashMsg({ msg, type });
    setTimeout(() => setFlashMsg(null), 3000);
  }

  // ── stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: submissions.length,
      new: submissions.filter((s) => s.status === 'new').length,
      read: submissions.filter((s) => s.status === 'read').length,
      replied: submissions.filter((s) => s.status === 'replied').length,
      archived: submissions.filter((s) => s.status === 'archived').length,
    }),
    [submissions]
  );

  // ── filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const matchesTab = activeTab === 'all' || s.status === activeTab;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.subject?.toLowerCase().includes(q) ||
        s.message?.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [submissions, activeTab, search]);

  // ── selection helpers ──────────────────────────────────────────────────────
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selectedIds.includes(s.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((s) => s.id));
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ── Open detail (mark read) ────────────────────────────────────────────────
  async function openDetail(sub) {
    setDetailSub(sub);
    if (sub.status === 'new') {
      await markContactReadAction(sub.id);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: 'read' } : s))
      );
      setDetailSub((prev) => (prev ? { ...prev, status: 'read' } : null));
    }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  function handleBulkStatus(status) {
    startBulkTransition(async () => {
      const fd = new FormData();
      fd.set('ids', JSON.stringify(selectedIds));
      fd.set('status', status);
      const result = await bulkUpdateContactStatusAction(fd);
      if (result?.error) {
        flash(result.error, 'error');
      } else {
        setSubmissions((prev) =>
          prev.map((s) => (selectedIds.includes(s.id) ? { ...s, status } : s))
        );
        setSelectedIds([]);
        flash(
          `${result.updated} submission${result.updated > 1 ? 's' : ''} marked as ${status}`
        );
      }
    });
  }

  function handleBulkDelete() {
    startBulkTransition(async () => {
      const fd = new FormData();
      fd.set('ids', JSON.stringify(selectedIds));
      const result = await bulkDeleteContactSubmissionsAction(fd);
      if (result?.error) {
        flash(result.error, 'error');
      } else {
        setSubmissions((prev) =>
          prev.filter((s) => !selectedIds.includes(s.id))
        );
        setSelectedIds([]);
        flash(
          `${result.deleted} submission${result.deleted > 1 ? 's' : ''} deleted`
        );
      }
    });
  }

  // ── After detail update ────────────────────────────────────────────────────
  function handleDetailUpdate(updated) {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    setDetailSub(updated);
  }

  const STAT_CARDS = [
    {
      icon: Mail,
      label: 'Total',
      value: stats.total,
      colorClass: 'bg-blue-500/15 text-blue-400',
      tab: 'all',
    },
    {
      icon: Clock,
      label: 'New',
      value: stats.new,
      colorClass: 'bg-purple-500/15 text-purple-400',
      tab: 'new',
    },
    {
      icon: Eye,
      label: 'Read',
      value: stats.read,
      colorClass: 'bg-sky-500/15 text-sky-400',
      tab: 'read',
    },
    {
      icon: CheckCircle2,
      label: 'Replied',
      value: stats.replied,
      colorClass: 'bg-green-500/15 text-green-400',
      tab: 'replied',
    },
    {
      icon: Archive,
      label: 'Archived',
      value: stats.archived,
      colorClass: 'bg-yellow-500/15 text-yellow-400',
      tab: 'archived',
    },
  ];

  return (
    <>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-violet-500/8 blur-3xl" />
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
              <span className="font-medium text-gray-400">
                Contact Submissions
              </span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 ring-1 ring-purple-500/25">
                <Mail className="h-5 w-5 text-purple-400" />
              </div>
              Contact Submissions
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage and respond to contact form submissions
              {stats.new > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-purple-500/25 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
                  {stats.new} new
                </span>
              )}
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Contact Page Live Info ─────────────────────────────────────────── */}
      {(contactInfo || socialLinks || (faqs && faqs.length > 0)) && (
        <ContactInfoPanel
          contactInfo={contactInfo}
          socialLinks={socialLinks}
          faqs={faqs}
        />
      )}

      {/* ─── Flash message ──────────────────────────────────────────────────── */}
      {flashMsg && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            flashMsg.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-green-500/30 bg-green-500/10 text-green-300'
          }`}
        >
          {flashMsg.type === 'error' ? (
            <X className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          {flashMsg.msg}
        </div>
      )}

      {/* ─── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map(({ icon, label, value, colorClass, tab }) => (
          <StatCard
            key={tab}
            icon={icon}
            label={label}
            value={value}
            colorClass={colorClass}
            active={activeTab === tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedIds([]);
            }}
          />
        ))}
      </div>

      {/* ─── Filters Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="scrollbar-none flex items-center gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-1.5">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => {
              setActiveTab('all');
              setSelectedIds([]);
            }}
            count={stats.total}
          >
            All
          </TabButton>
          <TabButton
            active={activeTab === 'new'}
            onClick={() => {
              setActiveTab('new');
              setSelectedIds([]);
            }}
            count={stats.new}
          >
            New
          </TabButton>
          <TabButton
            active={activeTab === 'read'}
            onClick={() => {
              setActiveTab('read');
              setSelectedIds([]);
            }}
            count={stats.read}
          >
            Read
          </TabButton>
          <TabButton
            active={activeTab === 'replied'}
            onClick={() => {
              setActiveTab('replied');
              setSelectedIds([]);
            }}
            count={stats.replied}
          >
            Replied
          </TabButton>
          <TabButton
            active={activeTab === 'archived'}
            onClick={() => {
              setActiveTab('archived');
              setSelectedIds([]);
            }}
            count={stats.archived}
          >
            Archived
          </TabButton>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search name, email, subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-4 pl-9 text-sm text-white placeholder-gray-600 backdrop-blur-sm transition-all focus:border-white/20 focus:bg-white/6 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Bulk Action Bar ────────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onBulkStatus={handleBulkStatus}
          onBulkDelete={handleBulkDelete}
          isPending={bulkPending}
        />
      )}

      {/* ─── List Header ────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/3 px-2.5 py-1.5 text-xs text-gray-400 transition-all hover:bg-white/6 hover:text-gray-200"
            >
              {allFilteredSelected ? (
                <SquareCheck className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {allFilteredSelected ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-gray-600">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* ─── Submissions List ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <SubmissionRow
              key={sub.id}
              sub={sub}
              selected={selectedIds.includes(sub.id)}
              onToggleSelect={toggleSelect}
              onOpen={openDetail}
              onStatusChange={() => {}}
              onDelete={() => {
                setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
                setSelectedIds((prev) => prev.filter((id) => id !== sub.id));
              }}
            />
          ))}
        </div>
      )}

      {/* ─── Detail Modal ───────────────────────────────────────────────────── */}
      {detailSub && (
        <SubmissionDetailModal
          submission={detailSub}
          onClose={() => setDetailSub(null)}
          onUpdated={handleDetailUpdate}
        />
      )}
    </>
  );
}
