/**
 * @file Guest events client — browsable list of public club events
 *   with filtering, search, and registration actions for guests.
 * @module GuestEventsClient
 */

'use client';

import { useState, useMemo } from 'react';
import { useScrollLock } from '@/app/_lib/hooks';
import {
  Calendar,
  MapPin,
  Clock,
  Tag,
  Search,
  ExternalLink,
  X,
  ChevronRight,
  Sparkles,
  Trophy,
  Users,
  Globe,
  Wifi,
  Building2,
  Filter,
  Star,
  AlertCircle,
  CheckCircle2,
  Timer,
} from 'lucide-react';
import { driveImageUrl } from '@/app/_lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_META = {
  Workshop: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  Contest: { color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
  Seminar: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  Bootcamp: { color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  Hackathon: { color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  Meetup: { color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
  Other: { color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
};

const STATUS_META = {
  upcoming: {
    label: 'Upcoming',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    dot: 'bg-emerald-400',
  },
  ongoing: {
    label: 'Ongoing',
    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    dot: 'bg-cyan-400 animate-pulse',
  },
  completed: {
    label: 'Completed',
    color: 'text-white/35 bg-white/4 border-white/8',
    dot: 'bg-white/30',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
    dot: 'bg-red-400',
  },
};

const VENUE_META = {
  online: { icon: Wifi, label: 'Online', color: 'text-blue-400' },
  offline: { icon: Building2, label: 'In-Person', color: 'text-emerald-400' },
  hybrid: { icon: Globe, label: 'Hybrid', color: 'text-violet-400' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const d = new Date(deadline);
  const diffMs = d - now;
  if (diffMs <= 0)
    return {
      label: 'Registration closed',
      color: 'text-red-400',
      closed: true,
    };
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0)
    return {
      label: `${hours}h left to register`,
      color: 'text-amber-400',
      urgent: true,
    };
  if (days <= 3)
    return {
      label: `${days}d ${hours}h left`,
      color: 'text-amber-400',
      urgent: true,
    };
  return {
    label: `Deadline: ${formatDate(deadline)}`,
    color: 'text-white/40',
    urgent: false,
  };
}

// ─── Featured Banner ──────────────────────────────────────────────────────────
function FeaturedBanner({ event, onOpen }) {
  const catMeta = CATEGORY_META[event.category] ?? CATEGORY_META.Other;
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.upcoming;
  const deadline = getDeadlineStatus(event.registration_deadline);

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10"
      onClick={() => onOpen(event)}
    >
      {/* background image */}
      {event.banner_image || event.cover_image ? (
        <div className="absolute inset-0">
          <img
            src={driveImageUrl(event.banner_image || event.cover_image)}
            alt={event.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/placeholder-event.svg';
            }}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-violet-900/40 via-black to-black" />
      )}

      {/* content */}
      <div className="relative flex min-h-52 flex-col justify-between p-6 sm:min-h-64 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            <Star className="size-3" />
            Featured
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${catMeta.color}`}
          >
            {event.category}
          </span>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.color}`}
          >
            <span
              className={`inline-block size-1.5 rounded-full ${statusMeta.dot}`}
            />
            {statusMeta.label}
          </span>
        </div>

        <div>
          <h2 className="mb-2 text-2xl leading-tight font-bold text-white sm:text-3xl">
            {event.title}
          </h2>
          {event.description && (
            <p className="mb-4 line-clamp-2 max-w-lg text-sm leading-relaxed text-white/55">
              {event.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatDate(event.start_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {event.location}
            </span>
            {deadline && (
              <span className={`flex items-center gap-1.5 ${deadline.color}`}>
                <Timer className="size-3.5" />
                {deadline.label}
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/18">
              View Details
              <ChevronRight className="size-4" />
            </button>
            {event.registration_url && event.status !== 'completed' && (
              <a
                href={event.registration_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-4 py-2 text-sm text-white/70 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/14"
              >
                Register
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, onOpen }) {
  const catMeta = CATEGORY_META[event.category] ?? CATEGORY_META.Other;
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.upcoming;
  const venueMeta = VENUE_META[event.venue_type] ?? VENUE_META.offline;
  const VenueIcon = venueMeta.icon;
  const deadline = getDeadlineStatus(event.registration_deadline);

  return (
    <div
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-all duration-200 hover:border-white/14 hover:bg-white/5"
      onClick={() => onOpen(event)}
    >
      {/* cover image */}
      <div className="relative h-40 overflow-hidden bg-white/4">
        {event.cover_image || event.banner_image ? (
          <img
            src={driveImageUrl(event.cover_image || event.banner_image)}
            alt={event.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/placeholder-event.svg';
            }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-linear-to-br from-white/4 to-white/2">
            <Calendar className="size-10 text-white/10" />
          </div>
        )}
        {/* status + category overlay */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${catMeta.color}`}
          >
            {event.category ?? 'Event'}
          </span>
          <span
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${statusMeta.color}`}
          >
            <span
              className={`inline-block size-1.5 rounded-full ${statusMeta.dot}`}
            />
            {statusMeta.label}
          </span>
        </div>
        {event.is_featured && (
          <div className="absolute right-2 bottom-2">
            <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/50 px-2 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm">
              <Star className="size-2.5" />
              Featured
            </span>
          </div>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 line-clamp-2 text-sm leading-snug font-semibold text-white/90 transition-colors group-hover:text-white">
          {event.title}
        </h3>
        {event.description && (
          <p className="mb-3 line-clamp-2 flex-1 text-xs leading-relaxed text-white/40">
            {event.description}
          </p>
        )}

        {/* meta */}
        <div className="mt-auto space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-white/45">
            <Calendar className="size-3.5 shrink-0" />
            <span>{formatDate(event.start_date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/45">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs ${venueMeta.color}`}
          >
            <VenueIcon className="size-3.5 shrink-0" />
            <span>{venueMeta.label}</span>
          </div>
          {deadline && (
            <div
              className={`flex items-center gap-1.5 text-xs ${deadline.color}`}
            >
              <Timer className="size-3.5 shrink-0" />
              <span>{deadline.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-white/6 px-4 py-3">
        <button className="text-xs text-white/40 transition group-hover:text-white/70">
          View Details →
        </button>
        {event.tags?.length > 0 && (
          <div className="flex gap-1">
            {event.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded border border-white/6 bg-white/3 px-1.5 py-0.5 text-[10px] text-white/30"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function EventModal({ event, onClose }) {
  useScrollLock();
  if (!event) return null;
  const catMeta = CATEGORY_META[event.category] ?? CATEGORY_META.Other;
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.upcoming;
  const venueMeta = VENUE_META[event.venue_type] ?? VENUE_META.offline;
  const VenueIcon = venueMeta.icon;
  const deadline = getDeadlineStatus(event.registration_deadline);

  const canRegister =
    event.registration_required &&
    event.status !== 'completed' &&
    event.status !== 'cancelled' &&
    (!event.registration_deadline ||
      new Date(event.registration_deadline) > new Date());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0d0d0f] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header image */}
        {(event.banner_image || event.cover_image) && (
          <div className="relative h-44 shrink-0 overflow-hidden sm:h-52">
            <img
              src={driveImageUrl(event.banner_image || event.cover_image)}
              alt={event.title}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/placeholder-event.svg';
              }}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#0d0d0f] via-transparent to-transparent" />
          </div>
        )}

        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full border border-white/12 bg-black/50 p-1.5 text-white/60 backdrop-blur-sm transition hover:bg-white/12 hover:text-white"
        >
          <X className="size-4" />
        </button>

        {/* content */}
        <div className="overflow-y-auto px-6 pt-4 pb-6">
          {/* badges */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${catMeta.color}`}
            >
              {event.category}
            </span>
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.color}`}
            >
              <span
                className={`inline-block size-1.5 rounded-full ${statusMeta.dot}`}
              />
              {statusMeta.label}
            </span>
            {event.is_featured && (
              <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-xs text-amber-400">
                <Star className="size-3" />
                Featured
              </span>
            )}
          </div>

          <h2 className="mb-1 text-xl leading-snug font-bold text-white">
            {event.title}
          </h2>
          {event.description && (
            <p className="mb-4 text-sm leading-relaxed text-white/50">
              {event.description}
            </p>
          )}

          {/* details grid */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              {
                icon: Calendar,
                label: 'Start',
                value: formatDateTime(event.start_date),
              },
              event.end_date && {
                icon: Clock,
                label: 'End',
                value: formatDateTime(event.end_date),
              },
              { icon: MapPin, label: 'Location', value: event.location },
              { icon: VenueIcon, label: 'Mode', value: venueMeta.label },
              event.max_participants && {
                icon: Users,
                label: 'Capacity',
                value: `${event.max_participants} participants`,
              },
              event.registration_deadline && {
                icon: Timer,
                label: 'Reg. Deadline',
                value: formatDateTime(event.registration_deadline),
              },
            ]
              .filter(Boolean)
              .map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/8 bg-white/3 p-2.5"
                >
                  <p className="mb-0.5 flex items-center gap-1 text-[10px] tracking-wider text-white/30 uppercase">
                    <Icon className="size-3" />
                    {label}
                  </p>
                  <p className="text-xs text-white/65">{value}</p>
                </div>
              ))}
          </div>

          {/* content / agenda */}
          {event.content && (
            <div className="mb-4 rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="mb-2 text-xs font-semibold tracking-wider text-white/30 uppercase">
                Details
              </p>
              <div
                className="blog-content text-sm leading-relaxed text-white/55"
                dangerouslySetInnerHTML={{ __html: event.content }}
              />
            </div>
          )}

          {/* tags */}
          {event.tags?.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5 text-xs text-white/45"
                >
                  <Tag className="size-3" />
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* deadline warning */}
          {deadline?.urgent && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-2.5">
              <AlertCircle className="size-4 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-400">{deadline.label}</p>
            </div>
          )}

          {/* guest CTA */}
          <div className="rounded-xl border border-violet-400/20 bg-linear-to-br from-violet-500/8 to-transparent p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-violet-400" />
              <p className="text-sm font-semibold text-white/80">
                Member-only benefits available
              </p>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-white/40">
              Club members get priority registration, exclusive materials,
              discounts, and post-event recordings.
            </p>
            <div className="flex flex-wrap gap-2">
              {canRegister && event.registration_url && (
                <a
                  href={event.registration_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white/80"
                >
                  Register as Guest
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* external event link */}
          {event.external_url && (
            <div className="mt-3">
              <a
                href={event.external_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/3 py-2.5 text-sm text-white/50 transition hover:bg-white/6 hover:text-white/80"
              >
                <Globe className="size-4" />
                Visit Event Page
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuestEventsClient({ events }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('soonest');

  const featured = events.filter(
    (e) => e.is_featured && ['upcoming', 'ongoing'].includes(e.status)
  );
  const topFeatured = featured[0] ?? null;

  // derive available filters from data
  const categories = [
    'all',
    ...new Set(events.map((e) => e.category).filter(Boolean)),
  ];
  const venueTypes = [
    'all',
    ...new Set(events.map((e) => e.venue_type).filter(Boolean)),
  ];

  const filtered = useMemo(() => {
    let arr = events.filter((e) => {
      const matchSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.location ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCat =
        categoryFilter === 'all' || e.category === categoryFilter;
      const matchVenue = venueFilter === 'all' || e.venue_type === venueFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchCat && matchVenue && matchStatus;
    });

    arr = [...arr].sort((a, b) => {
      if (sort === 'soonest')
        return new Date(a.start_date) - new Date(b.start_date);
      if (sort === 'newest')
        return new Date(b.created_at) - new Date(a.created_at);
      if (sort === 'oldest')
        return new Date(a.start_date) - new Date(b.start_date);
      if (sort === 'deadline') {
        const da = a.registration_deadline
          ? new Date(a.registration_deadline)
          : Infinity;
        const db = b.registration_deadline
          ? new Date(b.registration_deadline)
          : Infinity;
        return da - db;
      }
      return 0;
    });

    return arr;
  }, [events, search, categoryFilter, venueFilter, statusFilter, sort]);

  // stats
  const upcoming = events.filter((e) => e.status === 'upcoming').length;
  const ongoing = events.filter((e) => e.status === 'ongoing').length;
  const completed = events.filter((e) => e.status === 'completed').length;

  return (
    <>
      <EventModal event={selected} onClose={() => setSelected(null)} />

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Browse Events
          </h1>
          <p className="text-sm text-white/40">
            Explore workshops, contests & meetups hosted by NEUPC
          </p>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Upcoming',
            value: upcoming,
            icon: Calendar,
            color: 'text-emerald-400',
          },
          {
            label: 'Ongoing',
            value: ongoing,
            icon: Sparkles,
            color: 'text-cyan-400',
          },
          {
            label: 'Completed',
            value: completed,
            icon: CheckCircle2,
            color: 'text-white/40',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <button
            key={label}
            onClick={() =>
              setStatusFilter(
                statusFilter === label.toLowerCase()
                  ? 'all'
                  : label.toLowerCase()
              )
            }
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
              statusFilter === label.toLowerCase()
                ? 'border-white/20 bg-white/8'
                : 'border-white/8 bg-white/3 hover:bg-white/5'
            }`}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5">
              <Icon className={`size-4 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Featured banner ── */}
      {topFeatured && (
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400/70 uppercase">
            <Star className="size-3.5" />
            Featured Event
          </p>
          <FeaturedBanner event={topFeatured} onOpen={setSelected} />
        </div>
      )}

      {/* ── Filters & search ── */}
      <div className="space-y-3">
        {/* search + sort row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-xl border border-white/8 bg-white/4 py-2.5 pr-4 pl-9 text-sm text-white placeholder-white/30 transition outline-none focus:border-white/20 focus:bg-white/6"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white/70 transition outline-none focus:border-white/16"
          >
            <option value="soonest">Soonest First</option>
            <option value="newest">Newest Added</option>
            <option value="oldest">Oldest First</option>
            <option value="deadline">Closing Soon</option>
          </select>
        </div>

        {/* chips row */}
        <div className="flex flex-wrap gap-2">
          {/* status tabs */}
          <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
            {['all', 'upcoming', 'ongoing', 'completed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
                  statusFilter === s
                    ? 'bg-white/12 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* category chips */}
          {categories.length > 2 &&
            categories.map((cat) => {
              const m = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                    categoryFilter === cat
                      ? cat === 'all'
                        ? 'border-white/20 bg-white/12 text-white'
                        : m?.color
                      : 'border-white/8 bg-white/3 text-white/40 hover:text-white/70'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              );
            })}

          {/* venue type chips */}
          {venueTypes.length > 2 &&
            venueTypes.map((v) => {
              const m = VENUE_META[v];
              return (
                <button
                  key={v}
                  onClick={() => setVenueFilter(v)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium transition ${
                    venueFilter === v
                      ? 'border-white/20 bg-white/12 text-white'
                      : 'border-white/8 bg-white/3 text-white/40 hover:text-white/70'
                  }`}
                >
                  {v === 'all' ? (
                    'All Venues'
                  ) : (
                    <>
                      {m && <m.icon className={`size-3 ${m.color}`} />}
                      {m?.label ?? v}
                    </>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* ── Events Grid / Empty State ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/8 bg-white/3 py-20">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
            <Calendar className="size-7 text-white/20" />
          </div>
          <div className="text-center">
            <p className="font-medium text-white/60">No events found</p>
            <p className="mt-1 text-sm text-white/30">
              {events.length === 0
                ? 'Check back later for upcoming activities.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
          {(search ||
            categoryFilter !== 'all' ||
            venueFilter !== 'all' ||
            statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setVenueFilter('all');
                setStatusFilter('all');
              }}
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2 text-xs text-white/50 transition hover:bg-white/8"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-white/30">
            Showing <span className="text-white/60">{filtered.length}</span> of{' '}
            {events.length} events
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} onOpen={setSelected} />
            ))}
          </div>
        </>
      )}

      {/* ── Membership CTA banner section removed ── */}
    </>
  );
}
