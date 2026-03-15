/**
 * @file MotionFadeIn — Simple fade-in wrapper with configurable direction.
 *
 * @module MotionFadeIn
 */

'use client';

import { motion } from 'framer-motion';
import { fadeUp, fadeDown, fadeLeft, fadeRight, fadeIn, viewportConfig } from './motion';
import { cn } from '@/app/_lib/utils';

const DIRECTION_MAP = {
  up: fadeUp,
  down: fadeDown,
  left: fadeLeft,
  right: fadeRight,
  none: fadeIn,
};

/**
 * MotionFadeIn — Fades in a child element with optional direction.
 *
 * @param {'up'|'down'|'left'|'right'|'none'} [direction='up']
 * @param {number}  [delay=0]
 * @param {string}  [className]
 * @param {boolean} [inView=true]  — Use whileInView (scroll-triggered) vs immediate
 * @param {React.ReactNode} children
 */
export default function MotionFadeIn({
  children,
  direction = 'up',
  delay = 0,
  className,
  inView = true,
  ...rest
}) {
  const variants = DIRECTION_MAP[direction] || fadeUp;

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
    <motion.div
      variants={variants}
      {...animateProps}
      transition={delay ? { delay } : undefined}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
