/**
 * @file Section Background
 * @module SectionBackground
 */

import { cn } from '@/app/_lib/utils';

/**
 * SectionBackground — Decorative background layer with gradient overlays
 * and animated blur orbs. Used as the first child inside each `<section>`.
 *
 * @param {string} [variant='default'] – Color variant: 'default' | 'warm' | 'accent'
 * @param {boolean} [animated=false]   – Enable pulse animation on orbs
 * @param {string} [className]        – Additional wrapper classes
 */
export default function SectionBackground({
  variant = 'default',
  animated = false,
  className,
}) {
  const orbs = {
    default: {
      topLeft:
        'from-primary-500/10 to-secondary-500/10 -top-24 -left-24 sm:-top-48 sm:-left-48',
      bottomRight:
        'from-secondary-500/10 to-primary-500/10 -right-24 -bottom-24 sm:-right-48 sm:-bottom-48',
      overlay: 'from-primary-500/5 via-secondary-500/5 to-primary-500/5',
    },
    warm: {
      topLeft:
        'from-yellow-500/10 to-primary-500/10 -top-24 -left-24 sm:-top-48 sm:-left-48',
      bottomRight:
        'from-secondary-500/10 to-yellow-500/10 -right-24 -bottom-24 sm:-right-48 sm:-bottom-48',
      overlay: 'from-primary-500/5 via-secondary-500/5 to-primary-500/5',
    },
    accent: {
      topLeft:
        'from-primary-500/15 to-secondary-500/15 -top-24 -left-24 sm:-top-48 sm:-left-48',
      bottomRight:
        'from-secondary-500/15 to-primary-500/15 -right-24 -bottom-24 sm:-right-48 sm:-bottom-48',
      overlay: 'from-primary-500/5 via-secondary-500/5 to-primary-500/5',
    },
  };

  const config = orbs[variant] || orbs.default;

  return (
    <div className={cn('pointer-events-none absolute inset-0', className)}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-black/30 to-transparent" />
      <div
        className={cn(
          'absolute inset-0 bg-linear-to-br opacity-20',
          config.overlay
        )}
      />

      {/* Decorative blur orbs — softer and larger */}
      <div
        className={cn(
          'absolute h-64 w-64 rounded-full bg-linear-to-br blur-[100px] sm:h-96 sm:w-96 md:h-125 md:w-125',
          config.topLeft,
          animated && 'animate-pulse'
        )}
      />
      <div
        className={cn(
          'absolute h-64 w-64 rounded-full bg-linear-to-br blur-[100px] sm:h-96 sm:w-96 md:h-125 md:w-125',
          config.bottomRight,
          animated && 'animation-delay-2000 animate-pulse'
        )}
      />
    </div>
  );
}
