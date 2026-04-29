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
import DashboardTopbar from './DashboardTopbar';
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
  // Lazy init from localStorage to prevent post-mount layout shift
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [collapsePrefLoaded, setCollapsePrefLoaded] = useState(false);
  const pathname = usePathname();

  // Hide the public site header and footer on sub-dashboard routes (not /account itself)
  useEffect(() => {
    if (pathname === '/account') return;
    document.documentElement.setAttribute('data-dashboard', '');
    return () => document.documentElement.removeAttribute('data-dashboard');
  }, [pathname]);
  const { activeRole, setActiveRole } = useRole();

  // Mark prefs as loaded post-mount (init was eager via lazy useState)
  useEffect(() => { setCollapsePrefLoaded(true); }, []);

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

  // Prevent body scroll + restore scroll position when mobile sidebar is open
  useEffect(() => {
    if (!sidebarOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
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
        userRoles={userRoles}
        session={session}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {!hideSidebar && (
          <DashboardTopbar
            activeRole={currentRole}
            notificationCount={SIDEBAR_STATS.notifications}
          />
        )}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
