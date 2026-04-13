/**
 * @file Account layout client wrapper.
 * Manages sidebar state, role detection from URL, and navigation config.
 *
 * @module AccountLayoutClient
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useRole } from './RoleContext';
import AccountSidebar from './AccountSidebar';
import { getSidebarNavigation } from '@/app/_lib/sidebarConfig';

// Valid role segments in the URL
const VALID_ROLES = [
  'guest',
  'member',
  'executive',
  'admin',
  'mentor',
  'advisor',
];

/**
 * Detect active role from the current URL pathname.
 * e.g., /account/admin/events → 'admin'
 */
function getRoleFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  // pathname is /account/<role>/...
  if (segments.length >= 2 && segments[0] === 'account') {
    const roleSegment = segments[1];
    if (VALID_ROLES.includes(roleSegment)) {
      return roleSegment;
    }
  }
  return null;
}

// Sidebar navigation stats (placeholder — replace with real data via props)
const SIDEBAR_STATS = {
  upcomingEvents: 5,
  participationCount: 7,
  notifications: 2,
  pendingMembers: 15,
  totalUsers: 245,
  mentees: 8,
  pendingReviews: 4,
};

/** Send a heartbeat to keep is_online / last_seen fresh in the DB. */
function useHeartbeat() {
  useEffect(() => {
    const ping = () => fetch('/api/account/heartbeat', { method: 'POST' });

    // Ping immediately on mount, then every 60 s.
    ping();
    const interval = setInterval(ping, 60_000);

    // Re-ping when the tab regains focus (user switched back).
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}

export default function AccountLayoutClient({ children, session, userRoles }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsePrefLoaded, setCollapsePrefLoaded] = useState(false);
  const pathname = usePathname();
  const { activeRole, setActiveRole } = useRole();

  // Load persisted collapse preference after mount to keep hydration deterministic.
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored != null) {
      setCollapsed(stored === 'true');
    }
    setCollapsePrefLoaded(true);
  }, []);

  // Persist collapse preference
  useEffect(() => {
    if (!collapsePrefLoaded) return;
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed, collapsePrefLoaded]);

  useHeartbeat();

  // Auto-detect and sync role from URL
  const detectedRole = getRoleFromPath(pathname);

  useEffect(() => {
    if (detectedRole && detectedRole !== activeRole) {
      setActiveRole(detectedRole);
    }
  }, [detectedRole, activeRole, setActiveRole]);

  // Use URL-detected role while inside a role dashboard.
  // On /account hub (no role segment in URL), fall back to the first role
  // the user actually has (from the server-provided userRoles prop).
  // If no role is assigned, currentRole will be null/undefined.
  const currentRole = detectedRole || userRoles?.[0] || activeRole || null;

  // Hide sidebar only on the account selection page
  const hideSidebar = pathname === '/account';

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Close sidebar on route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Get sidebar navigation based on current role
  const sidebarNavigation = useMemo(() => {
    return getSidebarNavigation(currentRole, SIDEBAR_STATS, session);
  }, [currentRole, session]);

  return (
    <div className="relative flex min-h-screen bg-linear-to-br from-gray-950 via-gray-900 to-gray-950">
      <AccountSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        hideSidebar={hideSidebar}
        sidebarNavigation={sidebarNavigation}
        activeRole={currentRole}
        session={session}
        userRoles={userRoles}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
