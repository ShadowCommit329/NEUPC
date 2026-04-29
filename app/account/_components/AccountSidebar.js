'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight,
  Menu,
  X,
  LogOut,
  HelpCircle,
  Sparkles,
  PanelLeftClose,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
} from '@floating-ui/react';
import { signOutAction } from '@/app/_lib/actions';
import { cn, driveImageUrl, getInitials } from '@/app/_lib/utils';
import { ROLE_THEMES, ROLE_LABELS } from './roleTheme';

const ROLE_DESCRIPTIONS = {
  guest: 'Browse and participate',
  member: 'Full member benefits',
  mentor: 'Guide members',
  executive: 'Run operations',
  admin: 'Manage platform',
  advisor: 'Advisory board',
};

// ─── Tooltip (collapsed mode) ─────────────────────────────────────────────────
function Tooltip({ children, label, show }) {
  if (!show) return children;
  return (
    <div className="group/tooltip relative">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute top-1/2 left-full z-100 ml-3 -translate-y-1/2 rounded-lg border border-white/10 bg-gray-900 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-gray-200 opacity-0 shadow-xl transition-all duration-200 group-hover/tooltip:opacity-100"
      >
        {label}
        <div className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-white/10 bg-gray-900" />
      </div>
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────
function NavItem({ item, isActive, collapsed, theme, onClick }) {
  const Icon = item.icon;
  return (
    <Tooltip label={item.label} show={collapsed}>
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          'group/nav relative flex items-center rounded-lg transition-colors duration-150 outline-none',
          'focus-visible:ring-2 focus-visible:ring-white/30',
          collapsed
            ? 'min-h-9 justify-center p-2.5'
            : 'min-h-9 gap-3 px-3 py-2',
          isActive
            ? cn('font-semibold', theme.active)
            : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
        )}
      >
        {isActive && (
          <div
            className={cn(
              'absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b',
              theme.gradient
            )}
          />
        )}
        <Icon className="h-[17px] w-[17px] shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-[13px]">{item.label}</span>
            {item.badge != null && item.badge !== 0 && (
              <span
                className={cn(
                  'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold',
                  item.badgeType === 'alert'
                    ? 'bg-sky-500 text-white'
                    : 'bg-white/[0.08] text-gray-400'
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge != null && item.badge !== 0 && (
          <span
            className={cn(
              'absolute top-1 right-1 h-1.5 w-1.5 rounded-full',
              item.badgeType === 'alert' ? 'bg-sky-500' : 'bg-white/30'
            )}
          />
        )}
      </Link>
    </Tooltip>
  );
}

// ─── Route matching ───────────────────────────────────────────────────────────
function isRouteActive(pathname, href) {
  if (!pathname || !href) return false;
  const roleRootPattern = /^\/account\/[a-z]+$/;
  if (roleRootPattern.test(href)) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

// ─── Nav Group ────────────────────────────────────────────────────────────────
function NavGroup({ group, pathname, collapsed, theme, onItemClick }) {
  return (
    <div className="mb-1">
      {!collapsed && (
        <p className="mb-0.5 px-3 pt-3 pb-1 text-[10.5px] font-semibold tracking-widest text-gray-600 uppercase select-none">
          {group.label}
        </p>
      )}
      {collapsed && <div className="mx-auto my-2 h-px w-6 bg-white/[0.06]" />}
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
// Compact pill for the brand header row (never full-width)
function RoleOptionsList({ userRoles, activeRole, onPick }) {
  return (
    <div className="space-y-0.5 p-1.5">
      {userRoles.map((role) => {
        const rt = ROLE_THEMES[role] || ROLE_THEMES.guest;
        const isCurrent = role === activeRole;
        return (
          <button
            key={role}
            onClick={() => onPick(role)}
            className={cn(
              'relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors outline-none',
              'focus-visible:ring-2 focus-visible:ring-white/30',
              isCurrent
                ? rt.active
                : 'text-gray-300 hover:bg-white/[0.04] hover:text-gray-100'
            )}
          >
            {isCurrent && (
              <span
                className={cn(
                  'absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b',
                  rt.gradient
                )}
              />
            )}
            <span
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', rt.dot)}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[12.5px] leading-tight font-semibold',
                  isCurrent ? '' : 'text-gray-200'
                )}
              >
                {ROLE_LABELS[role] || role}
              </p>
              <p
                className={cn(
                  'mt-0.5 truncate text-[10.5px]',
                  isCurrent ? 'opacity-70' : 'text-gray-500'
                )}
              >
                {ROLE_DESCRIPTIONS[role] || ''}
              </p>
            </div>
            {isCurrent && (
              <Check className="h-3.5 w-3.5 shrink-0 opacity-80" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Floating-UI driven hook shared by both triggers
function useRoleMenu({ placement }) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ padding: 8, fallbackAxisSideDirection: 'end' }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(180, availableHeight)}px`,
          });
        },
      }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
  const role = useRole(context, { role: 'menu' });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  return {
    open,
    setOpen,
    refs,
    floatingStyles,
    context,
    getReferenceProps,
    getFloatingProps,
  };
}

function RoleMenuPanel({ context, refs, floatingStyles, getFloatingProps, children }) {
  return (
    <FloatingPortal>
      <FloatingFocusManager context={context} modal={false}>
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-100 w-52 outline-none"
        >
          <div className="animate-in fade-in zoom-in-95 overflow-hidden rounded-xl border border-white/12 bg-gray-900 shadow-2xl duration-150">
            <div className="border-b border-white/[0.07] px-3.5 py-2">
              <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                Switch Role
              </p>
            </div>
            {children}
          </div>
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}

function RoleBadge({ activeRole, userRoles, theme, onSwitch }) {
  const hasMultiple = userRoles && userRoles.length > 1;
  const menu = useRoleMenu({ placement: 'bottom-end' });

  if (!activeRole) return null;

  const label = ROLE_LABELS[activeRole] || activeRole;

  return (
    <>
      <button
        ref={hasMultiple ? menu.refs.setReference : undefined}
        {...(hasMultiple ? menu.getReferenceProps() : {})}
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] leading-none font-semibold tracking-widest uppercase transition-colors outline-none',
          'focus-visible:ring-2 focus-visible:ring-white/30',
          theme.badge,
          hasMultiple ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
        )}
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', theme.dot)} />
        {label}
        {hasMultiple && (
          <ChevronsUpDown
            className={cn(
              'h-2.5 w-2.5 shrink-0 opacity-60 transition-transform duration-150',
              menu.open && 'rotate-180'
            )}
          />
        )}
      </button>

      {hasMultiple && menu.open && (
        <RoleMenuPanel {...menu}>
          <RoleOptionsList
            userRoles={userRoles}
            activeRole={activeRole}
            onPick={(role) => {
              menu.setOpen(false);
              onSwitch(role);
            }}
          />
        </RoleMenuPanel>
      )}
    </>
  );
}

function RoleSwitcherCollapsed({ activeRole, userRoles, theme, onSwitch }) {
  const hasMultiple = userRoles && userRoles.length > 1;
  const menu = useRoleMenu({ placement: 'right-start' });

  if (!activeRole || !hasMultiple) return null;

  return (
    <>
      <Tooltip label={`Role: ${ROLE_LABELS[activeRole]}`} show={!menu.open}>
        <button
          ref={menu.refs.setReference}
          {...menu.getReferenceProps()}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md border transition-colors outline-none',
            'focus-visible:ring-2 focus-visible:ring-white/30',
            menu.open
              ? 'border-white/25 bg-white/10'
              : cn('hover:border-white/15 hover:bg-white/[0.06]', theme.badge)
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', theme.dot)} />
        </button>
      </Tooltip>

      {menu.open && (
        <RoleMenuPanel {...menu}>
          <RoleOptionsList
            userRoles={userRoles}
            activeRole={activeRole}
            onPick={(role) => {
              menu.setOpen(false);
              onSwitch(role);
            }}
          />
        </RoleMenuPanel>
      )}
    </>
  );
}

// ─── Membership upgrade card ──────────────────────────────────────────────────
function MembershipCard({ role }) {
  if (role !== 'guest') return null;
  return (
    <div className="mx-3 mb-3 rounded-xl border border-sky-500/20 bg-linear-to-br from-sky-500/10 to-blue-600/10 p-3">
      <p className="mb-0.5 text-[10px] font-semibold tracking-widest text-sky-400 uppercase">
        Membership
      </p>
      <p className="mb-0.5 text-[13px] font-semibold text-white">
        Become a Member
      </p>
      <p className="mb-3 text-[11.5px] leading-relaxed text-gray-400">
        Unlock contests, certificates, mentorship &amp; more.
      </p>
      <Link
        href="/account/guest/membership-application"
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-[12px] font-semibold text-white transition-all hover:bg-sky-400"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Apply now →
      </Link>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function AccountSidebar({
  sidebarOpen,
  setSidebarOpen,
  hideSidebar,
  sidebarNavigation,
  activeRole,
  userRoles,
  session,
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

  const handleRoleSwitch = (role) => router.push(`/account/${role}`);
  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          'fixed top-3 z-[60] rounded-lg border border-white/10 bg-gray-900/90 p-2 text-gray-300 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-white/25 hover:bg-gray-800 hover:text-white lg:hidden',
          sidebarOpen ? 'left-[290px]' : 'left-3'
        )}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[58] flex flex-col border-r border-white/[0.06] bg-gray-950 transition-all duration-300 ease-out lg:sticky lg:top-0 lg:z-40 lg:h-screen lg:translate-x-0',
          collapsed
            ? 'w-[68px]'
            : 'w-[280px] sm:w-[260px] lg:w-[228px] xl:w-[244px] 2xl:w-[260px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="navigation"
        aria-label="Account sidebar"
      >
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute top-5 -right-3 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-gray-900 text-gray-500 shadow-lg transition-all hover:border-white/20 hover:bg-gray-800 hover:text-gray-300 lg:flex"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <PanelLeftClose className="h-3 w-3" />
          )}
        </button>

        {/* ── Brand ────────────────────────────────────────────────────────── */}
        <div
          className={cn(
            'shrink-0 border-b border-white/[0.06]',
            collapsed
              ? 'flex flex-col items-center gap-2 px-3 py-4'
              : 'flex items-center justify-between px-4 py-[14px]'
          )}
        >
          {collapsed ? (
            <>
              <Link href="/" className="transition-opacity hover:opacity-80">
                <span className="text-[14px] font-bold tracking-tight text-white select-none">
                  N<span className={theme.accentText}>P</span>
                </span>
              </Link>
              <RoleSwitcherCollapsed
                activeRole={activeRole}
                userRoles={userRoles}
                theme={theme}
                onSwitch={handleRoleSwitch}
              />
            </>
          ) : (
            <>
              <div>
                <Link href="/" className="transition-opacity hover:opacity-80">
                  <span className="text-[15px] font-bold tracking-tight text-white select-none">
                    NEU<span className={theme.accentText}>PC</span>
                  </span>
                </Link>
                <p className="mt-0.5 text-[10px] font-medium tracking-widest text-gray-500 uppercase">
                  {ROLE_LABELS[activeRole] || 'Panel'} Panel
                </p>
              </div>
              <RoleBadge
                activeRole={activeRole}
                userRoles={userRoles}
                theme={theme}
                onSwitch={handleRoleSwitch}
              />
            </>
          )}
        </div>

        {/* ── User identity card ───────────────────────────────────────────── */}
        {!collapsed && (
          <Link
            href={`/account/${activeRole}/profile`}
            className="shrink-0 border-b border-white/[0.06] px-4 py-3.5 transition-colors hover:bg-white/[0.03] active:bg-white/[0.06]"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {hasAvatar ? (
                  <img
                    src={avatarSrc}
                    alt={session?.name || 'User'}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10"
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
                <div className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-950 bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] leading-5 font-semibold text-gray-100">
                  {session?.name || 'User'}
                </p>
                <p className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
                  {/* <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      theme.dot
                    )}
                  /> */}
                  {ROLE_LABELS[activeRole] || 'Guest'} · Active
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Collapsed: avatar only */}
        {collapsed && (
          <div className="flex shrink-0 justify-center border-b border-white/[0.06] py-3">
            <div className="relative">
              {hasAvatar ? (
                <img
                  src={avatarSrc}
                  alt={session?.name || 'User'}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br text-[11px] font-bold text-white',
                    theme.gradient
                  )}
                >
                  {initials}
                </div>
              )}
              <div className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-950 bg-emerald-400" />
            </div>
          </div>
        )}

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <nav
          className={cn(
            'flex-1 overflow-x-hidden overflow-y-auto py-1',
            collapsed ? 'px-2' : 'px-3',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          )}
        >
          {sidebarNavigation.map((group) => (
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

        {/* ── Membership upgrade card ──────────────────────────────────────── */}
        {!collapsed && <MembershipCard role={activeRole} />}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div
          className={cn(
            'shrink-0 border-t border-white/[0.06]',
            collapsed
              ? 'flex flex-col items-center gap-1 px-2 py-3'
              : 'flex items-center justify-between px-4 py-3'
          )}
        >
          <Tooltip label="Help" show={collapsed}>
            <button
              type="button"
              aria-label="Help"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Help</span>}
            </button>
          </Tooltip>

          <form action={signOutAction}>
            <Tooltip label="Sign out" show={collapsed}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] text-gray-500 transition-colors hover:bg-rose-500/[0.08] hover:text-rose-400"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </Tooltip>
          </form>
        </div>
      </aside>
    </>
  );
}
