/**
 * @file useReducedMotion — Custom hook for `prefers-reduced-motion` media query.
 * SSR-safe: defaults to `false` on server so animations render on first paint,
 * then hydrates to the user's actual preference.
 *
 * @module useReducedMotion
 */

'use client';

import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * useReducedMotion — Returns `true` if the user prefers reduced motion.
 * @returns {boolean}
 */
export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setPrefersReduced(mql.matches);

    const handler = (e) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
