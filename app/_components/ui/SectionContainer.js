/**
 * @file SectionContainer — Standardized section wrapper for consistent
 * vertical spacing, horizontal padding, and max-width across all pages.
 *
 * Replaces ad-hoc `<section className="mx-auto max-w-7xl px-4 ...">` patterns
 * with a single, configurable component.
 *
 * @module SectionContainer
 */

import { cn } from '@/app/_lib/utils';

/** Vertical padding presets */
const SIZE_MAP = {
  sm: 'py-10 md:py-14',
  md: 'py-14 md:py-20',
  lg: 'py-20 md:py-28',
};

/** Max-width presets */
const WIDTH_MAP = {
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

/**
 * SectionContainer — Unified section layout wrapper.
 *
 * @param {'sm'|'md'|'lg'} [size='md']       — Vertical spacing preset
 * @param {'3xl'|'4xl'|'5xl'|'6xl'|'7xl'|'full'} [maxWidth='7xl'] — Max content width
 * @param {string}  [className]  — Additional classes
 * @param {'section'|'div'|'article'} [as='section'] — HTML element
 * @param {React.ReactNode} children
 */
export default function SectionContainer({
  children,
  size = 'md',
  maxWidth = '7xl',
  className,
  as: Component = 'section',
  ...props
}) {
  return (
    <Component
      className={cn(
        'relative',
        SIZE_MAP[size] || SIZE_MAP.md,
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'mx-auto px-4 sm:px-6 lg:px-8',
          WIDTH_MAP[maxWidth] || WIDTH_MAP['7xl']
        )}
      >
        {children}
      </div>
    </Component>
  );
}
