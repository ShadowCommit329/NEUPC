/**
 * @file Navbar
 * @module Navbar
 */

'use client';

import Link from 'next/link';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  startTransition,
} from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { cn } from '@/app/_lib/utils';
import { signOutAction } from '@/app/_lib/actions';

const NAV_CONFIG = {
  links: [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Events' },
    { href: '/achievements', label: 'Achievements' },
  ],
  dropdowns: [
    {
      id: 'archives',
      label: 'Library',
      items: [
        { href: '/blogs', label: 'Blogs' },
        { href: '/roadmaps', label: 'Roadmaps' },
        // { href: '/resources', label: 'Resources' },
      ],
    },
    {
      id: 'clubinfo',
      label: 'Club Info',
      items: [
        { href: '/about', label: 'About' },
        { href: '/committee', label: 'Committee' },
        { href: '/gallery', label: 'Gallery' },
      ],
    },
    {
      id: 'connect',
      label: 'Connect',
      items: [
        { href: '/contact', label: 'Contact' },
        { href: '/developers', label: 'Developers' },
      ],
    },
  ],
  cta: { href: '/account', label: 'Get Started' },
};

function isNavActive(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function isDropdownActive(pathname, dropdown) {
  return dropdown.items.some((item) => isNavActive(pathname, item.href));
}

function DesktopDropdown({ dropdown, isOpen, onToggle, pathname }) {
  const ref = useRef(null);
  const active = isDropdownActive(pathname, dropdown);
  const activeColor = 'text-primary-400 bg-primary-500/10';
  const hoverColor = 'group-hover:text-primary-400';
  const hoverItem = 'hover:text-primary-400 hover:bg-primary-500/10';
  const activeItem = 'text-primary-400 bg-primary-500/10';

  return (
    <li ref={ref} className="group relative py-2">
      <button
        onClick={onToggle}
        className={cn(
          'font-heading flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase transition-all duration-300',
          active
            ? activeColor
            : cn('text-zinc-300 hover:bg-white/5 hover:text-white', hoverColor)
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {dropdown.label}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-300',
            isOpen ? 'rotate-180' : 'group-hover:rotate-180'
          )}
        />
      </button>

      {/* Invisible hover bridge */}
      <div className="absolute top-full left-0 h-3 w-full" />

      <ul
        className={cn(
          'bg-surface-2/95 absolute top-[calc(100%+0.5rem)] left-0 z-[250] min-w-[14rem] origin-top-left space-y-1 rounded-2xl border border-white/10 p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300',
          isOpen
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible -translate-y-2 scale-95 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100'
        )}
        role="menu"
      >
        {dropdown.items.map((item) => (
          <li key={item.href} role="none">
            <Link
              href={item.href}
              role="menuitem"
              className={cn(
                'block rounded-xl px-3.5 py-2 font-mono text-[11px] transition-all duration-200',
                isNavActive(pathname, item.href)
                  ? activeItem
                  : cn('text-zinc-300', hoverItem)
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

function MobileDropdown({ dropdown, isOpen, onToggle, onNavigate, pathname }) {
  const active = isDropdownActive(pathname, dropdown);
  const activeColor = 'bg-primary-500/10 text-primary-400';
  const inactiveColor = 'text-zinc-300 hover:bg-white/5 hover:text-white';
  const activeItemColor = 'text-primary-400';

  return (
    <li className="flex flex-col">
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full touch-manipulation items-center justify-between rounded-xl px-5 py-3.5 text-[15px] font-medium transition-all duration-300',
          active ? activeColor : inactiveColor
        )}
        aria-expanded={isOpen}
      >
        {dropdown.label}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-300',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen
            ? 'mt-1 grid-rows-[1fr] opacity-100'
            : 'mt-0 grid-rows-[0fr] opacity-0'
        )}
      >
        <ul className="overflow-hidden">
          <div className="flex flex-col gap-1 px-3 pt-1 pb-2">
            {dropdown.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-lg px-6 py-2.5 text-[13px] transition-all duration-200 hover:bg-white/5',
                    isNavActive(pathname, item.href)
                      ? activeItemColor
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </div>
        </ul>
      </div>
    </li>
  );
}

export default function Navbar({ session }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const pathname = usePathname();
  const navRef = useRef(null);

  const toggleDropdown = useCallback(
    (id) => setOpenDropdown((prev) => (prev === id ? null : id)),
    []
  );

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, []);

  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      startTransition(() => {
        setMobileMenuOpen(false);
        setOpenDropdown(null);
      });
    }
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
        setOpenDropdown(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeMobileMenu]);

  useEffect(() => {
    if (openDropdown === null) return;
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target))
        setOpenDropdown(null);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [openDropdown]);

  const isLoggedIn = Boolean(session?.user);

  return (
    <nav ref={navRef} className="relative z-[210]">
      {/* ── Desktop ────────────────────────────────────────────── */}
      <ul className="hidden items-center gap-1 lg:flex lg:gap-2 xl:gap-4">
        {NAV_CONFIG.links.map((link) => {
          const active = isNavActive(pathname, link.href);
          return (
            <li key={link.href} className="relative">
              <Link
                href={link.href}
                className={cn(
                  'font-heading relative rounded-full px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-all duration-300',
                  active
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}

        {NAV_CONFIG.dropdowns.map((dropdown) => (
          <DesktopDropdown
            key={dropdown.id}
            dropdown={dropdown}
            isOpen={openDropdown === dropdown.id}
            onToggle={() => toggleDropdown(dropdown.id)}
            pathname={pathname}
          />
        ))}

        {isLoggedIn ? (
          <div className="ml-2 flex items-center gap-3">
            <li>
              <Link
                href="/account"
                title="Go to Account"
                className="block transition-transform hover:scale-105"
              >
                <UserCircle
                  className="h-9 w-9 text-zinc-300 opacity-80 transition-colors hover:text-white hover:opacity-100"
                  strokeWidth={1.5}
                />
              </Link>
            </li>
            <li>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-red-500/80 transition-all hover:scale-105 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </li>
          </div>
        ) : (
          <li className="pl-3">
            <Link
              href={NAV_CONFIG.cta.href}
              className="bg-primary-500 font-heading hover:shadow-glow/50 hover:bg-primary-400 block flex items-center justify-center rounded-full px-5 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase shadow-lg transition-all duration-300 hover:scale-105"
            >
              {NAV_CONFIG.cta.label}
            </Link>
          </li>
        )}
      </ul>

      {/* ── Mobile header controls ──────────────────────────────── */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="touch-manipulation rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition-all hover:bg-white/10 hover:text-white active:scale-95"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-drawer"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* ── Mobile backdrop ─────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-x-0 z-[205] bg-black/60 backdrop-blur-md transition-opacity duration-500 lg:hidden"
          style={{
            top: 'var(--header-h, 69px)',
            height: 'calc(100dvh - var(--header-h, 69px))',
          }}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      <div
        id="mobile-nav-drawer"
        className={cn(
          'bg-surface-2/95 fixed inset-x-0 z-[206] border-t border-white/5 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden',
          mobileMenuOpen
            ? 'visible translate-y-0 opacity-100'
            : 'pointer-events-none invisible -translate-y-8 opacity-0'
        )}
        style={{
          top: 'var(--header-h, 69px)',
          height: 'calc(100dvh - var(--header-h, 69px))',
        }}
      >
        <ul className="pb-safe mx-auto flex h-full max-w-lg flex-col gap-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:grid md:max-w-3xl md:grid-cols-2 md:content-start md:gap-2 md:p-8">
          {NAV_CONFIG.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={closeMobileMenu}
                className={cn(
                  'block touch-manipulation rounded-xl px-5 py-3.5 text-[15px] font-medium transition-all duration-300',
                  isNavActive(pathname, link.href)
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {NAV_CONFIG.dropdowns.map((dropdown) => (
            <MobileDropdown
              key={dropdown.id}
              dropdown={dropdown}
              isOpen={openDropdown === dropdown.id}
              onToggle={() => toggleDropdown(dropdown.id)}
              onNavigate={closeMobileMenu}
              pathname={pathname}
            />
          ))}

          <li className="my-3 border-t border-white/10 md:col-span-2" />

          {isLoggedIn ? (
            <>
              <li className="md:col-span-1">
                <Link
                  href="/account"
                  onClick={closeMobileMenu}
                  className="block w-full touch-manipulation rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-center text-[15px] font-semibold text-zinc-300 transition-all hover:border-white/20 hover:text-white"
                >
                  My Account
                </Link>
              </li>
              <li className="md:col-span-1">
                <form action={signOutAction} className="h-full">
                  <button
                    type="submit"
                    onClick={closeMobileMenu}
                    className="block h-full w-full touch-manipulation rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3.5 text-center text-[15px] font-semibold text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                  >
                    Logout
                  </button>
                </form>
              </li>
            </>
          ) : (
            <li className="mt-2 md:col-span-2">
              <Link
                href={NAV_CONFIG.cta.href}
                onClick={closeMobileMenu}
                className="bg-primary-500 hover:shadow-glow/50 hover:bg-primary-400 block touch-manipulation rounded-xl px-5 py-3.5 text-center text-[15px] font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
              >
                {NAV_CONFIG.cta.label}
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
