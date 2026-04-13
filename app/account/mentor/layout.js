/**
 * @file Mentor dashboard layout.
 * Enforces `mentor` role via server-side guard.
 *
 * @module MentorLayout
 * @access mentor
 */

import { requireRole } from '@/app/_lib/auth-guard';

export default async function MentorLayout({ children }) {
  await requireRole('mentor');

  return <>{children}</>;
}
