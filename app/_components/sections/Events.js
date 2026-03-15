/**
 * @file Events — Homepage section with featured event slider + recent events grid.
 * @module Events
 */

'use client';

import Link from 'next/link';
import { cn, formatDate, driveImageUrl } from '@/app/_lib/utils';
import SectionHeader from '../ui/SectionHeader';
import SectionBackground from '../ui/SectionBackground';
import SafeImg from '../ui/SafeImg';
import FeaturedEventSlider from './FeaturedEventSlider';
import { useStaggerReveal } from '@/app/_lib/hooks';

// ─── Configuration ──────────────────────────────────────────────────────────

const CATEGORY_ICON = {
  Bootcamp: '📚',
  Contest: '🏆',
  Workshop: '🔧',
  Seminar: '🎤',
  Hackathon: '💻',
  Meetup: '🤝',
  Other: '📅',
};

const STATUS_CONFIG = {
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

/** Alternating accent colors for each recent-event card */
const CARD_ACCENTS = [
  {
    border: 'hover:border-primary-500/40',
    glow: 'from-primary-500/15',
    topLine: 'from-primary-500 to-secondary-500',
    title: 'group-hover:text-primary-200',
    icon: 'text-primary-400',
    date: 'text-primary-300',
    btn: 'from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
  },
  {
    border: 'hover:border-secondary-500/40',
    glow: 'from-secondary-500/15',
    topLine: 'from-secondary-500 to-primary-500',
    title: 'group-hover:text-secondary-200',
    icon: 'text-secondary-400',
    date: 'text-secondary-300',
    btn: 'from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700',
  },
  {
    border: 'hover:border-violet-500/40',
    glow: 'from-violet-500/15',
    topLine: 'from-violet-500 to-primary-500',
    title: 'group-hover:text-violet-200',
    icon: 'text-violet-400',
    date: 'text-violet-300',
    btn: 'from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700',
  },
];

// ─── RecentEventCard ────────────────────────────────────────────────────────

function RecentEventCard({ event, index = 0 }) {
  const a = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const emoji = CATEGORY_ICON[event.category] || '📅';
  const status = STATUS_CONFIG[event.status] || STATUS_CONFIG.upcoming;
  const eventLink = `/events/${event.slug || event.id}`;
  const hasImage = !!(event.cover_image || event.banner_image);

  return (
    <Link
      href={eventLink}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 shadow-xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:bg-white/6 hover:shadow-2xl',
        a.border
      )}
    >
      {/* Top accent line */}
      <div
        className={cn(
          'absolute top-0 right-0 left-0 h-px w-0 bg-linear-to-r transition-all duration-700 group-hover:w-full',
          a.topLine
        )}
      />

      {/* Hover glow */}
      <div
        className={cn(
          'pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-linear-to-br to-transparent opacity-0 blur-[50px] transition-opacity duration-500 group-hover:opacity-100',
          a.glow
        )}
      />

      {/* Image */}
      <div className="relative h-40 w-full overflow-hidden sm:h-44">
        {hasImage ? (
          <SafeImg
            src={driveImageUrl(event.cover_image || event.banner_image)}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-800/80 via-slate-900/60 to-slate-800/80">
            <span className="text-5xl opacity-30">{emoji}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* Category pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          <span className="text-xs">{emoji}</span>
          {event.category || 'Event'}
        </div>

        {/* Status pill */}
        <div
          className={cn(
            'absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md',
            status.text
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
          {status.label}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex flex-1 flex-col p-4 sm:p-5">
        <h3
          className={cn(
            'mb-2 line-clamp-2 text-base leading-snug font-bold text-white transition-colors duration-300 sm:text-lg',
            a.title
          )}
        >
          {event.title}
        </h3>

        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-gray-400 sm:text-sm">
          {event.description || 'Discover more about this exciting event.'}
        </p>

        {/* Meta row */}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <svg
              className={cn('h-3.5 w-3.5', a.icon)}
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
            <span className={cn('font-medium', a.date)}>
              {formatDate(event.start_date)}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-gray-500"
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
              </svg>
              <span className="max-w-32 truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Events Section ─────────────────────────────────────────────────────────

/**
 * Events — Homepage section with a hero-style featured event slider on top
 * followed by a 3-column grid of recent events.
 */
function Events({
  events = [],
  featuredEvents = [],
  recentEvents = [],
  settings = {},
}) {
  // Fallback: if no featured/recent were passed separately, derive from events
  const featured =
    featuredEvents.length > 0
      ? featuredEvents
      : events.filter((e) => e.is_featured);

  const featuredIds = new Set(featured.map((e) => e.id));
  const recent =
    recentEvents.length > 0
      ? recentEvents.filter((e) => !featuredIds.has(e.id))
      : events.filter((e) => !e.is_featured).slice(0, 3);

  const hasContent = featured.length > 0 || recent.length > 0;
  const { ref: gridRef, isVisible: gridVisible, getDelay } = useStaggerReveal({ staggerMs: 120 });

  return (
    <section className="relative overflow-hidden py-16 sm:py-20 md:py-28 lg:py-36">
      <SectionBackground />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            badgeIcon="🎯"
            badge={settings?.homepage_events_badge || 'Upcoming Events'}
            title={settings?.homepage_events_title || 'Events & Activities'}
            subtitle={
              settings?.homepage_events_subtitle ||
              'Join our workshops, contests, and tech talks to sharpen your skills and connect with the community'
            }
          />

          {hasContent ? (
            <div className="space-y-10 sm:space-y-14">
              {/* ── Featured Event(s) ─────────────────────────────────── */}
              {featured.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center gap-2 sm:mb-5">
                    <div className="h-px flex-1 bg-linear-to-r from-amber-500/30 to-transparent" />
                    <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-amber-400/80 uppercase">
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
                    <div className="h-px flex-1 bg-linear-to-l from-amber-500/30 to-transparent" />
                  </div>
                  <FeaturedEventSlider events={featured} />
                </div>
              )}

              {/* ── Recent Events Grid ────────────────────────────────── */}
              {recent.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center gap-2 sm:mb-5">
                    <div className="from-primary-500/30 h-px flex-1 bg-linear-to-r to-transparent" />
                    <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      Recent Events
                    </span>
                    <div className="from-primary-500/30 h-px flex-1 bg-linear-to-l to-transparent" />
                  </div>
                  <div ref={gridRef} className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                    {recent.slice(0, 3).map((event, index) => (
                      <div
                        key={event.id}
                        className={cn(
                          'transition-all duration-700 ease-out',
                          gridVisible
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-8 opacity-0'
                        )}
                        style={{
                          transitionDelay: gridVisible ? `${getDelay(index)}ms` : '0ms',
                        }}
                      >
                        <RecentEventCard event={event} index={index} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="mb-3 text-5xl opacity-40">🎯</div>
              <p className="text-lg text-gray-400">
                {settings?.events_empty_message ||
                  'No events at the moment. Check back soon!'}
              </p>
            </div>
          )}

          {/* View All CTA */}
          <div className="mt-10 text-center sm:mt-14 md:mt-20">
            <Link
              href="/events"
              className="from-primary-500 via-secondary-500 to-primary-600 hover:shadow-primary-500/40 group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-linear-to-r px-8 py-4 text-base font-semibold text-white shadow-[0_8px_32px_rgba(8,131,149,0.3)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(8,131,149,0.5)] md:px-12 md:py-5 md:text-lg"
            >
              <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">
                {settings?.homepage_events_cta || 'View All Events'}
              </span>
              <svg
                className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5 md:h-6 md:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Events;
