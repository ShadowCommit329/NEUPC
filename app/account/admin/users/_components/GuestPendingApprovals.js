/**
 * @file Guest pending approvals — section listing guest users awaiting
 *   account activation with approve / reject controls.
 * @module AdminGuestPendingApprovals
 */

'use client';

import {
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Avatar from './Avatar';

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function GuestPendingApprovals({
  pendingUsers,
  appealUsers = [],
  onApprove,
  onReject,
  isPending,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // Update items per page based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(3);
      } else {
        setItemsPerPage(9);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasPending = pendingUsers && pendingUsers.length > 0;
  const hasAppeals = appealUsers && appealUsers.length > 0;

  if (!hasPending && !hasAppeals) return null;

  const totalPages = hasPending
    ? Math.ceil(pendingUsers.length / itemsPerPage)
    : 0;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentUsers = hasPending ? pendingUsers.slice(startIdx, endIdx) : [];
  const hasPagination = hasPending && pendingUsers.length > itemsPerPage;

  // Reset to page 1 when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="space-y-8">
      {/* ── Pending Approvals ────────────────────────────────────────────── */}
      {hasPending && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              Guest Pending Approvals ({pendingUsers.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onApprove={onApprove}
                onReject={onReject}
                isPending={isPending}
              />
            ))}
          </div>

          {hasPagination && (
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              isPending={isPending}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              onPage={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* ── Rejection Appeals ────────────────────────────────────────────── */}
      {hasAppeals && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">
              Rejection Appeals ({appealUsers.length})
            </h3>
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-400 ring-1 ring-orange-500/25">
              Awaiting Review
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {appealUsers.map((user) => (
              <AppealCard
                key={user.id}
                user={user}
                onApprove={onApprove}
                onReject={onReject}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Standard pending user card ──────────────────────────────────────────────
function UserCard({ user, onApprove, onReject, isPending }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
          {user.joined && (
            <p className="mt-1 text-xs text-gray-600">
              Joined {fmtDate(user.joined)}
            </p>
          )}
        </div>
      </div>

      {/* User message — only shown when the user themselves wrote it */}
      {user.statusReason && user.statusChangedBy === user.id && (
        <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3 text-blue-400" />
            <p className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase">
              Message from user
            </p>
          </div>
          <p className="text-xs leading-relaxed text-gray-300">
            {user.statusReason}
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onApprove(user)}
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          onClick={() => onReject(user)}
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}

// ── Appeal card (rejected user who submitted an appeal) ─────────────────────
function AppealCard({ user, onApprove, onReject, isPending }) {
  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 backdrop-blur-sm">
      {/* Top accent */}
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
        <span className="text-[11px] font-semibold text-orange-400">
          Appeal submitted
        </span>
      </div>

      <div className="flex items-start gap-3">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
          {user.joined && (
            <p className="mt-1 text-xs text-gray-600">
              Joined {fmtDate(user.joined)}
            </p>
          )}
        </div>
      </div>

      {/* User message — only shown when the user themselves wrote it */}
      {user.statusReason && user.statusChangedBy === user.id && (
        <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3 text-blue-400" />
            <p className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase">
              Message from user
            </p>
          </div>
          <p className="text-xs leading-relaxed text-gray-300">
            {user.statusReason}
          </p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onApprove(user)}
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          onClick={() => onReject(user)}
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          Re-reject
        </button>
      </div>
    </div>
  );
}

// ── Pagination bar ───────────────────────────────────────────────────────────
function PaginationBar({
  currentPage,
  totalPages,
  isPending,
  onPrev,
  onNext,
  onPage,
}) {
  return (
    <div className="mt-6 flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <button
        onClick={onPrev}
        disabled={currentPage === 1 || isPending}
        className="order-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:order-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="order-3 flex flex-wrap items-center justify-center gap-2 sm:order-0">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPage(page)}
            disabled={isPending}
            className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
              currentPage === page
                ? 'border border-amber-500/50 bg-amber-500/20 text-amber-400'
                : 'border border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <div className="order-2 flex items-center justify-center text-xs text-gray-400 sm:order-0">
        Page {currentPage} of {totalPages}
      </div>

      <button
        onClick={onNext}
        disabled={currentPage === totalPages || isPending}
        className="order-1 mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:order-0 sm:mt-0"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
