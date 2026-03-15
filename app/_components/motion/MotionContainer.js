/**
 * @file MotionContainer — Combines layout container with scroll-triggered animation.
 * Use instead of raw `<motion.div variants={staggerContainer(...)}>` + manual setup.
 *
 * @module MotionContainer
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { staggerContainer, viewportConfig } from './motion';
import { cn } from '@/app/_lib/utils';

/**
 * MotionContainer — Animated stagger container with layout.
 *
 * @param {number}  [stagger=0.08]  — Delay between children
 * @param {number}  [delay=0]       — Initial delay
 * @param {string}  [className]
 * @param {boolean} [inView=true]   — Scroll-triggered vs immediate
 * @param {string}  [as='div']      — HTML element tag
 * @param {React.ReactNode} children
 */
export default function MotionContainer({
  children,
  stagger = 0.08,
  delay = 0,
  className,
  inView = true,
  as = 'div',
  ...rest
}) {
  const prefersReduced = useReducedMotion();
  const effectiveStagger = prefersReduced ? 0 : stagger;

  const Component = motion.create(as);

  const animateProps = inView
    ? {
        initial: 'hidden',
        whileInView: 'visible',
        viewport: viewportConfig,
      }
    : {
        initial: 'hidden',
        animate: 'visible',
      };

  return (
    <Component
      variants={staggerContainer(effectiveStagger, delay)}
      {...animateProps}
      className={cn(className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
