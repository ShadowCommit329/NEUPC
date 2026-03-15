/**
 * @file Account sidebar with role switcher and navigation.
 * Responsive sidebar with mobile overlay, role-aware navigation, and logout.
 *
 * @module AccountSidebar
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  Sparkles,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { signOutAction } from '@/app/_lib/actions';
import { driveImageUrl } from '@/app/_lib/utils';

const ROLE_COLORS = {
  guest: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
  },
  member: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
  },
  executive: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
  },
  admin: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    text: 'text-red-300',
  },
  mentor: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    text: 'text-green-300',
  },
  advisor: {
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/30',
    text: 'text-teal-300',
  },
};

const ROLE_LABELS = {
  guest: 'Guest',
  member: 'Member',
  executive: 'Executive',
  admin: 'Admin',
  mentor: 'Mentor',
  advisor: 'Advisor',
};

export default function AccountSidebar({
  sidebarOpen,
  setSidebarOpen,
  hideSidebar,
  sidebarNavigation,
  activeRole,
  session,
  userRoles,
  collapsed,
  setCollapsed,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  if (hideSidebar) return null;

  const roleColor = ROLE_COLORS[activeRole] || ROLE_COLORS.guest;
  const hasMultipleRoles = userRoles && userRoles.length > 1;
  const avatarSrc = driveImageUrl(session?.avatar_url || session?.image || '');

  const handleRoleSwitch = (role) => {
    setRoleSwitcherOpen(false);
    router.push(`/account/${role}`);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-4 z-50 rounded-xl border border-white/20 bg-gray-900/90 p-3 text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-white/30 hover:bg-gray-800 lg:hidden ${
          sidebarOpen ? 'left-76' : 'left-4'
        }`}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transform border-r border-white/10 bg-linear-to-b from-gray-900/98 via-gray-900/95 to-gray-900/98 shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'w-18' : 'w-72'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* User Profile Section */}
          <div className="border-b border-white/10 p-4">
            {collapsed ? (
              /* ── Collapsed: avatar only ── */
              <div className="flex flex-col items-center gap-3">
                {avatarSrc && !avatarSrc.match(/^[A-Z?]{1,3}$/) ? (
                  <img
                    src={avatarSrc}
                    alt={session?.name || 'User'}
                    className="h-10 w-10 rounded-full object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-500 text-white shadow-lg">
                    <User className="h-5 w-5" />
                  </div>
                )}
                {/* Mini role badge */}
                {activeRole && (
                  <div
                    className={`h-2 w-2 rounded-full ${roleColor.bg.replace('/20', '')}`}
                    title={ROLE_LABELS[activeRole] || activeRole}
                  />
                )}
              </div>
            ) : (
              /* ── Expanded: full profile ── */
              <>
                <div className="flex items-center gap-3">
                  {avatarSrc && !avatarSrc.match(/^[A-Z?]{1,3}$/) ? (
                    <img
                      src={avatarSrc}
                      alt={session?.name || 'User'}
                      className="h-12 w-12 overflow-hidden rounded-full object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-500 text-white shadow-lg">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-bold text-white">
                      {session?.name || 'Guest User'}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {session?.email || 'guest@example.com'}
                    </p>
                  </div>
                </div>

                {/* Role Switcher */}
                {activeRole && (
                  <div className="relative mt-3">
                    {hasMultipleRoles ? (
                      <>
                        <button
                          onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                          className={`flex w-full items-center justify-between rounded-lg border ${roleColor.border} ${roleColor.bg} px-3 py-2 transition-all duration-200 hover:brightness-110`}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight
                              className={`h-3.5 w-3.5 ${roleColor.text}`}
                            />
                            <span
                              className={`text-xs font-semibold ${roleColor.text}`}
                            >
                              {ROLE_LABELS[activeRole] || activeRole}
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-3.5 w-3.5 ${roleColor.text} transition-transform duration-200 ${
                              roleSwitcherOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Dropdown */}
                        {roleSwitcherOpen && (
                          <div className="absolute right-0 left-0 z-10 mt-1 overflow-hidden rounded-lg border border-white/10 bg-gray-800/95 shadow-xl backdrop-blur-xl">
                            {userRoles
                              .filter((role) => role !== activeRole)
                              .map((role) => {
                                const rc =
                                  ROLE_COLORS[role] || ROLE_COLORS.guest;
                                return (
                                  <button
                                    key={role}
                                    onClick={() => handleRoleSwitch(role)}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5"
                                  >
                                    <div
                                      className={`h-2 w-2 rounded-full ${rc.bg.replace('/20', '')}`}
                                    />
                                    <span
                                      className={`text-xs font-semibold ${rc.text}`}
                                    >
                                      {ROLE_LABELS[role] || role}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full border ${roleColor.border} ${roleColor.bg} px-3 py-1 text-xs font-semibold ${roleColor.text}`}
                      >
                        {ROLE_LABELS[activeRole] || activeRole}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Collapse toggle — floating on outer edge (desktop only) */}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="absolute top-5 -right-3 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-gray-800 text-gray-400 shadow-lg transition-all duration-300 hover:border-white/30 hover:bg-gray-700 hover:text-white lg:flex"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Navigation */}
          <nav className="scrollbar-hide flex-1 overflow-y-auto p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Main Navigation */}
            <div className="mb-8">
              {!collapsed && (
                <h3 className="mb-3 px-3 text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Navigation
                </h3>
              )}
              <div className="space-y-1.5">
                {sidebarNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex items-center overflow-hidden rounded-xl transition-all duration-300 ${
                        collapsed
                          ? 'justify-center px-2 py-3'
                          : 'justify-between px-4 py-3.5'
                      } ${
                        isActive
                          ? 'bg-linear-to-r from-blue-500/20 to-blue-600/10 text-blue-400 shadow-lg shadow-blue-500/20'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-blue-400 to-blue-600" />
                      )}
                      <div
                        className={`flex items-center ${collapsed ? '' : 'gap-3'}`}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                            isActive ? 'scale-110' : 'group-hover:scale-110'
                          }`}
                        />
                        {!collapsed && (
                          <span className="text-sm font-semibold">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span
                              className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold shadow-lg ${
                                item.badgeType === 'alert'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-blue-500/30 text-blue-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {isActive && <ChevronRight className="h-4 w-4" />}
                        </div>
                      )}
                      {/* Badge dot in collapsed mode */}
                      {collapsed && item.badge && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="space-y-2 border-t border-white/10 p-3">
            {/* Logout Button */}
            <form action={signOutAction}>
              <button
                type="submit"
                title={collapsed ? 'Logout' : undefined}
                className={`group flex w-full items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-bold text-red-300 shadow-lg transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/20 hover:shadow-red-500/20 ${
                  collapsed
                    ? 'justify-center px-2 py-3'
                    : 'justify-center px-4 py-3'
                }`}
              >
                <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                {!collapsed && <span>Logout</span>}
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
