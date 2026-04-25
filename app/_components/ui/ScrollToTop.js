/**
 * @file Scroll To Top
 * @module ScrollToTop
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Smooth-scroll to top with cross-browser fallback.
 * Uses native smooth scroll where supported; falls back to
 * requestAnimationFrame-based easing for older mobile browsers.
 */
function smoothScrollToTop() {
  // Native smooth scroll — works in modern browsers
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Fallback for iOS Safari < 15.4, older Android WebView, etc.
  const start = window.pageYOffset || document.documentElement.scrollTop;
  const duration = 500;
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    window.scrollTo(0, start * (1 - ease));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/**
 * ScrollToTop — Floating button that appears after scrolling down.
 * Drop into any client page — fully self-contained.
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Check initial position (e.g. page-reload mid-page)
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = useCallback(() => smoothScrollToTop(), []);

  if (!visible) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed right-6 bottom-6 z-50 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-neon-lime/30 bg-[#05060B]/80 text-neon-lime shadow-[0_0_24px_rgba(182,243,107,0.25)] backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:border-neon-lime hover:shadow-[0_0_40px_rgba(182,243,107,0.5)]"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
