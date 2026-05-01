/**
 * @file Account not-found state — reusable 404 UI for /account/* subroutes.
 *   Visual style matches member panel design system (surface #121317,
 *   hairline border, 16px radius).
 * @module AccountNotFoundState
 */

'use client';

import Link from 'next/link';
import { FileQuestion, LayoutDashboard, ArrowLeft } from 'lucide-react';

const SURFACE = 'border border-white/[0.06] bg-[#121317]';
const NESTED_SURFACE = 'border border-white/[0.06] bg-white/[0.02]';

const DEFAULT_SUGGESTIONS = [
  { label: 'Profile', href: 'profile' },
  { label: 'Settings', href: 'settings' },
  { label: 'Notifications', href: 'notifications' },
];

export default function AccountNotFoundState({
  title = 'Page not found',
  description = "The page you're looking for doesn't exist or has been moved.",
  dashboardHref = '/account',
  suggestions,
}) {
  const links =
    suggestions ??
    DEFAULT_SUGGESTIONS.map((s) => ({
      ...s,
      href: `${dashboardHref}/${s.href}`,
    }));

  return (
    <div className="mx-auto flex w-full max-w-[1600px] items-center justify-center px-4 pt-10 pb-12 sm:px-6 sm:pt-14 lg:px-8 xl:px-10 2xl:px-12">
      <div className={`w-full max-w-xl rounded-2xl ${SURFACE} p-6 sm:p-8`}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
            <FileQuestion className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold tracking-[0.18em] text-amber-400/80 uppercase">
              404
            </p>
            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-white/90 sm:text-[22px]">
              {title}
            </h2>
            <p className="mt-1 text-[13px] text-white/40">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={dashboardHref}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 px-4 py-2.5 text-[13px] font-semibold text-black transition hover:bg-white active:scale-[0.98]"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[13px] font-medium text-white/70 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Go back
          </button>
        </div>

        {links.length > 0 && (
          <div className={`mt-6 rounded-xl ${NESTED_SURFACE} p-4`}>
            <p className="mb-2.5 text-[10.5px] font-semibold tracking-[0.14em] text-white/35 uppercase">
              Try these pages
            </p>
            <div className="flex flex-wrap gap-1.5">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-[12.5px] text-white/65 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-[12px] text-white/35">
          Think this is an error?{' '}
          <Link
            href="/contact"
            className="text-white/65 underline underline-offset-2 decoration-white/20 transition hover:text-white hover:decoration-white/50"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
