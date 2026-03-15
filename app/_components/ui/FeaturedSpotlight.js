/**
 * @file Generic featured-item carousel/spotlight.
 * Replaces duplicate FeaturedSpotlight in BlogsClient, EventsClient,
 * RoadmapsClient, and FeaturedAchievementsCarousel in AchievementsClient.
 *
 * @module FeaturedSpotlight
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/app/_lib/utils';
import SafeImg from './SafeImg';
import { driveImageUrl } from '@/app/_lib/utils';

// ─── SVG icons ────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 8l4 4m0 0l-4 4m4-4H3"
      />
    </svg>
  );
}

// ─── FeaturedSpotlight ────────────────────────────────────────────────────────

/**
 * FeaturedSpotlight — Generic featured-item carousel.
 *
 * @param {Object} props
 * @param {Array}  props.items - Array of featured items
 * @param {(item: Object) => string|null} props.getImage - Returns image URL
 * @param {(item: Object) => string} props.getTitle - Returns title
 * @param {(item: Object) => string|null} [props.getDescription] - Returns description
 * @param {(item: Object) => string} props.getHref - Returns link href
 * @param {(item: Object) => React.ReactNode} [props.renderBadges] - Render badge chips
 * @param {(item: Object) => React.ReactNode} [props.renderMeta] - Render meta info (date, location, etc.)
 * @param {string} [props.ctaLabel='View Details'] - CTA button text
 * @param {string} [props.sectionTitle='Featured'] - Above-spotlight heading
 * @param {number} [props.interval=6000] - Auto-advance interval (ms)
 */
export default function FeaturedSpotlight({
  items = [],
  getImage,
  getTitle,
  getDescription,
  getHref,
  renderBadges,
  renderMeta,
  ctaLabel = 'View Details',
  sectionTitle = 'Featured',
  interval = 6000,
}) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = setInterval(() => setCurrent((i) => (i + 1) % count), interval);
    return () => clearInterval(timer);
  }, [count, paused, interval]);

  if (count === 0) return null;

  const item = items[current];
  const image = getImage(item);
  const title = getTitle(item);
  const description = getDescription?.(item);
  const href = getHref(item);

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            {sectionTitle}
          </h2>
          <p className="text-xs text-gray-500 sm:text-sm">
            Auto-slides every {interval / 1000} seconds with manual controls
          </p>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
          {count} featured
        </span>
      </div>

      {/* Carousel card */}
      <div
        className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/4 shadow-2xl backdrop-blur-sm transition-all duration-500 hover:border-white/20"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-secondary-600/8 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row">
          {/* Thumbnail */}
          {image && (
            <div className="relative h-72 shrink-0 overflow-hidden bg-black/25 sm:h-80 lg:h-auto lg:w-[46%] xl:w-1/2">
              <SafeImg
                src={driveImageUrl(image)}
                alt={title}
                className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 hidden bg-linear-to-r from-transparent to-[#0a0d14]/60 lg:block" />
              <div className="absolute inset-0 bg-linear-to-t from-[#0a0d14]/55 to-transparent lg:hidden" />
            </div>
          )}

          {/* Content */}
          <div className="flex flex-1 flex-col justify-center gap-4 p-7 sm:p-9 lg:p-10">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                ✨ Featured
              </span>
              {renderBadges?.(item)}
            </div>

            <h2 className="text-2xl leading-tight font-bold text-white sm:text-3xl xl:text-4xl">
              {title}
            </h2>

            {description && (
              <p className="line-clamp-2 text-sm leading-relaxed text-gray-400 sm:text-base">
                {description}
              </p>
            )}

            {/* Meta info */}
            {renderMeta && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {renderMeta(item)}
              </div>
            )}

            {/* CTA + counter */}
            <div className="flex items-center gap-4">
              <a
                href={href}
                className="bg-primary-500 hover:bg-primary-400 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/30 transition-all hover:-translate-y-0.5 hover:shadow-primary-900/50 active:translate-y-0"
              >
                {ctaLabel}
                <ArrowRightIcon />
              </a>
              {count > 1 && (
                <span className="text-xs text-gray-500 tabular-nums">
                  {current + 1} / {count}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Slider controls */}
        {count > 1 && (
          <>
            <button
              onClick={() => setCurrent((i) => (i - 1 + count) % count)}
              className="absolute top-1/2 left-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-sm transition-all hover:bg-black/70 hover:text-white"
              aria-label="Previous"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={() => setCurrent((i) => (i + 1) % count)}
              className="absolute top-1/2 right-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-sm transition-all hover:bg-black/70 hover:text-white"
              aria-label="Next"
            >
              <ChevronRightIcon />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === current
                      ? 'bg-primary-400 w-6'
                      : 'w-1.5 bg-white/25 hover:bg-white/50'
                  )}
                  aria-label={`Go to item ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
