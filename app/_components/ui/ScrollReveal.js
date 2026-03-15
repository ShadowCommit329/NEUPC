/**
 * @file ScrollReveal — Wrapper component for scroll-triggered animations.
 * Uses IntersectionObserver to detect when content enters viewport.
 *
 * @module ScrollReveal
 */

'use client';

import { useScrollReveal } from '@/app/_lib/hooks';
import { cn } from '@/app/_lib/utils';

// ─── Animation variant classes ──────────────────────────────────────────────
const HIDDEN = {
  'fade-up': 'translate-y-10 opacity-0',
  'fade-down': '-translate-y-10 opacity-0',
  'fade-left': 'translate-x-10 opacity-0',
  'fade-right': '-translate-x-10 opacity-0',
  fade: 'opacity-0',
  'scale-up': 'scale-95 opacity-0',
  'zoom-in': 'scale-90 opacity-0',
};

const VISIBLE = 'translate-y-0 translate-x-0 scale-100 opacity-100';

/**
 * ScrollReveal — Animates children into view when scrolled into the viewport.
 *
 * @param {'fade-up'|'fade-down'|'fade-left'|'fade-right'|'fade'|'scale-up'|'zoom-in'} [animation='fade-up']
 * @param {number}  [delay=0]       – Delay in ms
 * @param {number}  [duration=700]  – Duration in ms
 * @param {number}  [threshold=0.15] – IntersectionObserver threshold
 * @param {string}  [className]     – Extra classes
 * @param {'div'|'section'|'article'|'li'|'span'} [as='div'] – Wrapper element
 * @param {React.ReactNode} children
 */
export default function ScrollReveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  threshold = 0.15,
  className,
  as: Component = 'div',
  ...rest
}) {
  const [ref, isVisible] = useScrollReveal({ threshold });

  return (
    <Component
      ref={ref}
      className={cn(
        'transition-all ease-out',
        isVisible ? VISIBLE : HIDDEN[animation],
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: isVisible ? `${delay}ms` : '0ms',
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

/**
 * RevealGroup — Convenience wrapper that staggers multiple ScrollReveal children.
 * Use as a container and wrap each child in <ScrollReveal delay={index * stagger}>.
 */
export function RevealGroup({ children, className, ...rest }) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}
