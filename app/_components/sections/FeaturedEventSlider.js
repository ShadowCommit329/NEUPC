/**
 * @file FeaturedEventSlider — Auto‑sliding hero carousel for featured events.
 * @module FeaturedEventSlider
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn, formatDate, driveImageUrl } from '@/app/_lib/utils';
import SafeImg from '../ui/SafeImg';

const STATUS_STYLES = {
  upcoming: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    label: 'Upcoming',
  },
  ongoing: { dot: 'bg-amber-400', text: 'text-amber-300', label: 'Ongoing' },
  completed: {
    dot: 'bg-slate-400',
    text: 'text-slate-400',
    label: 'Completed',
  },
};

const CATEGORY_ICON = {
  Bootcamp: '📚',
  Contest: '🏆',
  Workshop: '🔧',
  Seminar: '🎤',
  Hackathon: '💻',
  Meetup: '🤝',
  Other: '📅',
};

export default function FeaturedEventSlider({ events = [] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = events.length;

  const next = useCallback(() => setCurrent((i) => (i + 1) % count), [count]);
  const prev = useCallback(
    () => setCurrent((i) => (i - 1 + count) % count),
    [count]
  );

  // Auto-advance every 6 seconds
  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [count, paused, next]);

  if (count === 0) return null;
  const event = events[current];
  const status = STATUS_STYLES[event.status] || STATUS_STYLES.upcoming;
  const emoji = CATEGORY_ICON[event.category] || '📅';
  const eventLink = `/events/${event.slug || event.id}`;
  const hasImage = !!(event.cover_image || event.banner_image);

  return (
    <div
      className="group/slider relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background glow */}
      <div className="from-primary-500/8 via-secondary-500/5 pointer-events-none absolute inset-0 bg-linear-to-br to-transparent" />

      <div className="relative flex flex-col lg:flex-row">
        {/* ── Image Side ──────────────────────────────────────────────── */}
        <div className="relative h-56 w-full overflow-hidden sm:h-64 lg:h-auto lg:w-1/2">
          {hasImage ? (
            <SafeImg
              src={driveImageUrl(event.banner_image || event.cover_image)}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/slider:scale-105"
            />
          ) : (
            <div className="from-primary-900/60 via-secondary-900/40 flex h-full w-full items-center justify-center bg-linear-to-br to-slate-900/60">
              <span className="text-7xl opacity-40">{emoji}</span>
            </div>
          )}
          {/* gradient overlays */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent lg:bg-linear-to-r lg:from-transparent lg:via-slate-950/30 lg:to-slate-950/90" />

          {/* Category badge on image */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md sm:top-5 sm:left-5">
            <span className="text-sm">{emoji}</span>
            {event.category || 'Event'}
          </div>

          {/* Mobile title overlay */}
          <div className="absolute right-4 bottom-4 left-4 lg:hidden">
            <h3 className="text-lg leading-tight font-bold text-white drop-shadow-lg sm:text-xl">
              {event.title}
            </h3>
          </div>
        </div>

        {/* ── Content Side ────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col justify-center p-5 sm:p-7 lg:p-10">
          {/* Featured + status badges */}
          <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                  clipRule="evenodd"
                />
              </svg>
              Featured
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium',
                status.text
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>
          </div>

          {/* Title (desktop) */}
          <h3 className="from-primary-200 to-secondary-200 mb-3 hidden bg-linear-to-r via-white bg-clip-text text-2xl leading-tight font-bold text-transparent lg:block xl:text-3xl">
            {event.title}
          </h3>

          {/* Description */}
          <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-gray-400 sm:text-base">
            {event.description || 'Join us for this exciting event!'}
          </p>

          {/* Meta info */}
          <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-400">
            {/* Date */}
            <div className="flex items-center gap-2">
              <svg
                className="text-primary-400 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-primary-300 font-medium">
                {formatDate(event.start_date)}
              </span>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-2">
                <svg
                  className="text-secondary-400 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* Participants */}
            {event.max_participants && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span>{event.max_participants}+ Participants</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <Link
            href={eventLink}
            className="from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 hover:shadow-primary-500/40 group/btn inline-flex w-fit items-center gap-2 rounded-xl bg-linear-to-r px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.03]"
          >
            View Event Details
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Slider Controls ─────────────────────────────────────────── */}
      {count > 1 && (
        <>
          {/* Arrows */}
          <button
            onClick={prev}
            aria-label="Previous featured event"
            className="absolute top-1/2 left-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md transition-all hover:bg-black/70 hover:text-white sm:left-4 sm:h-10 sm:w-10"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next featured event"
            className="absolute top-1/2 right-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md transition-all hover:bg-black/70 hover:text-white sm:right-4 sm:h-10 sm:w-10"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Dots + progress */}
          <div className="absolute right-0 bottom-0 left-0 flex items-center justify-center gap-2 pb-4 lg:pb-5">
            {events.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to featured event ${i + 1}`}
                className={cn(
                  'h-2 rounded-full transition-all duration-400',
                  i === current
                    ? 'bg-primary-400 w-8'
                    : 'w-2 bg-white/25 hover:bg-white/50'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
