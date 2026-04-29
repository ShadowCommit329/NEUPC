'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, HelpCircle, Search } from 'lucide-react';
import { cn } from '@/app/_lib/utils';
import { buildBreadcrumbs } from './breadcrumbConfig';
import { getRoleTheme } from './roleTheme';

export default function DashboardTopbar({ activeRole, notificationCount = 0 }) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);
  const theme = getRoleTheme(activeRole);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const notifHref = activeRole ? `/account/${activeRole}/notifications` : '/account';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-2 border-b backdrop-blur-xl transition-[box-shadow,border-color,background] duration-200',
        scrolled
          ? 'border-white/[0.08] bg-gray-950/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]'
          : 'border-white/[0.06] bg-gray-950/70',
        // Mobile: leave space for hamburger (left:3, ~40px wide); desktop: hamburger gone
        'pl-14 pr-3 sm:pl-16 sm:pr-4 lg:pl-6 lg:pr-6 xl:pl-8 xl:pr-8 2xl:pl-10 2xl:pr-10',
        'sm:gap-3'
      )}
    >
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          // Hide non-last crumbs on tiny screens
          const hideOnMobile = !isLast && i < crumbs.length - 2;
          return (
            <span
              key={c.href}
              className={cn('flex shrink-0 items-center gap-1.5', hideOnMobile && 'hidden sm:flex')}
            >
              {i > 0 && <ChevronRight className="h-3 w-3 text-gray-600" strokeWidth={2} />}
              {isLast ? (
                <span className={cn('truncate font-semibold', theme.accentText)}>{c.label}</span>
              ) : (
                <Link href={c.href} className="truncate text-gray-500 transition-colors hover:text-gray-300">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Search — icon only on mobile, full pill on md+ */}
      <button
        type="button"
        aria-label="Search"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-gray-400 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-gray-200 md:hidden"
      >
        <Search className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Search"
        className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[12.5px] text-gray-500 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-gray-300 md:flex md:w-52 lg:w-64 xl:w-80"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">Search events, resources…</span>
        <kbd className="shrink-0 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">⌘K</kbd>
      </button>

      {/* Notifications */}
      <Link
        href={notifHref}
        aria-label={notificationCount > 0 ? `Notifications, ${notificationCount} unread` : 'Notifications'}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-gray-400 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
      >
        <Bell className="h-4 w-4" />
        {notificationCount > 0 && (
          <span
            aria-live="polite"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm shadow-rose-500/30"
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </Link>

      {/* Help — hidden on mobile to save space */}
      <button
        type="button"
        aria-label="Help"
        className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-gray-400 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-gray-200 sm:flex"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </header>
  );
}
