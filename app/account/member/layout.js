/**
 * @file Member dashboard layout.
 * Enforces `member` role via server-side guard.
 *
 * @module MemberLayout
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';

export default async function MemberLayout({ children }) {
  await requireRole('member');

  return <>{children}</>;
}
