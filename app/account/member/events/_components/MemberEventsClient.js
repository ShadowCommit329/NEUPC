/**
 * @file Member events client — browsable list of published events
 *   with registration controls and attendance tracking.
 * @module MemberEventsClient
 */

'use client';

import {
  useState,
  useMemo,
  useTransition,
  useEffect,
  useCallback,
} from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Search,
  X,
  ChevronDown,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  ArrowRight,
  Filter,
  ExternalLink,
  Ticket,
  CalendarDays,
  Trophy,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import {
  registerForEventAction,
  cancelEventRegistrationAction,
} from '@/app/_lib/member-events-actions';
import { driveImageUrl } from '@/app/_lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function isPast(iso) {
  return iso ? new Date(iso) < new Date() : false;
}

function isSoon(iso) {
  if (!iso) return false;
  const diff = new Date(iso) - new Date();
  return diff > 0 && diff < 48 * 3600 * 1000;
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(targetIso) {
  const calc = useCallback(() => {
    const diff = new Date(targetIso) - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s };
  }, [targetIso]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  Workshop: {
    color: 'text-blue-300',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
  },
  Contest: {
    color: 'text-yellow-300',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/25',
  },
  Seminar: {
    color: 'text-green-300',
    bg: 'bg-green-500/15',
    border: 'border-green-500/25',
  },
  Bootcamp: {
    color: 'text-purple-300',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/25',
  },
  Hackathon: {
    color: 'text-red-300',
    bg: 'bg-red-500/15',
    border: 'border-red-500/25',
  },
  Meetup: {
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/25',
  },
  Other: {
    color: 'text-gray-400',
    bg: 'bg-gray-500/15',
    border: 'border-gray-500/25',
  },
};

const STATUS_STYLES = {
  upcoming: {
    label: 'Upcoming',
    color: 'text-blue-300',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/20',
  },
  ongoing: {
    label: 'Live Now',
    color: 'text-green-300',
    bg: 'bg-green-500/15',
    border: 'border-green-500/20',
  },
  completed: {
    label: 'Completed',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

const REG_STATUS_STYLES = {
  registered: {
    label: 'Registered',
    color: 'text-green-300',
    bg: 'bg-green-500/15',
    border: 'border-green-500/25',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-blue-300',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
  },
  attended: {
    label: 'Attended',
    color: 'text-purple-300',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/25',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

function catStyle(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

// ─── Flash Message ────────────────────────────────────────────────────────────

function Flash({ msg }) {
  if (!msg) return null;
  const isErr = msg.type === 'error';
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        isErr
          ? 'border-red-500/25 bg-red-500/8 text-red-300'
          : 'border-green-500/25 bg-green-500/8 text-green-300'
      }`}
    >
      {isErr ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      )}
      {msg.text}
    </div>
  );
}

// ─── RSVP Button ──────────────────────────────────────────────────────────────

function RSVPButton({ event, regStatus, userId, onDone, compact, isTeamLeader }) {
  const [pending, startTransition] = useTransition();
  const isRegistered = regStatus && regStatus !== 'cancelled';
  const isTeamEvent = event.participation_type === 'team';
  const isFull =
    event.max_participants &&
    (event.registration_count ?? 0) >= event.max_participants &&
    !isRegistered;
  const isClosed = !['upcoming', 'ongoing'].includes(event.status);
  const deadlinePassed =
    event.registration_deadline &&
    new Date(event.registration_deadline) < new Date();

  const disabled = pending || isFull || isClosed || deadlinePassed;

  const handleRegister = () => {
    startTransition(async () => {
      const res = await registerForEventAction(event.id);
      onDone(
        res.error
          ? { type: 'error', text: res.error }
          : { type: 'success', text: `Registered for "${event.title}"!` }
      );
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const res = await cancelEventRegistrationAction(event.id);
      onDone(
        res.error
          ? { type: 'error', text: res.error }
          : { type: 'success', text: 'Registration cancelled.' }
      );
    });
  };

  if (isRegistered) {
    // Only team leaders (or individual registrants) can cancel
    const canCancel = !isClosed && isTeamLeader !== false;
    return (
      <div className="flex gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
            compact ? '' : 'flex-1 justify-center'
          } border-green-500/25 bg-green-500/10 text-green-300`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Registered
        </div>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={pending}
            className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs text-gray-500 transition-colors hover:border-red-500/20 hover:bg-red-500/8 hover:text-red-300 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {!compact && 'Cancel'}
          </button>
        )}
      </div>
    );
  }

  if (isFull)
    return (
      <div
        className={`flex items-center justify-center gap-1.5 rounded-xl border border-gray-500/20 bg-gray-500/8 px-3 py-2 text-xs font-semibold text-gray-500 ${compact ? '' : 'w-full'}`}
      >
        Full
      </div>
    );

  if (isClosed || deadlinePassed)
    return (
      <div
        className={`flex items-center justify-center gap-1.5 rounded-xl border border-gray-500/20 bg-gray-500/8 px-3 py-2 text-xs font-semibold text-gray-500 ${compact ? '' : 'w-full'}`}
      >
        Closed
      </div>
    );

  // Team events require the full team builder — link to event page
  if (isTeamEvent) {
    const slug = event.slug || event.id;
    return (
      <Link
        href={`/events/${slug}`}
        className={`flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-300 transition-all hover:bg-blue-500/25 ${
          compact ? '' : 'w-full justify-center'
        }`}
      >
        <Users className="h-3.5 w-3.5" />
        {compact ? 'Team' : 'Register Team →'}
      </Link>
    );
  }

  return (
    <button
      onClick={handleRegister}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-300 transition-all hover:bg-blue-500/25 disabled:opacity-50 ${
        compact ? '' : 'w-full justify-center'
      }`}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Ticket className="h-3.5 w-3.5" />
      )}
      {!compact && 'Register'}
      {compact && (pending ? '' : 'RSVP')}
    </button>
  );
}

// ─── Countdown Display ────────────────────────────────────────────────────────

function Countdown({ targetIso }) {
  const t = useCountdown(targetIso);
  if (!t) return <span className="text-[11px] text-gray-600">Started</span>;
  return (
    <div className="flex items-center gap-1.5">
      {t.d > 0 && (
        <span className="text-xs font-bold text-white tabular-nums">
          {t.d}
          <span className="ml-0.5 text-[10px] font-normal text-gray-600">
            d
          </span>
        </span>
      )}
      <span className="text-xs font-bold text-white tabular-nums">
        {String(t.h).padStart(2, '0')}
        <span className="ml-0.5 text-[10px] font-normal text-gray-600">h</span>
      </span>
      <span className="text-xs font-bold text-white tabular-nums">
        {String(t.m).padStart(2, '0')}
        <span className="ml-0.5 text-[10px] font-normal text-gray-600">m</span>
      </span>
      <span className="text-xs font-bold text-white tabular-nums">
        {String(t.s).padStart(2, '0')}
        <span className="ml-0.5 text-[10px] font-normal text-gray-600">s</span>
      </span>
    </div>
  );
}

// ─── Featured Event Hero ──────────────────────────────────────────────────────

function FeaturedHero({ event, regInfo, userId, onFlash }) {
  const cs = catStyle(event.category);
  const ss = STATUS_STYLES[event.status] || STATUS_STYLES.upcoming;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      {/* Background image or gradient */}
      {event.cover_image ? (
        <img
          src={driveImageUrl(event.cover_image)}
          alt=""
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/placeholder-event.svg';
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      ) : null}
      <div className="absolute inset-0 bg-linear-to-br from-blue-900/60 via-purple-900/40 to-black/80" />

      <div className="relative z-10 p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-semibold tracking-wider text-yellow-300 uppercase">
            Featured Event
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cs.bg} ${cs.border} ${cs.color}`}
          >
            {event.category}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${ss.bg} ${ss.border} ${ss.color}`}
          >
            {ss.label}
          </span>
          {isToday(event.start_date) && (
            <span className="animate-pulse rounded-full border border-green-500/30 bg-green-500/20 px-2.5 py-0.5 text-[10px] font-bold text-green-300">
              TODAY
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold text-white sm:text-2xl lg:text-3xl">
          {event.title}
        </h2>
        {event.description && (
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-gray-400">
            {event.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-blue-400" />
            {fmtDateTime(event.start_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-pink-400" />
            {event.location}
          </span>
          {event.max_participants && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-green-400" />
              {event.max_participants} seats
            </span>
          )}
        </div>

        {/* Countdown */}
        {event.status === 'upcoming' && (
          <div className="mt-4 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-500" />
            <span className="mr-1 text-[11px] text-gray-500">Starts in</span>
            <Countdown targetIso={event.start_date} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <RSVPButton
            event={event}
            regStatus={regInfo?.status}
            userId={userId}
            onDone={onFlash}
            compact={false}
            isTeamLeader={regInfo?.isTeamLeader}
          />
          {event.external_url && (
            <a
              href={event.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10"
            >
              Details <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, regInfo, userId, onFlash }) {
  const cs = catStyle(event.category);
  const ss = STATUS_STYLES[event.status] || STATUS_STYLES.upcoming;
  const registeredCount = event.registration_count ?? 0;
  const seatsLeft = event.max_participants
    ? event.max_participants - registeredCount
    : null;
  const almostFull = seatsLeft !== null && seatsLeft <= 5 && seatsLeft > 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-all hover:border-white/15 hover:bg-white/5">
      {/* Image / cover */}
      <div className="relative h-36 overflow-hidden bg-linear-to-br from-gray-800 to-gray-900">
        {event.cover_image && (
          <img
            src={driveImageUrl(event.cover_image)}
            alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/placeholder-event.svg';
            }}
            className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {/* Overlaid badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase backdrop-blur-sm ${cs.bg} ${cs.border} ${cs.color}`}
          >
            {event.category}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold backdrop-blur-sm ${ss.bg} ${ss.border} ${ss.color}`}
          >
            {ss.label}
          </span>
        </div>
        {event.is_featured && (
          <div className="absolute top-2.5 right-2.5">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
          </div>
        )}
        {isToday(event.start_date) && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="animate-pulse rounded-full border border-green-500/40 bg-green-500/25 px-2 py-0.5 text-[9px] font-bold text-green-300 backdrop-blur-sm">
              TODAY
            </span>
          </div>
        )}
        {isSoon(event.start_date) && !isToday(event.start_date) && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/20 px-2 py-0.5 text-[9px] font-bold text-yellow-300 backdrop-blur-sm">
              SOON
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm leading-snug font-bold text-white">
          {event.title}
        </h3>

        <div className="mt-2.5 space-y-1.5 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0 text-blue-400" />
            <span className="truncate">{fmtDate(event.start_date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-pink-400" />
            <span className="truncate">{event.location}</span>
            {event.venue_type && event.venue_type !== 'offline' && (
              <span className="rounded-sm bg-white/8 px-1 py-0.5 text-[9px] capitalize">
                {event.venue_type}
              </span>
            )}
          </div>
          {seatsLeft !== null && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 shrink-0 text-green-400" />
              {seatsLeft === 0 ? (
                <span className="font-medium text-red-400">Fully booked</span>
              ) : (
                <span
                  className={almostFull ? 'font-medium text-orange-400' : ''}
                >
                  {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left
                  {almostFull && ' — hurry!'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Countdown for upcoming */}
        {event.status === 'upcoming' && !isPast(event.start_date) && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-gray-600" />
            <Countdown targetIso={event.start_date} />
          </div>
        )}

        <div className="flex-1" />

        {/* Registration deadline warning */}
        {event.registration_deadline &&
          !isPast(event.registration_deadline) &&
          isSoon(event.registration_deadline) && (
            <p className="mt-2.5 text-[10px] text-orange-400">
              ⚠ Registration closes {fmtDateTime(event.registration_deadline)}
            </p>
          )}

        <div className="mt-3.5">
          <RSVPButton
            event={event}
            regStatus={regInfo?.status}
            userId={userId}
            onDone={onFlash}
            compact={false}
            isTeamLeader={regInfo?.isTeamLeader}
          />
        </div>
      </div>
    </div>
  );
}

// ─── My Registration Row ──────────────────────────────────────────────────────

function MyRegRow({ reg, userId, onFlash }) {
  const event = reg.events;
  if (!event) return null;
  const rs = REG_STATUS_STYLES[reg.status] || REG_STATUS_STYLES.registered;
  const ss = STATUS_STYLES[event.status] || STATUS_STYLES.upcoming;
  const isPastEvent = isPast(event.start_date);
  const isLeader = reg.isTeamLeader !== false;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-4 py-3 transition-colors hover:bg-white/4">
      {/* Date block */}
      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/8 bg-white/4 py-2 text-center">
        <span className="text-[10px] font-semibold text-gray-500 uppercase">
          {new Date(event.start_date).toLocaleDateString('en-US', {
            month: 'short',
          })}
        </span>
        <span className="text-lg leading-none font-bold text-white tabular-nums">
          {new Date(event.start_date).getDate()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-200">
            {event.title}
          </p>
          {reg.team_name && (
            <span className="shrink-0 rounded-md bg-white/8 px-1.5 py-0.5 text-[9px] text-gray-500">
              {isLeader ? 'Team Leader' : 'Team Member'}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-600">
          <span className="flex items-center gap-0.5">
            <Calendar className="h-2.5 w-2.5" />
            {fmtDateTime(event.start_date)}
          </span>
          <span
            className={`rounded-full border px-1.5 py-0.5 font-semibold ${ss.bg} ${ss.border} ${ss.color}`}
          >
            {ss.label}
          </span>
          {reg.team_name && (
            <span className="text-gray-600">
              Team: {reg.team_name}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${rs.bg} ${rs.border} ${rs.color}`}
        >
          {rs.label}
        </span>
        {reg.status === 'registered' && !isPastEvent && isLeader && (
          <RSVPButton
            event={event}
            regStatus={reg.status}
            userId={userId}
            onDone={onFlash}
            compact={true}
            isTeamLeader={reg.isTeamLeader}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemberEventsClient({
  events,
  myRegistrations,
  userId,
}) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [flash, setFlash] = useState(null);

  // Auto-hide flash after 4s
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  // Build a lookup: eventId → { status, isTeamLeader }
  const regMap = useMemo(() => {
    const m = {};
    for (const r of myRegistrations) {
      if (r.event_id) {
        m[r.event_id] = { status: r.status, isTeamLeader: r.isTeamLeader };
      }
    }
    return m;
  }, [myRegistrations]);

  // Active (non-cancelled) registrations with event data
  const activeRegs = useMemo(
    () => myRegistrations.filter((r) => r.status !== 'cancelled' && r.events),
    [myRegistrations]
  );
  const pastRegs = useMemo(
    () =>
      myRegistrations.filter((r) => r.events && isPast(r.events.start_date)),
    [myRegistrations]
  );

  // Featured event
  const featuredEvent = useMemo(
    () =>
      events.find(
        (e) => e.is_featured && ['upcoming', 'ongoing'].includes(e.status)
      ) || null,
    [events]
  );

  // Categories for filter
  const categories = useMemo(
    () => ['all', ...new Set(events.map((e) => e.category).filter(Boolean))],
    [events]
  );

  // Upcoming / ongoing events (not past)
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => ['upcoming', 'ongoing'].includes(e.status))
      .filter((e) => {
        if (catFilter !== 'all' && e.category !== catFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
        );
      });
  }, [events, search, catFilter]);

  // Past / completed events
  const pastEvents = useMemo(() => {
    return events
      .filter((e) => ['completed', 'cancelled'].includes(e.status))
      .filter((e) => {
        if (catFilter !== 'all' && e.category !== catFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [events, search, catFilter]);

  function TabBtn({ id, label, count, alert }) {
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
          activeTab === id
            ? 'bg-white/12 text-white shadow-sm'
            : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
        }`}
      >
        {label}
        {count !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              alert
                ? 'bg-blue-500/20 text-blue-400'
                : activeTab === id
                  ? 'bg-white/15 text-white'
                  : 'bg-white/6 text-gray-600'
            }`}
          >
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Events</h1>
        <p className="text-sm text-gray-500">
          Discover, join, and track club events
        </p>
      </div>

      {/* ── Flash ──────────────────────────────────────────────────────── */}
      {flash && <Flash msg={flash} />}

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {[
          {
            icon: CalendarDays,
            label: 'Upcoming',
            value: events.filter((e) => e.status === 'upcoming').length,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            icon: Ticket,
            label: 'Registered',
            value: activeRegs.length,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
          {
            icon: Trophy,
            label: 'Attended',
            value: myRegistrations.filter((r) => r.status === 'attended')
              .length,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}
            >
              <Icon className={`h-4.5 w-4.5 ${color}`} />
            </div>
            <div>
              <p className="text-xl leading-none font-bold text-white tabular-nums">
                {value}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search events by name, location, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/4 py-2.5 pr-8 pl-9 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:bg-white/6 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <Tag className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-7 pl-8 text-sm text-white focus:border-white/20 focus:outline-none sm:w-40 [&>option]:bg-gray-900"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* ── Featured Hero (only on Upcoming tab) ────────────────────────── */}
      {activeTab === 'upcoming' && featuredEvent && (
        <FeaturedHero
          event={featuredEvent}
          regInfo={regMap[featuredEvent.id]}
          userId={userId}
          onFlash={setFlash}
        />
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-1.5">
        <TabBtn
          id="upcoming"
          label="Upcoming"
          count={upcomingEvents.length}
          alert={upcomingEvents.length > 0}
        />
        <TabBtn id="my" label="My Events" count={activeRegs.length} />
        <TabBtn id="past" label="Past Events" count={pastEvents.length} />
      </div>

      {/* ═════════════════════════════════════════════════════════════════
           TAB: UPCOMING
      ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'upcoming' && (
        <>
          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
              <CalendarDays className="mb-3 h-12 w-12 text-gray-700" />
              <p className="text-sm font-medium text-gray-500">
                No upcoming events
              </p>
              <p className="mt-1 text-xs text-gray-700">
                Check back soon for new events
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  regInfo={regMap[event.id]}
                  userId={userId}
                  onFlash={setFlash}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════
           TAB: MY EVENTS
      ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Ticket className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">
              My Registered Events
            </h2>
            <span className="ml-auto rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-300">
              {activeRegs.length} active
            </span>
          </div>

          {activeRegs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Ticket className="mb-3 h-10 w-10 text-gray-700" />
              <p className="text-sm font-medium text-gray-500">
                No active registrations
              </p>
              <button
                onClick={() => setActiveTab('upcoming')}
                className="mt-3 flex items-center gap-1 text-xs text-blue-400 transition-colors hover:text-blue-300"
              >
                Browse upcoming events <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRegs.map((reg) => (
                <MyRegRow
                  key={reg.id}
                  reg={reg}
                  userId={userId}
                  onFlash={setFlash}
                />
              ))}
            </div>
          )}

          {/* Cancelled registrations (collapsible would be ideal but keeping it simple) */}
          {myRegistrations.filter((r) => r.status === 'cancelled' && r.events)
            .length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-400">
                {myRegistrations.filter((r) => r.status === 'cancelled').length}{' '}
                cancelled registration(s)
              </summary>
              <div className="mt-2 space-y-2 opacity-60">
                {myRegistrations
                  .filter((r) => r.status === 'cancelled' && r.events)
                  .map((reg) => (
                    <MyRegRow
                      key={reg.id}
                      reg={reg}
                      userId={userId}
                      onFlash={setFlash}
                    />
                  ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
           TAB: PAST EVENTS
      ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'past' && (
        <>
          {pastEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
              <Trophy className="mb-3 h-12 w-12 text-gray-700" />
              <p className="text-sm font-medium text-gray-500">
                No past events
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => {
                const reg = myRegistrations.find(
                  (r) => r.event_id === event.id
                );
                const cs = catStyle(event.category);
                const ss =
                  STATUS_STYLES[event.status] || STATUS_STYLES.completed;
                const rs = reg
                  ? REG_STATUS_STYLES[reg.status] ||
                    REG_STATUS_STYLES.registered
                  : null;

                return (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/6 bg-white/2 p-4 opacity-80"
                  >
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${cs.bg} ${cs.border} ${cs.color}`}
                      >
                        {event.category}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${ss.bg} ${ss.border} ${ss.color}`}
                      >
                        {ss.label}
                      </span>
                      {rs && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${rs.bg} ${rs.border} ${rs.color}`}
                        >
                          {rs.label}
                        </span>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-300">
                      {event.title}
                    </h3>
                    <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(event.start_date)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
