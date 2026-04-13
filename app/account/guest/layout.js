/**
 * @file Guest dashboard layout.
 * Enforces `guest` role (skips `is_online` check since guests
 * don't require member activation).
 *
 * @module GuestLayout
 * @access guest
 */

import { requireRole } from '@/app/_lib/auth-guard';

export default async function GuestLayout({ children }) {
  await requireRole('guest', { checkIsActive: false });

  return <>{children}</>;
}
