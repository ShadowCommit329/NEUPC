/**
 * @file Members client — executive interface for reviewing pending
 *   join requests and managing current member profiles.
 * @module ExecutiveMembersClient
 */

'use client';

import { useState, useTransition } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  GraduationCap,
  Filter,
  ChevronDown,
} from 'lucide-react';
import {
  execApproveJoinRequestAction,
  execRejectJoinRequestAction,
} from '@/app/_lib/executive-actions';

function Avatar({ name, size = 'sm' }) {
  const initials =
    name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  const colors = [
    'from-blue-600',
    'from-violet-600',
    'from-emerald-600',
    'from-rose-600',
    'from-amber-600',
  ];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  const sz = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br ${colors[idx]} to-transparent font-semibold text-white ${sz}`}
    >
      {initials}
    </div>
  );
}

function ApprovalCard({ req, onApprove, onReject, isPending }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all hover:border-white/20 sm:flex-row sm:items-center">
      <Avatar name={req.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">
          {req.name || req.email}
        </p>
        <p className="truncate text-sm text-gray-400">{req.email}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          {req.batch && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" /> Session {req.batch}
            </span>
          )}
          {req.department && <span>{req.department}</span>}
          {req.student_id && <span>ID: {req.student_id}</span>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />{' '}
            {new Date(req.created_at).toLocaleDateString()}
          </span>
        </div>
        {req.reason && (
          <p className="mt-2 line-clamp-2 text-xs text-gray-400 italic">
            &quot;{req.reason}&quot;
          </p>
        )}
      </div>
      <div className="flex gap-2 sm:flex-col">
        <button
          onClick={() => onApprove(req.id)}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-600/30 disabled:opacity-60 sm:flex-none"
        >
          <UserCheck className="h-4 w-4" /> Approve
        </button>
        <button
          onClick={() => onReject(req.id)}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-600/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/20 disabled:opacity-60 sm:flex-none"
        >
          <UserX className="h-4 w-4" /> Reject
        </button>
      </div>
    </div>
  );
}

export default function MembersClient({
  initialRequests,
  initialMembers,
  pendingRequests,
  allMembers,
}) {
  // support both naming conventions
  initialRequests = initialRequests ?? pendingRequests ?? [];
  initialMembers = initialMembers ?? allMembers ?? [];
  const [tab, setTab] = useState('pending');
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = (id) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await execApproveJoinRequestAction(fd);
      if (res?.error) return showToast(res.error, 'error');
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast('Member approved!');
    });
  };

  const handleReject = (id) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await execRejectJoinRequestAction(fd);
      if (res?.error) return showToast(res.error, 'error');
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast('Request rejected.');
    });
  };

  const sessions = [
    ...new Set(
      initialMembers
        .map((m) => m.member_profiles?.[0]?.academic_session)
        .filter(Boolean)
    ),
  ].sort();

  const filteredMembers = initialMembers.filter((m) => {
    const profile = m.member_profiles?.[0];
    const query = search.toLowerCase();
    const matchSearch =
      !search ||
      m.full_name?.toLowerCase().includes(query) ||
      m.email?.toLowerCase().includes(query) ||
      profile?.student_id?.toLowerCase().includes(query);
    const matchSession =
      sessionFilter === 'all' ||
      String(profile?.academic_session) === sessionFilter;
    return matchSearch && matchSession;
  });

  const stats = {
    pending: requests.length,
    total: initialMembers.length,
    sessions: sessions.length,
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Members</h1>
        <p className="mt-1 text-gray-400">
          Manage join requests and view club members
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
          {
            label: 'Total Members',
            value: stats.total,
            color: 'text-blue-400',
          },
          {
            label: 'Sessions',
            value: stats.sessions,
            color: 'text-emerald-400',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
          >
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex w-fit rounded-xl border border-white/10 bg-white/5 p-1">
        {[
          {
            key: 'pending',
            label: 'Pending Approvals',
            count: requests.length,
          },
          {
            key: 'members',
            label: 'All Members',
            count: initialMembers.length,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-300'}`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.key ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'}`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Pending Tab */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
              <CheckCircle className="mb-4 h-12 w-12 text-emerald-500/50" />
              <p className="text-lg font-medium text-gray-400">
                All caught up!
              </p>
              <p className="mt-1 text-sm text-gray-500">
                No pending join requests
              </p>
            </div>
          ) : (
            requests.map((req) => (
              <ApprovalCard
                key={req.id}
                req={req}
                onApprove={handleApprove}
                onReject={handleReject}
                isPending={isPending}
              />
            ))
          )}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or student ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-gray-900 py-2.5 pr-9 pl-9 text-sm text-white focus:outline-none"
              >
                <option value="all">All Sessions</option>
                {sessions.map((s) => (
                  <option key={s} value={String(s)}>
                    Session {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-gray-600" />
              <p className="text-gray-400">No members found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs tracking-wide text-gray-500 uppercase">
                      <th className="px-4 py-3">Member</th>
                      <th className="hidden px-4 py-3 sm:table-cell">
                        Student ID
                      </th>
                      <th className="hidden px-4 py-3 md:table-cell">
                        Session
                      </th>
                      <th className="hidden px-4 py-3 lg:table-cell">
                        Department
                      </th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMembers.map((m) => {
                      const profile = m.member_profiles?.[0];
                      return (
                        <tr
                          key={m.id}
                          className="transition-colors hover:bg-white/3"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={m.full_name} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-white">
                                  {m.full_name || '—'}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  {m.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">
                            {profile?.student_id || '—'}
                          </td>
                          <td className="hidden px-4 py-3 text-gray-400 md:table-cell">
                            {profile?.academic_session ? (
                              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                                Session {profile.academic_session}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">
                            {profile?.department || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {m.created_at
                              ? new Date(m.created_at).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-white/10 px-4 py-3 text-xs text-gray-500">
                Showing {filteredMembers.length} of {initialMembers.length}{' '}
                members
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div
          className={`fixed right-6 bottom-6 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${toast.type === 'error' ? 'border-red-500/30 bg-red-500/20 text-red-300' : 'border-green-500/30 bg-green-500/20 text-green-300'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
