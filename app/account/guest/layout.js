/**
 * @file Guest dashboard layout.
 * Enforces `guest` role (skips `is_online` check since guests
 * don't require member activation), syncs the role to context.
 *
 * @module GuestLayout
 * @access guest
 */

import { requireRole } from '@/app/_lib/auth-guard';
import RoleSync from '../_components/RoleSync';

export default async function GuestLayout({ children }) {
  await requireRole('guest', { checkIsActive: false });

  return (
    <>
      <RoleSync role="guest" />
      {children}
    </>
  );
}
