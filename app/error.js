/**
 * @file Global error boundary page.
 * Displays error message with retry and navigation options.
 *
 * @module ErrorPage
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import PageBackground from './_components/ui/PageBackground';
import { useDelayedLoad } from './_lib/hooks';
import { cn } from './_lib/utils';

/**
 * Global error boundary component.
 * @param {{ error: Error, reset: Function }} props
 */
export default function Error({ error, reset }) {
  const isLoaded = useDelayedLoad();

  useEffect(() => {
    // In production, avoid logging full error details to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error);
    } else {
      console.error('Application error:', error?.message || 'Unknown error');
    }
  }, [error]);

  // In production, show a generic message instead of the raw error
  const displayMessage =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : error.message || 'An unexpected error occurred';

  return (
    <main className="relative min-h-screen bg-linear-to-b from-gray-900 via-black to-gray-900">
      <div className="flex min-h-screen items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <PageBackground />

        <div
          className={cn(
            'relative w-full max-w-2xl transition-all duration-700',
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          )}
        >
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:p-12 md:p-16">
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <div className="text-6xl sm:text-7xl">⚠️</div>
              </div>

              <h1 className="from-primary-300 to-secondary-300 mb-4 bg-linear-to-r via-white bg-clip-text text-center text-3xl font-bold text-transparent sm:text-4xl md:text-5xl">
                Something Went Wrong!
              </h1>

              <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-center text-sm text-gray-300 sm:text-base">
                  {displayMessage}
                </p>
              </div>

              <p className="mb-8 text-center text-sm text-gray-400 sm:text-base">
                Don&apos;t worry, this happens sometimes. You can try again or
                return to the homepage.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <button
                  onClick={reset}
                  className="group border-primary-500/50 from-primary-500/40 to-secondary-500/40 hover:shadow-primary-500/50 hover:border-primary-500/70 relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border bg-linear-to-r px-6 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 sm:px-8 sm:py-4 sm:text-base"
                >
                  <svg
                    className="h-4 w-4 transition-transform group-hover:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Try Again</span>
                </button>

                <Link
                  href="/"
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-white/40 hover:bg-white/10 hover:shadow-lg active:scale-95 sm:px-8 sm:py-4 sm:text-base"
                >
                  <svg
                    className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span>Go Home</span>
                </Link>
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-400">
                  Need help?{' '}
                  <Link
                    href="/contact"
                    className="text-primary-300 hover:text-primary-200 transition-colors hover:underline"
                  >
                    Contact support
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
