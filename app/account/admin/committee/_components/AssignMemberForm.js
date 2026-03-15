'use client';

import { useState, useMemo, useRef } from 'react';
import { createCommitteeMemberAction } from '@/app/_lib/committee-actions';

export default function AssignMemberForm({ positions, users, defaultTermStart, defaultTermEnd }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      const name = user.name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return name.includes(query) || email.includes(query);
    });
  }, [searchQuery, users]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchQuery(user.name);
    setIsOpen(false);
  };

  return (
    <form
      action={createCommitteeMemberAction}
      className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5"
    >
      <h2 className="text-lg font-semibold text-white">Assign Member</h2>

      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">User</span>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search and select user..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
                setSelectedUser(null);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-400"
            />
            {isOpen && filteredUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-black/60 shadow-lg">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </button>
                ))}
              </div>
            )}
            {isOpen && filteredUsers.length === 0 && searchQuery && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-sm text-gray-400">
                No users found
              </div>
            )}
          </div>
          {selectedUser && (
            <p className="mt-2 text-xs text-green-400">
              ✓ Selected: {selectedUser.name} ({selectedUser.email})
            </p>
          )}
        </label>
        <input
          type="hidden"
          name="user_id"
          value={selectedUser?.id || ''}
          required={!selectedUser}
        />
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-gray-400">Position</span>
        <select
          name="position_id"
          required
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          defaultValue=""
        >
          <option value="" disabled>
            Select position
          </option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.title} ({position.category})
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Term Start</span>
          <input
            name="term_start"
            type="date"
            required
            defaultValue={defaultTermStart}
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-400">Term End</span>
          <input
            name="term_end"
            type="date"
            defaultValue={defaultTermEnd}
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-gray-400">Current Term</span>
        <select
          name="is_current"
          defaultValue="true"
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-gray-400">Bio</span>
        <textarea
          name="bio"
          rows={3}
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          placeholder="Optional short bio"
        />
      </label>

      <button
        type="submit"
        className="rounded-xl bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-500/30"
      >
        Assign Member
      </button>
    </form>
  );
}
