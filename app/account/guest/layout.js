/**
 * @file Guest dashboard layout.
 * Enforces `guest` role (skips `is_online` check since guests
 * don't require member activation). Wraps children in scoped
 * design-token root + sticky topbar matching Claude design spec.
 *
 * @module GuestLayout
 * @access guest
 */

import { requireRole } from '@/app/_lib/auth-guard';
import './_components/guest-design.css';

export default async function GuestLayout({ children }) {
  await requireRole('guest', { checkIsActive: false });

  return (
    <div className="guest-panel">
      <a href="#guest-main" className="gp-skip">Skip to content</a>
      <div className="gp-main" id="guest-main">
        {children}
      </div>
    </div>
  );
}
