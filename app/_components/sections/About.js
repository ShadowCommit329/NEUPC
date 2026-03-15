/**
 * @file About
 * @module About
 */

'use client';

import Image from 'next/image';
import { cn } from '@/app/_lib/utils';
import { useScrollReveal } from '@/app/_lib/hooks';
import Button from '../ui/Button';
import SectionBackground from '../ui/SectionBackground';
import SectionHeader from '../ui/SectionHeader';

// ─── Default Content ────────────────────────────────────────────────────────

const DEFAULTS = {
  title: 'Who We Are',
  description1:
    'The Programming Club (NEUPC) of Netrokona University is an academic and skill-development organization under the Department of Computer Science and Engineering. Established with the goal of strengthening programming culture within the university, the club provides a structured environment for students to develop problem-solving skills, algorithmic thinking, and practical technical expertise.',
  description2:
    'The club serves as a platform where students can explore competitive programming, software development, research discussions, and emerging technologies beyond the academic syllabus.',
};

const HIGHLIGHT_TERM = 'Programming Club (NEUPC)';

function highlightClubName(text) {
  if (!text?.includes(HIGHLIGHT_TERM)) return text;
  const idx = text.indexOf(HIGHLIGHT_TERM);
  return (
    <>
      {text.slice(0, idx)}
      <strong className="text-primary-300">{HIGHLIGHT_TERM}</strong>
      {text.slice(idx + HIGHLIGHT_TERM.length)}
    </>
  );
}

/**
 * About — Introduction card with club description, logo, and scroll animations.
 *
 * @param {'dark'|'light'} variant – Visual variant
 * @param {object}         data    – Content overrides from site settings
 * @param {object}         settings – All public settings map
 */
function About({ variant = 'dark', data = {}, settings = {} }) {
  const isDark = variant === 'dark';
  const [cardRef, cardVisible] = useScrollReveal({ threshold: 0.08 });

  const {
    title = DEFAULTS.title,
    description1 = DEFAULTS.description1,
    description2 = DEFAULTS.description2,
  } = data;

  return (
    <section className="relative overflow-hidden py-16 sm:py-20 md:py-28">
      <SectionBackground />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header — rendered only on homepage (dark) variant */}
        {isDark && (
          <SectionHeader
            badgeIcon="🎓"
            badge={settings?.homepage_about_badge || 'Who We Are'}
            title={settings?.homepage_about_title || 'About NEUPC'}
            subtitle={
              settings?.homepage_about_subtitle ||
              'Building a Strong Programming Community at Netrokona University'
            }
            lineClassName="to-primary-500/40"
            titleClassName="from-white via-gray-100 to-gray-300"
          />
        )}

        <div className="mx-auto max-w-7xl">
          {/* ── Introduction Card ────────────────────────────────────── */}
          <div
            ref={cardRef}
            className={cn(
              'group/card relative grid gap-8 overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-5 shadow-2xl backdrop-blur-xl transition-all duration-700 ease-out sm:rounded-3xl sm:p-8 md:gap-10 md:p-12 lg:grid-cols-2 lg:items-center lg:p-14',
              cardVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0'
            )}
          >
            {/* Subtle top accent border */}
            <div className="from-primary-500/60 via-secondary-500/40 to-primary-500/60 absolute top-0 right-0 left-0 h-px bg-linear-to-r" />

            {/* Hover glow */}
            <div className="from-primary-500/5 to-secondary-500/5 pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-br opacity-0 transition-opacity duration-700 group-hover/card:opacity-100" />

            {/* ── Content ─────────────────────────────────────────────── */}
            <div
              className={cn(
                'relative transition-all duration-700 ease-out',
                cardVisible
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-8 opacity-0'
              )}
              style={{ transitionDelay: cardVisible ? '180ms' : '0ms' }}
            >
              <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
                <div className="from-primary-500/20 to-secondary-500/20 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-linear-to-br shadow-lg backdrop-blur-sm sm:h-14 sm:w-14 sm:rounded-2xl">
                  <span className="text-2xl sm:text-3xl">🌐</span>
                </div>
                <div>
                  <h3 className="bg-linear-to-r from-white to-gray-200 bg-clip-text text-xl font-bold text-transparent sm:text-2xl md:text-3xl">
                    {title}
                  </h3>
                  <div className="from-primary-500 to-secondary-500 mt-1.5 h-0.5 w-16 rounded-full bg-linear-to-r" />
                </div>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-gray-300 sm:mb-6 sm:text-base md:text-lg">
                {highlightClubName(description1)}
              </p>

              <p className="mb-4 text-sm leading-relaxed text-gray-400 sm:mb-6 sm:text-base md:text-lg">
                {description2}
              </p>

              {isDark && (
                <div className="mt-6 sm:mt-10">
                  <Button
                    variant="gradient"
                    size="md"
                    href="/about"
                    iconRight={
                      <svg
                        className="h-4 w-4 md:h-5 md:w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    }
                  >
                    {settings?.homepage_about_cta || 'Learn More About Us'}
                  </Button>
                </div>
              )}
            </div>

            {/* ── Logo ────────────────────────────────────────────────── */}
            <div
              className={cn(
                'flex items-center justify-center transition-all duration-700 ease-out',
                cardVisible
                  ? 'translate-x-0 scale-100 opacity-100'
                  : 'translate-x-8 scale-95 opacity-0'
              )}
              style={{ transitionDelay: cardVisible ? '380ms' : '0ms' }}
            >
              <div className="relative aspect-square w-full max-w-xs sm:max-w-sm md:max-w-md">
                <div className="from-primary-500/15 to-secondary-500/15 absolute inset-4 rounded-full bg-linear-to-br blur-[60px]" />
                <Image
                  src="/logo.png"
                  alt={
                    settings?.site_name
                      ? `${settings.site_name} Logo`
                      : 'NEUPC Logo'
                  }
                  width={500}
                  height={500}
                  className="relative z-10 drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
