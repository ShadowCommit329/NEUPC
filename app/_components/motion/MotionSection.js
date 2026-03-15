/**
 * @file MotionSection — Scroll-triggered section wrapper.
 * Replaces the useScrollReveal + CSS transition pattern with Framer Motion.
 *
 * @module MotionSection
 */

'use client';

import { motion } from 'framer-motion';
import { fadeUp, viewportConfig } from './motion';
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
  // Allow passing a full variant object or default to fadeUp
  const variants = variant || fadeUp;

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
