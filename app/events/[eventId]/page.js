/**
 * @file Event detail server page.
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

/* ──────────────── Helpers ──────────────────────────────────────────────── */

function formatTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

function formatDateShort(dateString) {
  if (!dateString) return '';
  return new Date(dateString)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

function getStatusConfig(status) {
  const map = {
    upcoming:  { label: 'Upcoming',  dot: 'bg-neon-lime animate-pulse',   text: 'text-neon-lime',   badge: 'border-neon-lime/30 bg-neon-lime/10 text-neon-lime' },
    ongoing:   { label: 'Live Now',  dot: 'bg-neon-violet animate-pulse', text: 'text-neon-violet', badge: 'border-neon-violet/30 bg-neon-violet/10 text-neon-violet' },
    completed: { label: 'Completed', dot: 'bg-zinc-600',                  text: 'text-zinc-500',    badge: 'border-white/10 bg-white/5 text-zinc-400' },
    cancelled: { label: 'Cancelled', dot: 'bg-red-500',                   text: 'text-red-400',     badge: 'border-red-500/20 bg-red-500/10 text-red-400' },
  };
  return map[status] || map.upcoming;
}

function getVenueLabel(type) {
  return { online: 'Online', offline: 'In-Person', hybrid: 'Hybrid' }[type] || '';
}

function getDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 24) { const days = Math.ceil(hours / 24); return `${days} Day${days > 1 ? 's' : ''}`; }
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours} Hour${hours > 1 ? 's' : ''}`;
  return `${minutes} Min`;
}

/* ──────────────── Metadata ─────────────────────────────────────────────── */

export async function generateMetadata({ params }) {
  const { eventId } = await params;
  const event = await getPublicEventById(eventId);
  if (!event) return { title: 'Event Not Found - NEUPC' };
  return buildEventMetadata(event, `/events/${eventId}`);
}

/* ──────────────── SVG Icons ────────────────────────────────────────────── */

function IconGroups({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconShield({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconLocation({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconGlobe({ className = 'w-4 h-4' }) {
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

function IconExternal({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function IconCamera({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function IconSync({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function IconTag({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

/* ──────────────── Sub-components ───────────────────────────────────────── */

function SectionLabel({ accent = 'lime', children }) {
  const lineColor = accent === 'violet' ? 'bg-neon-violet' : 'bg-neon-lime';
  const textColor = accent === 'violet' ? 'text-neon-violet' : 'text-neon-lime';
  return (
    <div className="flex items-center gap-3">
      <span className={`h-px w-6 shrink-0 ${lineColor}`} />
      <span className={`font-mono text-[10px] font-bold tracking-[0.4em] uppercase sm:text-[11px] ${textColor}`}>{children}</span>
    </div>
  );
}

function TagBadge({ children }) {
  return (
    <span className="inline-block rounded-full border border-neon-violet/20 bg-neon-violet/10 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-neon-violet uppercase">
      #{children}
    </span>
  );
}

function SidebarRow({ label, value, highlight }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-white/5 py-3 last:border-0 last:pb-0">
      <span className="shrink-0 font-mono text-[9px] tracking-widest text-zinc-500 uppercase sm:text-[10px]">{label}</span>
      <span className={`text-right font-heading text-[13px] font-bold leading-snug sm:text-sm ${highlight || 'text-white'}`}>
        {value}
      </span>
    </li>
  );
}

/* ──────────────── Page ─────────────────────────────────────────────────── */

async function EventDetailPage({ params }) {
  const { eventId } = await params;
  const [event, session] = await Promise.all([
    getPublicEventById(eventId),
    auth(),
  ]);
  if (!event) notFound();

  const galleryItems = await getPublicEventGallery(event.id);

  const heroImage  = driveImageUrl(event.cover_image || event.image);
  const statusCfg  = getStatusConfig(event.status);
  const duration   = getDuration(event.start_date, event.end_date);
  const venueLabel = getVenueLabel(event.venue_type);
  const tags       = event.tags || [];
  const isActive   = ['upcoming', 'ongoing'].includes(event.status);

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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-10 sm:pt-28 sm:pb-14 lg:pt-32 lg:pb-20">

        {/* Background image */}
        {heroImage && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt=""
              aria-hidden
              className="h-full w-full object-cover opacity-10 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#05060B]/70 via-[#05060B]/40 to-[#05060B]" />
          </div>
        )}

        {/* Ambient */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="grid-overlay absolute inset-0 opacity-15" />
          <div className="bg-neon-violet/8 absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full blur-[140px]" />
          <div className="bg-neon-lime/6 absolute top-1/2 -right-32 h-[400px] w-[400px] rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Back link */}
          <nav className="mb-6 sm:mb-8">
            <Link
              href="/events"
              className="group inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/3 px-4 py-2 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase backdrop-blur-sm transition-all hover:border-neon-lime/30 hover:text-neon-lime sm:text-[11px]"
            >
              <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Events
            </Link>
          </nav>

          {/* Status + category eyebrow */}
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
            <span className={`inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] font-bold tracking-widest uppercase sm:text-[10px] ${statusCfg.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {event.category && (
              <span className="inline-flex min-h-[28px] items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[9px] tracking-widest text-zinc-400 uppercase sm:text-[10px]">
                {event.category}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="kinetic-headline max-w-4xl font-heading text-[clamp(1.9rem,5vw+0.5rem,5.5rem)] font-black text-white uppercase [line-height:1.05] sm:[line-height:0.95]">
            {event.title}
          </h1>

          {/* Quick-info chips — 2-col grid on mobile, auto-flow on larger */}
          <div className="mt-6 grid grid-cols-2 gap-2.5 border-t border-white/8 pt-6 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3 sm:pt-8">
            {event.start_date && (
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 backdrop-blur-sm sm:px-4">
                <span className="block font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">Date &amp; Time</span>
                <span className="mt-0.5 block font-heading text-[13px] font-bold text-white sm:text-sm lg:text-[15px]">
                  {formatDateShort(event.start_date)}
                  {formatTime(event.start_date) ? ` · ${formatTime(event.start_date)}` : ''}
                </span>
              </div>
            )}
            {event.location && (
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 backdrop-blur-sm sm:px-4">
                <span className="block font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">Location</span>
                <span className="mt-0.5 block font-heading text-[13px] font-bold text-white sm:text-sm lg:text-[15px]">{event.location}</span>
              </div>
            )}
            {duration && (
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 backdrop-blur-sm sm:px-4">
                <span className="block font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">Duration</span>
                <span className="mt-0.5 block font-heading text-[13px] font-bold text-white sm:text-sm lg:text-[15px]">{duration}</span>
              </div>
            )}
            {event.participation_type && (
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 backdrop-blur-sm sm:px-4">
                <span className="block font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">Format</span>
                <span className="mt-0.5 block font-heading text-[13px] font-bold text-white sm:text-sm lg:text-[15px]">
                  {event.participation_type === 'team'
                    ? `Team${event.team_size ? ` of ${event.team_size}` : ''}`
                    : 'Individual'}
                </span>
              </div>
            )}
          </div>

          {/* CTA buttons + deadline urgency */}
          <div className="mt-6 sm:mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {isActive && event.registration_required && (
                <a
                  href="#register"
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-neon-lime px-6 py-3 font-heading text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.8)] sm:min-h-0 sm:px-8 sm:py-3.5 sm:text-[11px]"
                >
                  Register Now
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </a>
              )}
              <a
                href="#about"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 font-heading text-[10px] font-bold tracking-widest text-zinc-300 uppercase backdrop-blur-sm transition-all hover:border-neon-lime/40 hover:text-white sm:min-h-0 sm:px-8 sm:py-3.5 sm:text-[11px]"
              >
                View Details
              </a>
            </div>
            {/* Deadline urgency — shown near CTA so users see it before scrolling away */}
            {isActive && event.registration_required && event.registration_deadline && (
              <p className="mt-3 flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-amber-400/80 uppercase sm:text-[10px]">
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                Registration closes {formatDateShort(event.registration_deadline)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── About & Sidebar ──────────────────────────────────────────────── */}
      <section id="about" className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="bg-neon-violet/5 absolute -top-10 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full blur-[150px]" />
          <div className="grid-overlay absolute inset-0 opacity-15" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-10 xl:gap-14">

            {/* ── Sidebar — shown first on mobile so register CTA is visible early ── */}
            <div className="order-first lg:order-last lg:col-span-4">
              <div className="lg:sticky lg:top-24 space-y-4">

                {/* Registration / status area */}
                <div id="register">
                  {event.status === 'completed' ? (
                    <div className="holographic-card no-lift rounded-2xl p-5 sm:p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <IconCheck className="h-4 w-4 shrink-0 text-neon-lime" />
                        <div>
                          <h3 className="font-heading text-sm font-bold text-white uppercase">Event Concluded</h3>
                          <p className="font-mono text-[9px] text-zinc-600 sm:text-[10px]">
                            {formatDateShort(event.end_date || event.start_date)}
                          </p>
                        </div>
                      </div>

                      {/* Mini gallery strip */}
                      {galleryItems.length > 0 && (
                        <div className="mb-4">
                          <div className="flex gap-1.5 overflow-hidden rounded-xl">
                            {galleryItems.slice(0, 3).map((gItem, gi) => (
                              <div key={gItem.id} className="relative h-16 flex-1 overflow-hidden rounded-lg bg-white/3 sm:h-20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={driveImageUrl(gItem.url)}
                                  alt={gItem.caption || `Photo ${gi + 1}`}
                                  className="h-full w-full object-cover opacity-60 transition-opacity hover:opacity-100"
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
                            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-neon-violet/20 bg-neon-violet/8 px-4 py-2.5 font-mono text-[9px] font-bold tracking-widest text-neon-violet uppercase transition-colors hover:bg-neon-violet/16 sm:text-[10px]"
                          >
                            <IconCamera className="h-3.5 w-3.5" />
                            View {galleryItems.length} Photos
                          </a>
                        </div>
                      )}

                      <p className="mb-4 text-xs leading-relaxed text-zinc-600">
                        This event has concluded. Explore our upcoming events!
                      </p>
                      <Link
                        href="/events"
                        className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/4 px-5 py-3 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
                      >
                        Browse Events →
                      </Link>
                    </div>
                  ) : (
                    <EventRegistrationCard event={event} session={session} />
                  )}
                </div>

                {/* Key details card — hidden on mobile (same info is in hero chips) */}
                <div className="holographic-card no-lift hidden rounded-2xl p-5 lg:block sm:p-6">
                  <div className="mb-4">
                    <SectionLabel accent="lime">Details</SectionLabel>
                  </div>
                  <ul>
                    {event.start_date && (
                      <SidebarRow
                        label="Starts"
                        value={`${formatDateShort(event.start_date)}${formatTime(event.start_date) ? ` · ${formatTime(event.start_date)}` : ''}`}
                      />
                    )}
                    {event.end_date && (
                      <SidebarRow
                        label="Ends"
                        value={`${formatDateShort(event.end_date)}${formatTime(event.end_date) ? ` · ${formatTime(event.end_date)}` : ''}`}
                      />
                    )}
                    {duration && <SidebarRow label="Duration" value={duration} />}
                    {event.location && <SidebarRow label="Location" value={event.location} />}
                    <SidebarRow label="Status" value={statusCfg.label} highlight={statusCfg.text} />
                    {event.registration_required && event.registration_deadline && (
                      <SidebarRow
                        label="Reg. Deadline"
                        value={formatDateShort(event.registration_deadline)}
                        highlight="text-amber-400"
                      />
                    )}
                    {event.max_participants && (
                      <SidebarRow label="Capacity" value={`${event.max_participants} spots`} />
                    )}
                  </ul>
                </div>

                {/* Contact widget */}
                <Link
                  href="/contact"
                  className="holographic-card group flex items-center gap-3 rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                    <svg className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-neon-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-[11px] font-bold tracking-widest text-white uppercase">Need Help?</p>
                    <p className="mt-0.5 text-xs text-zinc-600">Questions about this event?</p>
                  </div>
                  <svg className="h-3 w-3 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>

                {/* External event website */}
                {event.external_url && (
                  <a
                    href={event.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="holographic-card group flex items-center gap-3 rounded-2xl p-4 transition-all sm:p-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-violet/10">
                      <IconExternal className="h-4 w-4 text-neon-violet" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-[11px] font-bold tracking-widest text-white uppercase">Event Website</p>
                      <p className="truncate font-mono text-[9px] text-zinc-600 sm:text-[10px]">{event.external_url}</p>
                    </div>
                    <svg className="h-3 w-3 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* ── Main content column ── */}
            <div className="order-last space-y-5 lg:order-first lg:col-span-8 sm:space-y-6">

              {/* Description + rich content */}
              {(event.description || event.content) && (
                <div className="holographic-card rounded-2xl p-5 sm:p-7">
                  {event.description && (
                    <p className="text-sm leading-[1.9] text-zinc-400 sm:text-base lg:text-[17px]">
                      {event.description}
                    </p>
                  )}
                  {event.content && (
                    <div className={`${event.description ? 'mt-5 border-t border-white/5 pt-5 sm:mt-6 sm:pt-6' : ''}`}>
                      <div
                        className="blog-content leading-relaxed text-zinc-300"
                        dangerouslySetInnerHTML={{ __html: event.content }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* At a Glance */}
              {(event.eligibility || venueLabel || event.participation_type || event.category) && (
                <div className="holographic-card rounded-2xl p-5 sm:p-6">
                  <div className="mb-5">
                    <SectionLabel accent="violet">At a Glance</SectionLabel>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                    {event.category && (
                      <div>
                        <dt className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-zinc-600 uppercase sm:text-[10px]">
                          <IconTag className="h-3 w-3 shrink-0" /> Category
                        </dt>
                        <dd className="text-sm font-bold leading-snug text-white">{event.category}</dd>
                      </div>
                    )}
                    {event.participation_type && (
                      <div>
                        <dt className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-zinc-600 uppercase sm:text-[10px]">
                          <IconGroups className="h-3 w-3 shrink-0" /> Format
                        </dt>
                        <dd className="text-sm font-bold leading-snug text-white">
                          {event.participation_type === 'team'
                            ? `Team${event.team_size ? ` · ${event.team_size}` : ''}`
                            : 'Individual'}
                        </dd>
                      </div>
                    )}
                    {venueLabel && (
                      <div>
                        <dt className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-zinc-600 uppercase sm:text-[10px]">
                          {event.venue_type === 'online'
                            ? <IconGlobe className="h-3 w-3 shrink-0" />
                            : event.venue_type === 'hybrid'
                            ? <IconSync className="h-3 w-3 shrink-0" />
                            : <IconLocation className="h-3 w-3 shrink-0" />}
                          Venue
                        </dt>
                        <dd className="text-sm font-bold leading-snug text-white">{venueLabel}</dd>
                      </div>
                    )}
                    {event.eligibility && (
                      <div>
                        <dt className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-zinc-600 uppercase sm:text-[10px]">
                          <IconShield className="h-3 w-3 shrink-0" /> Eligibility
                        </dt>
                        <dd className="text-sm font-bold leading-snug text-white">{event.eligibility}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Prerequisites */}
              {event.prerequisites && (
                <div className="holographic-card rounded-2xl p-5 sm:p-7">
                  <div className="mb-5">
                    <SectionLabel accent="lime">Requirements</SectionLabel>
                  </div>
                  <div className="space-y-2">
                    {event.prerequisites.split('\n').filter(Boolean).map((line, i) => (
                      <div
                        key={i}
                        className="flex gap-3 rounded-lg border-l-2 border-neon-lime/20 py-2.5 pl-4 transition-all hover:border-neon-lime/50 hover:bg-neon-lime/5"
                      >
                        <span className="shrink-0 font-mono text-[9px] font-bold tracking-widest text-neon-lime/60 sm:text-[10px]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="text-sm leading-relaxed text-zinc-400">{line.trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <div className="mb-3">
                    <SectionLabel accent="violet">Topics</SectionLabel>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => <TagBadge key={tag}>{tag}</TagBadge>)}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Schedule ─────────────────────────────────────────────────────── */}
      {event.end_date && event.start_date && (
        <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="bg-neon-lime/4 absolute top-1/3 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full blur-[120px]" />
          </div>
          <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />

          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

            <div className="mb-8 sm:mb-10">
              <SectionLabel accent="lime">Timeline</SectionLabel>
              <h2 className="kinetic-headline mt-3 font-heading text-2xl font-black text-white uppercase sm:text-3xl lg:text-4xl">
                Event Schedule
              </h2>
            </div>

            <div className="relative">
              {/* Vertical spine — visible from sm upward */}
              <div className="absolute top-3.5 bottom-3.5 left-3.5 w-px bg-gradient-to-b from-neon-lime/40 via-white/10 to-neon-violet/30 sm:left-1/2 sm:-translate-x-1/2" />

              <div className="space-y-6 sm:space-y-8">

                {/* Start node */}
                <div className="relative flex items-start gap-5 sm:items-center sm:gap-0">
                  {/* Mobile/tablet node on left spine */}
                  <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#05060B] bg-neon-lime shadow-[0_0_14px_rgba(182,243,107,0.55)] sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                    <div className="h-2 w-2 rounded-full bg-black/50" />
                  </div>

                  {/* Date label — desktop left */}
                  <div className="hidden sm:flex sm:w-5/12 sm:flex-col sm:items-end sm:pr-8">
                    <span className="font-heading text-sm font-bold text-neon-lime lg:text-base">
                      {formatDateShort(event.start_date)}
                    </span>
                    {formatTime(event.start_date) && (
                      <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                        {formatTime(event.start_date)}
                      </span>
                    )}
                  </div>

                  {/* Card — desktop right, mobile inline */}
                  <div className="holographic-card min-w-0 flex-1 rounded-xl p-4 sm:ml-auto sm:w-5/12 sm:flex-none sm:pl-8">
                    {/* Mobile date */}
                    <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                      <span className="font-mono text-[9px] font-bold tracking-widest text-neon-lime uppercase">
                        {formatDateShort(event.start_date)}
                      </span>
                      {formatTime(event.start_date) && (
                        <span className="font-mono text-[9px] text-zinc-600">· {formatTime(event.start_date)}</span>
                      )}
                    </div>
                    <h4 className="font-heading text-[11px] font-bold tracking-widest text-neon-lime uppercase">
                      Event Opens
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                      Registration closes and activities begin.
                    </p>
                  </div>
                </div>

                {/* End node */}
                <div className="relative flex items-start gap-5 sm:flex-row-reverse sm:items-center sm:gap-0">
                  {/* Node */}
                  <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#05060B] bg-neon-violet shadow-[0_0_14px_rgba(124,92,255,0.55)] sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                    <div className="h-2 w-2 rounded-full bg-black/50" />
                  </div>

                  {/* Date label — desktop right */}
                  <div className="hidden sm:flex sm:w-5/12 sm:flex-col sm:items-start sm:pl-8">
                    <span className="font-heading text-sm font-bold text-neon-violet lg:text-base">
                      {formatDateShort(event.end_date)}
                    </span>
                    {formatTime(event.end_date) && (
                      <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                        {formatTime(event.end_date)}
                      </span>
                    )}
                  </div>

                  {/* Card — desktop left, mobile inline */}
                  <div className="holographic-card min-w-0 flex-1 rounded-xl p-4 sm:mr-auto sm:w-5/12 sm:flex-none sm:pr-8">
                    {/* Mobile date */}
                    <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                      <span className="font-mono text-[9px] font-bold tracking-widest text-neon-violet uppercase">
                        {formatDateShort(event.end_date)}
                      </span>
                      {formatTime(event.end_date) && (
                        <span className="font-mono text-[9px] text-zinc-600">· {formatTime(event.end_date)}</span>
                      )}
                    </div>
                    <h4 className="font-heading text-[11px] font-bold tracking-widest text-neon-violet uppercase">
                      Event Closes
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                      Wrap-up and conclusion.{duration ? ` Total: ${duration}.` : ''}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Gallery ──────────────────────────────────────────────────────── */}
      {galleryItems.length > 0 && (
        <section id="event-gallery" className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
          <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="bg-neon-violet/4 absolute top-1/4 right-0 h-[350px] w-[350px] rounded-full blur-[130px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            {/* Header */}
            <div className="mb-7 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <SectionLabel accent="violet">Gallery</SectionLabel>
                <h2 className="kinetic-headline mt-3 font-heading text-2xl font-black text-white uppercase sm:text-3xl lg:text-4xl">
                  {event.status === 'completed' ? 'Relive the Moments' : 'Event Gallery'}
                </h2>
                <p className="mt-1 font-mono text-[9px] tracking-widest text-zinc-600 uppercase sm:text-[10px]">
                  {galleryItems.length} photo{galleryItems.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Link
                href="/events"
                className="w-fit shrink-0 rounded-full border border-white/10 bg-white/4 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-colors hover:border-neon-violet/40 hover:text-neon-violet sm:px-7 sm:py-3 sm:text-[11px]"
              >
                All Events →
              </Link>
            </div>

            <EventGalleryViewer items={galleryItems} eventTitle={event.title} />

            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/2 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-zinc-600 uppercase sm:text-[10px]">
                <IconCheck className="h-3.5 w-3.5 text-neon-lime" />
                {galleryItems.length} photo{galleryItems.length !== 1 ? 's' : ''} archived
              </div>
              <span className="font-mono text-[9px] tracking-widest text-zinc-600 uppercase sm:text-[10px]">
                Tap to view full size
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="grid-overlay absolute inset-0 opacity-15" />
          <div className="bg-neon-lime/4 absolute top-1/2 left-1/2 h-[400px] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-full blur-[130px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-neon-lime/15 bg-gradient-to-br from-neon-lime/5 via-transparent to-neon-violet/5 p-6 sm:rounded-3xl sm:p-10 lg:p-14">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3 md:items-center">
              <div className="md:col-span-2">
                <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.4em] text-neon-lime uppercase sm:text-[11px]">
                  /// Join the Community
                </p>
                <h2 className="font-heading text-2xl font-black leading-tight text-white uppercase sm:text-3xl lg:text-4xl">
                  Stay ahead of every event
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400 sm:mt-4">
                  Join NEUPC to get early access to events, workshops, and contests — and be part of a thriving community of programmers.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:flex-col md:items-end">
                <JoinButton
                  href="/join"
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-neon-lime px-6 py-3 font-heading text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] transition-shadow hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.7)] sm:min-h-0 sm:px-8 sm:py-3.5 sm:text-[11px]"
                >
                  Join the Club
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </JoinButton>
                <Link
                  href="/events"
                  className="text-center font-mono text-[10px] tracking-[0.25em] text-zinc-500 uppercase underline-offset-4 transition-colors hover:text-zinc-200 hover:underline sm:text-[11px]"
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
