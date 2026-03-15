/**
 * @file Account layout (server component).
 * Authenticates the session, fetches user roles, and wraps all /account/*
 * routes in the RoleProvider context + sidebar layout.
 * Uses cached data-fetchers shared with `requireRole()` to deduplicate
 * DB queries within a single request.
 *
 * @module AccountLayout
 */

import { auth } from '@/app/_lib/auth';
import { redirect } from 'next/navigation';
import { getCachedUserRoles } from '@/app/_lib/auth-guard';
import { getUserByEmail } from '@/app/_lib/data-service';
import AccountLayoutClient from './_components/AccountLayoutClient';
import { RoleProvider } from './_components/RoleContext';
import ChatFAB from '@/app/_components/chat/ChatFAB';

/** All account pages require runtime auth — prevent static generation */
export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [userRoles, dbUser] = await Promise.all([
    getCachedUserRoles(session.user.email).catch(() => []),
    getUserByEmail(session.user.email).catch(() => null),
  ]);

  // Serialize only the fields the client needs
  // Prefer the DB-stored avatar (Google Drive proxy URL) over the Google session image
  const userData = {
    name: session.user?.name || '',
    email: session.user?.email || '',
    avatar_url: dbUser?.avatar_url || session.user?.avatar_url || '',
    image:
      dbUser?.avatar_url ||
      session.user?.avatar_url ||
      session.user?.image ||
      '',
    role: userRoles[0] || null, // primary role from DB (or null if unassigned)
    roles: userRoles, // full roles array from DB
  };

  // Derive the initial active role from the DB array (first = highest-priority role)
  const initialRole = userRoles[0] || null;

  const hasNoRoles = !userRoles.length;
  const isGuest = hasNoRoles; // true only if NO roles assigned
  const isActive = dbUser?.account_status === 'active';
  const showChat = !isGuest && isActive;

  return (
    <RoleProvider userRoles={userRoles} initialRole={initialRole}>
      <AccountLayoutClient session={userData} userRoles={userRoles}>
        {children}
      </AccountLayoutClient>
      {showChat && <ChatFAB session={session} />}
    </RoleProvider>
  );
}
