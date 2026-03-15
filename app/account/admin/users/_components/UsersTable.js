/**
 * @file Users table — sortable, paginated data table listing all
 *   platform users with avatar, name, email, roles, status, and
 *   row-level action menus.
 * @module AdminUsersTable
 */

'use client';

import { useState, useEffect } from 'react';
import { Edit, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import Avatar from './Avatar';
import RoleBadge from './RoleBadge';
import StatusBadge from './StatusBadge';
import ApprovalBadge from './ApprovalBadge';
import ActionMenu from './ActionMenu';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLastActive(iso) {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hrs = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const DESKTOP_OPTIONS = [10, 25, 50, 100];
const MOBILE_OPTIONS = [5, 10, 25, 50];

function isInactiveUser(user) {
  return (user.status || '').toLowerCase() === 'inactive';
}

export default function UsersTable({
  filtered,
  users,
  onAction,
  onVerifyEmail,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setPageSize(mobile ? 5 : 10);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered.length, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIdx, startIdx + pageSize);
  const options = isMobile ? MOBILE_OPTIONS : DESKTOP_OPTIONS;

  const handlePageSize = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const HEADERS = [
    { label: 'User', cls: 'min-w-[200px]' },
    { label: 'Role', cls: 'min-w-[100px]' },
    { label: 'Status', cls: 'min-w-[110px]' },
    { label: 'Membership', cls: 'min-w-[120px]' },
    { label: 'Joined', cls: 'min-w-[90px]' },
    { label: 'Last Active', cls: 'min-w-[100px]' },
    { label: '', cls: 'min-w-[110px]' },
  ];

  console.log('Rendering UsersTable with', { filtered, users, paginated });

  return (
    <div className="space-y-2">
      <div className="relative z-10 overflow-hidden rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm">
        {/* desktop table */}
        <div className="hidden w-full overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2 text-left">
                {HEADERS.map((h) => (
                  <th
                    key={h.label}
                    className={`px-4 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase ${h.cls}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                paginated.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-white/3"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar user={user} />
                          {user.isOnline && (
                            <span
                              className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-900"
                              title="Online"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {user.email}
                          </p>
                          {user.studentId && (
                            <p className="text-xs text-gray-600">
                              {user.studentId}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge roles={user.roles} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ApprovalBadge
                        isApproved={user.isApproved}
                        hasMemberProfile={!!user.appliedAt}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      <span
                        title={
                          user.joined
                            ? new Date(user.joined).toLocaleString()
                            : ''
                        }
                      >
                        {formatDate(user.joined)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      <span
                        title={
                          user.lastActive
                            ? new Date(user.lastActive).toLocaleString()
                            : ''
                        }
                      >
                        {formatLastActive(user.lastActive)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isInactiveUser(user) && (
                          <button
                            onClick={() => onVerifyEmail?.(user.id)}
                            className="text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => onAction('edit', user)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-blue-400 transition-colors hover:border-blue-500/60 hover:bg-blue-500/20"
                          title="Edit user"
                        >
                          <Edit className="h-3.5 w-3.5 shrink-0" />
                          Edit
                        </button>
                        <ActionMenu user={user} onAction={onAction} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="divide-y divide-white/5 md:hidden">
          {paginated.length === 0 ? (
            <EmptyState />
          ) : (
            paginated.map((user) => (
              <div key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar user={user} />
                      {user.isOnline && (
                        <span
                          className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-900"
                          title="Online"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isInactiveUser(user) && (
                      <button
                        onClick={() => onVerifyEmail?.(user.id)}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 hover:text-cyan-200"
                      >
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => onAction('edit', user)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:border-blue-500/60 hover:bg-blue-500/20"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <ActionMenu user={user} onAction={onAction} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <RoleBadge roles={user.roles} />
                  <StatusBadge status={user.status} />
                  <ApprovalBadge
                    isApproved={user.isApproved}
                    hasMemberProfile={!!user.appliedAt}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Joined {formatDate(user.joined)}
                  {user.lastActive && (
                    <span className="ml-3 text-gray-700">
                      Active {formatLastActive(user.lastActive)}
                    </span>
                  )}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination bar */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          {/* Left: count + page size */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs text-gray-400">
              {startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)}{' '}
              <span className="text-gray-600">of {filtered.length}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">Show</span>
              <select
                value={pageSize}
                onChange={handlePageSize}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50"
              >
                {options.map((n) => (
                  <option key={n} value={n} className="bg-gray-900">
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: page controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {(() => {
                const range = [];
                const delta = isMobile ? 1 : 2;
                const left = Math.max(1, currentPage - delta);
                const right = Math.min(totalPages, currentPage + delta);
                for (let i = left; i <= right; i++) range.push(i);
                if (left > 1) range.unshift('...');
                if (right < totalPages) range.push('...');
                return range.map((p, i) =>
                  p === '...' ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="flex h-7 w-5 items-center justify-center text-xs text-gray-600"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                        currentPage === p
                          ? 'border-blue-500/50 bg-blue-500/20 text-blue-400'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-2xl bg-white/5 p-4">
        <Users className="h-8 w-8 text-gray-600" />
      </div>
      <p className="text-sm font-medium text-gray-400">No users found</p>
      <p className="text-xs text-gray-600">
        Try adjusting your search or filters
      </p>
    </div>
  );
}
