/**
 * @file Member Events Client — redesigned to match Linear/Vercel dark UI.
 * @module MemberEventsClient
 */

'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Filter,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Ticket,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import {
  registerForEventAction,
  cancelEventRegistrationAction,
} from '@/app/_lib/member-events-actions';

// ─── Mock data (shown when server returns nothing) ────────────────────────────

const now = new Date();
const d = (daysOffset, h = 10) => {
  const t = new Date(now);
  t.setDate(t.getDate() + daysOffset);
  t.setHours(h, 0, 0, 0);
  return t.toISOString();
};

const MOCK_EVENTS = [
  {
    id: 'ev-1',
    title: 'React Advanced Workshop',
    description: 'Deep-dive into React 19 concurrent features, Suspense, and server components with hands-on exercises.',
    kind: 'Workshop',
    kindTone: 'accent',
    start_date: d(5, 10),
    duration: '3h',
    location: 'Lab 301',
    host: 'Shafin Rahman',
    max_participants: 30,
    registration_count: 24,
    status: 'upcoming',
    registered: false,
  },
  {
    id: 'ev-2',
    title: 'Spring Hackathon 2026',
    description: '24-hour hackathon open to all members. Form teams of 2-4 and build something amazing.',
    kind: 'Hackathon',
    kindTone: 'warning',
    start_date: d(12, 9),
    duration: '24h',
    location: 'Main Hall',
    host: 'NEUPC Board',
    max_participants: 80,
    registration_count: 47,
    status: 'upcoming',
    registered: true,
  },
  {
    id: 'ev-3',
    title: 'Git & GitHub Mastery',
    description: 'From branching strategies to CI/CD pipelines. Practical session for all skill levels.',
    kind: 'Seminar',
    kindTone: 'info',
    start_date: d(18, 14),
    duration: '2h',
    location: 'Online (Zoom)',
    host: 'Raisa Hossain',
    max_participants: 100,
    registration_count: 63,
    status: 'upcoming',
    registered: false,
  },
  {
    id: 'ev-4',
    title: 'CTF Competition — Season 3',
    description: 'Capture the Flag cybersecurity challenge. Beginner-friendly with prizes for top 3 teams.',
    kind: 'Contest',
    kindTone: 'danger',
    start_date: d(25, 13),
    duration: '6h',
    location: 'CSE Building',
    host: 'Security SIG',
    max_participants: 50,
    registration_count: 50,
    status: 'upcoming',
    registered: false,
  },
];

const MOCK_PAST_EVENTS = [
  { id: 'pev-1', title: 'Python Bootcamp — Cohort 4', kind: 'Bootcamp', start_date: d(-30), attended: true },
  { id: 'pev-2', title: 'Open Source Contribution Day', kind: 'Workshop', start_date: d(-60), attended: true },
  { id: 'pev-3', title: 'UI/UX Design Fundamentals', kind: 'Seminar', start_date: d(-90), attended: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMonth(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function fmtDay(iso) {
  return new Date(iso).getDate();
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function isPast(iso) {
  return iso ? new Date(iso) < new Date() : false;
}

// ─── Tone → banner style ──────────────────────────────────────────────────────

const TONE_BANNER = {
  accent:  'radial-gradient(circle at 90% 10%, rgba(124,131,255,0.12), transparent 55%), #1a1a2e',
  warning: 'radial-gradient(circle at 90% 10%, rgba(251,191,36,0.12), transparent 55%), #1e1a0e',
  info:    'radial-gradient(circle at 90% 10%, rgba(96,165,250,0.12), transparent 55%), #0e1a22',
  danger:  'radial-gradient(circle at 90% 10%, rgba(248,113,113,0.12), transparent 55%), #200e0e',
};

const TONE_PILL = {
  accent:  'bg-indigo-500/20 text-indigo-300 border border-indigo-500/25',
  warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/25',
  info:    'bg-blue-500/20 text-blue-300 border border-blue-500/25',
  danger:  'bg-red-500/20 text-red-300 border border-red-500/25',
};

// ─── RSVPButton ───────────────────────────────────────────────────────────────

function RSVPButton({ event, registered, onDone, small = false }) {
  const [pending, startTransition] = useTransition();

  const isFull = event.max_participants && event.registration_count >= event.max_participants && !registered;

  const handleRegister = () => {
    startTransition(async () => {
      const res = await registerForEventAction(event.id);
      onDone(res.error ? { type: 'error', text: res.error } : { type: 'success', text: `Registered for "${event.title}"!` });
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const res = await cancelEventRegistrationAction(event.id);
      onDone(res.error ? { type: 'error', text: res.error } : { type: 'success', text: 'Registration cancelled.' });
    });
  };

  const base = small
    ? 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors'
    : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors';

  if (registered) {
    return (
      <span className={`${base} bg-green-500/15 text-green-300 border border-green-500/25`}>
        <CheckCircle2 className="h-3 w-3" /> Registered
      </span>
    );
  }

  if (isFull) {
    return <span className={`${base} bg-white/5 text-gray-500 border border-white/10`}>Full</span>;
  }

  return (
    <button onClick={handleRegister} disabled={pending} className={`${base} bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/25 disabled:opacity-50`}>
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ticket className="h-3 w-3" />}
      Register
    </button>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event, onFlash }) {
  const tone = event.kindTone || 'accent';
  const filled = event.max_participants ? Math.min(100, Math.round((event.registration_count / event.max_participants) * 100)) : 0;

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden flex flex-col" style={{ background: 'var(--bg-2, #111)' }}>
      {/* Banner */}
      <div className="relative px-5 pt-5 pb-4" style={bannerStyle(tone)}>
        <div className="flex items-start justify-between gap-3">
          {/* Date block */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/30 px-3 py-2 min-w-[52px] text-center backdrop-blur-sm">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{fmtMonth(event.start_date)}</span>
            <span className="text-2xl font-bold text-white leading-none tabular-nums">{fmtDay(event.start_date)}</span>
          </div>
          {/* Kind pill */}
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE_PILL[tone] || TONE_PILL.accent}`}>
            {event.kind}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 gap-2.5 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-white leading-snug">{event.title}</h3>
        {event.description && (
          <p className="text-[12.5px] text-gray-400 line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-gray-400 mt-0.5">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-gray-500" />
            {fmtTime(event.start_date)}{event.duration ? ` · ${event.duration}` : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-gray-500" />
            {event.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-gray-500" />
            {event.host}
          </span>
        </div>

        {/* Footer: attendee progress + action */}
        <div className="mt-auto pt-3 border-t border-white/6 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.registration_count}/{event.max_participants ?? '∞'} attending
              </span>
            </div>
            {event.max_participants && (
              <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${filled >= 90 ? 'bg-red-400' : filled >= 70 ? 'bg-yellow-400' : 'bg-indigo-400'}`}
                  style={{ width: `${filled}%` }}
                />
              </div>
            )}
          </div>
          <RSVPButton event={event} registered={event.registered} onFlash={onFlash} onDone={onFlash} small />
        </div>
      </div>
    </div>
  );
}

function bannerStyle(tone) {
  return { background: TONE_BANNER[tone] || TONE_BANNER.accent };
}

// ─── Flash ────────────────────────────────────────────────────────────────────

function Flash({ msg, onClose }) {
  const isErr = msg.type === 'error';
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${isErr ? 'border-red-500/25 bg-red-500/8 text-red-300' : 'border-green-500/25 bg-green-500/8 text-green-300'}`}>
      {isErr ? <XCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose}><X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" /></button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MemberEventsClient({ events: serverEvents, myRegistrations, userId }) {
  const useMock = true; // TODO: remove when DB is ready

  const [tab, setTab] = useState('all');
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  // Merge server data with mock
  const allEvents = useMemo(() => {
    if (useMock) return MOCK_EVENTS;
    const regMap = {};
    for (const r of myRegistrations) {
      if (r.event_id) regMap[r.event_id] = r.status !== 'cancelled';
    }
    return serverEvents.map((e) => ({
      ...e,
      kindTone: kindToTone(e.category || e.kind || ''),
      kind: e.category || e.kind || 'Event',
      registered: !!regMap[e.id],
    }));
  }, [serverEvents, myRegistrations, useMock]);

  const pastEvents = useMock ? MOCK_PAST_EVENTS : allEvents.filter((e) => isPast(e.start_date));
  const upcomingEvents = allEvents.filter((e) => !isPast(e.start_date));
  const registeredEvents = upcomingEvents.filter((e) => e.registered);
  const availableEvents = upcomingEvents.filter((e) => !e.registered);

  const TABS = [
    { id: 'all', label: 'All upcoming', count: upcomingEvents.length },
    { id: 'registered', label: 'Registered', count: registeredEvents.length },
    { id: 'available', label: 'Open to register', count: availableEvents.length },
    { id: 'past', label: 'Past events', count: pastEvents.length },
  ];

  const displayEvents =
    tab === 'all' ? upcomingEvents :
    tab === 'registered' ? registeredEvents :
    tab === 'available' ? availableEvents :
    [];

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">Events</h1>
          <p className="mt-1 text-[13px] text-white/40">Discover and join club activities</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/8 hover:text-white transition-colors">
          <Filter className="h-3.5 w-3.5" /> Filter
        </button>
      </div>

      {/* Flash */}
      {flash && <div className="mb-4"><Flash msg={flash} onClose={() => setFlash(null)} /></div>}

      {/* Tabs — underline style */}
      <div className="flex gap-0 border-b border-white/8 mb-6 overflow-x-auto scrollbar-none">
        {TABS.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              tab === id ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/6 text-gray-600'
            }`}>
              {count}
            </span>
            {tab === id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {tab !== 'past' && (
        displayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-white/6">
            <CalendarDays className="h-10 w-10 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">No events to show</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {displayEvents.map((event) => (
              <EventCard key={event.id} event={event} onFlash={setFlash} />
            ))}
          </div>
        )
      )}

      {/* Past events list */}
      {tab === 'past' && (
        <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: 'var(--bg-2, #111)' }}>
          {pastEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="h-10 w-10 text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">No past events</p>
            </div>
          ) : (
            pastEvents.map((e, i) => (
              <div
                key={e.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${i < pastEvents.length - 1 ? 'border-b border-white/6' : ''} hover:bg-white/[0.02] transition-colors`}
              >
                {e.attended
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                  : <XCircle className="h-4 w-4 shrink-0 text-gray-600" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{e.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{fmtDate(e.start_date)} · {e.kind}</p>
                </div>
                {e.attended !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    e.attended
                      ? 'bg-green-500/15 text-green-300 border-green-500/25'
                      : 'bg-white/5 text-gray-500 border-white/10'
                  }`}>
                    {e.attended ? 'Attended' : 'Missed'}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-gray-700 shrink-0" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function kindToTone(kind) {
  const k = kind.toLowerCase();
  if (k.includes('hack') || k.includes('contest') || k.includes('ctf') || k.includes('competition')) return 'warning';
  if (k.includes('seminar') || k.includes('talk') || k.includes('webinar') || k.includes('online')) return 'info';
  if (k.includes('urgent') || k.includes('cancel') || k.includes('alert')) return 'danger';
  return 'accent';
}
