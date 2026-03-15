/**
 * @file Account hub / role-selection page (server component).
 * Authenticates the user, auto-redirects single-role users to their
 * dashboard, and renders the role-selection grid for multi-role users.
 *
 * @module AccountPage
 * @requires requireAuth  — redirects unauthenticated visitors to /login
 * @requires roleDashboards — role → dashboard config mapping
 */

import { redirect } from 'next/navigation';
import { requireAuth } from '../_lib/auth-guard';
import { roleDashboards } from '../_lib/roleDashboardConfig';
import AccountPageClient from './_components/AccountPageClient';
import AccountHeader from './_components/AccountHeader';
import UserAvatar from './_components/UserAvatar';
import AvailableRoles from './_components/AvailableRoles';
import AccountStatusMessages from './_components/AccountStatusMessages';
import PendingRoleAssignment from './_components/PendingRoleAssignment';
import UpgradeBanner from './_components/UpgradeBanner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Account | NEUPC' };

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check whether a user with the given role can access their dashboard.
 * Only account_status matters — is_online is a heartbeat/presence flag updated
 * every 60 s and must NOT gate access (users would get kicked out mid-session).
 */
function canAccessDashboard(role, user) {
  return user?.account_status === 'active';
}

/**
 * Build the list of dashboards the user is eligible to enter.
 * @param {string[]} roles
 * @param {Object}   user
 */
function getAvailableDashboards(roles, user) {
  return roles
    .map((role) => ({ role, config: roleDashboards[role] }))
    .filter(({ role, config }) => config && canAccessDashboard(role, user));
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function AccountPage() {
  const { session, user, userRoles: rawRoles } = await requireAuth();

  // Users must have roles explicitly assigned by admin — no default guest role
  const userRoles = rawRoles;

  const availableRoles = getAvailableDashboards(userRoles, user);

  // Single accessible dashboard → smooth client-side redirect
  const redirectPath =
    availableRoles.length === 1 ? availableRoles[0].config.path : null;

  return (
    <AccountPageClient redirectPath={redirectPath}>
      <div className="min-h-screen px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <AccountHeader
            session={session.user}
            accountStatus={user?.account_status}
          />
          <UserAvatar session={session.user} />
          <AvailableRoles
            availableRoles={availableRoles}
            accountStatus={user?.account_status}
          />
          {userRoles.length === 0 && user?.account_status === 'active' && (
            <PendingRoleAssignment />
          )}
          <AccountStatusMessages
            accountStatus={user?.account_status}
            statusReason={user?.status_reason}
            statusChangedBy={user?.status_changed_by}
            suspensionExpiresAt={user?.suspension_expires_at}
            userId={user?.id}
            userName={session.user?.name ?? ''}
            userEmail={session.user?.email ?? ''}
          />
          <UpgradeBanner
            accountStatus={user?.account_status}
            userRoles={userRoles}
          />
        </div>
      </div>
    </AccountPageClient>
  );
}
