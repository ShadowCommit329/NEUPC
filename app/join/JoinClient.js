/**
 * @file Join page client component.
 * Renders the public account creation page with feature cards and Google OAuth sign-in.
 *
 * @module JoinClient
 */

'use client';

import { signIn } from 'next-auth/react';
import dynamic from 'next/dynamic';
const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});
import PageBackground from '../_components/ui/PageBackground';
import PageShell from '../_components/ui/PageShell';
import { useDelayedLoad, useScrollReveal } from '../_lib/hooks';
import { cn } from '../_lib/utils';

/* ──────────────────── Constants ──────────────────── */

/** @type {{ icon: string, title: string, description: string }[]} */
const DEFAULT_FEATURES = [
  {
    icon: '📅',
    title: 'Event Registration',
    description: 'Register for contests, workshops, and hackathons',
  },
  {
    icon: '📩',
    title: 'Smart Notifications',
    description: 'Get updates on events, blogs, roadmaps, and more',
  },
  {
    icon: '📊',
    title: 'Participation History',
    description: 'Track your events and download certificates',
  },
  {
    icon: '📨',
    title: 'Membership Application',
    description: 'Apply to become an official club member',
  },
];

/* ──────────────────── Component ──────────────────── */

/**
 * @param {{ features?: { icon: string, title: string, description: string }[] }} props
 */
export default function JoinClient({
  features: propFeatures = [],
  settings = {},
}) {
  const handleGoogleSignIn = () =>
    signIn('google', { callbackUrl: '/account' });
  const publicFeatures =
    propFeatures.length > 0 ? propFeatures : DEFAULT_FEATURES;
  const isLoaded = useDelayedLoad(50);
  const [featuresRef, featuresVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <PageShell>
      <PageBackground variant="fixed" />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 md:py-28 lg:px-8 lg:py-32">
        <div className="relative container mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <div
              style={{ transitionDelay: '0ms' }}
              className={cn(
                'mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition-all duration-700 sm:mb-8',
                isLoaded
                  ? 'translate-y-0 opacity-100'
                  : '-translate-y-4 opacity-0'
              )}
            >
              <span className="text-base">👤</span>
              <span>{settings?.join_page_badge || 'Public Account'}</span>
            </div>
            <h1
              style={{ transitionDelay: '150ms' }}
              className={cn(
                'from-primary-300 to-secondary-300 mb-6 bg-linear-to-r via-white bg-clip-text text-4xl leading-tight font-extrabold tracking-tight text-transparent transition-all duration-700 sm:mb-8 sm:text-5xl md:text-6xl lg:text-7xl',
                isLoaded
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0'
              )}
            >
              {settings?.join_page_title || 'Create Your Public Account'}
            </h1>
            <p
              style={{ transitionDelay: '300ms' }}
              className={cn(
                'mx-auto mb-10 max-w-2xl text-base leading-relaxed text-gray-200 transition-all duration-700 sm:mb-12 sm:text-lg md:text-xl',
                isLoaded
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0'
              )}
            >
              {settings?.join_page_description ||
                'Stay updated with events, contests, and workshops at Netrokona University Programming Club'}
            </p>
            <div
              style={{ transitionDelay: '450ms' }}
              className={cn(
                'flex flex-col justify-center gap-4 transition-all duration-700 sm:gap-5',
                isLoaded
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0'
              )}
            >
              <button
                onClick={handleGoogleSignIn}
                className="from-primary-600 via-primary-500 to-secondary-500 group hover:shadow-primary-500/50 inline-flex items-center justify-center gap-3 rounded-2xl bg-linear-to-r px-8 py-4 text-base font-bold text-white shadow-2xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-2xl active:scale-95 sm:px-10 sm:py-5 sm:text-lg"
              >
                <svg
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* What is a Public Account Section */}
      <section
        ref={featuresRef}
        className="relative bg-linear-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60 py-16 sm:py-20 md:py-24 lg:py-32"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center sm:mb-16 md:mb-20">
              <h2
                className={cn(
                  'mb-4 text-3xl leading-tight font-extrabold tracking-tight text-white transition-all duration-700 sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl',
                  featuresVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                )}
              >
                What is a Public Account?
              </h2>
              <p
                className={cn(
                  'mx-auto max-w-2xl text-base leading-relaxed text-gray-300 transition-all delay-150 duration-700 sm:text-lg md:text-xl',
                  featuresVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-4 opacity-0'
                )}
              >
                Get started with limited access and upgrade anytime
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-4">
              {publicFeatures.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    transitionDelay: featuresVisible
                      ? `${300 + index * 100}ms`
                      : '0ms',
                  }}
                  className={cn(
                    'group hover:border-primary-500/40 hover:shadow-primary-500/20 relative overflow-hidden rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:scale-[1.03] hover:bg-white/10 hover:shadow-2xl sm:p-7',
                    featuresVisible
                      ? 'translate-y-0 scale-100 opacity-100'
                      : 'translate-y-6 scale-95 opacity-0'
                  )}
                >
                  <div className="from-primary-500/20 to-secondary-500/20 absolute -top-8 -right-8 h-40 w-40 rounded-full bg-linear-to-br opacity-0 blur-3xl transition-all duration-500 group-hover:opacity-100"></div>
                  <div className="relative">
                    <div className="from-primary-500/30 to-secondary-500/30 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br text-3xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl sm:text-4xl">
                      {feature.icon}
                    </div>
                    <h3 className="mb-3 text-lg leading-snug font-bold text-white sm:text-xl">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-300 sm:text-base">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{ transitionDelay: featuresVisible ? '700ms' : '0ms' }}
              className={cn(
                'mt-10 rounded-2xl border-2 border-amber-500/30 bg-linear-to-br from-amber-500/10 to-orange-500/10 p-6 shadow-lg backdrop-blur-xl transition-all duration-700 sm:mt-12 sm:p-8 md:mt-16',
                featuresVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              )}
            >
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="shrink-0 text-3xl sm:text-4xl">ℹ️</div>
                <div>
                  <h3 className="mb-3 text-lg font-bold text-amber-200 sm:text-xl">
                    Important Note
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-200 sm:text-base">
                    Public accounts do not have access to internal member
                    resources, weekly problem sets, or committee discussions.
                    Upgrade to membership for full access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </PageShell>
  );
}
