'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error);
    } else {
      console.error('Application error:', error?.message || 'Unknown error');
    }
  }, [error]);

  const displayMessage =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : error?.message || 'An unexpected error occurred';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060B] px-4 py-24 sm:px-6">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-overlay absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(239,68,68,0.04),transparent)]" />
        <div className="absolute -top-40 -right-32 h-125 w-125 rounded-full bg-red-500/5 blur-[140px]" />
        <div className="bg-neon-violet/5 absolute -bottom-40 -left-32 h-100 w-100 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Eyebrow */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-red-500/30" />
          <span className="font-mono text-[9px] font-bold tracking-[0.4em] text-zinc-600 uppercase">
            System_Error · Runtime_Exception
          </span>
          <span className="h-px w-8 bg-red-500/30" />
        </div>

        {/* Big label */}
        <div className="kinetic-headline font-heading mb-6 select-none text-[clamp(4rem,18vw,10rem)] font-black uppercase leading-none text-white">
          ERR
          <span className="text-transparent" style={{ WebkitTextStroke: '1.5px rgba(239,68,68,0.7)' }}>
            OR.
          </span>
        </div>

        {/* Terminal card */}
        <div className="relative overflow-hidden rounded-sm border border-red-500/10 bg-[rgba(12,14,22,0.75)] p-7 backdrop-blur-2xl shadow-[0_0_60px_0_rgba(239,68,68,0.06)] sm:p-8">
          {/* Corner accents — red for error state */}
          <span className="absolute top-0 left-0 h-5 w-px bg-red-500/50" />
          <span className="absolute top-0 left-0 h-px w-5 bg-red-500/50" />
          <span className="absolute right-0 bottom-0 h-5 w-px bg-neon-violet/40" />
          <span className="absolute right-0 bottom-0 h-px w-5 bg-neon-violet/40" />

          {/* Status indicator */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-red-500/70 uppercase font-bold">
              Process_Failed
            </span>
          </div>

          {/* Error message */}
          <div className="rounded-sm border border-red-500/10 bg-red-500/[0.03] px-4 py-3">
            <p className="font-mono text-[10px] leading-relaxed tracking-wide text-zinc-500">
              <span className="text-red-400/60">&gt;&gt;</span>{' '}
              {displayMessage}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-neon-lime px-7 py-3 font-heading text-[10px] font-black tracking-[0.2em] uppercase text-black shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] transition-all hover:shadow-[0_0_45px_-5px_rgba(182,243,107,0.7)] active:scale-[0.98]"
            >
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry_Process
            </button>

            <Link
              href="/"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-7 py-3 font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-400 transition-all hover:border-white/20 hover:text-zinc-200 active:scale-[0.98]"
            >
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return_To_Nexus
            </Link>
          </div>
        </div>

        {/* Help */}
        <p className="mt-8 font-mono text-[9px] tracking-wide text-zinc-700">
          Persisting issue?{' '}
          <Link href="/contact" className="text-neon-violet/60 underline underline-offset-2 decoration-neon-violet/20 transition-colors hover:text-neon-violet">
            Contact_Support →
          </Link>
        </p>
      </div>
    </main>
  );
}
