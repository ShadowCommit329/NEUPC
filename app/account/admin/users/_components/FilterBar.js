/**
 * @file Filter bar — search and dropdown filters for narrowing the
 *   user list by role, status, or text query.
 * @module AdminFilterBar
 */

import { Search, ChevronDown, Wifi } from 'lucide-react';

const selectOptionStyles = `
  select {
    color-scheme: dark;
  }
  select option {
    background-color: #1a1a2e;
    color: #ffffff;
    padding: 8px;
  }
  select option:checked {
    background-color: #3b82f6;
    color: #ffffff;
  }
  select option:hover {
    background-color: #2d3748;
    color: #ffffff;
  }
`;

export default function FilterBar({
  search,
  onSearchChange,
  filterRole,
  onRoleChange,
  filterStatus,
  onStatusChange,
  filterOnline,
  onOnlineChange,
  filteredCount,
  totalCount,
}) {
  return (
    <>
      <style>{selectOptionStyles}</style>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* search */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email or student ID…"
            className="w-full rounded-xl border border-white/8 bg-white/4 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>

        {/* role filter */}
        <div className="relative min-w-48">
          <select
            value={filterRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/8 bg-white/4 py-2.5 pr-8 pl-4 text-sm text-white transition-all outline-none hover:border-white/12 hover:bg-white/5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          >
            <option value="All">All Roles</option>
            {['Admin', 'Executive', 'Mentor', 'Advisor', 'Member', 'Guest'].map(
              (r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              )
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors" />
        </div>

        {/* status filter */}
        <div className="relative min-w-48">
          <select
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/8 bg-white/4 py-2.5 pr-8 pl-4 text-sm text-white transition-all outline-none hover:border-white/12 hover:bg-white/5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          >
            <option value="All">All Statuses</option>
            {[
              'Active',
              'Inactive',
              'Pending',
              'Suspended',
              'Banned',
              'Blocked',
              'Locked',
              'Rejected',
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors" />
        </div>

        <span className="shrink-0 text-sm text-gray-500">
          {filteredCount} of {totalCount}
        </span>

        {/* online only toggle */}
        <button
          onClick={() => onOnlineChange(!filterOnline)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
            filterOnline
              ? 'border-green-500/50 bg-green-500/15 text-green-400'
              : 'border-white/8 bg-white/4 text-gray-500 hover:border-white/12 hover:bg-white/5 hover:text-gray-300'
          }`}
          title="Show online users only"
        >
          <Wifi className="h-3.5 w-3.5" />
          Online
        </button>
      </div>
    </>
  );
}
