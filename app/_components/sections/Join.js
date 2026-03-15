'use client';

/**
 * @file Join
 * @module Join
 */

import Link from 'next/link';
import { cn } from '@/app/_lib/utils';
import JoinButton from '../ui/JoinButton';
import Button from '../ui/Button';
import SectionBackground from '../ui/SectionBackground';
import SectionHeader from '../ui/SectionHeader';
import { useScrollReveal, useStaggerReveal } from '@/app/_lib/hooks';

// ─── Configuration ──────────────────────────────────────────────────────────

/** Default membership benefit cards when none are provided. */
const DEFAULT_BENEFITS = [
  {
    title: 'Learn & Grow',
    description: 'Access workshops, bootcamps, and mentorship programs',
    icon: 'learn',
    color: 'primary',
  },
  {
    title: 'Network',
    description: 'Connect with peers, alumni, and industry professionals',
    icon: 'network',
    color: 'secondary',
  },
  {
    title: 'Compete',
    description: 'Participate in contests and represent NU nationally',
    icon: 'compete',
    color: 'primary',
  },
  {
    title: 'Build Projects',
    description: 'Collaborate on real-world projects and hackathons',
    icon: 'build',
    color: 'secondary',
  },
];

/** SVG path data keyed by benefit icon name. */
const ICON_PATHS = {
  learn:
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  network:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  compete:
    'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  build: 'M13 10V3L4 14h7v7l9-11h-7z',
};

/** Color-variant classes for primary / secondary benefit cards. */
const COLOR_VARIANTS = {
  primary: {
    border: 'hover:border-primary-500/50',
    glow: 'from-primary-500/20',
    iconBg: 'from-primary-500/20 to-primary-600/20',
    iconText: 'text-primary-300',
    titleFrom: 'from-primary-300',
  },
  secondary: {
    border: 'hover:border-secondary-500/50',
    glow: 'from-secondary-500/20',
    iconBg: 'from-secondary-500/20 to-secondary-600/20',
    iconText: 'text-secondary-300',
    titleFrom: 'from-secondary-300',
  },
};

// ─── BenefitCard ────────────────────────────────────────────────────────────

/** A single benefit card with icon, title and description. */
function BenefitCard({ benefit, index }) {
  const colorKey = benefit.color || (index % 2 === 0 ? 'primary' : 'secondary');
  const v = COLOR_VARIANTS[colorKey] || COLOR_VARIANTS.primary;
  const iconPath = ICON_PATHS[benefit.icon] || ICON_PATHS.learn;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/6 bg-white/3 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-3 hover:bg-white/6 hover:shadow-[0_20px_60px_-15px_rgba(8,131,149,0.15)] sm:rounded-3xl sm:p-6',
        v.border
      )}
    >
      {/* Hover glow */}
      <div
        className={cn(
          'absolute -top-10 -right-10 h-32 w-32 rounded-full bg-linear-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100',
          v.glow
        )}
      />

      <div className="relative">
        <div
          className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br',
            v.iconBg
          )}
        >
          <svg
            className={cn('h-7 w-7', v.iconText)}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={iconPath}
            />
          </svg>
        </div>

        <h3
          className={cn(
            'mb-2 bg-linear-to-r to-white bg-clip-text text-lg font-bold text-transparent',
            v.titleFrom
          )}
        >
          {benefit.title}
        </h3>
        <p className="text-sm text-gray-400">{benefit.description}</p>
      </div>
    </div>
  );
}

// ─── Join Section ───────────────────────────────────────────────────────────

/**
 * Join — Homepage CTA section encouraging users to become NEUPC members.
 *
 * @param {Array} benefits – Benefit card data (falls back to DEFAULT_BENEFITS)
 */
function Join({ benefits = [], settings = {} }) {
  const displayBenefits = benefits.length > 0 ? benefits : DEFAULT_BENEFITS;

  const { ref: gridRef, isVisible: gridVisible, getDelay } = useStaggerReveal({ staggerMs: 100 });
  const [ctaRef, ctaVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="relative overflow-hidden py-16 sm:py-20 md:py-28 lg:py-36">
      <SectionBackground />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* ── Section Header ────────────────────────────────── */}
          <SectionHeader
            badge={settings?.homepage_join_badge || 'Join Our Community'}
            title={settings?.homepage_join_title || 'Become a Member'}
            subtitle={
              settings?.homepage_join_subtitle ||
              'Join NEUPC and unlock your potential in competitive programming, software development, and tech innovation'
            }
            lineClassName="to-primary-500/40"
            titleClassName="from-white via-gray-100 to-gray-300"
          />

          {/* ── Benefits Grid ─────────────────────────────────── */}
          <div
            ref={gridRef}
            className="mb-10 grid gap-4 sm:grid-cols-2 sm:gap-6 md:mb-16 lg:grid-cols-4"
          >
            {displayBenefits.map((benefit, index) => (
              <div
                key={benefit.title || index}
                className={cn(
                  'transition-all duration-700 ease-out',
                  gridVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                )}
                style={{ transitionDelay: gridVisible ? `${getDelay(index)}ms` : '0ms' }}
              >
                <BenefitCard benefit={benefit} index={index} />
              </div>
            ))}
          </div>

          {/* ── CTA Box ───────────────────────────────────────── */}
          <div
            ref={ctaRef}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/6 to-white/2 p-6 shadow-2xl backdrop-blur-xl transition-all duration-700 ease-out sm:rounded-3xl sm:p-8 md:p-12 lg:p-16',
              ctaVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            )}
          >
            <div className="from-primary-500/20 via-secondary-500/20 to-primary-500/20 absolute inset-0 bg-linear-to-r opacity-40" />
            <div className="from-primary-500/30 absolute -top-24 -left-24 h-48 w-48 rounded-full bg-linear-to-br to-transparent blur-[80px]" />
            <div className="from-secondary-500/30 absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-linear-to-br to-transparent blur-[80px]" />

            <div className="relative text-center">
              <h3 className="mb-3 text-2xl font-bold text-white sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl">
                {settings?.homepage_join_cta_title ||
                  'Ready to Start Your Journey?'}
              </h3>
              <p className="mx-auto mb-6 max-w-2xl text-sm text-gray-300 sm:mb-8 sm:text-base md:text-lg lg:text-xl">
                {settings?.homepage_join_cta_description ||
                  'Join hundreds of students who are already part of NEUPC and take your programming skills to the next level'}
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <JoinButton
                  href="/join"
                  className="group from-primary-500 via-secondary-500 to-primary-600 hover:shadow-3xl hover:shadow-primary-500/50 focus-visible:ring-primary-500 relative inline-flex items-center gap-3 overflow-hidden rounded-xl bg-linear-to-r px-8 py-4 text-base font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:outline-none active:scale-[0.97] md:px-12 md:py-5 md:text-lg"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">
                    {settings?.homepage_join_cta_button || 'Join NEUPC Now'}
                  </span>
                  <svg
                    className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 md:h-6 md:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </JoinButton>

                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                  iconRight={
                    <svg
                      className="h-5 w-5 md:h-6 md:w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  }
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Join;
