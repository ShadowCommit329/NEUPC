/**
 * @file ResponsiveGrid — Standardized responsive grid layout component.
 * Replaces ad-hoc `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` patterns.
 *
 * @module ResponsiveGrid
 */

import { cn } from '@/app/_lib/utils';

/** Column layout presets using Tailwind responsive breakpoints */
const COLS_MAP = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  '2-3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  '2-4': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};

/** Gap presets */
const GAP_MAP = {
  sm: 'gap-3 sm:gap-4',
  md: 'gap-4 sm:gap-5 md:gap-6',
  lg: 'gap-5 sm:gap-6 md:gap-8',
};

/**
 * ResponsiveGrid — Responsive CSS grid with standardized breakpoints.
 *
 * @param {'1'|'2'|'3'|'4'|'2-3'|'2-4'} [cols='3'] — Column preset
 * @param {'sm'|'md'|'lg'} [gap='md']               — Gap preset
 * @param {string}  [className]  — Additional classes
 * @param {React.ReactNode} children
 */
export default function ResponsiveGrid({
  children,
  cols = '3',
  gap = 'md',
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        'grid',
        COLS_MAP[cols] || COLS_MAP['3'],
        GAP_MAP[gap] || GAP_MAP.md,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
