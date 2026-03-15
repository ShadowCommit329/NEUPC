/**
 * @file PageTransition — Client wrapper for animated route transitions.
 * Uses AnimatePresence + motion.div keyed by pathname.
 * Supports `prefers-reduced-motion` — uses instant transition with no Y movement.
 *
 * @module PageTransition
 */

'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { pageTransition } from './motion';

/** Reduced-motion page transition — opacity only, no Y translate. */
const reducedPageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' } },
};

/**
 * PageTransition — Wraps children in an AnimatePresence for smooth
 * fade/slide transitions when navigating between routes.
 *
 * Place this inside the root layout, wrapping {children}.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  const transition = prefersReduced ? reducedPageTransition : pageTransition;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={transition.initial}
        animate={transition.animate}
        exit={transition.exit}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
