/**
 * @file Client-side event registration card.
 *   Handles auth-gated registration for both individual and team events.
 *   Shows blurred button when not logged in, team builder for team events.
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Sub-components                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Spinner icon */
function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/** Arrow icon for buttons */
function ArrowIcon() {
  return (
    <svg
      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Team Member Search + Chip                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function MemberChip({ member, onRemove }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200">
      {member.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatar_url}
          alt=""
          className="h-5 w-5 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
          {member.full_name?.[0] || '?'}
        </span>
      )}
      <span className="max-w-30 truncate">{member.full_name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          className="ml-1 text-gray-500 hover:text-red-400"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function TeamMemberSearch({
  selectedMembers,
  onAdd,
  onRemove,
  maxMembers,
  eligibilityRaw,
  currentUserId,
  eventId,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(
    async (q) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const roleId =
          eligibilityRaw && eligibilityRaw !== 'all'
            ? eligibilityRaw
            : undefined;
        // Pass eventId so server excludes already-registered users
        const res = await searchUsersForTeamAction(q.trim(), roleId, eventId);
        if (res.users) {
          // Also filter out already-selected members locally
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

  const isFull = maxMembers && selectedMembers.length >= maxMembers - 1; // -1 because current user is auto-included

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {selectedMembers.map((m) => (
          <MemberChip key={m.id} member={m} onRemove={onRemove} />
        ))}
      </div>

      {!isFull && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
          />
          {searching && (
            <div className="absolute top-3 right-3">
              <Spinner className="h-4 w-4 text-gray-500" />
            </div>
          )}

          {results.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0f1520] shadow-xl">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onAdd(user);
                    setQuery('');
                    setResults([]);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
                >
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
                      {user.full_name?.[0] || '?'}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-200">
                      {user.full_name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {maxMembers && (
        <p className="text-[11px] text-gray-600">
          {selectedMembers.length + 1} / {maxMembers} members (you are
          automatically included)
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Main Registration Card                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function EventRegistrationCard({ event, session }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [loadingReg, setLoadingReg] = useState(true);

  // Team form state
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  const isLoggedIn = !!session?.user;
  const isTeamEvent = event.participation_type === 'team';
  const isCancelled = event.status === 'cancelled';
  const isActive = ['upcoming', 'ongoing'].includes(event.status);
  const isDeadlinePassed =
    event.registration_deadline &&
    new Date(event.registration_deadline) < new Date();

  // Load current registration status
  useEffect(() => {
    if (!isLoggedIn || !event.id) {
      setLoadingReg(false);
      return;
    }
    getMyRegistrationAction(event.id)
      .then((res) => {
        if (res.registration) setRegistration(res.registration);
      })
      .finally(() => setLoadingReg(false));
  }, [isLoggedIn, event.id]);

  const isRegistered = registration && registration.status !== 'cancelled';

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRegister = useCallback(() => {
    setError(null);
    startTransition(async () => {
      let teamData = undefined;
      if (isTeamEvent) {
        teamData = {
          teamName,
          teamMembers: teamMembers.map((m) => m.id),
        };
      }
      const result = await registerForEventAction(event.id, teamData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Refresh registration status
        const regRes = await getMyRegistrationAction(event.id);
        if (regRes.registration) setRegistration(regRes.registration);
      }
    });
  }, [event.id, isTeamEvent, teamName, teamMembers, startTransition]);

  const handleCancel = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await cancelEventRegistrationAction(event.id);
      if (result?.error) {
        setError(result.error);
      } else {
        setRegistration(null);
        setSuccess(false);
      }
    });
  }, [event.id, startTransition]);

  const addTeamMember = useCallback((user) => {
    setTeamMembers((prev) => [...prev, user]);
  }, []);

  const removeTeamMember = useCallback((userId) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== userId));
  }, []);

  const handleInviteResponse = useCallback(
    (accept) => {
      setError(null);
      startTransition(async () => {
        const result = await respondToTeamInviteAction(
          registration.id,
          accept,
        );
        if (result?.error) {
          setError(result.error);
        } else {
          // Refresh to get updated myAcceptance
          const regRes = await getMyRegistrationAction(event.id);
          setRegistration(regRes.registration ?? null);
        }
      });
    },
    [registration, event.id, startTransition],
  );

  // ── Cancelled event ──────────────────────────────────────────────────────

  if (isCancelled) {
    return (
      <div className="holographic-card relative overflow-hidden rounded-2xl border border-red-500/20 p-6 text-white">
        <div className="relative">
          <div className="mb-1 flex items-center gap-3">
            <span className="bg-red-500 h-px w-5" />
            <h3 className="font-heading text-[11px] font-bold tracking-[0.4em] text-red-400 uppercase">Event Cancelled</h3>
          </div>
          <p className="mt-3 mb-5 text-sm leading-relaxed text-zinc-500">
            This event has been cancelled. Check out our other upcoming events.
          </p>
          <Link
            href="/events"
            className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/30 hover:text-neon-lime"
          >
            Browse Events →
          </Link>
        </div>
      </div>
    );
  }

  // ── No registration required ─────────────────────────────────────────────

  if (!event.registration_required) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-6 text-white shadow-xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-teal-500/8 blur-2xl" />
        <div className="relative">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <h3 className="text-lg font-bold text-emerald-300">
              Open to Everyone
            </h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            No registration needed — just show up and join!
          </p>
          {event.location && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-400">
              <span>📍</span> {event.location}
            </p>
          )}
          <Link
            href="/events"
            className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
          >
            View All Events
          </Link>
        </div>
      </div>
    );
  }

  // ── Non-leader team invitation ────────────────────────────────────────────

  if (
    !loadingReg &&
    registration &&
    registration.isTeamLeader === false
  ) {
    const myAcceptance = registration.myAcceptance ?? 'pending';

    // ─ Pending invite ──────────────────────────────────────────────────────
    if (myAcceptance === 'pending') {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-yellow-500/25 bg-yellow-500/8 p-6 text-white shadow-xl backdrop-blur-xl">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-yellow-500/10 blur-2xl" />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">📨</span>
              <h3 className="text-lg font-bold text-yellow-300">
                Team Invitation
              </h3>
            </div>
            <p className="mt-2 text-sm text-gray-300">
              You have been added to team{' '}
              <span className="font-semibold text-yellow-200">
                &ldquo;{registration.team_name}&rdquo;
              </span>{' '}
              for this event. Please accept or decline.
            </p>
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleInviteResponse(true)}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-400 disabled:opacity-50"
              >
                {isPending ? <Spinner className="h-4 w-4" /> : '✓ Accept'}
              </button>
              <button
                onClick={() => handleInviteResponse(false)}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm font-bold text-red-300 transition-all hover:bg-red-500/25 disabled:opacity-50"
              >
                {isPending ? <Spinner className="h-4 w-4" /> : '✕ Decline'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ─ Declined invite ─────────────────────────────────────────────────────
    if (myAcceptance === 'declined') {
      const canReaccept =
        isActive &&
        registration.status !== 'confirmed' &&
        registration.status !== 'attended';
      return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-500/20 bg-white/3 p-6 text-white shadow-xl backdrop-blur-xl">
          <div className="relative">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <h3 className="text-lg font-bold text-gray-400">
                Invitation Declined
              </h3>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              You declined the invitation to join team{' '}
              <span className="font-medium text-gray-400">
                &ldquo;{registration.team_name}&rdquo;
              </span>
              .
            </p>
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
            {canReaccept && (
              <button
                onClick={() => handleInviteResponse(true)}
                disabled={isPending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
              >
                {isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  'Change mind & Accept'
                )}
              </button>
            )}
            <Link
              href="/events"
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-white/8 bg-white/3 px-5 py-2.5 text-sm font-semibold text-gray-400 transition-all hover:bg-white/6"
            >
              View All Events
            </Link>
          </div>
        </div>
      );
    }

    // ─ Accepted non-leader: fall through to normal registered/confirmed/attended cards below
  }

  // ── Already registered ───────────────────────────────────────────────────

  if (isRegistered && !loadingReg) {
    const regStatus = registration.status; // 'registered' | 'confirmed' | 'attended'

    // ─ Attended ─────────────────────────────────────────────────────────────
    if (regStatus === 'attended') {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-purple-500/8 p-6 text-white shadow-xl backdrop-blur-xl">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl" />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">🏅</span>
              <h3 className="text-lg font-bold text-purple-300">
                You Attended!
              </h3>
            </div>
            {registration.team_name && (
              <p className="mt-2 text-sm text-purple-200/80">
                Team:{' '}
                <span className="font-semibold">{registration.team_name}</span>
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Thanks for joining this event. See you next time!
            </p>
            <Link
              href="/events"
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
            >
              View All Events
            </Link>
          </div>
        </div>
      );
    }

    // ─ Confirmed ─────────────────────────────────────────────────────────────
    if (regStatus === 'confirmed') {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/25 bg-sky-500/8 p-6 text-white shadow-xl backdrop-blur-xl">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">🎫</span>
              <h3 className="text-lg font-bold text-sky-300">
                Registration Confirmed!
              </h3>
            </div>
            {registration.team_name && (
              <p className="mt-2 text-sm text-sky-200/80">
                Team:{' '}
                <span className="font-semibold">{registration.team_name}</span>
                {registration.isTeamLeader === false && (
                  <span className="ml-2 rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] text-gray-400">
                    member
                  </span>
                )}
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Your spot has been confirmed by the organizers. We look forward to
              seeing you!
            </p>
            <p className="mt-3 text-xs text-gray-500">
              Need to make a change? Contact the club directly.
            </p>
            <Link
              href="/contact"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-5 py-2.5 text-sm font-semibold text-sky-300 transition-all hover:bg-sky-500/20"
            >
              Contact the Club
            </Link>
            <Link
              href="/events"
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
            >
              View All Events
            </Link>
          </div>
        </div>
      );
    }

    // ─ Registered (pending confirmation) ─────────────────────────────────────
    const isLeader = registration.isTeamLeader !== false;
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-6 text-white shadow-xl backdrop-blur-xl">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <h3 className="text-lg font-bold text-emerald-300">
              You&apos;re Registered!
            </h3>
          </div>
          {registration.team_name && (
            <p className="mt-2 text-sm text-emerald-200/80">
              Team:{' '}
              <span className="font-semibold">{registration.team_name}</span>
              {!isLeader && (
                <span className="ml-2 rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] text-gray-400">
                  member
                </span>
              )}
            </p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            You have successfully registered for this event. Waiting for
            confirmation from the organizers.
          </p>

          {/* Show team member acceptance status to the leader */}
          {isLeader &&
            registration.memberAcceptances &&
            registration.memberAcceptances.length > 0 && (
              <div className="mt-3 rounded-xl border border-white/8 bg-white/4 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Team Acceptance
                </p>
                <div className="space-y-1.5">
                  {registration.memberAcceptances.map((m) => {
                    const statusColor =
                      m.status === 'accepted'
                        ? 'text-emerald-400'
                        : m.status === 'declined'
                          ? 'text-red-400'
                          : 'text-yellow-400';
                    const statusIcon =
                      m.status === 'accepted'
                        ? '✓'
                        : m.status === 'declined'
                          ? '✕'
                          : '⏳';
                    return (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs text-gray-400">
                          {m.users?.full_name ?? m.user_id}
                          {m.is_leader && (
                            <span className="ml-1 text-[10px] text-gray-600">
                              (you)
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${statusColor}`}
                        >
                          {statusIcon}{' '}
                          {m.status.charAt(0).toUpperCase() +
                            m.status.slice(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {registration.memberAcceptances.some(
                  (m) => m.status === 'pending',
                ) && (
                  <p className="mt-2 text-[10px] text-yellow-500/80">
                    Waiting for all members to accept before admin can
                    confirm.
                  </p>
                )}
              </div>
            )}

          {/* Only team leader (or individual) can cancel */}
          {isActive && isLeader && (
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/20 disabled:opacity-50"
            >
              {isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                'Cancel Registration'
              )}
            </button>
          )}

          {/* Non-leader team members cannot cancel independently */}
          {isActive && !isLeader && (
            <Link
              href="/contact"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
            >
              Need changes? Contact the Club
            </Link>
          )}

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────

  const canRegister = isActive && !isDeadlinePassed;

  return (
    <div className="holographic-card relative overflow-hidden rounded-2xl border border-neon-lime/15 p-6 text-white">
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-neon-lime/5 blur-2xl" />

      <div className="relative">
        <div className="mb-1 flex items-center gap-3">
          <span className="bg-neon-lime h-px w-5" />
          <h3 className="font-heading text-[11px] font-bold tracking-[0.4em] text-neon-lime uppercase">
            {isTeamEvent ? 'Team Registration' : 'Registration'}
          </h3>
        </div>
        <p className="mt-3 mb-5 text-sm leading-relaxed text-zinc-400">
          {isDeadlinePassed
            ? 'Registration deadline has passed.'
            : isTeamEvent
              ? `Form a team of ${event.team_size || 'any size'} and register together.`
              : 'Secure your spot and join fellow programmers for this event.'}
        </p>

        {/* Participation type badge */}
        {isTeamEvent && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
            <span>👥</span>
            Team Event{event.team_size ? ` · ${event.team_size} members` : ''}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 rounded-xl border border-neon-lime/30 bg-neon-lime/10 p-3 font-mono text-[11px] tracking-wide text-neon-lime">
            ✓ Registration successful!
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {canRegister && (
          <>
            {/* Not logged in */}
            {!isLoggedIn ? (
              <div className="space-y-3">
                <div className="relative">
                  <div className="pointer-events-none blur-[3px] select-none">
                    <div className="flex w-full items-center justify-center gap-2 rounded-full bg-neon-lime px-5 py-3 font-heading text-[11px] font-bold tracking-widest text-black uppercase">
                      {isTeamEvent ? 'Register Team' : 'Register Now'}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <p className="font-heading text-xs font-bold text-white drop-shadow-lg">
                      Sign in to register
                    </p>
                    <Link
                      href="/login"
                      className="rounded-full bg-neon-lime px-5 py-1.5 font-heading text-[10px] font-bold tracking-widest text-black uppercase shadow-lg transition-all hover:opacity-90"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Team registration form */}
                {isTeamEvent && (
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter team name"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 transition-all outline-none focus:border-neon-lime/40"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                        Team Members
                      </label>
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

                {/* Register button */}
                <button
                  onClick={handleRegister}
                  disabled={
                    isPending ||
                    loadingReg ||
                    (isTeamEvent && !teamName.trim()) ||
                    (isTeamEvent &&
                      event.team_size &&
                      teamMembers.length !== event.team_size - 1)
                  }
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-neon-lime px-5 py-3 font-heading text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] transition-all hover:shadow-[0_0_40px_-5px_rgba(182,243,107,0.7)] disabled:opacity-50"
                >
                  {isPending || loadingReg ? (
                    <Spinner className="h-4 w-4 text-black" />
                  ) : (
                    <>
                      {isTeamEvent ? 'Register Team' : 'Register for Event'}
                      <ArrowIcon />
                    </>
                  )}
                </button>
              </>
            )}
          </>
        )}

        {/* External registration link fallback */}
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
          className="mt-3 flex w-full items-center justify-center rounded-full border border-white/10 bg-white/3 px-5 py-2.5 font-heading text-[10px] font-bold tracking-widest text-zinc-500 uppercase transition-all hover:border-white/20 hover:text-zinc-300"
        >
          View All Events
        </Link>
      </div>
    </div>
  );
}
