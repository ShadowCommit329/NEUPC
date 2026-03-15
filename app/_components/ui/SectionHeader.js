/**
 * @file Section Header
 * @module SectionHeader
 */

'use client';

import { cn } from '@/app/_lib/utils';
import { useScrollReveal } from '@/app/_lib/hooks';

/**
 * SectionHeader — Eyebrow flanking-lines style header used across all public
 * section interfaces.
 *
 * @param {string}  badge          – ALL-CAPS eyebrow label (e.g. "Upcoming Events")
 * @param {string}  [badgeIcon]    – Kept for API compat; not rendered in eyebrow
 * @param {string}  title          – Main heading text
 * @param {string}  [subtitle]     – Optional paragraph below the title
 * @param {string}  [lineClassName]  – Tailwind `to-*` colour for the eyebrow lines
 *                                    (defaults to `to-white/20`)
 * @param {string}  [titleClassName] – Override gradient classes on the h2
 * @param {string}  [className]    – Additional wrapper classes
 */
export default function SectionHeader({
  badge,
  badgeIcon, // eslint-disable-line no-unused-vars
  title,
  subtitle,
  lineClassName,
  titleClassName,
  // legacy props — silently ignored so old callers don't break
  badgeClassName, // eslint-disable-line no-unused-vars
  dividerClassName, // eslint-disable-line no-unused-vars
  className,
}) {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.05 });

  return (
    <div
      ref={ref}
      className={cn('mb-10 text-center sm:mb-12 md:mb-16 lg:mb-20', className)}
    >
      {/* Eyebrow — flanking hairlines + tracking label */}
      {badge && (
        <div
          className={cn(
            'mb-5 flex items-center justify-center gap-4 transition-all duration-700',
            isVisible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
          )}
        >
          <div
            className={cn(
              'h-px w-16 bg-linear-to-r from-transparent',
              lineClassName ?? 'to-white/20'
            )}
          />
          <span className="text-[11px] font-bold tracking-[0.35em] text-gray-500 uppercase">
            {badge}
          </span>
          <div
            className={cn(
              'h-px w-16 bg-linear-to-l from-transparent',
              lineClassName ?? 'to-white/20'
            )}
          />
        </div>
      )}

      {/* Title */}
      <h2
        className={cn(
          'mb-4 bg-linear-to-r bg-clip-text text-4xl font-bold text-transparent transition-all duration-700 md:text-5xl',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          titleClassName ?? 'from-white via-gray-100 to-gray-300'
        )}
        style={{ transitionDelay: isVisible ? '120ms' : '0ms' }}
      >
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={cn(
            'mx-auto max-w-xl text-sm leading-relaxed text-gray-500 transition-all duration-700 sm:text-base',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          )}
          style={{ transitionDelay: isVisible ? '220ms' : '0ms' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
