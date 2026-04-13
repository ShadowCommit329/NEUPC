/**
 * @file Advisor dashboard layout.
 * Enforces `advisor` role via server-side guard.
 *
 * @module AdvisorLayout
 * @access advisor
 */

import { requireRole } from '@/app/_lib/auth-guard';

export default async function AdvisorLayout({ children }) {
  await requireRole('advisor');

  return <>{children}</>;
}
