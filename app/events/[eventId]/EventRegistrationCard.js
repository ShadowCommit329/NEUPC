/**
 * @file Client-side event registration card.
 *   Handles auth-gated registration for both individual and team events.
 *
 * @module EventRegistrationCard
 */

'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import {
  registerForEventAction,
  cancelEventRegistrationAction,
  searchUsersForTeamAction,
  getMyRegistrationAction,
  respondToTeamInviteAction,
} from '@/app/_lib/member-events-actions';

/* ── Icons ── */

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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

function IconX({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconUsers({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconMail({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function IconMapPin({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/* ── Section header ── */
function CardHeader({ accent = 'lime', children }) {
  const lineColor = accent === 'violet' ? 'bg-neon-violet' : accent === 'red' ? 'bg-red-500' : accent === 'amber' ? 'bg-amber-400' : 'bg-neon-lime';
  const textColor = accent === 'violet' ? 'text-neon-violet' : accent === 'red' ? 'text-red-400' : accent === 'amber' ? 'text-amber-400' : 'text-neon-lime';
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={`h-px w-5 ${lineColor}`} />
      <span className={`font-mono text-[10px] font-bold tracking-[0.4em] uppercase ${textColor}`}>{children}</span>
    </div>
  );
}

/* ── Team member search ── */

function MemberChip({ member, onRemove }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
      {member.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neon-violet/20 font-mono text-[10px] font-bold text-neon-violet">
          {member.full_name?.[0] || '?'}
        </span>
      )}
      <span className="max-w-[120px] truncate font-mono text-[11px] text-zinc-300">{member.full_name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="ml-0.5 text-zinc-600 transition-colors hover:text-red-400"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function TeamMemberSearch({ selectedMembers, onAdd, onRemove, maxMembers, eligibilityRaw, currentUserId, eventId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(
    async (q) => {
      if (q.trim().length < 2) { setResults([]); return; }
      setSearching(true);
      try {
        const roleId = eligibilityRaw && eligibilityRaw !== 'all' ? eligibilityRaw : undefined;
        const res = await searchUsersForTeamAction(q.trim(), roleId, eventId);
        if (res.users) {
          const selectedIds = new Set(selectedMembers.map((m) => m.id));
          setResults(res.users.filter((u) => !selectedIds.has(u.id)));
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [eligibilityRaw, selectedMembers, eventId]
  );

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const isFull = maxMembers && selectedMembers.length >= maxMembers - 1;

  return (
    <div className="space-y-3">
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map((m) => (
            <MemberChip key={m.id} member={m} onRemove={onRemove} />
          ))}
        </div>
      )}

      {!isFull && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-xs text-white placeholder-zinc-600 outline-none transition-all focus:border-neon-lime/40 focus:ring-1 focus:ring-neon-lime/20"
          />
          {searching && (
            <div className="absolute top-3 right-3">
              <Spinner className="h-4 w-4 text-zinc-500" />
            </div>
          )}
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0c0d14] shadow-2xl">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => { onAdd(user); setQuery(''); setResults([]); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neon-violet/20 font-mono text-[10px] font-bold text-neon-violet">
                      {user.full_name?.[0] || '?'}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-heading text-xs font-bold text-white">{user.full_name}</p>
                    <p className="truncate font-mono text-[10px] text-zinc-500">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {maxMembers && (
        <p className="font-mono text-[10px] text-zinc-600">
          {selectedMembers.length + 1} / {maxMembers} members · you are auto-included
        </p>
      )}
    </div>
  );
}

/* ── Main card ── */

export default function EventRegistrationCard({ event, session }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [loadingReg, setLoadingReg] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  const isLoggedIn = !!session?.user;
  const isTeamEvent = event.participation_type === 'team';
  const isCancelled = event.status === 'cancelled';
  const isActive = ['upcoming', 'ongoing'].includes(event.status);
  const isDeadlinePassed = event.registration_deadline && new Date(event.registration_deadline) < new Date();

  useEffect(() => {
    if (!isLoggedIn || !event.id) { setLoadingReg(false); return; }
    getMyRegistrationAction(event.id)
      .then((res) => { if (res.registration) setRegistration(res.registration); })
      .finally(() => setLoadingReg(false));
  }, [isLoggedIn, event.id]);

  const isRegistered = registration && registration.status !== 'cancelled';

  const handleRegister = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const teamData = isTeamEvent ? { teamName, teamMembers: teamMembers.map((m) => m.id) } : undefined;
      const result = await registerForEventAction(event.id, teamData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        const regRes = await getMyRegistrationAction(event.id);
        if (regRes.registration) setRegistration(regRes.registration);
      }
    });
  }, [event.id, isTeamEvent, teamName, teamMembers, startTransition]);

  const handleCancel = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await cancelEventRegistrationAction(event.id);
      if (result?.error) { setError(result.error); }
      else { setRegistration(null); setSuccess(false); }
    });
  }, [event.id, startTransition]);

  const addTeamMember = useCallback((user) => setTeamMembers((prev) => [...prev, user]), []);
  const removeTeamMember = useCallback((userId) => setTeamMembers((prev) => prev.filter((m) => m.id !== userId)), []);

  const handleInviteResponse = useCallback(
    (accept) => {
      setError(null);
      startTransition(async () => {
        const result = await respondToTeamInviteAction(registration.id, accept);
        if (result?.error) { setError(result.error); }
        else {
          const regRes = await getMyRegistrationAction(event.id);
          setRegistration(regRes.registration ?? null);
        }
      });
    },
    [registration, event.id, startTransition],
  );

  /* ── Cancelled ── */
  if (isCancelled) {
    return (
      <div className="holographic-card no-lift rounded-2xl border border-red-500/20 p-5 sm:p-6">
        <CardHeader accent="red">Event Cancelled</CardHeader>
        <p className="mb-5 text-sm leading-relaxed text-zinc-500">
          This event has been cancelled. Check out our other upcoming events.
        </p>
        <Link
          href="/events"
          className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
        >
          Browse Events →
        </Link>
      </div>
    );
  }

  /* ── No registration required ── */
  if (!event.registration_required) {
    return (
      <div className="holographic-card no-lift rounded-2xl border border-neon-lime/15 p-5 sm:p-6">
        <CardHeader accent="lime">Open to Everyone</CardHeader>
        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          No registration needed — just show up and join!
        </p>
        {event.location && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
            <IconMapPin className="h-3.5 w-3.5 shrink-0 text-neon-lime" />
            <span className="font-mono text-xs text-zinc-300">{event.location}</span>
          </div>
        )}
        <Link
          href="/events"
          className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
        >
          View All Events →
        </Link>
      </div>
    );
  }

  /* ── Non-leader team invitation ── */
  if (!loadingReg && registration && registration.isTeamLeader === false) {
    const myAcceptance = registration.myAcceptance ?? 'pending';

    if (myAcceptance === 'pending') {
      return (
        <div className="holographic-card no-lift rounded-2xl border border-amber-400/20 p-5 sm:p-6">
          <CardHeader accent="amber">Team Invitation</CardHeader>
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 p-3">
            <IconMail className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm leading-relaxed text-zinc-300">
              You&apos;ve been invited to team{' '}
              <span className="font-bold text-white">&ldquo;{registration.team_name}&rdquo;</span>.
              Accept or decline below.
            </p>
          </div>
          {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => handleInviteResponse(true)}
              disabled={isPending}
              className="group flex flex-1 items-center justify-center gap-2 rounded-full bg-neon-lime px-4 py-2.5 font-heading text-[10px] font-bold tracking-widest text-black uppercase transition-all hover:shadow-[0_0_20px_-5px_rgba(182,243,107,0.7)] disabled:opacity-50"
            >
              {isPending ? <Spinner className="h-3.5 w-3.5 text-black" /> : <><IconCheck className="h-3.5 w-3.5" /> Accept</>}
            </button>
            <button
              onClick={() => handleInviteResponse(false)}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2.5 font-heading text-[10px] font-bold tracking-widest text-red-400 uppercase transition-all hover:bg-red-500/20 disabled:opacity-50"
            >
              {isPending ? <Spinner className="h-3.5 w-3.5" /> : <><IconX className="h-3.5 w-3.5" /> Decline</>}
            </button>
          </div>
        </div>
      );
    }

    if (myAcceptance === 'declined') {
      const canReaccept = isActive && registration.status !== 'confirmed' && registration.status !== 'attended';
      return (
        <div className="holographic-card no-lift rounded-2xl border border-white/8 p-5 sm:p-6">
          <CardHeader accent="red">Invitation Declined</CardHeader>
          <p className="mb-4 text-sm leading-relaxed text-zinc-500">
            You declined the invitation to join team{' '}
            <span className="text-zinc-400">&ldquo;{registration.team_name}&rdquo;</span>.
          </p>
          {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}
          {canReaccept && (
            <button
              onClick={() => handleInviteResponse(true)}
              disabled={isPending}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-full border border-neon-lime/30 bg-neon-lime/10 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-neon-lime uppercase transition-all hover:bg-neon-lime/20 disabled:opacity-50"
            >
              {isPending ? <Spinner className="h-3.5 w-3.5" /> : 'Change Mind & Accept'}
            </button>
          )}
          <Link
            href="/events"
            className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-500 uppercase transition-all hover:text-zinc-300"
          >
            View All Events →
          </Link>
        </div>
      );
    }
  }

  /* ── Already registered ── */
  if (isRegistered && !loadingReg) {
    const regStatus = registration.status;

    if (regStatus === 'attended') {
      return (
        <div className="holographic-card no-lift rounded-2xl border border-neon-violet/20 p-5 sm:p-6">
          <CardHeader accent="violet">You Attended</CardHeader>
          {registration.team_name && (
            <p className="mb-2 font-mono text-xs text-neon-violet/80">
              Team: <span className="font-bold text-neon-violet">{registration.team_name}</span>
            </p>
          )}
          <p className="mb-5 text-sm leading-relaxed text-zinc-400">Thanks for joining. See you at the next one!</p>
          <Link
            href="/events"
            className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
          >
            Browse Events →
          </Link>
        </div>
      );
    }

    if (regStatus === 'confirmed') {
      return (
        <div className="holographic-card no-lift rounded-2xl border border-neon-lime/20 p-5 sm:p-6">
          <CardHeader accent="lime">Spot Confirmed</CardHeader>
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-neon-lime/15 bg-neon-lime/8 px-3 py-2.5">
            <IconCheck className="h-4 w-4 shrink-0 text-neon-lime" />
            <p className="font-mono text-xs text-neon-lime">Your registration has been confirmed!</p>
          </div>
          {registration.team_name && (
            <p className="mb-3 font-mono text-xs text-zinc-400">
              Team: <span className="text-white">{registration.team_name}</span>
              {registration.isTeamLeader === false && (
                <span className="ml-2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-500">member</span>
              )}
            </p>
          )}
          <p className="mb-4 text-xs leading-relaxed text-zinc-500">We look forward to seeing you there!</p>
          <Link
            href="/contact"
            className="mb-2 flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:text-zinc-200"
          >
            Need Changes? Contact Us
          </Link>
          <Link
            href="/events"
            className="flex w-full items-center justify-center rounded-full border border-white/8 bg-white/3 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-600 uppercase transition-all hover:text-zinc-400"
          >
            View All Events →
          </Link>
        </div>
      );
    }

    /* registered – pending confirmation */
    const isLeader = registration.isTeamLeader !== false;
    return (
      <div className="holographic-card no-lift rounded-2xl border border-neon-lime/15 p-5 sm:p-6">
        <CardHeader accent="lime">You&apos;re Registered</CardHeader>

        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-neon-lime/15 bg-neon-lime/8 px-3 py-2.5">
          <IconCheck className="h-4 w-4 shrink-0 text-neon-lime" />
          <p className="font-mono text-xs text-neon-lime">Awaiting organizer confirmation</p>
        </div>

        {registration.team_name && (
          <p className="mb-3 font-mono text-xs text-zinc-400">
            Team: <span className="text-white">{registration.team_name}</span>
            {!isLeader && (
              <span className="ml-2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-500">member</span>
            )}
          </p>
        )}

        {isLeader && registration.memberAcceptances && registration.memberAcceptances.length > 0 && (
          <div className="mb-4 rounded-xl border border-white/8 bg-white/3 p-3">
            <p className="mb-2 font-mono text-[9px] font-bold tracking-widest text-zinc-600 uppercase">Team Acceptance</p>
            <div className="space-y-1.5">
              {registration.memberAcceptances.map((m) => {
                const statusColor = m.status === 'accepted' ? 'text-neon-lime' : m.status === 'declined' ? 'text-red-400' : 'text-amber-400';
                const statusLabel = m.status === 'accepted' ? 'Accepted' : m.status === 'declined' ? 'Declined' : 'Pending';
                return (
                  <div key={m.user_id} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-zinc-400">
                      {m.users?.full_name ?? m.user_id}
                      {m.is_leader && <span className="ml-1 text-zinc-600">(you)</span>}
                    </span>
                    <span className={`font-mono text-[10px] font-bold ${statusColor}`}>{statusLabel}</span>
                  </div>
                );
              })}
            </div>
            {registration.memberAcceptances.some((m) => m.status === 'pending') && (
              <p className="mt-2 font-mono text-[10px] text-amber-400/80">
                Waiting for all members to accept.
              </p>
            )}
          </div>
        )}

        {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}

        {isActive && isLeader && (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-red-400 uppercase transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {isPending ? <Spinner className="h-3.5 w-3.5" /> : 'Cancel Registration'}
          </button>
        )}

        {isActive && !isLeader && (
          <Link
            href="/contact"
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:text-zinc-200"
          >
            Need Changes? Contact Us
          </Link>
        )}

        <Link
          href="/events"
          className="flex w-full items-center justify-center rounded-full border border-white/8 bg-white/3 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-600 uppercase transition-all hover:text-zinc-400"
        >
          View All Events →
        </Link>
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (loadingReg && isLoggedIn) {
    return (
      <div className="holographic-card no-lift rounded-2xl border border-white/8 p-5 sm:p-6">
        <div className="mb-4 h-3 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="mb-3 h-4 w-full animate-pulse rounded-lg bg-white/8" />
        <div className="mb-6 h-4 w-3/4 animate-pulse rounded-lg bg-white/6" />
        <div className="h-11 w-full animate-pulse rounded-full bg-white/10" />
      </div>
    );
  }

  /* ── Registration form ── */
  const canRegister = isActive && !isDeadlinePassed;

  return (
    <div className="holographic-card relative overflow-hidden rounded-2xl border border-neon-lime/15 p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-neon-lime/5 blur-2xl" />

      <div className="relative">
        <CardHeader accent="lime">{isTeamEvent ? 'Team Registration' : 'Registration'}</CardHeader>

        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          {isDeadlinePassed
            ? 'Registration deadline has passed.'
            : isTeamEvent
              ? `Form a team of ${event.team_size || 'any size'} and register together.`
              : 'Secure your spot and join fellow programmers for this event.'}
        </p>

        {isTeamEvent && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <IconUsers className="h-3.5 w-3.5 shrink-0 text-neon-violet" />
            <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
              Team Event{event.team_size ? ` · ${event.team_size} members` : ''}
            </span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-neon-lime/30 bg-neon-lime/10 p-3">
            <IconCheck className="h-4 w-4 shrink-0 text-neon-lime" />
            <span className="font-mono text-[11px] text-neon-lime">Registration successful!</span>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}

        {/* Deadline urgency — visible right above the register button */}
        {canRegister && event.registration_deadline && (() => {
          const daysLeft = Math.ceil((new Date(event.registration_deadline) - new Date()) / 86400000);
          if (daysLeft > 7) return null;
          return (
            <div className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${daysLeft <= 2 ? 'border-red-500/30 bg-red-500/10' : 'border-amber-400/25 bg-amber-400/8'}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full animate-pulse ${daysLeft <= 2 ? 'bg-red-400' : 'bg-amber-400'}`} />
              <p className={`font-mono text-[10px] font-bold tracking-wide ${daysLeft <= 2 ? 'text-red-400' : 'text-amber-400'}`}>
                {daysLeft <= 0 ? 'Closes today!' : daysLeft === 1 ? 'Closes tomorrow!' : `${daysLeft} days left to register`}
              </p>
            </div>
          );
        })()}

        {canRegister && (
          <>
            {!isLoggedIn ? (
              <div className="relative">
                <div className="pointer-events-none blur-[3px] select-none">
                  <div className="flex w-full items-center justify-center gap-2 rounded-full bg-neon-lime px-5 py-3 font-heading text-[11px] font-bold tracking-widest text-black uppercase">
                    {isTeamEvent ? 'Register Team' : 'Register Now'}
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <p className="font-heading text-xs font-bold text-white drop-shadow-lg">Sign in to register</p>
                  <Link
                    href="/login"
                    className="rounded-full bg-neon-lime px-5 py-1.5 font-heading text-[10px] font-bold tracking-widest text-black uppercase shadow-lg transition-all hover:opacity-90"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {isTeamEvent && (
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Team Name</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter team name"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-neon-lime/40 focus:ring-1 focus:ring-neon-lime/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Team Members</label>
                      <TeamMemberSearch
                        selectedMembers={teamMembers}
                        onAdd={addTeamMember}
                        onRemove={removeTeamMember}
                        maxMembers={event.team_size}
                        eligibilityRaw={event.eligibility_raw}
                        currentUserId={session?.user?.id}
                        eventId={event.id}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={
                    isPending ||
                    loadingReg ||
                    (isTeamEvent && !teamName.trim()) ||
                    (isTeamEvent && event.team_size && teamMembers.length !== event.team_size - 1)
                  }
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-neon-lime px-5 py-3 font-heading text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] transition-all hover:shadow-[0_0_40px_-5px_rgba(182,243,107,0.7)] disabled:opacity-50"
                >
                  {isPending || loadingReg ? (
                    <Spinner className="h-4 w-4 text-black" />
                  ) : (
                    <>
                      {isTeamEvent ? 'Register Team' : 'Register for Event'}
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </>
            )}
          </>
        )}

        {event.registration_url && canRegister && isLoggedIn && (
          <a
            href={event.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-300 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
          >
            External Registration ↗
          </a>
        )}

        <Link
          href="/events"
          className="mt-3 flex w-full items-center justify-center rounded-full border border-white/8 bg-white/3 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-600 uppercase transition-all hover:border-white/15 hover:text-zinc-400"
        >
          View All Events
        </Link>
      </div>
    </div>
  );
}
