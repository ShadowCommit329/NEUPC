/**
 * @file Executive dashboard layout.
 * Enforces `executive` or `admin` role via server-side guard.
 *
 * @module ExecutiveLayout
 * @access executive | admin
 */

import { requireRole } from '@/app/_lib/auth-guard';

export default async function ExecutiveLayout({ children }) {
  await requireRole(['executive', 'admin']);

  return <>{children}</>;
}
