/**
 * @file MotionCard — Animated card wrapper with entry, hover, and tap effects.
 * Supports `prefers-reduced-motion` — disables hover/tap transforms.
 *
 * @module MotionCard
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, fadeIn, cardHover, reducedCardHover, buttonTap, viewportConfig } from './motion';
import { cn } from '@/app/_lib/utils';

/**
 * MotionCard — Wraps a card element with scroll-reveal entry,
 * hover lift/scale, and tap press-down.
 *
 * @param {Object}  [variants]        — Custom entry variant (default: fadeUp)
 * @param {Object}  [hover]           — Custom hover animation (default: cardHover)
 * @param {boolean} [tapEffect=true]  — Enable tap-down effect
 * @param {string}  [className]
 * @param {boolean} [inView=true]     — Use whileInView
 * @param {React.ReactNode} children
 */
export default function MotionCard({
  children,
  variants: customVariants,
  hover,
  tapEffect = true,
  className,
  inView = true,
  ...rest
}) {
  const prefersReduced = useReducedMotion();

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

  // Use reduced variants when user prefers reduced motion
  const entryVariant = prefersReduced
    ? fadeIn
    : (customVariants || fadeUp);

  const hoverEffect = prefersReduced
    ? reducedCardHover
    : (hover || cardHover);

  return (
    <motion.div
      variants={entryVariant}
      {...animateProps}
      whileHover={hoverEffect}
      whileTap={tapEffect && !prefersReduced ? buttonTap : undefined}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
