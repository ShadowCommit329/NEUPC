/**
 * @file Account error boundary — reusable error UI shown when a server
 *   or client error occurs within the /account/* segment. Offers retry,
 *   dashboard, and support links. Visual style matches member panel
 *   design system (surface #121317, hairline border, 16px radius).
 * @module AccountError
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, LayoutDashboard, HelpCircle } from 'lucide-react';

const SURFACE = 'border border-white/[0.06] bg-[#121317]';
const NESTED_SURFACE = 'border border-white/[0.06] bg-white/[0.02]';

export default function AccountError({
  error,
  reset,
  title,
  dashboardHref = '/account',
}) {
  useEffect(() => {
    console.error(`[Account Error]${title ? ` (${title})` : ''}:`, error);
  }, [error, title]);

  const heading = title ? `Failed to load ${title}` : 'Something went wrong';

  return (
    <div className="mx-auto flex w-full max-w-[1600px] items-center justify-center px-4 pt-10 pb-12 sm:px-6 sm:pt-14 lg:px-8 xl:px-10 2xl:px-12">
      <div className={`w-full max-w-xl rounded-2xl ${SURFACE} p-6 sm:p-8`}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-white/90 sm:text-[22px]">
              {heading}
            </h2>
            <p className="mt-1 text-[13px] text-white/40">
              An unexpected error occurred while loading this page.
            </p>
          </div>
        </div>

        {error?.message && (
          <div className={`mt-5 rounded-xl ${NESTED_SURFACE} px-4 py-3`}>
            <p className="font-mono text-[11.5px] leading-relaxed wrap-break-word text-white/55">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1.5 font-mono text-[10.5px] text-white/30">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            onClick={reset}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 px-4 py-2.5 text-[13px] font-semibold text-black transition hover:bg-white active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" />
            Try again
          </button>
          <Link
            href={dashboardHref}
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[13px] font-medium text-white/70 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </div>

        <div className={`mt-6 rounded-xl ${NESTED_SURFACE} px-4 py-3`}>
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-[12.5px] text-white/45">
            <HelpCircle className="h-3.5 w-3.5" />
            Persistent issue?
            <Link
              href="/contact"
              className="text-white/75 underline underline-offset-2 decoration-white/20 transition hover:text-white hover:decoration-white/50"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
