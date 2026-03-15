/**
 * @file Role management client — admin interface for viewing, editing,
 *   and assigning user roles with permission-level controls and
 *   member-count statistics.
 * @module AdminRoleManagementClient
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  Key,
  Lock,
  LayoutGrid,
  Table2,
  Search,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import RoleCard from './RoleCard';
import PermissionsModal from './PermissionsModal';
import EditDescriptionModal from './EditDescriptionModal';
import AssignRoleModal from './AssignRoleModal';
import { getRoleConfig } from './roleConfig';

// ─── small helpers ────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, colorClass }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3.5 backdrop-blur-sm">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-gray-500">{label}</p>
        {sub && (
          <p className="mt-0.5 truncate text-[10px] text-gray-600">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────

export default function RoleManagementClient({
  initialRoles,
  allPermissions,
  initialUsers,
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [users, setUsers] = useState(initialUsers); // live user list shared across modals
  const [view, setView] = useState('grid'); // 'grid' | 'matrix'
  const [search, setSearch] = useState('');

  // Modal state
  const [permissionsRole, setPermissionsRole] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [assignRole, setAssignRole] = useState(null);

  // ── derived stats ──────────────────────────────────────────
  const totalUsers = useMemo(
    () => roles.reduce((s, r) => s + (r.userCount ?? 0), 0),
    [roles]
  );
  const totalPermissions = allPermissions.length;
  const highestRole = roles[0]; // already sorted by priority DESC
  const mostUsedRole = useMemo(() => {
    return [...roles].sort(
      (a, b) => (b.userCount ?? 0) - (a.userCount ?? 0)
    )[0];
  }, [roles]);

  // ── filtered roles for grid ────────────────────────────────
  const filteredRoles = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return roles;
    return roles.filter(
      (r) =>
        r.name?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
    );
  }, [roles, search]);

  // ── callbacks ─────────────────────────────────────────────

  function handleDescriptionSaved(roleId, newDescription) {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, description: newDescription } : r
      )
    );
  }

  function handlePermissionsChanged(roleId, updatedPerms) {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, permissions: updatedPerms } : r
      )
    );
  }

  // Called by AssignRoleModal whenever a user's role changes.
  // userId – the affected user
  // roleId – the role that was added or removed
  // action – 'assign' | 'remove'
  function handleUserAssigned(userId, roleId, action) {
    // Resolve the role name for updating roleNames alongside roleIds
    const roleName = roles.find((r) => r.id === roleId)?.name;

    // 1. Update the live users array so re-opening a modal shows fresh data
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const currentIds = Array.isArray(u.roleIds)
          ? u.roleIds
          : u.currentRoleId
            ? [u.currentRoleId]
            : [];
        const updatedIds =
          action === 'assign'
            ? currentIds.includes(roleId)
              ? currentIds
              : [...currentIds, roleId]
            : currentIds.filter((id) => id !== roleId);
        const currentNames = Array.isArray(u.roleNames) ? u.roleNames : [];
        const updatedNames = roleName
          ? action === 'assign'
            ? currentNames.includes(roleName)
              ? currentNames
              : [...currentNames, roleName]
            : currentNames.filter((n) => n !== roleName)
          : currentNames;
        return { ...u, roleIds: updatedIds, roleNames: updatedNames };
      })
    );

    // 2. Update role user-counts
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id === roleId) {
          return {
            ...r,
            userCount:
              action === 'assign'
                ? (r.userCount ?? 0) + 1
                : Math.max(0, (r.userCount ?? 0) - 1),
          };
        }
        return r;
      })
    );
  }

  // ── matrix view: get unique permission categories + names ──
  const permCategories = useMemo(
    () => [...new Set(allPermissions.map((p) => p.category))].sort(),
    [allPermissions]
  );

  return (
    <>
      {/* ── Page Header ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">Roles</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 ring-1 ring-purple-500/25">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              Role Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage roles, permissions and access control
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/account/admin/users"
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-medium text-blue-300 transition-all hover:border-blue-500/50 hover:bg-blue-500/20"
            >
              User Management
            </Link>
            <Link
              href="/account/admin/applications"
              className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs font-medium text-yellow-300 transition-all hover:border-yellow-500/50 hover:bg-yellow-500/20"
            >
              Applications
            </Link>
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Shield}
          label="Total Roles"
          value={roles.length}
          colorClass="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          icon={Key}
          label="Total Permissions"
          value={totalPermissions}
          colorClass="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          icon={Users}
          label="Users with Roles"
          value={totalUsers}
          sub={mostUsedRole ? `Most common: ${mostUsedRole.name}` : undefined}
          colorClass="bg-emerald-500/20 text-emerald-400"
        />
        <StatCard
          icon={Lock}
          label="Highest Role"
          value={
            highestRole?.name
              ? highestRole.name.charAt(0).toUpperCase() +
                highestRole.name.slice(1)
              : '—'
          }
          sub={`Priority ${highestRole?.priority ?? '—'}`}
          colorClass="bg-red-500/20 text-red-400"
        />
      </div>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* search */}
        <div className="relative max-w-xs flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-600 transition-colors outline-none focus:border-white/20"
          />
        </div>

        {/* view toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setView('grid')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'grid'
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </button>
          <button
            onClick={() => setView('matrix')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'matrix'
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            Matrix
          </button>
        </div>
      </div>

      {/* ── Grid View ─────────────────────────────────────── */}
      {view === 'grid' && (
        <>
          {filteredRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/4 py-16 text-center text-gray-500">
              <Shield className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No roles match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onManagePermissions={(r) => setPermissionsRole(r)}
                  onEditDescription={(r) => setEditRole(r)}
                  onAssignUsers={(r) => setAssignRole(r)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Matrix View ───────────────────────────────────── */}
      {view === 'matrix' && (
        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/3">
          <table className="w-full min-w-160 text-left text-xs">
            <thead>
              <tr className="border-b border-white/8">
                <th className="sticky left-0 z-10 bg-[#0f1117] px-4 py-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  Permission
                </th>
                {[...roles].reverse().map((role) => {
                  const cfg = getRoleConfig(role.name);
                  return (
                    <th key={role.id} className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold capitalize ${cfg.badge}`}
                        >
                          {role.name}
                        </span>
                        <span className="text-[9px] text-gray-600">
                          P{role.priority}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {permCategories.map((category) => (
                <>
                  {/* category row */}
                  <tr
                    key={`cat-${category}`}
                    className="border-b border-white/5 bg-white/3"
                  >
                    <td
                      colSpan={roles.length + 1}
                      className="sticky left-0 bg-white/5 px-4 py-1.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase"
                    >
                      {category}
                    </td>
                  </tr>
                  {/* permission rows */}
                  {allPermissions
                    .filter((p) => p.category === category)
                    .map((perm) => (
                      <tr
                        key={perm.id}
                        className="border-b border-white/5 hover:bg-white/3"
                      >
                        <td className="sticky left-0 bg-[#0f1117] px-4 py-2.5 font-mono text-[11px] text-gray-300">
                          {perm.name}
                          {perm.description && (
                            <p className="mt-0.5 font-sans text-[10px] text-gray-600">
                              {perm.description}
                            </p>
                          )}
                        </td>
                        {[...roles].reverse().map((role) => {
                          const has = role.permissions?.some(
                            (p) => p.id === perm.id
                          );
                          return (
                            <td
                              key={role.id}
                              className="px-4 py-2.5 text-center"
                            >
                              {has ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
                              ) : (
                                <XCircle className="mx-auto h-4 w-4 text-gray-700" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </>
              ))}
            </tbody>
          </table>
          {allPermissions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
              <Key className="mb-3 h-8 w-8 opacity-30" />
              <p className="text-sm">
                No permissions defined in the database yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Priority Legend ───────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
        <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Role Hierarchy
        </p>
        <div className="flex flex-wrap gap-2">
          {[...roles].reverse().map((role) => {
            const cfg = getRoleConfig(role.name);
            return (
              <div
                key={role.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${cfg.bgGlass} ${cfg.border}`}
              >
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                <span
                  className={`text-xs font-semibold capitalize ${cfg.accent}`}
                >
                  {role.name}
                </span>
                <span className="text-[10px] text-gray-600">
                  P{role.priority}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-1.5">
            <span className="text-[10px] text-gray-500">
              Higher priority = more access
            </span>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      {permissionsRole && (
        <PermissionsModal
          role={
            roles.find((r) => r.id === permissionsRole.id) ?? permissionsRole
          }
          allPermissions={allPermissions}
          onClose={() => setPermissionsRole(null)}
          onPermissionsChanged={handlePermissionsChanged}
        />
      )}

      {editRole && (
        <EditDescriptionModal
          role={roles.find((r) => r.id === editRole.id) ?? editRole}
          onClose={() => setEditRole(null)}
          onSaved={handleDescriptionSaved}
        />
      )}

      {assignRole && (
        <AssignRoleModal
          key={assignRole.id}
          role={roles.find((r) => r.id === assignRole.id) ?? assignRole}
          users={users}
          onClose={() => setAssignRole(null)}
          onUserAssigned={handleUserAssigned}
        />
      )}
    </>
  );
}
