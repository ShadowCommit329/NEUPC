/**
 * @file hooks
 * @module hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDelayedLoad — Triggers a smooth entrance animation after mount.
 * @param {number} delay – Milliseconds to wait (default 100)
 * @returns {boolean} isLoaded
 */
export function useDelayedLoad(delay = 100) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return isLoaded;
}

/**
 * useScrollReveal — IntersectionObserver-based scroll reveal.
 * Returns a ref to attach to the element and a boolean for visibility.
 * Once visible, it stays visible (fires once).
 *
 * Uses a lower threshold and tighter margin by default so sections
 * trigger reliably even on short mobile viewports.
 *
 * @param {object}  [options]
 * @param {number}  [options.threshold=0.05]  – Visibility threshold (0–1)
 * @param {string}  [options.rootMargin='0px 0px -40px 0px'] – Observer root margin
 * @returns {[React.RefObject, boolean]}
 */
export function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Fallback: if IntersectionObserver is not supported, show immediately
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: options.threshold ?? 0.05,
        rootMargin: options.rootMargin ?? '0px 0px -40px 0px',
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return [ref, isVisible];
}

/**
 * useStaggerReveal — Scroll reveal with stagger support for lists/grids.
 * Returns ref, isVisible, and a function to get per-item delay.
 *
 * @param {object}  [options]
 * @param {number}  [options.staggerMs=100] – Delay between each item
 * @param {number}  [options.threshold=0.1]
 * @returns {{ ref: React.RefObject, isVisible: boolean, getDelay: (index: number) => number }}
 */
export function useStaggerReveal(options = {}) {
  const staggerMs = options.staggerMs ?? 100;
  const [ref, isVisible] = useScrollReveal({
    threshold: options.threshold ?? 0.1,
    rootMargin: options.rootMargin,
  });

  const getDelay = useCallback((index) => index * staggerMs, [staggerMs]);

  return { ref, isVisible, getDelay };
}

/**
 * useScrollLock — Locks page scroll on <html> and <body> while a modal /
 * panel is open.  Restores the previous overflow values on cleanup so that
 * nested modals or other in-flight style overrides are handled gracefully.
 *
 * @param {boolean} [enabled=true] – Pass `false` to skip locking (useful when
 *   the same hook call is conditioned on a state variable, e.g. a confirm modal
 *   with an early `if (!open) return null`).
 */
export function useScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [enabled]);
}
