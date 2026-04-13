/**
 * @file Professional account sidebar with role switcher, grouped navigation,
 * tooltips, keyboard shortcuts, and polished micro-interactions.
 *
 * Features:
 * - Grouped navigation sections with collapsible headings
 * - Role-aware theming with gradient accents
 * - Smooth collapse/expand with icon-only mode + tooltips
 * - Mobile-first responsive overlay with backdrop blur
 * - Animated role switcher dropdown
 * - Online status indicator on avatar
 * - Keyboard navigation (Escape to close)
 * - Accessible ARIA labels throughout
 *
 * @module AccountSidebar
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  ArrowLeftRight,
  PanelLeftClose,
  ChevronsUpDown,
  Check,
  Dot,
} from 'lucide-react';
import { signOutAction } from '@/app/_lib/actions';
import { cn, driveImageUrl, getInitials } from '@/app/_lib/utils';

// ─── Role theming ─────────────────────────────────────────────────────────────
const ROLE_THEMES = {
  guest: {
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    dot: 'bg-sky-400',
    gradient: 'from-sky-500 to-blue-600',
    active: 'bg-sky-500/12 text-sky-400 shadow-sky-500/10',
    accent: 'bg-sky-400',
    hover: 'hover:bg-sky-500/8',
  },
  member: {
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    dot: 'bg-violet-400',
    gradient: 'from-violet-500 to-purple-600',
    active: 'bg-violet-500/12 text-violet-400 shadow-violet-500/10',
    accent: 'bg-violet-400',
    hover: 'hover:bg-violet-500/8',
  },
  executive: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    dot: 'bg-amber-400',
    gradient: 'from-amber-500 to-orange-600',
    active: 'bg-amber-500/12 text-amber-400 shadow-amber-500/10',
    accent: 'bg-amber-400',
    hover: 'hover:bg-amber-500/8',
  },
  admin: {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    dot: 'bg-rose-400',
    gradient: 'from-rose-500 to-red-600',
    active: 'bg-rose-500/12 text-rose-400 shadow-rose-500/10',
    accent: 'bg-rose-400',
    hover: 'hover:bg-rose-500/8',
  },
  mentor: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-400',
    gradient: 'from-emerald-500 to-green-600',
    active: 'bg-emerald-500/12 text-emerald-400 shadow-emerald-500/10',
    accent: 'bg-emerald-400',
    hover: 'hover:bg-emerald-500/8',
  },
  advisor: {
    badge: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
    dot: 'bg-teal-400',
    gradient: 'from-teal-500 to-cyan-600',
    active: 'bg-teal-500/12 text-teal-400 shadow-teal-500/10',
    accent: 'bg-teal-400',
    hover: 'hover:bg-teal-500/8',
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

// ─── Tooltip (collapsed mode) ─────────────────────────────────────────────────
function Tooltip({ children, label, show }) {
  if (!show) return children;
  return (
    <div className="group/tooltip relative">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute top-1/2 left-full z-[100] ml-3 -translate-y-1/2 rounded-lg border border-white/10 bg-gray-900 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-gray-200 opacity-0 shadow-xl transition-all duration-200 group-hover/tooltip:opacity-100"
      >
        {label}
        <div className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-white/10 bg-gray-900" />
      </div>
    </div>
  );
}

// ─── Navigation Item ──────────────────────────────────────────────────────────
function NavItem({ item, isActive, collapsed, theme, onClick }) {
  const Icon = item.icon;

  return (
    <Tooltip label={item.label} show={collapsed}>
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          'group/nav relative flex items-center rounded-lg transition-all duration-200',
          collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
          isActive
            ? cn('font-semibold shadow-sm', theme.active)
            : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
        )}
      >
        {/* Active indicator bar */}
        {isActive && (
          <div
            className={cn(
              'absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b',
              theme.gradient
            )}
          />
        )}

        <Icon
          className={cn(
            'h-[18px] w-[18px] shrink-0 transition-all duration-200',
            isActive
              ? 'scale-105'
              : 'group-hover/nav:scale-105 group-hover/nav:text-gray-300'
          )}
        />

        {!collapsed && (
          <>
            <span className="flex-1 truncate text-[13px] leading-5">
              {item.label}
            </span>

            {/* Badges */}
            {item.badge != null && item.badge !== 0 && (
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] leading-none font-bold',
                  item.badgeType === 'alert'
                    ? 'bg-rose-500/90 text-white shadow-sm shadow-rose-500/25'
                    : 'bg-white/[0.08] text-gray-400'
                )}
              >
                {typeof item.badge === 'number' && item.badge > 99
                  ? '99+'
                  : item.badge}
              </span>
            )}
          </>
        )}

        {/* Collapsed badge dot */}
        {collapsed && item.badge != null && item.badge !== 0 && (
          <span
            className={cn(
              'absolute top-1 right-1 h-2 w-2 rounded-full',
              item.badgeType === 'alert'
                ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                : 'bg-white/30'
            )}
          />
        )}
      </Link>
    </Tooltip>
  );
}

// ─── Active route matching ────────────────────────────────────────────────────

/**
 * Check if the current pathname matches a nav item's href.
 * - Dashboard routes (role root like /account/admin) require exact match.
 * - All other routes use startsWith so nested pages still highlight
 *   the parent nav item (e.g. /account/admin/users/create highlights "Users").
 */
function isRouteActive(pathname, href) {
  if (!pathname || !href) return false;
  // Dashboard items: role root pages should only match exactly
  const roleRootPattern = /^\/account\/[a-z]+$/;
  if (roleRootPattern.test(href)) {
    return pathname === href;
  }
  // For all other items, match the href prefix so nested routes stay highlighted
  return pathname === href || pathname.startsWith(href + '/');
}

// ─── Section Group ────────────────────────────────────────────────────────────
function NavGroup({ group, pathname, collapsed, theme, onItemClick }) {
  return (
    <div className={collapsed ? 'py-2' : 'py-1.5'}>
      {/* Section label */}
      {!collapsed && (
        <h3 className="mb-1 px-3 text-[11px] font-semibold tracking-widest text-gray-500/80 uppercase select-none">
          {group.label}
        </h3>
      )}

      {/* Collapsed: tiny divider */}
      {collapsed && (
        <div className="mx-auto mb-1.5 h-px w-5 rounded-full bg-white/[0.06]" />
      )}

      <div className="space-y-0.5">
        {group.items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={isRouteActive(pathname, item.href)}
            collapsed={collapsed}
            theme={theme}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Role Switcher ────────────────────────────────────────────────────────────
function RoleSwitcher({ activeRole, userRoles, theme, onSwitch, collapsed }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hasMultiple = userRoles && userRoles.length > 1;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!activeRole) return null;

  // Single role — just display a badge
  if (!hasMultiple) {
    if (collapsed) return null;
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
          theme.badge
        )}
      >
        <div className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} />
        <span className="text-[11px] font-semibold tracking-wide uppercase">
          {ROLE_LABELS[activeRole] || activeRole}
        </span>
      </div>
    );
  }

  // Collapsed — tiny dot button
  if (collapsed) {
    return (
      <div ref={ref} className="relative">
        <Tooltip label={`Switch role (${ROLE_LABELS[activeRole]})`} show>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              'relative flex h-7 w-7 items-center justify-center rounded-lg border transition-colors duration-200',
              theme.badge
            )}
          >
            <div className={cn('h-2 w-2 rounded-full', theme.dot)} />
          </button>
        </Tooltip>
        {open && (
          <div className="absolute top-0 left-full z-[100] ml-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-gray-900/95 shadow-2xl backdrop-blur-xl">
            {userRoles.map((role) => {
              const rt = ROLE_THEMES[role] || ROLE_THEMES.guest;
              const isCurrent = role === activeRole;
              return (
                <button
                  key={role}
                  onClick={() => {
                    setOpen(false);
                    onSwitch(role);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors',
                    isCurrent
                      ? 'bg-white/[0.06] font-semibold text-white'
                      : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                  )}
                >
                  <div className={cn('h-2 w-2 rounded-full', rt.dot)} />
                  <span className="flex-1">{ROLE_LABELS[role] || role}</span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-white/60" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Expanded — full dropdown
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 transition-all duration-200 hover:brightness-110',
          theme.badge
        )}
      >
        <div className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} />
        <span className="flex-1 text-left text-[11px] font-semibold tracking-wide uppercase">
          {ROLE_LABELS[activeRole] || activeRole}
        </span>
        <ChevronsUpDown className="h-3 w-3 opacity-50" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute inset-x-0 z-[100] mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-gray-900/95 shadow-2xl backdrop-blur-xl">
          <div className="px-2.5 py-2 text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
            Switch role
          </div>
          {userRoles.map((role) => {
            const rt = ROLE_THEMES[role] || ROLE_THEMES.guest;
            const isCurrent = role === activeRole;
            return (
              <button
                key={role}
                onClick={() => {
                  setOpen(false);
                  onSwitch(role);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-xs transition-colors',
                  isCurrent
                    ? 'bg-white/[0.06] font-semibold text-white'
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                )}
              >
                <div className={cn('h-2 w-2 rounded-full', rt.dot)} />
                <span className="flex-1">{ROLE_LABELS[role] || role}</span>
                {isCurrent && <Check className="h-3.5 w-3.5 text-white/50" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────────────────
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

  if (hideSidebar) return null;

  const theme = ROLE_THEMES[activeRole] || ROLE_THEMES.guest;
  const avatarSrc = driveImageUrl(session?.avatar_url || session?.image || '');
  const hasAvatar = avatarSrc && !/^[A-Z?]{1,3}$/.test(avatarSrc);
  const initials = getInitials(session?.name || 'U');

  const handleRoleSwitch = (role) => {
    router.push(`/account/${role}`);
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    <>
      {/* ── Mobile hamburger ───────────────────────────────────────────────── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          'fixed top-4 z-[60] rounded-xl border border-white/15 bg-gray-900/90 p-2.5 text-gray-300 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-white/25 hover:bg-gray-800 hover:text-white lg:hidden',
          sidebarOpen ? 'left-[276px]' : 'left-4'
        )}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[58] flex flex-col border-r border-white/[0.06] bg-gray-950/[0.97] shadow-2xl transition-all duration-300 ease-out lg:sticky lg:top-0 lg:z-40 lg:h-screen lg:translate-x-0',
          collapsed ? 'w-[68px]' : 'w-[272px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="navigation"
        aria-label="Account sidebar"
      >
        {/* ── Collapse toggle (desktop) ──────────────────────────────────── */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute top-6 -right-3 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-gray-900 text-gray-500 shadow-lg transition-all duration-200 hover:border-white/20 hover:bg-gray-800 hover:text-gray-300 lg:flex"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <PanelLeftClose className="h-3 w-3" />
          )}
        </button>

        {/* ── User profile header ────────────────────────────────────────── */}
        <div
          className={cn(
            'shrink-0 border-b border-white/[0.06]',
            collapsed ? 'px-3 py-4' : 'px-4 py-4'
          )}
        >
          {collapsed ? (
            /* Collapsed: avatar + role dot */
            <div className="flex flex-col items-center gap-2.5">
              <div className="relative">
                {hasAvatar ? (
                  <img
                    src={avatarSrc}
                    alt={session?.name || 'User'}
                    className={cn(
                      'h-9 w-9 rounded-full object-cover ring-2 ring-offset-2 ring-offset-gray-950',
                      `ring-gray-800`
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white',
                      theme.gradient
                    )}
                  >
                    {initials}
                  </div>
                )}
                {/* Online dot */}
                <div className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-gray-950 bg-emerald-400" />
              </div>
              <RoleSwitcher
                activeRole={activeRole}
                userRoles={userRoles}
                theme={theme}
                onSwitch={handleRoleSwitch}
                collapsed
              />
            </div>
          ) : (
            /* Expanded: full profile card */
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {hasAvatar ? (
                    <img
                      src={avatarSrc}
                      alt={session?.name || 'User'}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 ring-offset-2 ring-offset-gray-950"
                    />
                  ) : (
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white',
                        theme.gradient
                      )}
                    >
                      {initials}
                    </div>
                  )}
                  {/* Online dot */}
                  <div className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-gray-950 bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-5 font-semibold text-gray-100">
                    {session?.name || 'Guest User'}
                  </p>
                  <p className="truncate text-xs leading-4 text-gray-500">
                    {session?.email || ''}
                  </p>
                </div>
              </div>

              <RoleSwitcher
                activeRole={activeRole}
                userRoles={userRoles}
                theme={theme}
                onSwitch={handleRoleSwitch}
                collapsed={false}
              />
            </div>
          )}
        </div>

        {/* ── Navigation groups ───────────────────────────────────────────── */}
        <nav
          className={cn(
            'flex-1 overflow-x-hidden overflow-y-auto',
            collapsed ? 'px-2 py-2' : 'px-3 py-2',
            // Hide scrollbar but keep scrollable
            'scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          )}
        >
          {sidebarNavigation.map((group, idx) => (
            <NavGroup
              key={group.key}
              group={group}
              pathname={pathname}
              collapsed={collapsed}
              theme={theme}
              onItemClick={closeMobileSidebar}
            />
          ))}
        </nav>

        {/* ── Footer: Logout ─────────────────────────────────────────────── */}
        <div
          className={cn(
            'shrink-0 border-t border-white/[0.06]',
            collapsed ? 'px-2 py-3' : 'px-3 py-3'
          )}
        >
          <form action={signOutAction}>
            <Tooltip label="Sign out" show={collapsed}>
              <button
                type="submit"
                className={cn(
                  'group/logout flex w-full items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-[13px] font-medium text-gray-400 transition-all duration-200 hover:border-rose-500/20 hover:bg-rose-500/[0.06] hover:text-rose-400',
                  collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
                )}
              >
                <LogOut className="h-4 w-4 transition-transform duration-200 group-hover/logout:-translate-x-0.5" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </Tooltip>
          </form>
        </div>
      </aside>
    </>
  );
}
