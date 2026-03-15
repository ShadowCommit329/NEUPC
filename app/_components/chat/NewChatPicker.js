/**
 * @file NewChatPicker – Professional contact picker for starting new chats.
 *
 * Features:
 * - Search with debounce
 * - Grouped contacts by role
 * - Avatar with gradient fallback
 * - Role badges with colors
 * - Loading + empty states
 *
 * @module NewChatPicker
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn, getFallbackAvatarUrl } from '@/app/_lib/utils';
import { getInitials } from '@/app/_lib/utils';
import {
  getChatableUsersAction,
  createDirectConversationAction,
} from '@/app/_lib/chat-actions';
import { Search, Loader2, Users } from 'lucide-react';

const ROLE_STYLES = {
  member: {
    badge: 'bg-violet-500/15 text-violet-400',
    gradient: 'from-violet-500 to-violet-700',
  },
  executive: {
    badge: 'bg-amber-500/15 text-amber-400',
    gradient: 'from-amber-500 to-amber-700',
  },
  admin: {
    badge: 'bg-red-500/15 text-red-400',
    gradient: 'from-red-500 to-red-700',
  },
  mentor: {
    badge: 'bg-emerald-500/15 text-emerald-400',
    gradient: 'from-emerald-500 to-emerald-700',
  },
  advisor: {
    badge: 'bg-teal-500/15 text-teal-400',
    gradient: 'from-teal-500 to-teal-700',
  },
};

const ROLE_ORDER = ['executive', 'admin', 'mentor', 'advisor', 'member'];

export default function NewChatPicker({
  session,
  onConversationCreated,
  onCancel,
}) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);
  const [error, setError] = useState('');

  /* ── Fetch users ─────────────────────────────────────── */
  const fetchUsers = useCallback(async (query) => {
    setLoading(true);
    setError('');
    const result = await getChatableUsersAction(query || '');
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setUsers(result.users || []);
  }, []);

  useEffect(() => {
    const delay = search ? 300 : 0;
    const timer = setTimeout(() => fetchUsers(search), delay);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  /* ── Group users by role ─────────────────────────────── */
  const grouped = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      const r = u.role || 'member';
      if (!map[r]) map[r] = [];
      map[r].push(u);
    });
    // Sort by ROLE_ORDER
    return ROLE_ORDER.filter((r) => map[r]?.length).map((r) => ({
      role: r,
      users: map[r],
    }));
  }, [users]);

  /* ── Select user ─────────────────────────────────────── */
  const handleSelect = async (user) => {
    const userId = user.id || user.user_id;
    setCreating(userId);
    setError('');
    const result = await createDirectConversationAction(userId);
    setCreating(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onConversationCreated?.(result.conversation);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#111b21]">
      {/* Search */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts"
            className={cn(
              'w-full rounded-lg bg-[#202c33] py-1.75 pr-3 pl-9',
              'text-[13px] text-[#d1d7db] placeholder-[#8696a0]',
              'border-none outline-none',
              'transition-colors focus:bg-[#2a3942]'
            )}
            autoFocus
          />
        </div>
      </div>

      {error && <p className="px-3 pt-1 text-[11px] text-[#ea4335]">{error}</p>}

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {loading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#00a884]" />
            <p className="mt-2 text-[11px] text-[#8696a0]">
              Loading contacts...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#202c33]">
              <Users className="h-6 w-6 text-[#6b7b8d]" />
            </div>
            <p className="text-sm text-[#8696a0]">
              {search ? 'No contacts found' : 'No contacts available'}
            </p>
          </div>
        ) : (
          grouped.map(({ role, users: roleUsers }) => (
            <div key={role}>
              {/* Role header */}
              <div className="sticky top-0 z-5 bg-[#111b21] px-4 py-1.5">
                <span
                  className={cn(
                    'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                    ROLE_STYLES[role]?.badge || 'bg-[#2a3942] text-[#8696a0]'
                  )}
                >
                  {role}s
                </span>
              </div>

              {/* User rows */}
              {roleUsers.map((user) => {
                const userId = user.id || user.user_id;
                const style = ROLE_STYLES[user.role];
                return (
                  <button
                    key={userId}
                    onClick={() => handleSelect(user)}
                    disabled={creating === userId}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left',
                      'transition-colors duration-100',
                      'hover:bg-[#2a3942]/70',
                      'focus-visible:bg-[#2a3942]/70 focus-visible:outline-none',
                      'disabled:opacity-50'
                    )}
                  >
                    {/* Avatar */}
                    {user.avatar_url &&
                    !user.avatar_url.match(/^[A-Z?]{1,2}$/) ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="h-11 w-11 rounded-full object-cover ring-1 ring-white/5"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.src = getFallbackAvatarUrl(user.email || user.full_name);
                        }}
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br text-sm font-semibold text-white ring-1 ring-white/5',
                          style?.gradient || 'from-[#00a884] to-[#00876d]'
                        )}
                      >
                        {getInitials(user.full_name || 'U')}
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1 border-b border-[#222d34]/80 py-1">
                      <p className="truncate text-[15px] text-[#e9edef]">
                        {user.full_name || 'Unknown'}
                      </p>
                      <p className="text-[12px] text-[#8696a0]">
                        {user.email || ''}
                      </p>
                    </div>

                    {creating === userId && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#00a884]" />
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
