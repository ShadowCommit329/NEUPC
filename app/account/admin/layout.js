/**
 * @file Admin dashboard layout.
 * Enforces `admin` role via server-side guard.
 *
 * @module AdminLayout
 * @access admin
 */

import { requireRole } from '@/app/_lib/auth-guard';

export default async function AdminLayout({ children }) {
  await requireRole('admin');

  return <>{children}</>;
}
