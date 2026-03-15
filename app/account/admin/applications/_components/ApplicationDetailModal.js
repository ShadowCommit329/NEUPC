/**
 * @file Application Detail modal component
 * @module ApplicationDetailModal
 */

'use client';

import { useState, useTransition } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  BookOpen,
  Code,
  Github,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  RotateCcw,
  Copy,
  ExternalLink,
  GraduationCap,
  Hash,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';
import { getStatusConfig } from './applicationConfig';
import {
  approveApplicationAction,
  rejectApplicationAction,
  resetApplicationAction,
  deleteApplicationAction,
} from '@/app/_lib/application-actions';
import { useScrollLock } from '@/app/_lib/hooks';

function InfoItem({ icon: Icon, label, value, mono, href, copyable }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
          {label}
        </p>
        <div className="flex items-center gap-2">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm break-all text-blue-400 transition-colors hover:text-blue-300"
            >
              {value}
              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
            </a>
          ) : (
            <p
              className={`text-sm leading-relaxed break-all text-gray-200 ${mono ? 'font-mono' : ''}`}
            >
              {value}
            </p>
          )}
          {copyable && (
            <button
              onClick={handleCopy}
              className="shrink-0 rounded p-0.5 text-gray-600 transition-colors hover:text-gray-300"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          {copied && (
            <span className="shrink-0 text-[10px] text-green-400">Copied!</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ApplicationDetailModal({
  request,
  onClose,
  onUpdated,
  onDeleted,
}) {
  const [isPending, startTransition] = useTransition();
  useScrollLock();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(
    request.rejection_reason || ''
  );
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const sc = getStatusConfig(request.status);

  function showMsg(type, msg) {
    setActionMsg({ type, msg });
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function handleApprove() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', request.id);
      const result = await approveApplicationAction(fd);
      if (result?.error) {
        showMsg('error', result.error);
      } else {
        onUpdated?.({ ...request, status: 'approved', rejection_reason: null });
      }
    });
  }

  async function handleReject() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', request.id);
      fd.set('rejection_reason', rejectionReason);
      const result = await rejectApplicationAction(fd);
      if (result?.error) {
        showMsg('error', result.error);
      } else {
        setShowRejectForm(false);
        onUpdated?.({
          ...request,
          status: 'rejected',
          rejection_reason: rejectionReason,
        });
      }
    });
  }

  async function handleReset() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', request.id);
      const result = await resetApplicationAction(fd);
      if (result?.error) {
        showMsg('error', result.error);
      } else {
        onUpdated?.({
          ...request,
          status: 'pending',
          rejection_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        });
      }
    });
  }

  async function handleDelete() {
    setDeletePending(true);
    const fd = new FormData();
    fd.set('id', request.id);
    const result = await deleteApplicationAction(fd);
    setDeletePending(false);
    if (result?.error) {
      showMsg('error', result.error);
    } else {
      onDeleted?.();
      onClose();
    }
  }

  const submittedAt = request.created_at
    ? new Date(request.created_at).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const reviewedAt = request.reviewed_at
    ? new Date(request.reviewed_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Parse interests
  const interests = request.interests
    ? request.interests
        .split(/[,\n|;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-950 shadow-2xl shadow-black/60">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
              <GraduationCap className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-white">
                {request.name}
              </h2>
              <p className="text-[11px] text-gray-500">
                Membership Application
              </p>
            </div>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sc.badgeClass}`}
            >
              <sc.icon className="h-3 w-3" />
              {sc.label}
            </span>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/8 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Action message ─────────────────────────────────────────────── */}
        {actionMsg && (
          <div
            className={`mx-6 mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${
              actionMsg.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-green-500/30 bg-green-500/10 text-green-300'
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {actionMsg.msg}
          </div>
        )}

        {/* ── Scroll body ───────────────────────────────────────────────── */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* Personal info */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
              Personal Information
            </h3>
            <div className="divide-y divide-white/5">
              <InfoItem icon={User} label="Full Name" value={request.name} />
              <InfoItem
                icon={Mail}
                label="Email"
                value={request.email}
                copyable
              />
              <InfoItem icon={Phone} label="Phone" value={request.phone} />
            </div>
            <a
              href={`mailto:${request.email}`}
              className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/15"
            >
              <Mail className="h-3.5 w-3.5" />
              Reply via Email
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          </div>

          {/* Academic info */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
              Academic Details
            </h3>
            <div className="divide-y divide-white/5">
              <InfoItem
                icon={Hash}
                label="Student ID"
                value={request.student_id}
                mono
                copyable
              />
              <InfoItem
                icon={CalendarDays}
                label="Session"
                value={request.batch}
              />
              <InfoItem
                icon={BookOpen}
                label="Department"
                value={request.department}
              />
            </div>
          </div>

          {/* Online presence */}
          {(request.codeforces_handle || request.github) && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                Online Presence
              </h3>
              <div className="divide-y divide-white/5">
                {request.codeforces_handle && (
                  <InfoItem
                    icon={Code}
                    label="Codeforces"
                    value={request.codeforces_handle}
                    href={`https://codeforces.com/profile/${request.codeforces_handle}`}
                  />
                )}
                {request.github && (
                  <InfoItem
                    icon={Github}
                    label="GitHub"
                    value={request.github}
                    href={
                      request.github.startsWith('http')
                        ? request.github
                        : `https://github.com/${request.github}`
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <h3 className="mb-3 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          {request.reason && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                Why do you want to join?
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-200">
                {request.reason}
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
              Submission Info
            </h3>
            <div className="divide-y divide-white/5">
              <InfoItem
                icon={CalendarDays}
                label="Submitted At"
                value={submittedAt}
              />
              {reviewedAt && (
                <InfoItem
                  icon={CheckCircle2}
                  label="Reviewed At"
                  value={reviewedAt}
                />
              )}
            </div>
          </div>

          {/* Rejection reason */}
          {request.status === 'rejected' && request.rejection_reason && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 p-4">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="mb-1 text-xs font-semibold text-red-300">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-200">
                  {request.rejection_reason}
                </p>
              </div>
            </div>
          )}

          {/* Reject form (inline) */}
          {showRejectForm && (
            <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <label className="text-xs font-semibold text-red-300">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why the application is being rejected…"
                className="w-full resize-none rounded-xl border border-red-500/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-red-500/40 focus:ring-1 focus:ring-red-500/30 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReject}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Confirm Reject
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="rounded-xl px-3 py-2 text-xs text-gray-500 transition-colors hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions ────────────────────────────────────────────── */}
        <div className="space-y-3 border-t border-white/8 px-6 py-4">
          {/* Primary actions */}
          <div className="flex flex-wrap gap-2">
            {request.status !== 'approved' && (
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/15 px-4 py-2.5 text-sm font-semibold text-green-300 transition-all hover:scale-[1.01] hover:bg-green-500/25 active:scale-95 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve
              </button>
            )}
            {request.status !== 'rejected' && !showRejectForm && (
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-300 transition-all hover:scale-[1.01] hover:bg-red-500/25 active:scale-95 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            )}
            {request.status !== 'pending' && (
              <button
                onClick={handleReset}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-300 transition-all hover:scale-[1.01] hover:bg-yellow-500/20 active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to Pending
              </button>
            )}
          </div>

          {/* Delete + close */}
          <div className="flex items-center justify-between">
            {deleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  Permanently delete?
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deletePending}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                >
                  {deletePending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Yes, delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-2 py-1.5 text-xs text-gray-500 transition-colors hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
