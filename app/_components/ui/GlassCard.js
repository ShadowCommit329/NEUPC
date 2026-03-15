/**
 * @file Reusable glass-morphism card wrapper with accent colour.
 * Extracted from AboutClient.js for use across all public pages.
 *
 * @module GlassCard
 */

import { cn } from '@/app/_lib/utils';

/**
 * GlassCard — Glass-morphism card with optional accent colour line.
 *
 * @param {{ children: React.ReactNode, className?: string, accent?: 'primary'|'secondary', showTopLine?: boolean }} props
 */
export default function GlassCard({
  children,
  className,
  accent = 'primary',
  showTopLine = true,
  ...props
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl transition-all duration-500',
        'hover:border-white/15 hover:bg-white/[0.06] hover:shadow-2xl',
        accent === 'primary'
          ? 'hover:shadow-primary-500/6'
          : 'hover:shadow-secondary-500/6',
        className
      )}
      {...props}
    >
      {/* Top accent highlight line */}
      {showTopLine && (
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-px bg-linear-to-r to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100',
            accent === 'primary'
              ? 'from-primary-500/50 via-primary-400/20'
              : 'from-secondary-500/50 via-secondary-400/20'
          )}
        />
      )}
      {children}
    </div>
  );
}
