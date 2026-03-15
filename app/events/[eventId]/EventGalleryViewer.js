'use client';

import { useState, useEffect, useCallback } from 'react';
import SafeImg from '@/app/_components/ui/SafeImg';
import { driveImageUrl } from '@/app/_lib/utils';

/* ──────────────────────────────────────────────────────── */
/*  EventGalleryViewer                                      */
/*  Interactive mosaic grid + full-screen lightbox           */
/* ──────────────────────────────────────────────────────── */

export default function EventGalleryViewer({ items, eventTitle }) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const isOpen = lightboxIndex >= 0;

  /* ── Lightbox helpers ── */
  const open = (i) => setLightboxIndex(i);
  const close = () => setLightboxIndex(-1);
  const next = useCallback(
    () => setLightboxIndex((p) => (p + 1) % items.length),
    [items.length]
  );
  const prev = useCallback(
    () => setLightboxIndex((p) => (p - 1 + items.length) % items.length),
    [items.length]
  );

  /* keyboard + body-lock */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handler);
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, next, prev]);

  /* ── Grid layout helper ── */
  const getSpan = (index, total) => {
    if (index === 0 && total > 1) return 'col-span-2 row-span-2'; // hero
    if (total >= 6 && index === 3) return 'col-span-2'; // wide accent
    return '';
  };

  return (
    <>
      {/* ── Mosaic Grid — all photos visible ── */}
      <div className="grid auto-rows-[150px] grid-cols-2 gap-2 sm:auto-rows-[190px] sm:grid-cols-4 md:auto-rows-[220px] md:gap-3">
        {items.map((item, i) => {
          const isHero = i === 0 && items.length > 1;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => open(i)}
              aria-label={item.caption || `View photo ${i + 1}`}
              className={`group relative overflow-hidden rounded-2xl border border-white/8 bg-slate-900/60 text-left transition-all duration-500 hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${getSpan(i, items.length)}`}
            >
              <SafeImg
                src={driveImageUrl(item.url)}
                alt={item.caption || `Photo ${i + 1} from ${eventTitle}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              {/* gradient overlay */}
              <div
                className={`absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent transition-opacity duration-300 ${
                  item.caption || isHero
                    ? 'opacity-50 group-hover:opacity-90'
                    : 'opacity-0 group-hover:opacity-70'
                }`}
              />

              {/* caption */}
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 translate-y-1 p-3 transition-transform duration-300 group-hover:translate-y-0 md:p-4">
                  <p
                    className={`leading-snug font-medium text-white ${isHero ? 'text-sm md:text-base' : 'text-xs'}`}
                  >
                    {item.caption}
                  </p>
                </div>
              )}

              {/* magnify icon */}
              <div className="absolute top-2.5 right-2.5 flex h-8 w-8 scale-90 items-center justify-center rounded-full bg-black/40 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Full-screen Lightbox ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 backdrop-blur-2xl"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          {/* top bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4 md:px-6">
            {/* counter */}
            <span className="pointer-events-auto rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white/90 tabular-nums backdrop-blur-sm">
              {lightboxIndex + 1} <span className="text-white/40">/</span>{' '}
              {items.length}
            </span>
            {/* close */}
            <button
              onClick={close}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close lightbox"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* prev */}
          {items.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-5 md:h-12 md:w-12"
              aria-label="Previous photo"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* next */}
          {items.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-5 md:h-12 md:w-12"
              aria-label="Next photo"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* main image */}
          <div
            className="flex max-h-[85vh] max-w-[92vw] flex-col items-center md:max-w-[80vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <SafeImg
              src={driveImageUrl(items[lightboxIndex].url)}
              alt={
                items[lightboxIndex].caption ||
                `Photo ${lightboxIndex + 1} from ${eventTitle}`
              }
              className="max-h-[78vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            {items[lightboxIndex].caption && (
              <p className="mt-3 max-w-lg text-center text-sm leading-relaxed text-gray-300">
                {items[lightboxIndex].caption}
              </p>
            )}
          </div>

          {/* thumbnail strip (bottom) */}
          {items.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
              <div className="flex max-w-[90vw] gap-1.5 overflow-x-auto rounded-2xl bg-black/60 p-2 backdrop-blur-xl md:max-w-[70vw]">
                {items.map((t, ti) => (
                  <button
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(ti);
                    }}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-all md:h-14 md:w-14 ${
                      ti === lightboxIndex
                        ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-black'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                    aria-label={`Go to photo ${ti + 1}`}
                  >
                    <SafeImg
                      src={driveImageUrl(t.url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
