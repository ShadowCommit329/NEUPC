/**
 * @file PageTransition — Client wrapper for animated route transitions.
 * Uses AnimatePresence + motion.div keyed by pathname.
 *
 * @module PageTransition
 */

'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { pageTransition } from './motion';

/**
 * PageTransition — Wraps children in an AnimatePresence for smooth
 * fade/slide transitions when navigating between routes.
 *
 * Place this inside the root layout, wrapping {children}.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
