/**
 * @file Event detail server page.
 * Professional event detail with immersive hero, info grid, content, and sidebar.
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
      dot: 'bg-emerald-400',
      bg: 'bg-emerald-500/15 border-emerald-500/30',
      text: 'text-emerald-300',
    },
    ongoing: {
      label: 'Happening Now',
      dot: 'bg-amber-400 animate-pulse',
      bg: 'bg-amber-500/15 border-amber-500/30',
      text: 'text-amber-300',
    },
    completed: {
      label: 'Completed',
      dot: 'bg-gray-400',
      bg: 'bg-gray-500/15 border-gray-500/30',
      text: 'text-gray-300',
    },
    cancelled: {
      label: 'Cancelled',
      dot: 'bg-red-400',
      bg: 'bg-red-500/15 border-red-500/30',
      text: 'text-red-300',
    },
  };
  return map[status] || map.upcoming;
}

function getVenueLabel(type) {
  const map = {
    online: '🌐 Online',
    offline: '🏢 In-Person',
    hybrid: '🔄 Hybrid',
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
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${minutes} min`;
}

/* ──────────────────── Metadata ──────────────────── */

/** @param {{ params: Promise<{ eventId: string }> }} props */
export async function generateMetadata({ params }) {
  const { eventId } = await params;
  const event = await getPublicEventById(eventId);
  if (!event) return { title: 'Event Not Found - NEUPC' };
  return buildEventMetadata(event, `/events/${eventId}`);
}

/* ──────────────────── Sub-components ──────────────────── */

function InfoCard({ icon, label, value, accent = false }) {
  if (!value) return null;
  return (
    <div
      className={`group/info flex items-start gap-3.5 rounded-xl border p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        accent
          ? 'border-primary-500/20 bg-primary-500/5 hover:border-primary-500/40 hover:bg-primary-500/10'
          : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/7'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover/info:scale-110 ${
          accent ? 'bg-primary-500/20' : 'bg-white/8'
        }`}
      >
        <span className="text-lg">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wider text-gray-400 uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-sm leading-snug font-semibold text-gray-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function TagBadge({ children }) {
  return (
    <span className="border-primary-500/20 bg-primary-500/10 text-primary-300 rounded-full border px-3 py-1 text-xs font-medium">
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

  // Use the resolved UUID for gallery lookup (eventId from URL may be a slug)
  const galleryItems = await getPublicEventGallery(event.id);

  const heroImage = driveImageUrl(event.cover_image || event.image);
  const statusCfg = getStatusConfig(event.status);
  const { month, day } = formatShortDate(event.start_date);
  const duration = getDuration(event.start_date, event.end_date);
  const venueLabel = getVenueLabel(event.venue_type);
  const tags = event.tags || [];

  return (
    <main className="min-h-screen bg-linear-to-b from-[#0F172A] via-[#0a1120] to-[#0F172A]">
      <EventJsonLd event={event} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Events', url: '/events' },
          { name: event.title },
        ]}
      />

      {/* ── Immersive Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="from-primary-500/10 to-secondary-500/10 absolute inset-0 bg-linear-to-br" />
          <div className="absolute inset-0 bg-linear-to-b from-black/40 to-black/80" />
        </div>

        {/* Decorative orbs */}
        <div className="from-primary-500/20 absolute -top-32 -left-32 h-96 w-96 rounded-full bg-linear-to-br to-transparent blur-3xl" />
        <div className="from-secondary-500/15 absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-linear-to-tl to-transparent blur-3xl" />

        <div className="relative container mx-auto px-4 pt-8 pb-16 sm:px-6 md:pt-12 md:pb-20 lg:px-8 lg:pb-24">
          {/* Breadcrumb & back */}
          <nav className="mb-8 flex items-center gap-3 text-sm text-gray-400 md:mb-10">
            <Link
              href="/events"
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/3 px-4 py-2 font-medium backdrop-blur-sm transition-all hover:border-white/15 hover:bg-white/7 hover:text-white"
            >
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
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
              All Events
            </Link>
          </nav>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-12">
            {/* Date card (floating) */}
            {month && (
              <div className="hidden shrink-0 lg:block">
                <div className="from-primary-500 to-primary-600 flex h-24 w-24 flex-col items-center justify-center rounded-2xl bg-linear-to-br shadow-2xl ring-4 ring-white/8">
                  <span className="text-xs font-bold tracking-widest text-white/80 uppercase">
                    {month}
                  </span>
                  <span className="text-3xl font-black text-white">{day}</span>
                </div>
              </div>
            )}

            {/* Title area */}
            <div className="flex-1 space-y-5">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Status */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`}
                  />
                  {statusCfg.label}
                </span>
                {/* Category */}
                {event.category && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    {event.category}
                  </span>
                )}
                {/* Venue type */}
                {venueLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/3 px-3 py-1.5 text-xs font-medium text-gray-300">
                    {venueLabel}
                  </span>
                )}
                {/* Eligibility */}
                {event.eligibility && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      event.eligibility === 'Everyone'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {event.eligibility === 'Everyone' ? '🌐' : '🔒'}{' '}
                    {event.eligibility}
                  </span>
                )}
                {/* Featured */}
                {event.is_featured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-300">
                    ⭐ Featured
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl leading-tight font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                {event.title}
              </h1>

              {/* Quick meta row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-300">
                {event.start_date && (
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
                    <span>{formatDate(event.start_date)}</span>
                  </div>
                )}
                {event.start_date && (
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{formatTime(event.start_date)}</span>
                  </div>
                )}
                {event.location && (
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                )}
                {duration && (
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>{duration}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cover Image (full-width, below hero) ── */}
      {heroImage && (
        <section className="relative -mt-4 pb-8 md:pb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="group relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/8 transition-all duration-500 hover:ring-white/15">
                <div className="absolute inset-0 z-10 bg-linear-to-t from-gray-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt={event.title}
                  className="h-auto w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Main Content Grid ── */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
              {/* ─── Left Column: Content ─── */}
              <div className="space-y-8 lg:col-span-2">
                {/* ── Event Concluded Banner ── */}
                {event.status === 'completed' && (
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-linear-to-br from-emerald-950/60 to-slate-900/50 p-5 backdrop-blur-xl">
                    <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
                    <div className="relative flex flex-wrap items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
                        <svg
                          className="h-6 w-6 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold tracking-wider text-emerald-300 uppercase">
                          Event Successfully Concluded
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Held on{' '}
                          {formatDate(event.end_date || event.start_date)}
                          {duration ? ` · ${duration}` : ''}
                          {galleryItems.length > 0
                            ? ` · ${galleryItems.length} photo${galleryItems.length !== 1 ? 's' : ''} archived`
                            : ''}
                        </p>
                      </div>
                      {galleryItems.length > 0 && (
                        <a
                          href="#event-gallery"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3.5 py-2 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/20"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                            />
                          </svg>
                          See Photos
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* About Section */}
                {(event.description || event.content) && (
                  <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-xl md:p-8">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="from-primary-500/20 to-primary-600/20 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br">
                        <svg
                          className="text-primary-300 h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white md:text-2xl">
                        About This Event
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {event.description && (
                        <p className="text-base leading-relaxed text-gray-300 md:text-lg">
                          {event.description}
                        </p>
                      )}
                      {event.content && (
                        <div className="border-t border-white/8 pt-4">
                          <div
                            className="blog-content leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: event.content,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Event Details Grid */}
                <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-xl md:p-8">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="from-secondary-500/20 to-secondary-600/20 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br">
                      <svg
                        className="text-secondary-300 h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white md:text-2xl">
                      Event Details
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoCard
                      icon="📅"
                      label="Date"
                      value={formatDate(event.start_date)}
                      accent
                    />
                    <InfoCard
                      icon="🕒"
                      label="Time"
                      value={formatTime(event.start_date)}
                      accent
                    />
                    <InfoCard
                      icon="📍"
                      label="Location"
                      value={event.location}
                    />
                    {venueLabel && (
                      <InfoCard
                        icon={
                          event.venue_type === 'online'
                            ? '🌐'
                            : event.venue_type === 'hybrid'
                              ? '🔄'
                              : '🏢'
                        }
                        label="Venue Type"
                        value={
                          event.venue_type === 'online'
                            ? 'Online'
                            : event.venue_type === 'hybrid'
                              ? 'Hybrid'
                              : 'In-Person'
                        }
                      />
                    )}
                    {duration && (
                      <InfoCard icon="⏱️" label="Duration" value={duration} />
                    )}
                    {event.end_date && (
                      <InfoCard
                        icon="🏁"
                        label="End Date"
                        value={formatDate(event.end_date)}
                      />
                    )}
                    {event.max_participants && (
                      <InfoCard
                        icon="👥"
                        label="Max Participants"
                        value={`${event.max_participants} spots`}
                      />
                    )}
                    <InfoCard
                      icon={event.participation_type === 'team' ? '👥' : '👤'}
                      label="Participation"
                      value={
                        event.participation_type === 'team'
                          ? `Team${event.team_size ? ` (${event.team_size} members)` : ''}`
                          : 'Individual'
                      }
                    />
                    <InfoCard
                      icon="📋"
                      label="Registration"
                      value={
                        event.registration_required
                          ? 'Required'
                          : 'Not Required'
                      }
                    />
                    {event.registration_required &&
                      event.registration_deadline && (
                        <InfoCard
                          icon="⏰"
                          label="Registration Deadline"
                          value={formatDate(event.registration_deadline)}
                          accent
                        />
                      )}
                    {event.eligibility && (
                      <InfoCard
                        icon={event.eligibility === 'Everyone' ? '🌐' : '🔒'}
                        label="Eligibility"
                        value={event.eligibility}
                      />
                    )}
                    {event.category && (
                      <InfoCard
                        icon="🏷️"
                        label="Category"
                        value={event.category}
                      />
                    )}
                  </div>
                </div>

                {/* Prerequisites */}
                {event.prerequisites && (
                  <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-xl md:p-8">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500/20 to-amber-600/20">
                        <svg
                          className="h-5 w-5 text-amber-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white md:text-2xl">
                        Prerequisites
                      </h2>
                    </div>
                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-5">
                      <p className="text-sm leading-relaxed whitespace-pre-line text-gray-300">
                        {event.prerequisites}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-xl md:p-8">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="from-primary-500/20 to-primary-600/20 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br">
                        <svg
                          className="text-primary-300 h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white md:text-2xl">
                        Tags
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <TagBadge key={tag}>{tag}</TagBadge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Right Column: Sidebar ─── */}
              <div className="space-y-6 lg:col-span-1">
                {/* Registration CTA */}
                <div className="sticky top-6 space-y-6">
                  {event.status === 'completed' ? (
                    /* ── Completed: Event Recap Card ── */
                    <div className="relative overflow-hidden rounded-2xl border border-gray-600/20 bg-gray-900/80 p-6 shadow-xl ring-1 ring-white/5 backdrop-blur-xl">
                      <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-violet-500/8 blur-2xl" />
                      <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-emerald-500/8 blur-2xl" />
                      <div className="relative">
                        {/* Header */}
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
                            <svg
                              className="h-5 w-5 text-emerald-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">
                              Event Concluded
                            </h3>
                            <p className="text-xs text-gray-400">
                              {formatDate(event.end_date || event.start_date)}
                            </p>
                          </div>
                        </div>

                        {/* Mini gallery strip */}
                        {galleryItems.length > 0 && (
                          <div className="mb-4">
                            <div className="flex gap-1.5 overflow-hidden rounded-xl">
                              {galleryItems.slice(0, 3).map((gItem, gi) => (
                                <div
                                  key={gItem.id}
                                  className="relative h-20 flex-1 overflow-hidden rounded-xl bg-slate-800"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={driveImageUrl(gItem.url)}
                                    alt={gItem.caption || `Photo ${gi + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                  {gi === 2 && galleryItems.length > 3 && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                                      <span className="text-sm font-bold text-white">
                                        +{galleryItems.length - 3}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <a
                              href="#event-gallery"
                              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/20"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                                />
                              </svg>
                              View All {galleryItems.length} Photos
                            </a>
                          </div>
                        )}

                        <p className="mb-4 text-xs leading-relaxed text-gray-400">
                          This event has concluded. Explore our upcoming events
                          and be part of the next one!
                        </p>
                        <Link
                          href="/events"
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
                        >
                          Explore Upcoming Events
                        </Link>
                      </div>
                    </div>
                  ) : (
                    /* ── Active / Cancelled: In-app Registration ── */
                    <EventRegistrationCard event={event} session={session} />
                  )}

                  {/* Quick Info Sidebar Card */}
                  <div className="rounded-2xl border border-white/8 bg-white/3 p-5 backdrop-blur-xl">
                    <h3 className="mb-4 text-sm font-semibold tracking-wider text-gray-400 uppercase">
                      Quick Info
                    </h3>
                    <div className="space-y-3.5">
                      {[
                        {
                          icon: '📅',
                          label: 'Date',
                          value: formatDate(event.start_date),
                        },
                        {
                          icon: '🕒',
                          label: 'Time',
                          value: formatTime(event.start_date),
                        },
                        { icon: '📍', label: 'Venue', value: event.location },
                        { icon: '⏱️', label: 'Duration', value: duration },
                        {
                          icon:
                            event.participation_type === 'team' ? '👥' : '👤',
                          label: 'Participation',
                          value:
                            event.participation_type === 'team'
                              ? `Team${event.team_size ? ` (${event.team_size} members)` : ''}`
                              : 'Individual',
                        },
                        {
                          icon: '�',
                          label: 'Registration',
                          value: event.registration_required
                            ? 'Required'
                            : 'Not Required',
                        },
                        {
                          icon: '⏰',
                          label: 'Reg. Deadline',
                          value:
                            event.registration_required &&
                            event.registration_deadline
                              ? formatDate(event.registration_deadline)
                              : null,
                        },
                        {
                          icon: '�👥',
                          label: 'Capacity',
                          value: event.max_participants
                            ? `${event.max_participants} spots`
                            : null,
                        },
                        {
                          icon: event.eligibility === 'Everyone' ? '🌐' : '🔒',
                          label: 'Open to',
                          value: event.eligibility,
                        },
                      ]
                        .filter((item) => item.value)
                        .map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-3"
                          >
                            <span className="text-base">{item.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-400">
                                {item.label}
                              </p>
                              <p className="truncate text-sm font-medium text-gray-200">
                                {item.value}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* External Link */}
                  {event.external_url && (
                    <a
                      href={event.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 p-5 backdrop-blur-xl transition-all hover:border-white/15 hover:bg-white/7"
                    >
                      <div className="from-primary-500/20 to-primary-600/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br">
                        <svg
                          className="text-primary-400 h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          Event Website
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {event.external_url}
                        </p>
                      </div>
                      <svg
                        className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
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
                    </a>
                  )}

                  {/* Contact */}
                  <div className="rounded-2xl border border-white/8 bg-white/3 p-5 backdrop-blur-xl">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-lg">💬</span>
                      <h3 className="text-sm font-bold text-white">
                        Need Help?
                      </h3>
                    </div>
                    <p className="mb-4 text-xs leading-relaxed text-gray-400">
                      Have questions about this event? We&apos;re here to help.
                    </p>
                    <Link
                      href="/contact"
                      className="text-primary-400 hover:text-primary-300 group/link inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                    >
                      Contact Us
                      <svg
                        className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5"
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
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Event Gallery ── */}
      {galleryItems.length > 0 && (
        <section
          id="event-gallery"
          className="relative overflow-hidden py-14 md:py-20"
        >
          {/* Ambient background */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-violet-950/10 to-transparent" />
          <div className="pointer-events-none absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-violet-500/5 blur-3xl" />
          <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-56 w-56 rounded-full bg-indigo-500/5 blur-3xl" />

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              {/* Section header */}
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500/25 to-purple-600/25 ring-1 ring-violet-500/30">
                    <svg
                      className="h-6 w-6 text-violet-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white md:text-3xl">
                      {event.status === 'completed'
                        ? 'Relive the Moments'
                        : 'Event Gallery'}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-400">
                      {galleryItems.length} photo
                      {galleryItems.length !== 1 ? 's' : ''}{' '}
                      {event.status === 'completed'
                        ? 'captured during this event'
                        : 'from this event'}
                    </p>
                  </div>
                </div>
                {event.status === 'completed' && (
                  <div className="flex items-center gap-2 self-start rounded-full border border-emerald-500/20 bg-emerald-500/8 px-4 py-2 backdrop-blur-sm sm:self-auto">
                    <svg
                      className="h-3.5 w-3.5 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs font-medium text-emerald-300">
                      Concluded ·{' '}
                      {formatDate(event.end_date || event.start_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Interactive gallery with lightbox */}
              <EventGalleryViewer
                items={galleryItems}
                eventTitle={event.title}
              />

              {/* Bottom bar */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/2 px-5 py-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs text-gray-400">
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
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  All {galleryItems.length} photo
                  {galleryItems.length !== 1 ? 's' : ''} archived from this
                  event
                </div>
                <span className="text-xs text-gray-500">
                  Click any photo to view full size
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Section ── */}
      <section className="relative overflow-hidden py-16 md:py-20">
        <div className="via-primary-500/5 absolute inset-0 bg-linear-to-b from-transparent to-transparent" />
        <div className="bg-primary-500/10 absolute top-0 left-1/4 h-64 w-64 rounded-full blur-3xl" />
        <div className="bg-secondary-500/10 absolute right-1/4 bottom-0 h-64 w-64 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-8 text-center backdrop-blur-xl md:p-12 lg:p-16">
            <div className="mb-5 text-5xl">🎉</div>
            <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl lg:text-4xl">
              Interested in More Events?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-gray-400 md:text-lg">
              Join NEUPC to get notified about upcoming events, workshops, and
              contests! Be part of a thriving community of passionate
              programmers.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <JoinButton
                href="/join"
                className="from-primary-500 to-primary-600 group inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r px-8 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl"
              >
                Join the Club
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
              </JoinButton>
              <Link
                href="/events"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/3 px-8 py-3.5 font-semibold text-white backdrop-blur-sm transition-all hover:scale-[1.03] hover:border-white/15 hover:bg-white/7"
              >
                Browse All Events
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </main>
  );
}

export default EventDetailPage;
