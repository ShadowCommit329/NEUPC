/**
 * @file Assign role modal — dialog for assigning a specific role to
 *   one or more users with search and bulk-selection support.
 * @module AdminAssignRoleModal
 */

'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  X,
  Shield,
  Search,
  UserCheck,
  UserMinus,
  Loader2,
  Users,
  CheckCircle2,
} from 'lucide-react';
import {
  assignRoleToUserAction,
  removeRoleFromUserAction,
} from '@/app/_lib/role-actions';
import { getRoleConfig } from './roleConfig';

const MANAGED_ROLES = ['member', 'advisor', 'admin', 'mentor', 'executive'];

function buildEmptyDraft(roleName) {
  if (roleName === 'member') {
    return { student_id: '', academic_session: '', department: '' };
  }
  if (roleName === 'advisor') {
    return { position: '', profile_link: '', department: '' };
  }
  if (roleName === 'executive') {
    return {
      position_id: '',
      term_start: '',
      term_end: '',
      is_current: true,
      bio: '',
    };
  }
  if (roleName === 'admin' || roleName === 'mentor') {
    return { bio: '' };
  }
  return {};
}

function UserAvatar({ user, size = 'md' }) {
  const isUrl =
    user.avatar?.startsWith('http') || user.avatar?.startsWith('/api/image/');
  const sz = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  if (isUrl) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${sz} rounded-full object-cover ring-1 ring-white/10`}
      />
    );
  }
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-emerald-500 to-emerald-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-cyan-500 to-cyan-600',
  ];
  const color = colors[(user.name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${color} font-semibold text-white ring-1 ring-white/10`}
    >
      {user.avatar ?? '?'}
    </div>
  );
}

export default function AssignRoleModal({
  role,
  users,
  onClose,
  onUserAssigned, // (userId, newRoleId, newRoleName, oldRoleId) => void
}) {
  const cfg = getRoleConfig(role?.name);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'assigned' | 'unassigned'
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [localUsers, setLocalUsers] = useState(
    users.map((u) => ({
      ...u,
      roleIds: Array.isArray(u.roleIds)
        ? u.roleIds
        : u.currentRoleId
          ? [u.currentRoleId]
          : [],
      roleNames: Array.isArray(u.roleNames)
        ? u.roleNames
        : u.currentRoleName && u.currentRoleName !== 'guest'
          ? [u.currentRoleName]
          : [],
    }))
  );
  const [errorMap, setErrorMap] = useState({});
  const [successIds, setSuccessIds] = useState(new Set());
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [profileDrafts, setProfileDrafts] = useState({});
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return localUsers.filter((u) => {
      const matchSearch =
        !term ||
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term);
      const isAssigned = u.roleIds?.includes(role.id);
      if (filter === 'assigned') return matchSearch && isAssigned;
      if (filter === 'unassigned') return matchSearch && !isAssigned;
      return matchSearch;
    });
  }, [localUsers, search, filter, role.id]);

  const assignedCount = useMemo(
    () => localUsers.filter((u) => u.roleIds?.includes(role.id)).length,
    [localUsers, role.id]
  );

  function setLoading(userId, val) {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      val ? next.add(userId) : next.delete(userId);
      return next;
    });
  }

  function setSuccess(userId) {
    setSuccessIds((prev) => new Set(prev).add(userId));
    setTimeout(
      () =>
        setSuccessIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        }),
      2000
    );
  }

  function handleAssign(user) {
    const isManagedRole = MANAGED_ROLES.includes(role.name);
    const draft = profileDrafts[user.id] || buildEmptyDraft(role.name);

    if (isManagedRole) {
      if (
        role.name === 'member' &&
        (!draft.student_id.trim() ||
          !draft.academic_session.trim() ||
          !draft.department.trim())
      ) {
        setExpandedUserId(user.id);
        setErrorMap((prev) => ({
          ...prev,
          [user.id]:
            'Member requires Student ID, Academic Session, and Department.',
        }));
        return;
      }

      if (
        role.name === 'advisor' &&
        (!draft.position.trim() ||
          !draft.profile_link.trim() ||
          !draft.department.trim())
      ) {
        setExpandedUserId(user.id);
        setErrorMap((prev) => ({
          ...prev,
          [user.id]: 'Advisor requires Position, Profile Link, and Department.',
        }));
        return;
      }

      if (
        role.name === 'executive' &&
        (!draft.position_id.trim() ||
          !draft.term_start.trim() ||
          !draft.term_end.trim())
      ) {
        setExpandedUserId(user.id);
        setErrorMap((prev) => ({
          ...prev,
          [user.id]:
            'Executive requires Position ID, Term Start, and Term End.',
        }));
        return;
      }
    }

    setLoading(user.id, true);
    setErrorMap((prev) => ({ ...prev, [user.id]: null }));

    const fd = new FormData();
    fd.set('userId', user.id);
    fd.set('roleId', role.id);
    fd.set('roleName', role.name);

    if (role.name === 'member') {
      fd.set('student_id', draft.student_id.trim());
      fd.set('academic_session', draft.academic_session.trim());
      fd.set('department', draft.department.trim());
    }

    if (role.name === 'advisor') {
      fd.set('position', draft.position.trim());
      fd.set('profile_link', draft.profile_link.trim());
      fd.set('department', draft.department.trim());
    }

    if (role.name === 'admin' || role.name === 'mentor') {
      fd.set('bio', draft.bio?.trim() || '');
    }

    if (role.name === 'executive') {
      fd.set('position_id', draft.position_id.trim());
      fd.set('term_start', draft.term_start.trim());
      fd.set('term_end', draft.term_end.trim());
      fd.set('is_current', draft.is_current ? 'true' : 'false');
      fd.set('bio', draft.bio?.trim() || '');
    }

    startTransition(async () => {
      try {
        await assignRoleToUserAction(fd);
        setLocalUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  roleIds: u.roleIds?.includes(role.id)
                    ? u.roleIds
                    : [...(u.roleIds ?? []), role.id],
                  roleNames: u.roleNames?.includes(role.name)
                    ? u.roleNames
                    : [...(u.roleNames ?? []), role.name],
                }
              : u
          )
        );
        onUserAssigned(user.id, role.id, 'assign');
        setSuccess(user.id);
      } catch (err) {
        setErrorMap((prev) => ({ ...prev, [user.id]: err.message }));
      } finally {
        setLoading(user.id, false);
      }
    });
  }

  function handleRemove(user) {
    setLoading(user.id, true);
    setErrorMap((prev) => ({ ...prev, [user.id]: null }));

    const fd = new FormData();
    fd.set('userId', user.id);
    fd.set('roleId', role.id);
    fd.set('roleName', role.name);

    startTransition(async () => {
      try {
        await removeRoleFromUserAction(fd);
        setLocalUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  roleIds: (u.roleIds ?? []).filter((id) => id !== role.id),
                  roleNames: (u.roleNames ?? []).filter((n) => n !== role.name),
                }
              : u
          )
        );
        onUserAssigned(user.id, role.id, 'remove');
        setSuccess(user.id);
      } catch (err) {
        setErrorMap((prev) => ({ ...prev, [user.id]: err.message }));
      } finally {
        setLoading(user.id, false);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl">
        {/* ── header ── */}
        <div
          className={`flex shrink-0 items-center justify-between border-b border-white/8 bg-linear-to-r ${cfg.gradient} px-5 py-4`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${cfg.iconBg}`}
            >
              <Shield className={`h-4 w-4 ${cfg.iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Assign role to users</p>
              <h2 className="text-sm font-bold text-white capitalize">
                {role.name}
                <span className="ml-2 font-normal text-gray-500">
                  · {assignedCount} assigned
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── search + filter ── */}
        <div className="shrink-0 space-y-2 border-b border-white/8 px-4 py-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pr-4 pl-10 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-white/20"
            />
          </div>
          <div className="flex gap-1">
            {[
              { key: 'all', label: `All (${localUsers.length})` },
              { key: 'assigned', label: `Assigned (${assignedCount})` },
              {
                key: 'unassigned',
                label: `Others (${localUsers.length - assignedCount})`,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── user list ── */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '420px' }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-600">
              <Users className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map((user) => {
                const isAssigned = user.roleIds?.includes(role.id) ?? false;
                const isLoading = loadingIds.has(user.id);
                const isSuccess = successIds.has(user.id);
                const err = errorMap[user.id];
                const isManagedRole = MANAGED_ROLES.includes(role.name);
                const draft =
                  profileDrafts[user.id] || buildEmptyDraft(role.name);
                const isExpanded = expandedUserId === user.id;

                return (
                  <li
                    key={user.id}
                    className={`px-4 py-3 transition-colors hover:bg-white/3 ${
                      isAssigned ? 'bg-white/2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">
                            {user.name}
                          </p>
                          {isAssigned && (
                            <CheckCircle2
                              className={`h-3.5 w-3.5 shrink-0 ${cfg.iconColor}`}
                            />
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {user.email}
                        </p>
                        {/* all current role badges */}
                        {user.roleNames?.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {user.roleNames.map((rn) => {
                              const rc = getRoleConfig(rn);
                              return (
                                <span
                                  key={rn}
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold capitalize ${rc.badge}`}
                                >
                                  {rn}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {err && (
                          <p className="mt-0.5 text-[10px] text-red-400">
                            {err}
                          </p>
                        )}
                      </div>

                      {/* role count badge */}
                      <span className="shrink-0 rounded-md bg-white/8 px-2 py-0.5 text-[10px] text-gray-400">
                        {user.roleIds?.length ?? 0} role
                        {user.roleIds?.length !== 1 ? 's' : ''}
                      </span>

                      {/* action button */}
                      {isAssigned ? (
                        <button
                          onClick={() => handleRemove(user)}
                          disabled={isLoading}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-white/6 px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isSuccess ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (isManagedRole) setExpandedUserId(user.id);
                            handleAssign(user);
                          }}
                          disabled={isLoading}
                          className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${cfg.badge} hover:opacity-90`}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isSuccess ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          Assign
                        </button>
                      )}
                    </div>

                    {isManagedRole && !isAssigned && isExpanded && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/3 p-3">
                        <p className="mb-2 text-[11px] font-semibold text-gray-400 uppercase">
                          {role.name} Profile Details
                        </p>

                        {role.name === 'member' && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <input
                              value={draft.student_id}
                              onChange={(e) =>
                                setProfileDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...buildEmptyDraft(role.name),
                                    ...prev[user.id],
                                    student_id: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Student ID"
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                            />
                            <input
                              value={draft.academic_session}
                              onChange={(e) =>
                                setProfileDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...buildEmptyDraft(role.name),
                                    ...prev[user.id],
                                    academic_session: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Academic Session"
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                            />
                            <input
                              value={draft.department}
                              onChange={(e) =>
                                setProfileDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...buildEmptyDraft(role.name),
                                    ...prev[user.id],
                                    department: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Department"
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                            />
                          </div>
                        )}

                        {role.name === 'advisor' && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <input
                              value={draft.position}
                              onChange={(e) =>
                                setProfileDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...buildEmptyDraft(role.name),
                                    ...prev[user.id],
                                    position: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Position"
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                            />
                            <input
                              value={draft.profile_link}
                              onChange={(e) =>
                                setProfileDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...buildEmptyDraft(role.name),
                                    ...prev[user.id],
                                    profile_link: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Profile Link"
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                            />
                            <input
                              value={draft.department}
                              onChange={(e) =>
                                setProfileDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...buildEmptyDraft(role.name),
                                    ...prev[user.id],
                                    department: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Department"
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                            />
                          </div>
                        )}

                        {(role.name === 'admin' || role.name === 'mentor') && (
                          <textarea
                            rows={2}
                            value={draft.bio}
                            onChange={(e) =>
                              setProfileDrafts((prev) => ({
                                ...prev,
                                [user.id]: {
                                  ...buildEmptyDraft(role.name),
                                  ...prev[user.id],
                                  bio: e.target.value,
                                },
                              }))
                            }
                            placeholder="Bio (optional)"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                          />
                        )}

                        {role.name === 'executive' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <input
                                value={draft.position_id}
                                onChange={(e) =>
                                  setProfileDrafts((prev) => ({
                                    ...prev,
                                    [user.id]: {
                                      ...buildEmptyDraft(role.name),
                                      ...prev[user.id],
                                      position_id: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Position ID"
                                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                              />
                              <input
                                type="date"
                                value={draft.term_start}
                                onChange={(e) =>
                                  setProfileDrafts((prev) => ({
                                    ...prev,
                                    [user.id]: {
                                      ...buildEmptyDraft(role.name),
                                      ...prev[user.id],
                                      term_start: e.target.value,
                                    },
                                  }))
                                }
                                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                              />
                              <input
                                type="date"
                                value={draft.term_end}
                                onChange={(e) =>
                                  setProfileDrafts((prev) => ({
                                    ...prev,
                                    [user.id]: {
                                      ...buildEmptyDraft(role.name),
                                      ...prev[user.id],
                                      term_end: e.target.value,
                                    },
                                  }))
                                }
                                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                id={`isCurrent-${user.id}`}
                                type="checkbox"
                                checked={Boolean(draft.is_current)}
                                onChange={(e) =>
                                  setProfileDrafts((prev) => ({
                                    ...prev,
                                    [user.id]: {
                                      ...buildEmptyDraft(role.name),
                                      ...prev[user.id],
                                      is_current: e.target.checked,
                                    },
                                  }))
                                }
                                className="h-3.5 w-3.5 rounded border-white/30 bg-white/5"
                              />
                              <label
                                htmlFor={`isCurrent-${user.id}`}
                                className="text-xs text-gray-400"
                              >
                                Is Current
                              </label>
                            </div>
                            <textarea
                              rows={2}
                              value={draft.bio}
                              onChange={(e) =>
                                setProfileDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...buildEmptyDraft(role.name),
                                    ...prev[user.id],
                                    bio: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Bio (optional)"
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── footer ── */}
        <div className="shrink-0 border-t border-white/8 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-white/6 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
