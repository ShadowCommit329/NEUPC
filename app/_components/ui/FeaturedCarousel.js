'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../_lib/utils';

/**
 * Horizontal snap carousel for full-width featured banners.
 * - Native scroll-snap for momentum/touch on mobile
 * - Prev/Next buttons (hidden when only one slide)
 * - Dot indicators
 * - Keyboard left/right when focused
 */
export default function FeaturedCarousel({
  items,
  renderItem,
  getKey,
  ariaLabel = 'Featured',
  autoPlay = true,
  interval = 5000,
}) {
  const trackRef = useRef(null);
  const rootRef = useRef(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  const scrollToIndex = useCallback((idx) => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[idx];
    if (!child) return;
    track.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
  }, []);

  const next = useCallback(() => scrollToIndex(Math.min(active + 1, count - 1)), [active, count, scrollToIndex]);
  const prev = useCallback(() => scrollToIndex(Math.max(active - 1, 0)), [active, scrollToIndex]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = track.scrollLeft + track.clientWidth / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < track.children.length; i++) {
          const c = track.children[i];
          const ccenter = c.offsetLeft + c.clientWidth / 2;
          const d = Math.abs(ccenter - center);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        setActive(bestIdx);
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!autoPlay || count < 2 || paused) return;
    const id = setInterval(() => {
      const nextIdx = (active + 1) % count;
      scrollToIndex(nextIdx);
    }, interval);
    return () => clearInterval(id);
  }, [autoPlay, count, paused, active, interval, scrollToIndex]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  };

  if (count === 0) return null;

  return (
    <div
      ref={rootRef}
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div
            key={getKey ? getKey(item, i) : i}
            className="w-full shrink-0 snap-center px-px"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            disabled={active === 0}
            aria-label="Previous slide"
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition',
              'hover:border-neon-lime/40 hover:text-neon-lime disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white',
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            disabled={active === count - 1}
            aria-label="Next slide"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition',
              'hover:border-neon-lime/40 hover:text-neon-lime disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white',
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="mt-5 flex items-center justify-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === active ? 'w-6 bg-neon-lime' : 'w-1.5 bg-white/20 hover:bg-white/40',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
