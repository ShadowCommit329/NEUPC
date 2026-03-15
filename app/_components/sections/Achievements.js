/**
 * @file Achievements — Homepage section
 * @module Achievements
 *
 * Shows a stats grid + featured-achievements carousel.
 * If there are multiple featured achievements the user can slide through them.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/app/_lib/utils';
import SectionBackground from '../ui/SectionBackground';
import SectionHeader from '../ui/SectionHeader';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Same logic as `getResultTier` on the achievements page. */
function isMedalist(result) {
  if (!result) return false;
  const r = result.toLowerCase();
  return /1st|first|champion|winner|gold|rank.?1\b|#1\b|2nd|second|silver|rank.?2\b|#2\b|3rd|third|bronze|rank.?3\b|#3\b/.test(
    r
  );
}

/** Derive the same 4 stats the achievements page hero shows. */
function deriveStats(achievements, participations) {
  const achYears = [
    ...new Set(achievements.map((a) => a.year).filter(Boolean)),
  ];
  const partYears = [
    ...new Set(participations.map((p) => p.year).filter(Boolean)),
  ];
  const yearsActive = Math.max(achYears.length - 1, partYears.length - 1);

  return [
    { icon: '🏆', value: String(achievements.length), label: 'Achievements' },
    {
      icon: '🥇',
      value: String(achievements.filter((a) => isMedalist(a.result)).length),
      label: 'Medalists',
    },
    {
      icon: '📋',
      value: String(participations.length),
      label: 'Participations',
    },
    {
      icon: '📅',
      value: yearsActive > 0 ? `${yearsActive}+` : '—',
      label: 'Years Active',
    },
  ];
}

/** Mirror of the result-styling logic from the achievements page. */
function getResultStyle(result) {
  if (!result) return null;
  const r = result.toLowerCase();
  if (/1st|first|champion|winner|gold|rank.?1\b|#1\b/.test(r))
    return {
      badge: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      emoji: '🥇',
    };
  if (/2nd|second|silver|rank.?2\b|#2\b/.test(r))
    return {
      badge: 'border-slate-400/40 bg-slate-400/10 text-slate-300',
      emoji: '🥈',
    };
  if (/3rd|third|bronze|rank.?3\b|#3\b/.test(r))
    return {
      badge: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
      emoji: '🥉',
    };
  if (/finalist|final|top.?\d|semi/.test(r))
    return {
      badge: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
      emoji: '🏅',
    };
  if (/qualified|qualify|selected/.test(r))
    return {
      badge: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
      emoji: '✅',
    };
  if (/participant|participated/.test(r))
    return { badge: 'border-white/10 bg-white/5 text-white/50', emoji: '📋' };
  return {
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    emoji: '🏅',
  };
}

// ─── StatCard ────────────────────────────────────────────────────────────────

/** Per-stat accent: number gradient, bottom line, dim background icon colour. */
const STAT_THEMES = [
  {
    numGradient: 'from-amber-300 to-yellow-200',
    line: 'from-amber-500/0 via-amber-400/60 to-amber-500/0',
    shadow: 'hover:shadow-amber-500/10',
    iconColor: 'text-amber-400/[0.07] group-hover:text-amber-400/[0.14]',
    iconBg: 'bg-amber-500/10 text-amber-300',
  },
  {
    numGradient: 'from-sky-300 to-blue-200',
    line: 'from-sky-500/0 via-sky-400/60 to-sky-500/0',
    shadow: 'hover:shadow-sky-500/10',
    iconColor: 'text-sky-400/[0.07] group-hover:text-sky-400/[0.14]',
    iconBg: 'bg-sky-500/10 text-sky-300',
  },
  {
    numGradient: 'from-violet-300 to-purple-200',
    line: 'from-violet-500/0 via-violet-400/60 to-violet-500/0',
    shadow: 'hover:shadow-violet-500/10',
    iconColor: 'text-violet-400/[0.07] group-hover:text-violet-400/[0.14]',
    iconBg: 'bg-violet-500/10 text-violet-300',
  },
  {
    numGradient: 'from-emerald-300 to-teal-200',
    line: 'from-emerald-500/0 via-emerald-400/60 to-emerald-500/0',
    shadow: 'hover:shadow-emerald-500/10',
    iconColor: 'text-emerald-400/[0.07] group-hover:text-emerald-400/[0.14]',
    iconBg: 'bg-emerald-500/10 text-emerald-300',
  },
];

/**
 * Animates a numeric string from 0 to its target value when the element
 * enters the viewport. Handles suffixes like "120+" or "5k".
 */
function useCountUp(rawValue, duration = 1100) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(() => {
    // If rawValue has no leading digits (e.g. '—'), show it immediately
    return /^\d/.test(String(rawValue)) ? '0' : String(rawValue);
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const match = String(rawValue).match(/^(\d+)(.*)$/);
    if (!match) {
      setTimeout(() => setDisplay(rawValue), 0);
      return;
    }
    const target = parseInt(match[1], 10);
    const suffix = match[2] || '';
    let started = false;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        let current = 0;
        const totalFrames = Math.round(duration / 16);
        const step = target / totalFrames;
        const tick = () => {
          current = Math.min(current + step, target);
          setDisplay(String(Math.round(current)) + suffix);
          if (current < target) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rawValue, duration]);

  return { ref, display };
}

function StatCard({ stat, index }) {
  const theme = STAT_THEMES[index % STAT_THEMES.length];
  const { ref, display } = useCountUp(stat.value);

  return (
    <div
      ref={ref}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-white/14 hover:shadow-2xl sm:p-7',
        theme.shadow
      )}
    >
      {/* Giant dim icon — purely decorative */}
      <div
        className={cn(
          'pointer-events-none absolute -top-3 -right-3 text-[7rem] leading-none transition-all duration-700 select-none sm:text-[8rem]',
          theme.iconColor
        )}
      >
        {stat.icon}
      </div>

      <div className="relative flex flex-col gap-4">
        {/* Icon pill */}
        <div
          className={cn(
            'inline-flex w-fit items-center justify-center rounded-xl p-2.5 text-xl',
            theme.iconBg
          )}
        >
          {stat.icon}
        </div>

        {/* Number */}
        <div
          className={cn(
            'bg-linear-to-r bg-clip-text text-5xl leading-none font-extrabold text-transparent tabular-nums sm:text-6xl',
            theme.numGradient
          )}
        >
          {display}
        </div>

        {/* Label */}
        <div className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          {stat.label}
        </div>
      </div>

      {/* Coloured bottom accent line — reveals on hover */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-px bg-linear-to-r opacity-0 transition-opacity duration-500 group-hover:opacity-100',
          theme.line
        )}
      />
    </div>
  );
}

// ─── FeaturedSlider ──────────────────────────────────────────────────────────

function FeaturedSlider({ items }) {
  const [idx, setIdx] = useState(0);
  const total = items.length;

  const prev = useCallback(
    () => setIdx((i) => (i - 1 + total) % total),
    [total]
  );
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  // Auto-advance every 5.5 s
  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [total, next]);

  const item = items[idx];
  const rs = getResultStyle(item.result);
  const cats = item.category
    ? item.category
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const participants = Array.isArray(item.participants)
    ? item.participants
    : [];
  const memberLabel = item.is_team
    ? (item.team_name ?? participants.join(', '))
    : participants.join(', ');

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/4 backdrop-blur-xl">
      {/* ── Split layout: image left on desktop ── */}
      <div className="flex flex-col md:min-h-85 md:flex-row">
        {/* Image pane */}
        <div className="relative h-56 w-full shrink-0 overflow-hidden sm:h-72 md:h-auto md:w-[45%]">
          <Image
            key={item.id}
            src={item.featured_photo?.url ?? '/placeholder-event.png'}
            alt={item.title}
            fill
            className="object-cover transition-all duration-700"
            sizes="(max-width: 768px) 100vw, 45vw"
            unoptimized
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-black/10 md:bg-linear-to-r md:from-transparent md:via-black/10 md:to-black/50" />

          {/* Featured badge + year */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-300 backdrop-blur-sm">
              ⭐ Featured
            </span>
            {item.year && (
              <span className="rounded-lg bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                {item.year}
              </span>
            )}
          </div>

          {/* Slide counter */}
          {total > 1 && (
            <div className="absolute top-4 right-4">
              <span className="rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white/70 tabular-nums backdrop-blur-sm">
                {idx + 1} / {total}
              </span>
            </div>
          )}
        </div>

        {/* Content pane */}
        <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
          <div>
            {/* Category pills */}
            {cats.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {cats.map((cat) => (
                  <span
                    key={cat}
                    className="text-primary-300 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            <h3 className="mb-3 text-xl leading-snug font-bold text-white sm:text-2xl lg:text-3xl">
              {item.title}
            </h3>

            {item.description && (
              <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-400 sm:text-base">
                {item.description}
              </p>
            )}
          </div>

          {/* Meta footer */}
          <div className="space-y-3">
            {rs && (
              <div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                    rs.badge
                  )}
                >
                  {rs.emoji} {item.result}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500">
              {item.contest_name && (
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-600">🏟</span>
                  {item.contest_url ? (
                    <a
                      href={item.contest_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 underline underline-offset-2 transition-colors hover:text-white"
                    >
                      {item.contest_name}
                    </a>
                  ) : (
                    <span className="text-gray-400">{item.contest_name}</span>
                  )}
                </span>
              )}
              {memberLabel && (
                <span className="flex items-center gap-1.5">
                  <span>{item.is_team ? '👥' : '👤'}</span>
                  <span className="text-gray-400">{memberLabel}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Prev / Next arrows ── */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous achievement"
            className="absolute top-1/2 left-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next achievement"
            className="absolute top-1/2 right-3 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 md:right-6 md:left-auto md:translate-x-0">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Go to achievement ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === idx
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/30 hover:bg-white/60'
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Shimmer bottom line */}
      <div className="from-primary-500/0 to-secondary-500/0 absolute inset-x-0 bottom-0 h-px bg-linear-to-r via-amber-500/40" />
    </div>
  );
}

// ─── Achievements Section ────────────────────────────────────────────────────

/**
 * @param {Array}  achievements – All achievement records from DB
 * @param {Array}  stats        – [{icon, value, label}]
 * @param {object} settings     – Public site settings
 */
function Achievements({
  achievements = [],
  participations = [],
  stats = [],
  settings = {},
}) {
  const featured = achievements.filter((a) => a.is_featured);
  // Prefer live-derived stats (same as achievements page);
  // fall back to settings-based stats only if no data at all.
  const displayStats =
    achievements.length > 0 || participations.length > 0
      ? deriveStats(achievements, participations)
      : stats.length > 0
        ? stats
        : deriveStats([], []);

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8">
      <SectionBackground variant="warm" />

      <div className="relative mx-auto max-w-6xl">
        {/* ── Section header ────────────────────────────────────────── */}
        <SectionHeader
          badge={settings?.homepage_achievements_badge || 'Achievements'}
          title={
            settings?.homepage_achievements_title || 'Excellence in Action'
          }
          subtitle={
            settings?.homepage_achievements_subtitle ||
            'Celebrating our journey of competitive programming success and innovation'
          }
          lineClassName="to-amber-500/40"
          titleClassName="from-amber-300 via-white to-primary-300"
        />

        {/* ── Stats grid ────────────────────────────────────────────── */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 md:mb-12 lg:grid-cols-4">
          {displayStats.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} />
          ))}
        </div>

        {/* ── Featured carousel ─────────────────────────────────────── */}
        {featured.length > 0 ? (
          <>
            {/* Sub-label */}
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                ⭐ Featured achievements
              </span>
              <span className="text-xs text-gray-600 tabular-nums">
                {featured.length} total
              </span>
            </div>

            <FeaturedSlider items={featured} />
          </>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/3 py-14 text-center backdrop-blur-sm">
            <p className="text-sm text-gray-500">
              {settings?.achievements_empty_message ||
                'No featured achievements yet.'}
            </p>
          </div>
        )}

        {/* ── View all CTA ──────────────────────────────────────────── */}
        <div className="mt-10 text-center sm:mt-12">
          <Link
            href="/achievements"
            className="group inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-lg hover:shadow-amber-500/10"
          >
            {settings?.homepage_achievements_cta || 'View All Achievements'}
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Achievements;
