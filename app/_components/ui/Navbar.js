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

// ─── Configuration ──────────────────────────────────────────────────────────

/** Navigation structure — direct links, dropdown groups, and CTA button. */
const NAV_CONFIG = {
  links: [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Events' },
    { href: '/achievements', label: 'Achievements' },
  ],
  dropdowns: [
    {
      id: 'archives',
      label: 'Archives',
      items: [
        { href: '/blogs', label: 'Blogs' },
        { href: '/roadmaps', label: 'Roadmaps' },
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
  cta: { href: '/account', label: 'Get Started', style: 'primary' },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Check if a path matches or is a child of a given href. */
function isNavActive(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/** Check if any item within a dropdown is active. */
function isDropdownActive(pathname, dropdown) {
  return dropdown.items.some((item) => isNavActive(pathname, item.href));
}

/** Desktop dropdown menu with hover + click support for touch devices. */
function DesktopDropdown({ dropdown, isOpen, onToggle, pathname }) {
  const ref = useRef(null);
  const dropdownIsActive = isDropdownActive(pathname, dropdown);

  return (
    <li ref={ref} className="group relative">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-colors duration-200 xl:text-base',
          dropdownIsActive
            ? 'text-secondary-400'
            : 'text-primary-100 hover:text-secondary-400'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {dropdown.label}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen ? 'rotate-180' : 'group-hover:rotate-180'
          )}
        />
      </button>
      <ul
        className={cn(
          'bg-background-dark border-primary-700 shadow-glow absolute top-full left-0 mt-2 min-w-50 rounded-xl border transition-all duration-300',
          isOpen
            ? 'visible translate-y-0 opacity-100'
            : 'invisible translate-y-2 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100'
        )}
        role="menu"
      >
        {dropdown.items.map((item, index) => (
          <li key={item.href} role="none">
            <Link
              href={item.href}
              role="menuitem"
              className={cn(
                'block px-5 py-3 text-sm transition-colors duration-200',
                isNavActive(pathname, item.href)
                  ? 'bg-primary-800/50 text-secondary-400'
                  : 'text-primary-100 hover:bg-primary-800 hover:text-secondary-400',
                index === 0 && 'rounded-t-xl',
                index === dropdown.items.length - 1 && 'rounded-b-xl'
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

/** Mobile accordion dropdown. */
function MobileDropdown({ dropdown, isOpen, onToggle, onNavigate, pathname }) {
  const dropdownIsActive = isDropdownActive(pathname, dropdown);

  return (
    <li>
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full touch-manipulation items-center justify-between rounded-lg px-5 py-3.5 text-base font-medium transition-colors duration-200',
          dropdownIsActive
            ? 'bg-primary-800/50 text-secondary-400'
            : 'text-primary-100 hover:bg-primary-800 hover:text-secondary-400'
        )}
        aria-expanded={isOpen}
      >
        {dropdown.label}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <ul
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {dropdown.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'block px-10 py-2.5 text-sm transition-colors duration-200',
                isNavActive(pathname, item.href)
                  ? 'text-secondary-400'
                  : 'text-primary-200 hover:text-secondary-400'
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

// ─── Navbar ─────────────────────────────────────────────────────────────────

/**
 * Navbar — Responsive navigation bar with desktop dropdowns and mobile drawer.
 *
 * @param {Object} session – NextAuth session object (controls auth-aware UI)
 */
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

  // Close mobile menu on route change
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
        setOpenDropdown(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMobileMenu]);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    if (openDropdown === null) return;

    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () =>
      document.removeEventListener('pointerdown', handleClickOutside);
  }, [openDropdown]);

  const isLoggedIn = Boolean(session?.user);

  return (
    <nav ref={navRef} className="relative z-50">
      {/* ── Desktop Navigation ────────────────────────────────── */}
      <ul className="hidden items-center gap-4 lg:flex xl:gap-6 2xl:gap-8">
        {NAV_CONFIG.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                'text-sm font-medium whitespace-nowrap transition-colors duration-200 xl:text-base',
                isNavActive(pathname, link.href)
                  ? 'text-secondary-400'
                  : 'text-primary-100 hover:text-secondary-400'
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}

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
          <>
            <li>
              <Link
                href="/account"
                className="group flex items-center justify-center"
                title="Go to Account"
              >
                <UserCircle className="border-primary-500/50 hover:border-primary-500 hover:shadow-primary-500/30 text-primary-300 hover:text-primary-100 h-10 w-10 rounded-full transition-all duration-200 hover:scale-105" />
              </Link>
            </li>
            <li>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex items-center justify-center rounded-lg border-2 border-red-500/50 p-2 text-red-300 transition-all duration-200 hover:scale-105 hover:border-red-500 hover:bg-red-500/10"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </li>
          </>
        ) : (
          <li>
            <Link
              href={NAV_CONFIG.cta.href}
              className={cn(
                'shrink-0 rounded-lg px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 xl:px-5 xl:py-2 xl:text-base',
                NAV_CONFIG.cta.style === 'primary'
                  ? 'bg-primary-500 hover:bg-primary-600 shadow-soft hover:shadow-glow text-white'
                  : 'border-primary-500/50 text-primary-300 hover:border-primary-500 hover:bg-primary-500/10 border-2'
              )}
            >
              {NAV_CONFIG.cta.label}
            </Link>
          </li>
        )}
      </ul>

      {/* ── Mobile Menu Button ────────────────────────────────── */}
      <button
        onClick={() => setMobileMenuOpen((prev) => !prev)}
        className="text-primary-100 hover:text-secondary-400 touch-manipulation p-1 transition-colors duration-200 lg:hidden"
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? (
          <X className="h-7 w-7" />
        ) : (
          <Menu className="h-7 w-7" />
        )}
      </button>

      {/* ── Mobile Navigation ─────────────────────────────────── */}
      {/* Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'bg-background-dark/95 fixed inset-x-0 top-14 bottom-0 z-50 backdrop-blur-md transition-all duration-300 sm:top-17 lg:hidden',
          mobileMenuOpen
            ? 'visible opacity-100'
            : 'pointer-events-none invisible opacity-0'
        )}
      >
        <ul className="pb-safe mx-auto flex h-full max-w-md flex-col gap-0.5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {NAV_CONFIG.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={closeMobileMenu}
                className={cn(
                  'block touch-manipulation rounded-lg px-5 py-3.5 text-base font-medium transition-colors duration-200',
                  isNavActive(pathname, link.href)
                    ? 'bg-primary-800/50 text-secondary-400'
                    : 'text-primary-100 hover:bg-primary-800 hover:text-secondary-400'
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

          <li className="my-3 border-t border-white/10" />

          {isLoggedIn ? (
            <>
              <li>
                <Link
                  href="/account"
                  onClick={closeMobileMenu}
                  className="border-primary-500/50 bg-primary-500/10 text-primary-300 hover:border-primary-500 hover:bg-primary-500/20 block w-full touch-manipulation rounded-lg border-2 px-5 py-3.5 text-center text-base font-semibold transition-all duration-200"
                >
                  My Account
                </Link>
              </li>
              <li className="mt-2">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    onClick={closeMobileMenu}
                    className="block w-full touch-manipulation rounded-lg border-2 border-red-500/50 px-5 py-3.5 text-center text-base font-semibold text-red-300 transition-all duration-200 hover:border-red-500 hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </form>
              </li>
            </>
          ) : (
            <li>
              <Link
                href={NAV_CONFIG.cta.href}
                onClick={closeMobileMenu}
                className={cn(
                  'block touch-manipulation rounded-lg px-5 py-3.5 text-center text-base font-semibold transition-all duration-200',
                  NAV_CONFIG.cta.style === 'primary'
                    ? 'bg-primary-500 hover:bg-primary-600 shadow-soft text-white'
                    : 'border-primary-500/50 text-primary-300 hover:border-primary-500 hover:bg-primary-500/10 border-2'
                )}
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
