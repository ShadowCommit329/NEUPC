/**
 * @file Event detail server page.
 * Synced with homepage design system: neon-lime / neon-violet palette,
 * holographic-card components, kinetic-headline typography, grid-overlay ambients.
 *
 * @module EventDetailPage
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPublicEventById,
  getPublicEventGallery,
} from '@/app/_lib/public-actions';
import { EventJsonLd, BreadcrumbJsonLd } from '@/app/_components/ui/JsonLd';
import ScrollToTop from '@/app/_components/ui/ScrollToTop';
import JoinButton from '@/app/_components/ui/JoinButton';
import { buildEventMetadata } from '@/app/_lib/seo';
import { driveImageUrl } from '@/app/_lib/utils';
import { auth } from '@/app/_lib/auth';
import EventGalleryViewer from './EventGalleryViewer';
import EventRegistrationCard from './EventRegistrationCard';

/* ──────────────────── Helpers ──────────────────── */

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(dateString) {
  if (!dateString) return '';
  return new Date(dateString)
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
}

function formatShortDate(dateString) {
  if (!dateString) return { month: '', day: '' };
  const d = new Date(dateString);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
  };
}

function getStatusConfig(status) {
  const map = {
    upcoming: {
      label: 'Upcoming',
      dot: 'bg-neon-lime animate-pulse',
      text: 'text-neon-lime',
    },
    ongoing: {
      label: 'Live Now',
      dot: 'bg-neon-violet animate-pulse',
      text: 'text-neon-violet',
    },
    completed: {
      label: 'Completed',
      dot: 'bg-zinc-600',
      text: 'text-zinc-500',
    },
    cancelled: {
      label: 'Cancelled',
      dot: 'bg-red-500',
      text: 'text-red-400',
    },
  };
  return map[status] || map.upcoming;
}

function getVenueLabel(type) {
  const map = {
    online: 'Online',
    offline: 'In-Person',
    hybrid: 'Hybrid',
  };
  return map[type] || '';
}

function getDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.ceil(hours / 24);
    return `${days} Day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours} Hour${hours > 1 ? 's' : ''}`;
  return `${minutes} Min`;
}

/* ──────────────────── Metadata ──────────────────── */

/** @param {{ params: Promise<{ eventId: string }> }} props */
export async function generateMetadata({ params }) {
  const { eventId } = await params;
  const event = await getPublicEventById(eventId);
  if (!event) return { title: 'Event Not Found - NEUPC' };
  return buildEventMetadata(event, `/events/${eventId}`);
}

/* ──────────────────── SVG Icons ──────────────────── */

function IconBolt({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function IconGroups({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconShield({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconLocation({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconGlobe({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function IconCheck({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconExternal({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function IconCamera({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function IconSync({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function IconTag({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

/* ──────────────────── Sub-components ──────────────────── */

function TagBadge({ children }) {
  return (
    <span className="border-neon-violet/20 bg-neon-violet/10 text-neon-violet inline-block rounded-full border px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest">
      #{children}
    </span>
  );
}

/* ──────────────────── Page Component ──────────────────── */

async function EventDetailPage({ params }) {
  const { eventId } = await params;
  const [event, session] = await Promise.all([
    getPublicEventById(eventId),
    auth(),
  ]);
  if (!event) notFound();

  const galleryItems = await getPublicEventGallery(event.id);

  const heroImage = driveImageUrl(event.cover_image || event.image);
  const statusCfg = getStatusConfig(event.status);
  const duration = getDuration(event.start_date, event.end_date);
  const venueLabel = getVenueLabel(event.venue_type);
  const tags = event.tags || [];

  return (
    <main className="relative min-h-screen">
      <EventJsonLd event={event} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Events', url: '/events' },
          { name: event.title },
        ]}
      />

      {/* ── Hero Section ── */}
      <section className="relative flex min-h-[85vh] flex-col justify-center overflow-hidden pt-20 pb-16">
        {/* Background image */}
        {heroImage && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="h-full w-full object-cover opacity-15 grayscale"
              src={heroImage}
              alt={event.title}
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#05060B] via-transparent to-[#05060B]" />
          </div>
        )}

        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="grid-overlay absolute inset-0 opacity-20" />
          <div className="bg-neon-violet/10 absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-[140px]" />
          <div className="bg-neon-lime/8 absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-3">
            <Link
              href="/events"
              className="group font-heading inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 backdrop-blur-sm transition-all hover:border-neon-lime/30 hover:text-neon-lime"
            >
              <svg
                className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Events
            </Link>
          </nav>

          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-4">
            <span className={`pulse-dot inline-block h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
            <span className={`font-mono text-[10px] font-bold tracking-[0.3em] uppercase sm:text-[11px] ${statusCfg.text}`}>
              {statusCfg.label}
              {event.category ? ` · ${event.category}` : ''}
            </span>
          </div>

          {/* Kinetic headline */}
          <h1 className="kinetic-headline font-heading max-w-4xl text-[clamp(2.5rem,8vw,7rem)] font-black text-white uppercase">
            {event.title}
          </h1>

          {/* Quick meta row */}
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-8">
            {event.start_date && (
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-lg font-bold text-white sm:text-xl">
                  {formatDateShort(event.start_date)}
                </span>
                <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                  Date
                </span>
              </div>
            )}
            {event.start_date && (
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-lg font-bold text-white sm:text-xl">
                  {formatTime(event.start_date)}
                </span>
                <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                  Time
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-lg font-bold text-white sm:text-xl">
                  {event.location}
                </span>
                <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                  Venue
                </span>
              </div>
            )}
            {duration && (
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-lg font-bold text-white sm:text-xl">
                  {duration}
                </span>
                <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                  Duration
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {event.status !== 'completed' && event.registration_required && (
              <a
                href="#register"
                className="group bg-neon-lime font-heading inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)]"
              >
                Register Now
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </a>
            )}
            <a
              href="#about"
              className="font-heading inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-[11px] font-bold tracking-widest text-zinc-200 uppercase backdrop-blur-sm transition-all hover:border-neon-lime/50 hover:text-white"
            >
              View Details
            </a>
          </div>
        </div>
      </section>

      {/* ── About & Info Bento Grid ── */}
      <section id="about" className="relative overflow-hidden py-20 sm:py-28">
        {/* Top divider */}
        <div className="dark:via-neon-violet/20 absolute top-0 left-1/2 h-px w-full -translate-x-1/2 bg-linear-to-r from-transparent via-slate-200 to-transparent" />

        {/* Ambient */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="bg-neon-violet/5 absolute -top-20 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full blur-[160px]" />
          <div className="bg-neon-lime/4 absolute right-0 bottom-0 h-[400px] w-[500px] rounded-full blur-[140px]" />
          <div className="grid-overlay absolute inset-0 opacity-20" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-14 space-y-5 text-center sm:mb-18">
            <div className="flex items-center justify-center gap-4">
              <span className="bg-neon-violet h-px w-10" />
              <span className="text-neon-violet font-mono text-[11px] font-bold tracking-[0.5em] uppercase">
                Event Detail
              </span>
              <span className="bg-neon-violet h-px w-10" />
            </div>
            <h2 className="kinetic-headline font-heading text-[clamp(1.85rem,8vw,4.5rem)] font-black text-white uppercase">
              About This Event
            </h2>
          </div>

          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
            {/* ── Left: About content ── */}
            <div className="space-y-8 lg:col-span-8">
              {/* Description */}
              {(event.description || event.content) && (
                <div className="holographic-card rounded-2xl p-6 sm:rounded-3xl sm:p-10">
                  {event.description && (
                    <p className="text-base leading-[1.9] font-light text-zinc-400 sm:text-lg">
                      {event.description}
                    </p>
                  )}
                  {event.content && (
                    <div className="mt-6 border-t border-white/5 pt-6">
                      <div
                        className="blog-content leading-relaxed text-zinc-300"
                        dangerouslySetInnerHTML={{ __html: event.content }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Event Highlights Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {event.category && (
                  <div className="holographic-card group rounded-2xl p-5 sm:p-6">
                    <div className="bg-neon-lime/10 mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl">
                      <IconTag className="text-neon-lime h-5 w-5" />
                    </div>
                    <h4 className="font-heading text-neon-lime mb-2 text-[11px] font-bold tracking-widest uppercase sm:text-[12px]">
                      Category
                    </h4>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {event.category}
                    </p>
                  </div>
                )}
                <div className="holographic-card group rounded-2xl p-5 sm:p-6">
                  <div className="bg-neon-violet/10 mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl">
                    <IconGroups className="text-neon-violet h-5 w-5" />
                  </div>
                  <h4 className="font-heading text-neon-violet mb-2 text-[11px] font-bold tracking-widest uppercase sm:text-[12px]">
                    Participation
                  </h4>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {event.participation_type === 'team'
                      ? `Team${event.team_size ? ` (${event.team_size} members)` : ''}`
                      : 'Individual'}
                  </p>
                </div>
                {event.eligibility && (
                  <div className="holographic-card group rounded-2xl p-5 sm:p-6">
                    <div className="bg-neon-lime/10 mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl">
                      <IconShield className="text-neon-lime h-5 w-5" />
                    </div>
                    <h4 className="font-heading text-neon-lime mb-2 text-[11px] font-bold tracking-widest uppercase sm:text-[12px]">
                      Eligibility
                    </h4>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {event.eligibility}
                    </p>
                  </div>
                )}
                {venueLabel && (
                  <div className="holographic-card group rounded-2xl p-5 sm:p-6">
                    <div className="bg-neon-violet/10 mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl">
                      {event.venue_type === 'online' ? (
                        <IconGlobe className="text-neon-violet h-5 w-5" />
                      ) : event.venue_type === 'hybrid' ? (
                        <IconSync className="text-neon-violet h-5 w-5" />
                      ) : (
                        <IconLocation className="text-neon-violet h-5 w-5" />
                      )}
                    </div>
                    <h4 className="font-heading text-neon-violet mb-2 text-[11px] font-bold tracking-widest uppercase sm:text-[12px]">
                      Venue Type
                    </h4>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {venueLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Prerequisites */}
              {event.prerequisites && (
                <div className="holographic-card rounded-2xl p-6 sm:rounded-3xl sm:p-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="bg-neon-lime h-px w-8" />
                    <span className="text-neon-lime font-mono text-[10px] font-bold tracking-[0.4em] uppercase sm:text-[11px]">
                      Requirements
                    </span>
                  </div>
                  <div className="space-y-3">
                    {event.prerequisites
                      .split('\n')
                      .filter(Boolean)
                      .map((line, i) => (
                        <div
                          key={i}
                          className="group flex gap-4 border-l-2 border-neon-lime/25 py-3 pl-5 transition-all hover:border-neon-lime/60 hover:bg-neon-lime/5"
                        >
                          <span className="text-neon-lime font-mono text-[10px] font-bold tracking-widest">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <p className="text-sm leading-relaxed text-zinc-400">
                            {line.trim()}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <TagBadge key={tag}>{tag}</TagBadge>
                  ))}
                </div>
              )}
            </div>

            {/* ── Right: Sidebar ── */}
            <div className="space-y-6 lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                {/* Event Details Panel */}
                <div className="holographic-card rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="bg-neon-lime h-px w-6" />
                    <span className="text-neon-lime font-mono text-[10px] font-bold tracking-[0.4em] uppercase">
                      Details
                    </span>
                  </div>

                  <ul className="space-y-4">
                    {event.start_date && (
                      <li className="flex justify-between border-b border-white/5 pb-4">
                        <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">Date</span>
                        <span className="font-heading text-sm font-bold text-white">{formatDateShort(event.start_date)}</span>
                      </li>
                    )}
                    {event.start_date && (
                      <li className="flex justify-between border-b border-white/5 pb-4">
                        <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">Time</span>
                        <span className="font-heading text-sm font-bold text-white">{formatTime(event.start_date)}</span>
                      </li>
                    )}
                    {event.location && (
                      <li className="flex justify-between border-b border-white/5 pb-4">
                        <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">Venue</span>
                        <span className="font-heading text-sm font-bold text-right text-white">{event.location}</span>
                      </li>
                    )}
                    {duration && (
                      <li className="flex justify-between border-b border-white/5 pb-4">
                        <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">Duration</span>
                        <span className="font-heading text-sm font-bold text-white">{duration}</span>
                      </li>
                    )}
                    <li className="flex justify-between border-b border-white/5 pb-4">
                      <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">Type</span>
                      <span className="font-heading text-sm font-bold text-white">
                        {event.participation_type === 'team'
                          ? `Team${event.team_size ? ` (${event.team_size})` : ''}`
                          : 'Solo'}
                      </span>
                    </li>
                    <li className="flex justify-between pb-3">
                      <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">Status</span>
                      <span className={`flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase ${statusCfg.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </li>
                    {event.registration_required && event.registration_deadline && (
                      <li className="flex justify-between border-t border-white/5 pt-4">
                        <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">Deadline</span>
                        <span className="font-heading text-sm font-bold text-amber-400">{formatDateShort(event.registration_deadline)}</span>
                      </li>
                    )}
                    {event.max_participants && (
                      <li className="flex justify-between border-t border-white/5 pt-4">
                        <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">Capacity</span>
                        <span className="font-heading text-sm font-bold text-white">{event.max_participants} spots</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Registration Card */}
                <div id="register">
                  {event.status === 'completed' ? (
                    <div className="holographic-card rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <IconCheck className="text-neon-lime h-5 w-5" />
                        <div>
                          <h3 className="font-heading text-sm font-bold text-white uppercase">Event Concluded</h3>
                          <p className="font-mono text-[10px] text-zinc-500">{formatDateShort(event.end_date || event.start_date)}</p>
                        </div>
                      </div>

                      {/* Mini gallery strip */}
                      {galleryItems.length > 0 && (
                        <div className="mb-4">
                          <div className="flex gap-1.5 overflow-hidden rounded-xl">
                            {galleryItems.slice(0, 3).map((gItem, gi) => (
                              <div key={gItem.id} className="relative h-16 flex-1 overflow-hidden rounded-lg bg-[#0c0e16]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={driveImageUrl(gItem.url)}
                                  alt={gItem.caption || `Photo ${gi + 1}`}
                                  className="h-full w-full object-cover opacity-70 hover:opacity-100 transition-opacity"
                                />
                                {gi === 2 && galleryItems.length > 3 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                    <span className="font-mono text-xs font-bold text-white">+{galleryItems.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <a
                            href="#event-gallery"
                            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-neon-violet/25 bg-neon-violet/10 px-4 py-2.5 font-mono text-[10px] font-bold tracking-widest text-neon-violet uppercase transition-colors hover:bg-neon-violet/20"
                          >
                            <IconCamera className="h-3.5 w-3.5" />
                            View {galleryItems.length} Photos
                          </a>
                        </div>
                      )}

                      <p className="mb-4 text-xs leading-relaxed font-light text-zinc-500">
                        This event has concluded. Explore our upcoming events!
                      </p>
                      <Link
                        href="/events"
                        className="font-heading flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-bold tracking-widest text-zinc-300 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
                      >
                        Browse Events →
                      </Link>
                    </div>
                  ) : (
                    <EventRegistrationCard event={event} session={session} />
                  )}
                </div>

                {/* Contact */}
                <div className="holographic-card rounded-2xl p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <h3 className="font-heading text-[11px] font-bold tracking-widest text-white uppercase">
                      Need Help?
                    </h3>
                  </div>
                  <p className="mb-4 text-xs leading-relaxed font-light text-zinc-500">
                    Have questions about this event? We&apos;re here to help.
                  </p>
                  <Link
                    href="/contact"
                    className="group font-heading text-neon-lime inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-colors hover:opacity-80"
                  >
                    Contact Us
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>

                {/* External Link */}
                {event.external_url && (
                  <a
                    href={event.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="holographic-card group flex items-center gap-4 rounded-2xl p-5 transition-all"
                  >
                    <div className="bg-neon-violet/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      <IconExternal className="text-neon-violet h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-[11px] font-bold tracking-widest text-white uppercase">
                        Event Website
                      </p>
                      <p className="truncate font-mono text-[10px] text-zinc-500">
                        {event.external_url}
                      </p>
                    </div>
                    <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Schedule Timeline ── */}
      {event.end_date && event.start_date && (
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="dark:via-neon-lime/20 absolute top-0 left-1/2 h-px w-full -translate-x-1/2 bg-linear-to-r from-transparent via-slate-200 to-transparent" />
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="bg-neon-lime/5 absolute top-1/3 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="mb-14 space-y-5 text-center">
              <div className="flex items-center justify-center gap-4">
                <span className="bg-neon-lime h-px w-10" />
                <span className="text-neon-lime font-mono text-[11px] font-bold tracking-[0.5em] uppercase">
                  Timeline
                </span>
                <span className="bg-neon-lime h-px w-10" />
              </div>
              <h2 className="kinetic-headline font-heading text-4xl font-black text-white uppercase sm:text-5xl md:text-6xl">
                Event Schedule
              </h2>
            </div>

            <div className="relative space-y-12">
              {/* Timeline line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[2px] bg-neon-lime/10 -translate-x-1/2 hidden md:block" />

              {/* Start */}
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
                <div className="md:w-5/12 text-right hidden md:block">
                  <p className="font-heading text-lg font-bold text-neon-lime uppercase">
                    {formatDateShort(event.start_date)} · {formatTime(event.start_date)}
                  </p>
                  <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mt-1">Event Begins</p>
                </div>
                <div className="z-10 w-8 h-8 rounded-full border-4 border-[#05060B] bg-neon-lime shadow-[0_0_15px_rgba(182,243,107,0.6)]" />
                <div className="md:w-5/12 holographic-card rounded-2xl p-5">
                  <h4 className="font-heading text-[11px] font-bold tracking-widest text-neon-lime uppercase mb-2">Opening</h4>
                  <p className="text-sm leading-relaxed font-light text-zinc-400">
                    Event kickoff and start of activities.
                  </p>
                </div>
              </div>

              {/* End */}
              <div className="relative flex flex-col md:flex-row-reverse items-center justify-between gap-6 md:gap-0">
                <div className="md:w-5/12 text-left hidden md:block">
                  <p className="font-heading text-lg font-bold text-neon-violet uppercase">
                    {formatDateShort(event.end_date)} · {formatTime(event.end_date)}
                  </p>
                  <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mt-1">Event Ends</p>
                </div>
                <div className="z-10 w-8 h-8 rounded-full border-4 border-[#05060B] bg-neon-violet shadow-[0_0_15px_rgba(124,92,255,0.6)]" />
                <div className="md:w-5/12 holographic-card rounded-2xl p-5">
                  <h4 className="font-heading text-[11px] font-bold tracking-widest text-neon-violet uppercase mb-2">Closing</h4>
                  <p className="text-sm leading-relaxed font-light text-zinc-400">
                    Final wrap-up and conclusion.
                    {duration ? ` Total duration: ${duration}.` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Event Gallery ── */}
      {galleryItems.length > 0 && (
        <section id="event-gallery" className="relative overflow-hidden py-20 sm:py-28">
          <div className="dark:via-neon-violet/20 absolute top-0 left-1/2 h-px w-full -translate-x-1/2 bg-linear-to-r from-transparent via-slate-200 to-transparent" />
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="bg-neon-violet/5 absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full blur-[140px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="bg-neon-violet h-px w-8 sm:w-10" />
                  <span className="text-neon-violet font-mono text-[10px] font-bold tracking-[0.4em] uppercase sm:text-[11px]">
                    Gallery
                  </span>
                </div>
                <h2 className="kinetic-headline font-heading text-4xl font-black text-white uppercase sm:text-5xl md:text-6xl">
                  {event.status === 'completed' ? 'Relive the Moments' : 'Event Gallery'}
                </h2>
                <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                  {galleryItems.length} photo{galleryItems.length !== 1 ? 's' : ''}{' '}
                  {event.status === 'completed' ? 'archived' : 'from this event'}
                </p>
              </div>
              <Link
                href="/events"
                className="font-heading w-fit shrink-0 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-colors hover:border-neon-violet hover:text-neon-violet sm:px-8 sm:py-3.5 sm:text-[11px]"
              >
                All Events →
              </Link>
            </div>

            <EventGalleryViewer items={galleryItems} eventTitle={event.title} />

            {/* Bottom bar */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/2 px-5 py-3.5 backdrop-blur-sm">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                <IconCheck className="text-neon-lime h-4 w-4" />
                {galleryItems.length} photo{galleryItems.length !== 1 ? 's' : ''} archived
              </div>
              <span className="hidden font-mono text-[10px] tracking-widest text-zinc-600 uppercase sm:inline">
                Click to view full size
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Section ── */}
      <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="grid-overlay absolute inset-0 opacity-20" />
          <div className="bg-neon-lime/5 absolute top-1/2 left-1/2 h-[500px] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
            <div className="mb-5 flex items-center justify-center gap-4">
              <span className="bg-neon-lime h-px w-10" />
              <span className="text-neon-lime font-mono text-[11px] font-bold tracking-[0.5em] uppercase">
                Community
              </span>
              <span className="bg-neon-lime h-px w-10" />
            </div>
            <h2 className="kinetic-headline font-heading text-4xl font-black text-white uppercase sm:text-5xl md:text-6xl">
              Interested in More <span className="neon-text">Events?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed font-light text-zinc-400 sm:mt-6 sm:text-base">
              Join NEUPC to get notified about upcoming events, workshops, and
              contests. Be part of a thriving community of passionate
              programmers.
            </p>
          </div>

          {/* CTA block */}
          <div className="border-neon-lime/20 from-neon-lime/5 to-neon-violet/5 relative overflow-hidden rounded-2xl border bg-linear-to-br via-transparent p-6 sm:rounded-3xl sm:p-10 md:p-14 lg:p-16">
            <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">
              <div className="md:col-span-2">
                <p className="text-neon-lime mb-2 font-mono text-[10px] font-bold tracking-[0.4em] uppercase sm:mb-3">
                  /// Next Steps
                </p>
                <h3 className="font-heading text-2xl leading-tight font-black text-white uppercase sm:text-3xl md:text-4xl">
                  Ready to be part of the community?
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed font-light text-zinc-400 sm:mt-4">
                  Join the club or explore more events to find your next challenge.
                </p>
              </div>
              <div className="flex flex-row flex-wrap items-center gap-3 md:flex-col md:items-end md:gap-3">
                <JoinButton
                  href="/join"
                  className="group bg-neon-lime font-heading inline-flex items-center gap-2 rounded-full px-6 py-3 text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)] sm:px-8 sm:py-3.5 sm:text-[11px]"
                >
                  Join the Club
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </JoinButton>
                <Link
                  href="/events"
                  className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase underline-offset-4 transition-colors hover:text-white hover:underline sm:text-[11px]"
                >
                  Browse Events →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </main>
  );
}

export default EventDetailPage;
