/**
 * @file Admin user management page (server component).
 * Fetches all users with stats, formats dates for display,
 * and renders the user management table.
 *
 * @module AdminUsersPage
 * @access admin
 */

import { getAllUsers, getUserStats } from '@/app/_lib/data-service';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import UserManagementClient from './_components/UserManagementClient';

export const metadata = { title: 'Users | Admin | NEUPC' };

// Revalidate every 0 seconds (on-demand via revalidatePath from actions)
export const revalidate = 0;

// ── Page ────────────────────────────────────────────────────────────────────

export default async function AdminUsersPage({ searchParams }) {
  const params = await searchParams;
  const [users, stats] = await Promise.all([
    getAllUsers().catch(() => []),
    getUserStats().catch(() => ({})),
  ]);

  // Normalise URL params so the client can pre-apply filters.
  // ?role=guest  → 'Guest'   ?status=active → 'Active'   ?search=foo → 'foo'
  const rawRole = params?.role ?? '';
  const rawStatus = params?.status ?? '';
  const rawSearch = params?.search ?? '';
  const VALID_ROLES = [
    'guest',
    'member',
    'mentor',
    'executive',
    'advisor',
    'admin',
  ];
  const VALID_STATUSES = [
    'active',
    'inactive',
    'suspended',
    'banned',
    'blocked',
    'locked',
    'pending',
    'rejected',
  ];
  const initialFilterRole = VALID_ROLES.includes(rawRole.toLowerCase())
    ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase()
    : 'All';
  const initialFilterStatus = VALID_STATUSES.includes(rawStatus.toLowerCase())
    ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
    : 'All';
  const initialSearch = rawSearch.slice(0, 100); // basic length guard

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="mt-2 text-sm text-gray-400">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Link
          href="/account/admin/users/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2.5 font-semibold text-blue-300 transition-colors hover:bg-blue-500/30"
        >
          <UserPlus className="h-5 w-5" />
          Add User
        </Link>
      </div>
      <UserManagementClient
        initialUsers={users}
        stats={stats}
        initialFilterRole={initialFilterRole}
        initialFilterStatus={initialFilterStatus}
        initialSearch={initialSearch}
      />
    </div>
  );
}
