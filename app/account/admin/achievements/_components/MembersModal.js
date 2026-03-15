/**
 * @file Members modal — overlay for selecting members to award a
 *   specific achievement or viewing who has already earned it.
 * @module AdminMembersModal
 */

'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import {
  addAchievementMemberAction,
  removeAchievementMemberAction,
} from '@/app/_lib/achievement-actions';
import { useScrollLock } from '@/app/_lib/hooks';

const POSITIONS = ['Team Lead', 'Member', 'Coach', 'Mentor', 'Co-Lead'];

export default function MembersModal({ achievement, users = [], onClose }) {
  const [members, setMembers] = useState(achievement.member_achievements ?? []);
  useScrollLock();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [position, setPosition] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null); // id of record being removed
  const [, startTransition] = useTransition();

  // Users not yet linked
  const linkedIds = new Set(members.map((m) => m.user_id));
  const availableUsers = users.filter((u) => !linkedIds.has(u.id));

  // ── Add member ────────────────────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault();
    if (!selectedUserId) return;
    setAddError('');
    setAdding(true);

    const fd = new FormData();
    fd.set('achievement_id', achievement.id);
    fd.set('user_id', selectedUserId);
    fd.set('position', position);

    const res = await addAchievementMemberAction(fd);
    setAdding(false);

    if (res?.error) {
      setAddError(res.error);
    } else {
      // Optimistically add
      const addedUser = users.find((u) => u.id === selectedUserId);
      setMembers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(), // placeholder; server will revalidate
          achievement_id: achievement.id,
          user_id: selectedUserId,
          position: position || null,
          users: addedUser
            ? {
                id: addedUser.id,
                full_name: addedUser.full_name,
                avatar_url: addedUser.avatar_url,
              }
            : null,
        },
      ]);
      setSelectedUserId('');
      setPosition('');
    }
  }

  // ── Remove member ─────────────────────────────────────────────────────────
  function handleRemove(recordId) {
    setRemoving(recordId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', recordId);
      const res = await removeAchievementMemberAction(fd);
      if (!res?.error) {
        setMembers((prev) => prev.filter((m) => m.id !== recordId));
      }
      setRemoving(null);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-2 backdrop-blur-sm sm:p-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              👥 Linked Members
            </h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {achievement.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* ── Body (scrollable) ────────────────────────────────────────── */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Add member form */}
          {availableUsers.length > 0 ? (
            <form onSubmit={handleAdd} className="space-y-3">
              <p className="text-sm font-medium text-slate-300">Add a member</p>
              <div className="flex gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">Select member…</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email || u.id}
                    </option>
                  ))}
                </select>
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  list="position-options"
                  placeholder="Position (opt.)"
                  className="w-36 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <datalist id="position-options">
                  {POSITIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              {addError && <p className="text-xs text-red-400">{addError}</p>}
              <button
                type="submit"
                disabled={adding || !selectedUserId}
                className="w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {adding ? 'Adding…' : 'Add Member'}
              </button>
            </form>
          ) : (
            <p className="rounded-lg bg-slate-800/50 py-3 text-center text-xs text-slate-500">
              All registered members are already linked.
            </p>
          )}

          <div className="h-px bg-slate-700/40" />

          {/* Current members list */}
          <div>
            <p className="mb-3 text-sm font-medium text-slate-300">
              Current members{' '}
              <span className="text-xs text-slate-500">({members.length})</span>
            </p>

            {members.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No members linked yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => {
                  const u = m.users;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/60 p-3"
                    >
                      {/* Avatar */}
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-700">
                        {u?.avatar_url ? (
                          <Image
                            src={u.avatar_url}
                            alt={u.full_name ?? ''}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                            {(u?.full_name ?? '?')[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Name + position */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {u?.full_name ?? 'Unknown member'}
                        </p>
                        {m.position && (
                          <p className="text-xs text-amber-400">{m.position}</p>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={removing === m.id}
                        title="Unlink member"
                        className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        {removing === m.id ? (
                          <span className="text-xs">…</span>
                        ) : (
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-700/50 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-700/50 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
