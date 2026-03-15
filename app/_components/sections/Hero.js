/**
 * @file Hero
 * @module Hero
 */

import Link from 'next/link';
import SVG from '../ui/SVG';
import JoinButton from '../ui/JoinButton';
import Button from '../ui/Button';

// ─── Default Content ────────────────────────────────────────────────────────
const DEFAULTS = {
  title: 'Programming Club',
  subtitle: '(NEUPC)',
  department: 'Department of Computer Science and Engineering',
  university: 'Netrokona University, Netrokona, Bangladesh',
};

/**
 * Hero — Full-screen landing section with club name, department info,
 * CTA buttons, and an animated SVG illustration.
 *
 * @param {object} data – Overrides from site settings (hero_title, etc.)
 * @param {object} settings – All public settings map
 */
function Hero({ data = {}, settings = {} }) {
  const {
    title = DEFAULTS.title,
    subtitle = DEFAULTS.subtitle,
    department = DEFAULTS.department,
    university = DEFAULTS.university,
  } = data;

  const welcomeText =
    settings.hero_welcome_text || `Welcome to ${settings.site_name || 'NEUPC'}`;
  const joinLabel = settings.hero_join_label || 'Join Now';
  const learnMoreLabel = settings.hero_learn_more_label || 'Learn More';

  return (
    <section
      aria-label="Hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      {/* Ambient glow behind hero content */}
      <div className="from-primary-500/15 via-secondary-500/10 pointer-events-none absolute top-1/2 left-1/2 h-72 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br to-transparent blur-[120px] sm:h-96 sm:w-md md:h-150 md:w-200" />

      <div className="relative grid w-full max-w-7xl grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-20">
        {/* ── Text Content ────────────────────────────────────────── */}
        <div className="text-center lg:text-left">
          {/* Small label above the title */}
          <div
            className="animate-fade-in mb-6 inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-linear-to-r from-white/[0.06] to-white/[0.02] px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-all duration-500 hover:border-white/[0.14] hover:from-white/[0.09] hover:to-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_28px_rgba(0,0,0,0.25)]"
            style={{ animationDelay: '50ms' }}
          >
            {/* Live indicator dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="bg-primary-400/50 absolute inline-flex h-full w-full animate-ping rounded-full" />
              <span className="bg-primary-400 relative inline-flex h-2 w-2 rounded-full shadow-[0_0_10px_rgba(8,131,149,0.75)]" />
            </span>
            {/* Separator */}
            <span className="h-3.5 w-px shrink-0 bg-white/10" />
            <span className="text-sm font-medium tracking-wide text-gray-300/85 transition-colors duration-300 hover:text-gray-200/95">
              {welcomeText}
            </span>
          </div>

          <h1
            className="animate-slide-up mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl"
            style={{ animationDelay: '150ms' }}
          >
            <span className="bg-linear-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              {title}
            </span>{' '}
            <span className="from-primary-300 via-secondary-300 to-primary-400 bg-linear-to-r bg-clip-text text-transparent">
              {subtitle}
            </span>
          </h1>

          {/* Animated gradient divider */}
          <div
            className="animate-fade-in from-primary-500 via-secondary-400 to-primary-500 mx-auto my-6 h-1 w-20 rounded-full bg-linear-to-r shadow-[0_0_20px_rgba(8,131,149,0.4)] sm:my-8 sm:w-32 lg:mx-0"
            style={{ animationDelay: '400ms' }}
          />

          <div
            className="animate-slide-up space-y-3"
            style={{ animationDelay: '500ms' }}
          >
            <h2 className="text-base font-medium tracking-wide text-gray-200/90 sm:text-lg md:text-xl lg:text-2xl">
              {department}
            </h2>
            <p className="text-sm font-light tracking-wide text-gray-400 sm:text-base md:text-lg lg:text-xl">
              {university}
            </p>
          </div>

          {/* ── CTA Buttons ─────────────────────────────────────── */}
          <div
            className="animate-slide-up mt-8 flex flex-col items-center justify-center gap-3 sm:mt-14 sm:flex-row sm:gap-6 lg:justify-start"
            style={{ animationDelay: '700ms' }}
          >
            <JoinButton
              href="/join"
              label="Join Now"
              className="from-primary-500 to-secondary-500 hover:shadow-primary-500/40 group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-linear-to-r px-8 py-4 text-base font-semibold text-white shadow-[0_8px_32px_rgba(8,131,149,0.3)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(8,131,149,0.5)] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:outline-none active:scale-[0.97] sm:w-auto md:px-10 md:py-4.5 md:text-lg"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">{joinLabel}</span>
              <svg
                className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
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
              href="/about"
              className="w-full sm:w-auto"
            >
              {learnMoreLabel}
            </Button>
          </div>
        </div>

        {/* ── Illustration ────────────────────────────────────────── */}
        <div
          className="animate-scale-in relative hidden items-center justify-center sm:flex"
          style={{ animationDelay: '400ms' }}
          aria-hidden="true"
        >
          {/* Soft glow behind the SVG */}
          <div className="from-primary-500/20 to-secondary-500/20 pointer-events-none absolute inset-0 rounded-full bg-linear-to-br blur-[80px]" />
          <SVG />
        </div>
      </div>
    </section>
  );
}

export default Hero;
