/**
 * @file MotionStagger — Container that staggers its children's animations.
 * Wrap any list or grid of items for a cascading entrance effect.
 *
 * @module MotionStagger
 */

'use client';

import { motion } from 'framer-motion';
import { staggerContainer, viewportConfig } from './motion';
import { cn } from '@/app/_lib/utils';

/**
 * MotionStagger — Stagger container for child animations.
 *
 * @param {number}  [stagger=0.08]  — Delay between each child
 * @param {number}  [delay=0]       — Initial delay before stagger starts
 * @param {string}  [className]
 * @param {boolean} [inView=true]   — Scroll-triggered vs immediate
 * @param {React.ReactNode} children
 */
export default function MotionStagger({
  children,
  stagger = 0.08,
  delay = 0,
  className,
  inView = true,
  ...rest
}) {
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
      variants={staggerContainer(stagger, delay)}
      {...animateProps}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
