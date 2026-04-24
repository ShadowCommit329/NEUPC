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
import { Menu, X, ChevronDown, LogOut } from 'lucide-react';
import Image from 'next/image';
import { cn, driveImageUrl } from '@/app/_lib/utils';
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
        { href: '/gallery', label: 'Gallery' },
      ],
    },
    {
      id: 'clubinfo',
      label: 'Club Info',
      items: [
        { href: '/about', label: 'About' },
        { href: '/committee', label: 'Committee' },
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

// ── UserAvatar ───────────────────────────────────────────────
function UserAvatar({ user, size = 36, overlay = false }) {
  const avatarSrc = driveImageUrl(user.avatar_url || user.image || '');
  const name = user.name || 'Account';
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const imgEl = avatarSrc ? (
    <Image
      src={avatarSrc}
      alt={name}
      fill
      sizes={`${size}px`}
      className="object-cover transition-transform duration-500 ease-out group-hover/av:scale-110"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span
      aria-label={name}
      className="flex h-full w-full items-center justify-center rounded-full bg-linear-to-br from-neon-lime/80 to-neon-violet/80 text-[11px] font-bold tracking-wide text-black select-none"
    >
      {initials}
    </span>
  );

  return (
    <div
      className="group/av relative shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 transition-all duration-300 ease-out hover:ring-neon-lime/40 hover:shadow-[0_0_0_4px_rgba(182,243,107,0.08)]"
      style={{ width: size, height: size }}
    >
      {imgEl}
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 backdrop-blur-[2px] transition-all duration-300 ease-out group-hover/av:opacity-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4 scale-75 text-white/90 transition-transform duration-300 ease-out group-hover/av:scale-100"
            aria-hidden="true"
          >
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── DesktopDropdown ──────────────────────────────────────────
function DesktopDropdown({ dropdown, isOpen, onToggle, pathname }) {
  const ref = useRef(null);
  const active = isDropdownActive(pathname, dropdown);

  return (
    <li ref={ref} className="group relative hidden py-2 min-[1100px]:block">
      <button
        onClick={onToggle}
        className={cn(
          'font-heading flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase transition-all duration-200 ease-out',
          active
            ? 'bg-neon-lime/10 text-neon-lime'
            : 'text-zinc-300 hover:bg-white/5 hover:text-white group-hover:text-neon-lime'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {dropdown.label}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-300 ease-out',
            isOpen ? 'rotate-180' : 'group-hover:rotate-180'
          )}
        />
      </button>

      {/* Invisible hover bridge */}
      <div className="absolute top-full left-0 h-3 w-full" />

      <ul
        className={cn(
          'bg-surface-2/95 absolute top-[calc(100%+0.5rem)] left-0 z-[250] min-w-[14rem] origin-top-left space-y-0.5 rounded-2xl border border-white/10 p-2 shadow-[0_12px_40px_rgb(0,0,0,0.55)] backdrop-blur-xl transition-all duration-300 ease-out',
          isOpen
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible -translate-y-3 scale-95 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100'
        )}
        role="menu"
      >
        {dropdown.items.map((item, i) => (
          <li
            key={item.href}
            role="none"
            className={cn(
              'transition-all duration-300 ease-out',
              isOpen
                ? 'translate-y-0 opacity-100'
                : '-translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
            )}
            style={{ transitionDelay: isOpen ? `${i * 40}ms` : `${i * 25}ms` }}
          >
            <Link
              href={item.href}
              role="menuitem"
              className={cn(
                'flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-[11px] transition-all duration-150 ease-out',
                isNavActive(pathname, item.href)
                  ? 'bg-neon-lime/10 text-neon-lime'
                  : 'text-zinc-300 hover:translate-x-0.5 hover:bg-neon-lime/8 hover:text-neon-lime'
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

// ── MobileDropdown ───────────────────────────────────────────
function MobileDropdown({ dropdown, isOpen, onToggle, onNavigate, pathname, staggerDelay = 0, visible = true }) {
  const active = isDropdownActive(pathname, dropdown);

  return (
    <li
      className={cn(
        'flex flex-col transition-all duration-300 ease-out',
        visible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
      )}
      style={{ transitionDelay: `${staggerDelay}ms` }}
    >
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full touch-manipulation items-center justify-between rounded-xl px-5 py-3.5 text-[15px] font-medium transition-all duration-200 ease-out active:scale-[0.98]',
          active
            ? 'bg-neon-lime/10 text-neon-lime'
            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
        )}
        aria-expanded={isOpen}
      >
        {dropdown.label}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-300 ease-out',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-350 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isOpen
            ? 'mt-1 grid-rows-[1fr] opacity-100'
            : 'mt-0 grid-rows-[0fr] opacity-0'
        )}
      >
        <ul className="overflow-hidden">
          <div className="flex flex-col gap-0.5 px-3 pt-1 pb-2">
            {dropdown.items.map((item, i) => (
              <li
                key={item.href}
                className={cn(
                  'transition-all duration-300 ease-out',
                  isOpen ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                )}
                style={{ transitionDelay: isOpen ? `${50 + i * 45}ms` : '0ms' }}
              >
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-lg px-6 py-2.5 text-[13px] transition-all duration-150 ease-out hover:bg-white/5 active:scale-[0.97]',
                    isNavActive(pathname, item.href)
                      ? 'text-neon-lime'
                      : 'text-zinc-400 hover:text-neon-lime'
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

// ── Navbar ───────────────────────────────────────────────────
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
      return () => { document.body.style.overflow = ''; };
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
  const allDrawerLinks = [...NAV_CONFIG.links, ...NAV_CONFIG.dropdowns];

  return (
    <nav ref={navRef} className="relative z-[210] flex items-center gap-2 sm:gap-3">

      {/* ── Desktop / Tablet nav ─────────────────────────────── */}
      <ul className="flex items-center gap-1 sm:gap-2 xl:gap-3">

        {/* Primary links — visible from 900px */}
        {NAV_CONFIG.links.map((link) => {
          const active = isNavActive(pathname, link.href);
          return (
            <li key={link.href} className="relative hidden min-[900px]:block">
              <Link
                href={link.href}
                className={cn(
                  'font-heading relative rounded-full px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase transition-all duration-200 ease-out min-[1100px]:px-4 min-[1100px]:py-2',
                  // Underline pip via ::after
                  'after:absolute after:bottom-0 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-neon-lime after:transition-all after:duration-300 after:ease-out',
                  active
                    ? 'bg-neon-lime/10 text-neon-lime after:w-4'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-neon-lime hover:after:w-3'
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}

        {/* Dropdowns — visible from 1100px */}
        {NAV_CONFIG.dropdowns.map((dropdown) => (
          <DesktopDropdown
            key={dropdown.id}
            dropdown={dropdown}
            isOpen={openDropdown === dropdown.id}
            onToggle={() => toggleDropdown(dropdown.id)}
            pathname={pathname}
          />
        ))}

        {/* Auth / CTA */}
        {isLoggedIn ? (
          <div className="ml-1 flex items-center gap-2 sm:ml-2">
            <li className="hidden min-[900px]:block">
              <Link
                href="/account"
                title="Go to Account"
                className="block transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
              >
                <UserAvatar user={session.user} size={36} overlay />
              </Link>
            </li>
            <li className="hidden min-[900px]:block">
              <form action={signOutAction}>
                <button
                  type="submit"
                  title="Logout"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-red-500/80 backdrop-blur-sm transition-all duration-200 ease-out hover:scale-105 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 active:scale-95 sm:h-9 sm:w-9"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </form>
            </li>
          </div>
        ) : (
          <li className="hidden min-[900px]:pl-1 min-[1100px]:pl-3 sm:block">
            <Link
              href={NAV_CONFIG.cta.href}
              className="font-heading inline-flex items-center gap-1.5 rounded-full bg-neon-lime px-4 py-2 text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_24px_-6px_rgba(182,243,107,0.6)] transition-all duration-200 ease-out hover:scale-105 hover:shadow-[0_0_32px_-4px_rgba(182,243,107,0.8)] active:scale-95 sm:px-5 sm:py-2.5 sm:text-[11px]"
            >
              {NAV_CONFIG.cta.label}
            </Link>
          </li>
        )}
      </ul>

      {/* ── Hamburger ────────────────────────────────────────── */}
      <div className="ml-1 flex items-center min-[1100px]:hidden sm:ml-2">
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={cn(
            'relative flex h-8 w-8 touch-manipulation items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 ease-out active:scale-90 sm:h-9 sm:w-9',
            mobileMenuOpen
              ? 'border-neon-lime/30 bg-neon-lime/10 text-neon-lime'
              : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
          )}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-drawer"
        >
          <span
            className={cn(
              'absolute transition-all duration-300 ease-out',
              mobileMenuOpen ? 'rotate-90 scale-100 opacity-100' : 'rotate-0 scale-75 opacity-0'
            )}
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span
            className={cn(
              'absolute transition-all duration-300 ease-out',
              mobileMenuOpen ? '-rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'
            )}
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
        </button>
      </div>

      {/* ── Backdrop ─────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-x-0 z-[205] bg-black/60 backdrop-blur-md transition-opacity duration-500 ease-out min-[1100px]:hidden"
          style={{
            top: 'var(--header-h, 69px)',
            height: 'calc(100dvh - var(--header-h, 69px))',
          }}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer ───────────────────────────────────────────── */}
      <div
        id="mobile-nav-drawer"
        className={cn(
          'bg-surface-2/95 fixed inset-x-0 z-[206] border-t border-neon-lime/10 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] min-[1100px]:hidden',
          mobileMenuOpen
            ? 'visible translate-y-0 opacity-100'
            : 'pointer-events-none invisible -translate-y-6 opacity-0'
        )}
        style={{
          top: 'var(--header-h, 69px)',
          height: 'calc(100dvh - var(--header-h, 69px))',
        }}
      >
        <ul className="pb-safe mx-auto flex h-full max-w-lg flex-col gap-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:grid md:max-w-3xl md:grid-cols-2 md:content-start md:gap-2 md:p-8">

          {/* Primary links */}
          {NAV_CONFIG.links.map((link, i) => (
            <li
              key={link.href}
              className={cn(
                'min-[900px]:hidden transition-all duration-300 ease-out',
                mobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              )}
              style={{ transitionDelay: mobileMenuOpen ? `${i * 55}ms` : '0ms' }}
            >
              <Link
                href={link.href}
                onClick={closeMobileMenu}
                className={cn(
                  'block touch-manipulation rounded-xl px-5 py-3.5 text-[15px] font-medium transition-all duration-150 ease-out active:scale-[0.98]',
                  isNavActive(pathname, link.href)
                    ? 'bg-neon-lime/10 text-neon-lime'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-neon-lime'
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {/* Dropdowns */}
          {NAV_CONFIG.dropdowns.map((dropdown, i) => (
            <MobileDropdown
              key={dropdown.id}
              dropdown={dropdown}
              isOpen={openDropdown === dropdown.id}
              onToggle={() => toggleDropdown(dropdown.id)}
              onNavigate={closeMobileMenu}
              pathname={pathname}
              staggerDelay={mobileMenuOpen ? (NAV_CONFIG.links.length + i) * 55 : 0}
              visible={mobileMenuOpen}
            />
          ))}

          {/* Divider */}
          <li
            className={cn(
              'my-3 border-t border-neon-lime/10 transition-opacity duration-300 ease-out md:col-span-2',
              mobileMenuOpen ? 'opacity-100' : 'opacity-0'
            )}
            style={{ transitionDelay: mobileMenuOpen ? `${allDrawerLinks.length * 55}ms` : '0ms' }}
          />

          {isLoggedIn ? (
            <>
              <li
                className={cn(
                  'min-[900px]:hidden md:col-span-1 transition-all duration-300 ease-out',
                  mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                )}
                style={{ transitionDelay: mobileMenuOpen ? `${(allDrawerLinks.length + 1) * 55}ms` : '0ms' }}
              >
                <Link
                  href="/account"
                  onClick={closeMobileMenu}
                  className="flex w-full touch-manipulation items-center justify-center gap-3 rounded-xl border border-neon-lime/15 bg-neon-lime/5 px-5 py-3.5 transition-all duration-150 ease-out hover:border-neon-lime/30 hover:bg-neon-lime/10 active:scale-[0.98]"
                >
                  <UserAvatar user={session.user} size={24} />
                  <span className="truncate text-[15px] font-semibold text-zinc-300">
                    {session.user?.name || 'My Account'}
                  </span>
                </Link>
              </li>
              <li
                className={cn(
                  'mt-1 min-[900px]:hidden md:col-span-1 md:mt-0 transition-all duration-300 ease-out',
                  mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                )}
                style={{ transitionDelay: mobileMenuOpen ? `${(allDrawerLinks.length + 2) * 55}ms` : '0ms' }}
              >
                <form action={signOutAction} className="h-full w-full">
                  <button
                    type="submit"
                    onClick={closeMobileMenu}
                    className="flex h-full w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3.5 text-[15px] font-semibold text-red-400 transition-all duration-150 ease-out hover:bg-red-500/10 hover:text-red-300 active:scale-[0.98]"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </form>
              </li>
            </>
          ) : (
            <li
              className={cn(
                'mt-2 sm:hidden md:col-span-2 transition-all duration-300 ease-out',
                mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
              )}
              style={{ transitionDelay: mobileMenuOpen ? `${(allDrawerLinks.length + 1) * 55}ms` : '0ms' }}
            >
              <Link
                href={NAV_CONFIG.cta.href}
                onClick={closeMobileMenu}
                className="block touch-manipulation rounded-xl bg-neon-lime px-5 py-3.5 text-center text-[15px] font-bold text-black shadow-[0_0_32px_-8px_rgba(182,243,107,0.5)] transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-[0_0_40px_-6px_rgba(182,243,107,0.7)] active:scale-[0.98]"
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
