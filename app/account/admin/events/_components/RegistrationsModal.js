/**
 * @file Registrations modal — overlay listing all participant
 *   registrations for a specific event with attendance status.
 * @module AdminRegistrationsModal
 */

'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Download,
  ExternalLink,
  UserCheck,
  Mail,
  Ban,
  CalendarCheck,
  CalendarX,
  ShieldCheck,
} from 'lucide-react';
import {
  getStatusConfig,
  getCategoryConfig,
  formatEventDate,
} from './eventConfig';
import { useScrollLock } from '@/app/_lib/hooks';
import { getFallbackAvatarUrl } from '@/app/_lib/utils';

// ─── registration status config ───────────────────────────────────────────────

const REG_STATUS = {
  registered: {
    label: 'Registered',
    badge: 'bg-blue-500/20 text-blue-300',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    badge: 'bg-emerald-500/20 text-emerald-300',
    icon: CheckCircle2,
  },
  attended: {
    label: 'Attended',
    badge: 'bg-purple-500/20 text-purple-300',
    icon: UserCheck,
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-red-500/20 text-red-300',
    icon: XCircle,
  },
};

function RegStatusBadge({ status }) {
  const cfg = REG_STATUS[status] ?? REG_STATUS.registered;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${cfg.badge}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── user avatar ──────────────────────────────────────────────────────────────

function Avatar({ name, src, size = 8 }) {
  const initials =
    name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '?';
  const fallbackSrc = getFallbackAvatarUrl(name || 'user');
  
  return (
    <div
      className={`flex h-${size} w-${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-bold text-gray-300`}
    >
      {src ? (
        <img 
          src={src} 
          alt={name} 
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback to robohash if primary image fails
            e.target.src = fallbackSrc;
          }}
        />
      ) : (
        <span style={{ fontSize: size < 10 ? '10px' : '12px' }}>
          {initials}
        </span>
      )}
    </div>
  );
}

// ─── action button ────────────────────────────────────────────────────────────

function ActionBtn({ icon: Icon, label, colorClass, loading, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      title={title}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40 ${colorClass}`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function RegistrationsModal({ event, onClose }) {
  const [registrations, setRegistrations] = useState([]);
  useScrollLock();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionPending, setActionPending] = useState(null); // registrationId being acted on
  const [actionError, setActionError] = useState(null);

  const sc = getStatusConfig(event.status);
  const cc = getCategoryConfig(event.category);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    async function fetchRegistrations() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/events/${event.id}/registrations`);
        if (!res.ok) throw new Error('Failed to fetch registrations.');
        const data = await res.json();
        setRegistrations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRegistrations();
  }, [event.id]);

  // ── update registration status ────────────────────────────────────────────
  async function updateStatus(registrationId, status) {
    setActionPending(registrationId);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/events/${event.id}/registrations/${registrationId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update.');
      // Optimistically update local state
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === registrationId
            ? { ...r, status: data.status, attended: data.attended }
            : r
        )
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionPending(null);
    }
  }

  // filter
  const filtered = registrations.filter((r) => {
    const name = r.users?.full_name ?? '';
    const email = r.users?.email ?? '';
    const teamMembers = (r.team_member_details ?? [])
      .map((m) => `${m.full_name ?? ''} ${m.email ?? ''}`)
      .join(' ');
    const matchSearch =
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      (r.team_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      teamMembers.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // stat counts
  const counts = registrations.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  // CSV export
  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Status', 'Team Name', 'Team Members', 'Registered At'],
      ...registrations.map((r) => [
        r.users?.full_name ?? '',
        r.users?.email ?? '',
        r.status,
        r.team_name ?? '',
        (r.team_member_details ?? []).map((m) => m.full_name).join('; '),
        r.registered_at ? new Date(r.registered_at).toISOString() : '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((c) => `"${c}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${event.slug ?? event.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const STATUS_TABS = [
    'all',
    'registered',
    'confirmed',
    'attended',
    'cancelled',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-8 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl">
        {/* header */}
        <div className="border-b border-white/8 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-lg ${cc.placeholder}`}
              >
                {cc.icon}
              </div>
              <div>
                <h2 className="font-bold text-white">{event.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{formatEventDate(event.start_date)}</span>
                  <span>·</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${sc.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {/* stats summary */}
          {!loading && registrations.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(REG_STATUS).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/3 px-3 py-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                    <div>
                      <p className="text-base leading-none font-bold text-white tabular-nums">
                        {counts[key] ?? 0}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        {cfg.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder-gray-600 outline-none focus:border-white/20"
              />
            </div>
            <button
              onClick={exportCSV}
              disabled={registrations.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>

          {/* action error */}
          {actionError && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <span>{actionError}</span>
              <button
                onClick={() => setActionError(null)}
                className="ml-2 shrink-0 text-red-400 hover:text-red-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* status filter tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filterStatus === tab
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'all'
                  ? `All (${registrations.length})`
                  : `${tab} (${counts[tab] ?? 0})`}
              </button>
            ))}
          </div>

          {/* list */}
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-white/6 bg-white/3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-gray-500" />
                <p className="mt-3 text-sm text-gray-500">
                  Loading registrations…
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-red-400">
                <XCircle className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                <Users className="mb-3 h-10 w-10 opacity-20" />
                <p className="text-sm">
                  {registrations.length === 0
                    ? 'No registrations yet.'
                    : 'No results match your filter.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((reg) => {
                  const user = reg.users;
                  return (
                    <div
                      key={reg.id}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/3"
                    >
                      <Avatar name={user?.full_name} src={user?.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">
                            {user?.full_name ?? 'Unknown User'}
                          </p>
                          {reg.team_name && (
                            <span className="shrink-0 rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] text-gray-400">
                              Team: {reg.team_name}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0 text-gray-600" />
                          <p className="truncate text-xs text-gray-500">
                            {user?.email ?? '—'}
                          </p>
                        </div>
                        {reg.registered_at && (
                          <p className="mt-0.5 text-[10px] text-gray-600">
                            {new Date(reg.registered_at).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                        )}
                        {/* Team members list with acceptance badges */}
                        {reg.team_member_details &&
                          reg.team_member_details.length > 0 && (
                            <div className="mt-2 space-y-1.5 border-t border-white/6 pt-2">
                              <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                                Team Members ({reg.team_member_details.length})
                              </p>
                              {reg.team_member_details.map((m) => {
                                const acc = (reg.member_acceptances ?? []).find(
                                  (a) => a.user_id === m.id,
                                );
                                const st = acc?.status ?? 'pending';
                                const stColor =
                                  st === 'accepted'
                                    ? 'text-emerald-400'
                                    : st === 'declined'
                                      ? 'text-red-400'
                                      : 'text-yellow-400';
                                return (
                                  <div
                                    key={m.id}
                                    className="flex items-center justify-between gap-1.5"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <Avatar
                                        name={m.full_name}
                                        src={m.avatar_url}
                                        size={5}
                                      />
                                      <span className="text-xs text-gray-400">
                                        {m.full_name}
                                      </span>
                                      {acc?.is_leader && (
                                        <span className="text-[10px] text-gray-600">
                                          leader
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`shrink-0 text-[10px] font-semibold ${stColor}`}
                                    >
                                      {st === 'accepted' ? '✓' : st === 'declined' ? '✕' : '⏳'}{' '}
                                      {st.charAt(0).toUpperCase() + st.slice(1)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {/* Admin action buttons */}
                        {reg.status !== 'cancelled' && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {/* Confirm */}
                            {reg.status === 'registered' && (() => {
                              const nonLeaders = (reg.member_acceptances ?? []).filter(a => !a.is_leader);
                              const pendingCount = nonLeaders.filter(a => a.status === 'pending').length;
                              const declinedCount = nonLeaders.filter(a => a.status === 'declined').length;
                              const allAccepted = pendingCount === 0 && declinedCount === 0;
                              const disableTitle = pendingCount > 0
                                ? `${pendingCount} member(s) haven't accepted yet`
                                : declinedCount > 0
                                  ? `${declinedCount} member(s) declined`
                                  : undefined;
                              return (
                                <ActionBtn
                                  icon={ShieldCheck}
                                  label={allAccepted ? 'Confirm' : `Waiting (${pendingCount + declinedCount})`}
                                  colorClass="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                  loading={actionPending === reg.id}
                                  disabled={nonLeaders.length > 0 && !allAccepted}
                                  title={disableTitle}
                                  onClick={() => updateStatus(reg.id, 'confirmed')}
                                />
                              );
                            })()}
                            {/* Mark Attended */}
                            {reg.status === 'confirmed' && (
                              <ActionBtn
                                icon={CalendarCheck}
                                label="Attended"
                                colorClass="bg-purple-500/15 text-purple-400 hover:bg-purple-500/25"
                                loading={actionPending === reg.id}
                                onClick={() => updateStatus(reg.id, 'attended')}
                              />
                            )}
                            {/* Undo Attend */}
                            {reg.status === 'attended' && (
                              <ActionBtn
                                icon={CalendarX}
                                label="Undo Attend"
                                colorClass="bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"
                                loading={actionPending === reg.id}
                                onClick={() =>
                                  updateStatus(reg.id, 'confirmed')
                                }
                              />
                            )}
                            {/* Cancel */}
                            <ActionBtn
                              icon={Ban}
                              label="Cancel"
                              colorClass="bg-red-500/15 text-red-400 hover:bg-red-500/25"
                              loading={actionPending === reg.id}
                              onClick={() => updateStatus(reg.id, 'cancelled')}
                            />
                          </div>
                        )}
                        {/* Re-register cancelled */}
                        {reg.status === 'cancelled' && (
                          <div className="mt-2">
                            <ActionBtn
                              icon={UserCheck}
                              label="Re-register"
                              colorClass="bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                              loading={actionPending === reg.id}
                              onClick={() => updateStatus(reg.id, 'registered')}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <RegStatusBadge status={reg.status} />
                        {reg.certificate_issued && (
                          <span className="text-[10px] text-purple-400">
                            🎓 Cert issued
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* capacity indicator */}
          {event.max_participants && (
            <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="h-4 w-4 text-gray-600" />
                Capacity
              </div>
              <div className="text-right">
                <span className="font-bold text-white">
                  {registrations.length}
                </span>
                <span className="text-gray-500">
                  {' '}
                  / {event.max_participants}
                </span>
                {registrations.length >= event.max_participants && (
                  <span className="ml-2 rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                    Full
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
