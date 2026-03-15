/**
 * @file Applications client component — unified panel for Membership
 *   Applications (join_requests) and Guest Access Applications (pending users).
 * @module ApplicationsClient
 */

'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  GraduationCap,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  BookOpen,
  Hash,
  Code,
  Github,
  Loader2,
  Trash2,
  SquareCheck,
  Square,
  X,
  ChevronDown,
  AlertCircle,
  CalendarDays,
  Eye,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Users,
  UserCheck,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import ApplicationDetailModal from './ApplicationDetailModal';
import { getStatusConfig, ALL_STATUSES } from './applicationConfig';
import {
  approveApplicationAction,
  rejectApplicationAction,
  resetApplicationAction,
  deleteApplicationAction,
  bulkApproveApplicationsAction,
  bulkRejectApplicationsAction,
  bulkDeleteApplicationsAction,
} from '@/app/_lib/application-actions';
import {
  approveMemberAction,
  rejectGuestAction,
} from '@/app/_lib/user-actions';

// ─── Shared: Stat Card ────────────────────────────────────────────────────────

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

// ─── Shared: Tab Button ───────────────────────────────────────────────────────

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

// ─── Shared: Flash Message ────────────────────────────────────────────────────

function FlashMsg({ msg, type }) {
  if (!msg) return null;
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
        type === 'error'
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-green-500/30 bg-green-500/10 text-green-300'
      }`}
    >
      {type === 'error' ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      )}
      {msg}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  const getPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between border-t border-white/6 pt-4">
      <span className="text-xs text-gray-500">
        Showing{' '}
        <span className="font-medium text-gray-400 tabular-nums">{from}–{to}</span>
        {' '}of{' '}
        <span className="font-medium text-gray-400 tabular-nums">{totalItems}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 text-gray-400 transition-colors hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {getPages().map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-600">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                currentPage === page
                  ? 'border-white/20 bg-white/12 text-white'
                  : 'border-white/8 text-gray-500 hover:bg-white/6 hover:text-gray-300'
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 text-gray-400 transition-colors hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBERSHIP APPLICATIONS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

function BulkActionBar({
  selectedCount,
  onClear,
  onApprove,
  onReject,
  onDelete,
  isPending,
}) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reason, setReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 px-4 py-3">
      <div className="flex items-center gap-2">
        <SquareCheck className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-semibold text-blue-300">
          {selectedCount} selected
        </span>
      </div>
      {showRejectInput ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (optional)"
            className="w-52 rounded-lg border border-red-500/20 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-red-500/30 focus:outline-none"
          />
          <button
            onClick={() => {
              setShowRejectInput(false);
              onReject(reason);
              setReason('');
            }}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Confirm Reject
          </button>
          <button
            onClick={() => setShowRejectInput(false)}
            className="px-1 text-xs text-gray-500 transition-colors hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={onApprove}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300 transition-colors hover:bg-green-500/20 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Approve All
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <XCircle className="h-3 w-3" /> Reject All
          </button>
          {deleteConfirm ? (
            <>
              <span className="text-xs text-gray-400">
                Delete {selectedCount}?
              </span>
              <button
                onClick={() => {
                  setDeleteConfirm(false);
                  onDelete();
                }}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" /> Confirm
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-1 text-xs text-gray-500 hover:text-gray-300"
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
            onClick={onClear}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Application Row ──────────────────────────────────────────────────────────

function ApplicationRow({ req, selected, onToggleSelect, onOpen, onRefresh }) {
  const sc = getStatusConfig(req.status);
  const [statusOpen, setStatusOpen] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const displayName = req.full_name || req.name || '—';

  const dateStr = req.created_at
    ? new Date(req.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  async function quickApprove() {
    setStatusOpen(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', req.id);
      await approveApplicationAction(fd);
      onRefresh?.('approved');
    });
  }

  async function quickReject() {
    setStatusOpen(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', req.id);
      fd.set('rejection_reason', reason);
      await rejectApplicationAction(fd);
      setShowRejectInput(false);
      onRefresh?.('rejected');
    });
  }

  async function quickReset() {
    setStatusOpen(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', req.id);
      await resetApplicationAction(fd);
      onRefresh?.('pending');
    });
  }

  async function handleDelete() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', req.id);
      await deleteApplicationAction(fd);
      onRefresh?.('deleted');
    });
  }

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-2xl border bg-white/3 px-4 py-4 transition-all duration-150 hover:bg-white/5 sm:items-center ${
        selected
          ? 'border-blue-500/25 bg-blue-500/5'
          : 'border-white/8 hover:border-white/12'
      } ${sc.rowHighlight}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleSelect(req.id)}
        className="mt-0.5 shrink-0 text-gray-500 transition-colors hover:text-blue-400 sm:mt-0"
      >
        {selected ? (
          <SquareCheck className="h-4 w-4 text-blue-400" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>

      {/* Main info */}
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => onOpen(req)}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <span className="text-sm font-semibold text-white">
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 shrink-0 text-gray-600" />
            <span className="truncate text-xs text-gray-400">{req.email}</span>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {req.student_id && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <Hash className="h-3 w-3" />
              {req.student_id}
            </span>
          )}
          {req.batch && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <CalendarDays className="h-3 w-3" />
              {req.batch}
            </span>
          )}
          {req.department && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <BookOpen className="h-3 w-3" />
              <span className="max-w-45 truncate">{req.department}</span>
            </span>
          )}
        </div>

        {(req.codeforces_handle || req.github) && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {req.codeforces_handle && (
              <span className="flex items-center gap-1 text-[11px] text-gray-600">
                <Code className="h-3 w-3" />
                {req.codeforces_handle}
              </span>
            )}
            {req.github && (
              <span className="flex items-center gap-1 text-[11px] text-gray-600">
                <Github className="h-3 w-3" />
                {req.github}
              </span>
            )}
          </div>
        )}

        <p className="mt-2 text-[11px] text-gray-600">{dateStr}</p>
      </div>

      {/* Right — status badge + actions */}
      <div className="ml-2 flex shrink-0 flex-col items-end gap-2">
        {showRejectInput ? (
          <div
            className="flex flex-col gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-44 rounded-lg border border-red-500/20 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none"
            />
            <div className="flex gap-1">
              <button
                onClick={quickReject}
                disabled={isPending}
                className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-300 hover:bg-red-500/25"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                Confirm
              </button>
              <button
                onClick={() => setShowRejectInput(false)}
                className="px-1.5 text-[11px] text-gray-500 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusOpen((v) => !v);
                }}
                disabled={isPending}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 ${sc.badgeClass}`}
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
                  className="absolute top-full right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-white/12 bg-gray-950 shadow-2xl"
                  onMouseLeave={() => setStatusOpen(false)}
                >
                  {req.status !== 'approved' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        quickApprove();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-gray-300 transition-colors hover:bg-white/6"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      Approve
                    </button>
                  )}
                  {req.status !== 'rejected' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusOpen(false);
                        setShowRejectInput(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-gray-300 transition-colors hover:bg-white/6"
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                      Reject
                    </button>
                  )}
                  {req.status !== 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        quickReset();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-gray-300 transition-colors hover:bg-white/6"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-yellow-400" />
                      Reset to Pending
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(req);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
                title="View details"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              {deleteConfirm ? (
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="rounded border border-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10"
                  >
                    Del
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-0.5 text-[10px] text-gray-500 hover:text-gray-300"
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
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Membership Empty State ───────────────────────────────────────────────────

function MembershipEmpty({ tab }) {
  const msgs = {
    all: {
      title: 'No applications yet',
      sub: 'Join requests will appear here once submitted.',
    },
    pending: { title: 'No pending applications', sub: 'All caught up!' },
    approved: { title: 'No approved applications', sub: '' },
    rejected: { title: 'No rejected applications', sub: '' },
  };
  const { title, sub } = msgs[tab] ?? msgs.all;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
      <GraduationCap className="mb-4 h-12 w-12 text-gray-700" />
      <p className="text-sm font-semibold text-gray-400">{title}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUEST ACCESS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Avatar helper ────────────────────────────────────────────────────────────

function GuestAvatar({ user }) {
  const isUrl = user.avatar?.startsWith('http') || user.avatar?.startsWith('/');

  if (isUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10">
        <Image
          src={user.avatar}
          alt={user.name}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  // Initials fallback
  const initials = user.avatar || '?';
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-linear-to-br from-indigo-500/30 to-purple-500/30 text-sm font-bold text-white">
      {initials}
    </div>
  );
}

// ─── Guest Application Row ────────────────────────────────────────────────────

function GuestRow({ user, onApprove, onReject, onFlash }) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const isAppeal = user.accountStatus === 'rejected';

  const joinedStr = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const lastLoginStr = user.lastLogin
    ? new Date(user.lastLogin).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  async function handleApprove() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('userId', user.id);
        await approveMemberAction(fd);
        onApprove(user.id);
        onFlash(`${user.name} approved as guest.`, 'success');
      } catch (err) {
        onFlash(err.message || 'Failed to approve.', 'error');
      }
    });
  }

  async function handleReject() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('userId', user.id);
        fd.set('reason', reason || 'Guest application rejected by admin');
        await rejectGuestAction(fd);
        onReject(user.id);
        onFlash(`${user.name}'s application rejected.`, 'success');
      } catch (err) {
        onFlash(err.message || 'Failed to reject.', 'error');
      }
    });
  }

  return (
    <div
      className={`group rounded-2xl border bg-white/3 p-4 transition-all hover:bg-white/5 ${
        isAppeal
          ? 'border-orange-500/20 bg-orange-500/3'
          : 'border-white/8 hover:border-white/12'
      }`}
    >
      {isAppeal && (
        <div className="mb-3 flex items-center gap-1.5">
          <RotateCcw className="h-3 w-3 text-orange-400" />
          <span className="text-[10px] font-semibold tracking-wider text-orange-400 uppercase">
            Appeal
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <GuestAvatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {user.name}
          </p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {joinedStr && (
              <span className="flex items-center gap-1 text-[10px] text-gray-600">
                <CalendarDays className="h-2.5 w-2.5" />
                Joined {joinedStr}
              </span>
            )}
            {lastLoginStr && (
              <span className="text-[10px] text-gray-600">
                Last seen {lastLoginStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User's own message / reason */}
      {user.statusReason && user.statusChangedBy === user.id && (
        <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3 text-blue-400" />
            <span className="text-[10px] font-semibold tracking-wider text-blue-400 uppercase">
              Message from user
            </span>
          </div>
          <p className="text-xs leading-relaxed text-gray-300">
            {user.statusReason}
          </p>
        </div>
      )}

      {/* Actions */}
      {showRejectInput ? (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (optional)"
            className="w-full rounded-lg border border-red-500/20 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-red-500/30 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/15 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ThumbsDown className="h-3 w-3" />
              )}
              Confirm Reject
            </button>
            <button
              onClick={() => setShowRejectInput(false)}
              className="px-3 text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ThumbsUp className="h-3.5 w-3.5" />
            )}
            Approve
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Guest Empty State ────────────────────────────────────────────────────────

function GuestEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
      <UserCheck className="mb-4 h-12 w-12 text-gray-700" />
      <p className="text-sm font-semibold text-gray-400">
        No pending guest applications
      </p>
      <p className="mt-1 text-xs text-gray-600">
        New sign-ups will appear here for review.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const MEMBER_PAGE_SIZE = 15;
const GUEST_PAGE_SIZE = 12;

export default function ApplicationsClient({
  initialRequests,
  initialGuestApps,
  adminId,
}) {
  // ── Top-level panel switcher ──────────────────────────────────────────────
  const [panel, setPanel] = useState('membership'); // 'membership' | 'guest'

  // ── Flash message ─────────────────────────────────────────────────────────
  const [flashMsg, setFlashMsg] = useState(null);

  function flash(msg, type = 'success') {
    setFlashMsg({ msg, type });
    setTimeout(() => setFlashMsg(null), 3500);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MEMBERSHIP STATE
  // ══════════════════════════════════════════════════════════════════════════

  const [requests, setRequests] = useState(initialRequests ?? []);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailReq, setDetailReq] = useState(null);
  const [bulkPending, startBulkTransition] = useTransition();
  const [memberPage, setMemberPage] = useState(1);

  const memberStats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesTab = activeTab === 'all' || r.status === activeTab;
      const q = search.toLowerCase();
      const name = r.full_name || r.name || '';
      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.student_id?.toLowerCase().includes(q) ||
        r.batch?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.codeforces_handle?.toLowerCase().includes(q) ||
        r.github?.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [requests, activeTab, search]);

  const allSelected =
    filteredRequests.length > 0 &&
    filteredRequests.every((r) => selectedIds.includes(r.id));

  const totalMemberPages = Math.ceil(
    filteredRequests.length / MEMBER_PAGE_SIZE
  );
  // Clamp page so deletions never leave us stranded on an empty page
  const safeMemberPage = Math.min(memberPage, totalMemberPages || 1);
  const paginatedRequests = filteredRequests.slice(
    (safeMemberPage - 1) * MEMBER_PAGE_SIZE,
    safeMemberPage * MEMBER_PAGE_SIZE
  );

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : filteredRequests.map((r) => r.id));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleRowRefresh(id, newStatus) {
    if (newStatus === 'deleted') {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } else {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    }
  }

  function handleBulkApprove() {
    startBulkTransition(async () => {
      const fd = new FormData();
      fd.set('ids', JSON.stringify(selectedIds));
      const result = await bulkApproveApplicationsAction(fd);
      if (result?.error) {
        flash(result.error, 'error');
      } else {
        setRequests((prev) =>
          prev.map((r) =>
            selectedIds.includes(r.id) ? { ...r, status: 'approved' } : r
          )
        );
        setSelectedIds([]);
        flash(
          `${result.updated} application${result.updated > 1 ? 's' : ''} approved`
        );
      }
    });
  }

  function handleBulkReject(reason) {
    startBulkTransition(async () => {
      const fd = new FormData();
      fd.set('ids', JSON.stringify(selectedIds));
      fd.set('rejection_reason', reason || '');
      const result = await bulkRejectApplicationsAction(fd);
      if (result?.error) {
        flash(result.error, 'error');
      } else {
        setRequests((prev) =>
          prev.map((r) =>
            selectedIds.includes(r.id)
              ? { ...r, status: 'rejected', rejection_reason: reason }
              : r
          )
        );
        setSelectedIds([]);
        flash(
          `${result.updated} application${result.updated > 1 ? 's' : ''} rejected`
        );
      }
    });
  }

  function handleBulkDelete() {
    startBulkTransition(async () => {
      const fd = new FormData();
      fd.set('ids', JSON.stringify(selectedIds));
      const result = await bulkDeleteApplicationsAction(fd);
      if (result?.error) {
        flash(result.error, 'error');
      } else {
        setRequests((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
        setSelectedIds([]);
        flash(
          `${result.deleted} application${result.deleted > 1 ? 's' : ''} deleted`
        );
      }
    });
  }

  function handleDetailUpdate(updated) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setDetailReq(updated);
  }

  function handleDetailDelete() {
    if (detailReq) {
      setRequests((prev) => prev.filter((r) => r.id !== detailReq.id));
      setSelectedIds((prev) => prev.filter((x) => x !== detailReq.id));
    }
    setDetailReq(null);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GUEST ACCESS STATE
  // ══════════════════════════════════════════════════════════════════════════

  const [guestApps, setGuestApps] = useState(initialGuestApps ?? []);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestPage, setGuestPage] = useState(1);

  const guestStats = useMemo(
    () => ({
      total: guestApps.length,
      pending: guestApps.filter((u) => u.accountStatus === 'pending').length,
      appeals: guestApps.filter((u) => u.accountStatus === 'rejected').length,
    }),
    [guestApps]
  );

  const filteredGuests = useMemo(() => {
    if (!guestSearch) return guestApps;
    const q = guestSearch.toLowerCase();
    return guestApps.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [guestApps, guestSearch]);

  const totalGuestPages = Math.ceil(filteredGuests.length / GUEST_PAGE_SIZE);
  const safeGuestPage = Math.min(guestPage, totalGuestPages || 1);
  const paginatedGuests = filteredGuests.slice(
    (safeGuestPage - 1) * GUEST_PAGE_SIZE,
    safeGuestPage * GUEST_PAGE_SIZE
  );

  function handleGuestApproved(userId) {
    setGuestApps((prev) => prev.filter((u) => u.id !== userId));
  }

  function handleGuestRejected(userId) {
    setGuestApps((prev) => prev.filter((u) => u.id !== userId));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  const MEMBER_STAT_CARDS = [
    {
      icon: GraduationCap,
      label: 'Total',
      value: memberStats.total,
      colorClass: 'bg-blue-500/15 text-blue-400',
      tab: 'all',
    },
    {
      icon: Clock,
      label: 'Pending',
      value: memberStats.pending,
      colorClass: 'bg-yellow-500/15 text-yellow-400',
      tab: 'pending',
    },
    {
      icon: CheckCircle2,
      label: 'Approved',
      value: memberStats.approved,
      colorClass: 'bg-green-500/15 text-green-400',
      tab: 'approved',
    },
    {
      icon: XCircle,
      label: 'Rejected',
      value: memberStats.rejected,
      colorClass: 'bg-red-500/15 text-red-400',
      tab: 'rejected',
    },
  ];

  return (
    <>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-orange-500/8 blur-3xl" />
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
              <span className="font-medium text-gray-400">Applications</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/15 ring-1 ring-yellow-500/25">
                <GraduationCap className="h-5 w-5 text-yellow-400" />
              </div>
              Applications
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              Review membership and guest access applications
              {memberStats.pending > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
                  {memberStats.pending} membership pending
                </span>
              )}
              {guestStats.pending > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
                  {guestStats.pending} guest pending
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/account/admin/users"
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-medium text-blue-300 transition-all hover:border-blue-500/50 hover:bg-blue-500/20"
            >
              User Management
            </Link>
            <Link
              href="/account/admin/roles"
              className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-medium text-purple-300 transition-all hover:border-purple-500/50 hover:bg-purple-500/20"
            >
              Role Management
            </Link>
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Panel Switcher ──────────────────────────────────────────────────── */}
      <div className="flex overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-1.5">
        <button
          onClick={() => setPanel('membership')}
          className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            panel === 'membership'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Membership Applications
          {memberStats.pending > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                panel === 'membership'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-white/6 text-gray-600'
              }`}
            >
              {memberStats.pending} pending
            </span>
          )}
        </button>
        <button
          onClick={() => setPanel('guest')}
          className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            panel === 'guest'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Guest Access
          {guestStats.total > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                panel === 'guest'
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-white/6 text-gray-600'
              }`}
            >
              {guestStats.total} {guestStats.total === 1 ? 'review' : 'reviews'}
            </span>
          )}
        </button>
      </div>

      {/* ─── Flash ──────────────────────────────────────────────────────────── */}
      <FlashMsg msg={flashMsg?.msg} type={flashMsg?.type} />

      {/* ═══════════════════════════════════════════════════════════════════════
          MEMBERSHIP PANEL
          ═══════════════════════════════════════════════════════════════════════ */}
      {panel === 'membership' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MEMBER_STAT_CARDS.map(
              ({ icon, label, value, colorClass, tab }) => (
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
                    setMemberPage(1);
                  }}
                />
              )
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="scrollbar-none flex items-center gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-1.5">
              {['all', 'pending', 'approved', 'rejected'].map((t) => (
                <TabButton
                  key={t}
                  active={activeTab === t}
                  onClick={() => {
                    setActiveTab(t);
                    setSelectedIds([]);
                    setMemberPage(1);
                  }}
                  count={t === 'all' ? memberStats.total : memberStats[t]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </TabButton>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search name, email, ID, session…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setMemberPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-4 pl-9 text-sm text-white placeholder-gray-600 backdrop-blur-sm transition-all focus:border-white/20 focus:bg-white/6 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setMemberPage(1);
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.length}
              onClear={() => setSelectedIds([])}
              onApprove={handleBulkApprove}
              onReject={handleBulkReject}
              onDelete={handleBulkDelete}
              isPending={bulkPending}
            />
          )}

          {/* List header */}
          {filteredRequests.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/3 px-2.5 py-1.5 text-xs text-gray-400 transition-all hover:bg-white/6 hover:text-gray-200"
                >
                  {allSelected ? (
                    <SquareCheck className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-xs text-gray-600 tabular-nums">
                  {filteredRequests.length > MEMBER_PAGE_SIZE
                    ? `${(safeMemberPage - 1) * MEMBER_PAGE_SIZE + 1}–${Math.min(safeMemberPage * MEMBER_PAGE_SIZE, filteredRequests.length)} of ${filteredRequests.length}`
                    : `${filteredRequests.length} result${filteredRequests.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          )}

          {/* List */}
          {filteredRequests.length === 0 ? (
            <MembershipEmpty tab={activeTab} />
          ) : (
            <div className="space-y-2">
              {paginatedRequests.map((req) => (
                <ApplicationRow
                  key={req.id}
                  req={req}
                  selected={selectedIds.includes(req.id)}
                  onToggleSelect={toggleSelect}
                  onOpen={setDetailReq}
                  onRefresh={(newStatus) => handleRowRefresh(req.id, newStatus)}
                />
              ))}
            </div>
          )}

          {/* Membership Pagination */}
          <Pagination
            currentPage={safeMemberPage}
            totalPages={totalMemberPages}
            totalItems={filteredRequests.length}
            pageSize={MEMBER_PAGE_SIZE}
            onPageChange={setMemberPage}
          />

          {/* Detail Modal */}
          {detailReq && (
            <ApplicationDetailModal
              request={detailReq}
              onClose={() => setDetailReq(null)}
              onUpdated={handleDetailUpdate}
              onDeleted={handleDetailDelete}
            />
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          GUEST ACCESS PANEL
          ═══════════════════════════════════════════════════════════════════════ */}
      {panel === 'guest' && (
        <>
          {/* Guest stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Users}
              label="Total Reviews"
              value={guestStats.total}
              colorClass="bg-indigo-500/15 text-indigo-400"
              active={false}
              onClick={() => {}}
            />
            <StatCard
              icon={Clock}
              label="Awaiting Review"
              value={guestStats.pending}
              colorClass="bg-yellow-500/15 text-yellow-400"
              active={false}
              onClick={() => {}}
            />
            <StatCard
              icon={RotateCcw}
              label="Appeals"
              value={guestStats.appeals}
              colorClass="bg-orange-500/15 text-orange-400"
              active={false}
              onClick={() => {}}
            />
          </div>

          {/* Panel description */}
          <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
              <div>
                <p className="text-sm font-medium text-indigo-300">
                  Guest Access Applications
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  These are new users who signed up via Google and are awaiting
                  admin approval to access the guest panel. Approving a user
                  grants them guest-level access with no member privileges.
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          {guestApps.length > 0 && (
            <div className="relative w-full sm:w-80">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search name or email…"
                value={guestSearch}
                onChange={(e) => {
                  setGuestSearch(e.target.value);
                  setGuestPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-4 pl-9 text-sm text-white placeholder-gray-600 backdrop-blur-sm transition-all focus:border-white/20 focus:bg-white/6 focus:outline-none"
              />
              {guestSearch && (
                <button
                  onClick={() => {
                    setGuestSearch('');
                    setGuestPage(1);
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Pending section */}
          {paginatedGuests.filter((u) => u.accountStatus === 'pending').length >
            0 && (
            <div>
              <div className="mb-3 flex items-center gap-2 px-1">
                <Clock className="h-4 w-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">
                  Awaiting Review
                </h3>
                <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                  {guestStats.pending}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedGuests
                  .filter((u) => u.accountStatus === 'pending')
                  .map((user) => (
                    <GuestRow
                      key={user.id}
                      user={user}
                      onApprove={handleGuestApproved}
                      onReject={handleGuestRejected}
                      onFlash={flash}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Appeals section */}
          {paginatedGuests.filter((u) => u.accountStatus === 'rejected')
            .length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2 px-1">
                <RotateCcw className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-white">
                  Rejection Appeals
                </h3>
                <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                  {guestStats.appeals}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedGuests
                  .filter((u) => u.accountStatus === 'rejected')
                  .map((user) => (
                    <GuestRow
                      key={user.id}
                      user={user}
                      onApprove={handleGuestApproved}
                      onReject={handleGuestRejected}
                      onFlash={flash}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Guest Pagination */}
          {filteredGuests.length > 0 && (
            <Pagination
              currentPage={safeGuestPage}
              totalPages={totalGuestPages}
              totalItems={filteredGuests.length}
              pageSize={GUEST_PAGE_SIZE}
              onPageChange={setGuestPage}
            />
          )}

          {/* Empty state */}
          {guestApps.length === 0 && <GuestEmpty />}

          {/* Search no results */}
          {guestApps.length > 0 && filteredGuests.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-12 text-center">
              <Search className="mb-3 h-8 w-8 text-gray-700" />
              <p className="text-sm text-gray-500">
                No users match &ldquo;{guestSearch}&rdquo;
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
