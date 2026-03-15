/**
 * @file MotionSection — Scroll-triggered section wrapper.
 * Replaces the useScrollReveal + CSS transition pattern with Framer Motion.
 * Supports `prefers-reduced-motion` — falls back to opacity-only fade.
 *
 * @module MotionSection
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, fadeIn, viewportConfig } from './motion';
import { cn } from '@/app/_lib/utils';

/**
 * MotionSection — Animates a section when it scrolls into view.
 *
 * @param {'fadeUp'|'fadeIn'|'fadeLeft'|'fadeRight'|'scaleIn'} [variant='fadeUp']
 * @param {number}  [delay=0]      — Extra delay in seconds
 * @param {string}  [className]
 * @param {string}  [as='section'] — HTML element tag
 * @param {Object}  [viewport]     — Custom viewport config override
 * @param {React.ReactNode} children
 */
export default function MotionSection({
  children,
  variant,
  delay = 0,
  className,
  as = 'section',
  viewport,
  ...rest
}) {
  const prefersReduced = useReducedMotion();

  // When reduced motion is preferred, use opacity-only fade
  const variants = prefersReduced ? fadeIn : (variant || fadeUp);

  const Component = motion.create(as);

  return (
    <Component
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport || viewportConfig}
      transition={delay ? { delay } : undefined}
      className={cn(className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
