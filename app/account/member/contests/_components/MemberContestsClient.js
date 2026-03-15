/**
 * @file Member contests client — browsable list of programming
 *   contests with participation tracking and registration controls.
 * @module MemberContestsClient
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
  Trophy,
  Search,
  X,
  ChevronDown,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  Users,
  Zap,
  Medal,
  BarChart2,
  Hash,
  ArrowRight,
  Tag,
  Swords,
  Flame,
  Target,
} from 'lucide-react';
import {
  joinContestAction,
  leaveContestAction,
} from '@/app/_lib/member-contests-actions';
import { useScrollLock } from '@/app/_lib/hooks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function fmtDuration(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function isPast(iso) {
  return iso ? new Date(iso) < new Date() : false;
}

function isSoon(iso) {
  if (!iso) return false;
  const diff = new Date(iso) - Date.now();
  return diff > 0 && diff < 48 * 3600 * 1000;
}

function endTime(startIso, durationMins) {
  if (!startIso || !durationMins) return null;
  return new Date(
    new Date(startIso).getTime() + durationMins * 60 * 1000
  ).toISOString();
}

function rankLabel(rank) {
  if (!rank) return null;
  if (rank === 1) return '🥇 1st';
  if (rank === 2) return '🥈 2nd';
  if (rank === 3) return '🥉 3rd';
  return `#${rank}`;
}

// ─── Countdown ───────────────────────────────────────────────────────────────

function useCountdown(targetIso) {
  const calc = useCallback(() => {
    if (!targetIso) return null;
    const diff = new Date(targetIso) - Date.now();
    if (diff <= 0) return null;
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  }, [targetIso]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

function CountdownDisplay({ targetIso, label = 'Starts in' }) {
  const t = useCountdown(targetIso);
  if (!t) return <span className="text-[11px] text-gray-600">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      {t.d > 0 && (
        <span className="text-xs font-bold text-white tabular-nums">
          {t.d}
          <span className="ml-px text-[10px] font-normal text-gray-600">d</span>
        </span>
      )}
      <span className="text-xs font-bold text-white tabular-nums">
        {String(t.h).padStart(2, '0')}
        <span className="ml-px text-[10px] font-normal text-gray-600">h</span>
      </span>
      <span className="text-xs font-bold text-white tabular-nums">
        {String(t.m).padStart(2, '0')}
        <span className="ml-px text-[10px] font-normal text-gray-600">m</span>
      </span>
      <span className="text-xs font-bold text-white tabular-nums">
        {String(t.s).padStart(2, '0')}
        <span className="ml-px text-[10px] font-normal text-gray-600">s</span>
      </span>
    </div>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  upcoming: {
    label: 'Upcoming',
    color: 'text-blue-300',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
  },
  running: {
    label: 'Live Now',
    color: 'text-green-300',
    bg: 'bg-green-500/15',
    border: 'border-green-500/25',
  },
  finished: {
    label: 'Finished',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
  },
};

const PLATFORM_COLORS = {
  Codeforces: {
    color: 'text-red-300',
    bg: 'bg-red-500/12',
    border: 'border-red-500/25',
  },
  LeetCode: {
    color: 'text-yellow-300',
    bg: 'bg-yellow-500/12',
    border: 'border-yellow-500/25',
  },
  AtCoder: {
    color: 'text-blue-300',
    bg: 'bg-blue-500/12',
    border: 'border-blue-500/25',
  },
  HackerRank: {
    color: 'text-green-300',
    bg: 'bg-green-500/12',
    border: 'border-green-500/25',
  },
  CodeChef: {
    color: 'text-purple-300',
    bg: 'bg-purple-500/12',
    border: 'border-purple-500/25',
  },
  ICPC: {
    color: 'text-orange-300',
    bg: 'bg-orange-500/12',
    border: 'border-orange-500/25',
  },
};
function platStyle(p) {
  return (
    PLATFORM_COLORS[p] || {
      color: 'text-gray-400',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
    }
  );
}

// ─── Flash ────────────────────────────────────────────────────────────────────

function Flash({ msg, onClose }) {
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
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose}>
        <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}

// ─── Join / Leave Button ──────────────────────────────────────────────────────

function JoinButton({ contest, isJoined, userId, onDone, compact }) {
  const [pending, start] = useTransition();
  const isFinished = contest.status === 'finished';

  const handleJoin = () => {
    start(async () => {
      const res = await joinContestAction(contest.id);
      onDone(
        res.error
          ? { type: 'error', text: res.error }
          : { type: 'success', text: `Joined "${contest.title}"!` }
      );
    });
  };

  const handleLeave = () => {
    start(async () => {
      const res = await leaveContestAction(contest.id);
      onDone(
        res.error
          ? { type: 'error', text: res.error }
          : { type: 'success', text: 'Registration removed.' }
      );
    });
  };

  if (isFinished)
    return (
      <span className="flex items-center justify-center rounded-xl border border-gray-500/20 bg-gray-500/8 px-3 py-2 text-xs font-medium text-gray-600">
        Finished
      </span>
    );

  if (isJoined) {
    return (
      <div className="flex gap-2">
        <span
          className={`flex items-center gap-1.5 rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300 ${compact ? '' : 'flex-1 justify-center'}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Registered
        </span>
        {contest.status !== 'running' && (
          <button
            onClick={handleLeave}
            disabled={pending}
            className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs text-gray-500 transition-colors hover:border-red-500/25 hover:bg-red-500/8 hover:text-red-300 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {!compact && 'Leave'}
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-xl border border-yellow-500/30 bg-yellow-500/12 px-3 py-2 text-xs font-semibold text-yellow-300 transition-all hover:bg-yellow-500/22 disabled:opacity-50 ${
        compact ? '' : 'w-full justify-center'
      }`}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Swords className="h-3.5 w-3.5" />
      )}
      {compact ? 'Join' : 'Join Contest'}
    </button>
  );
}

// ─── Featured Contest Hero ────────────────────────────────────────────────────

function FeaturedHero({ contest, isJoined, userId, onFlash }) {
  const ss = STATUS_STYLES[contest.status] || STATUS_STYLES.upcoming;
  const ps = platStyle(contest.platform);
  const end = endTime(contest.start_time, contest.duration);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <div className="absolute inset-0 bg-linear-to-br from-yellow-900/40 via-orange-900/30 to-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-yellow-500/8 via-transparent to-transparent" />

      <div className="relative z-10 p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold tracking-wider text-yellow-300 uppercase">
            Official Contest
          </span>
          {contest.platform && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${ps.bg} ${ps.border} ${ps.color}`}
            >
              {contest.platform}
            </span>
          )}
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${ss.bg} ${ss.border} ${ss.color}`}
          >
            {ss.label}
          </span>
          {contest.status === 'running' && (
            <span className="animate-pulse rounded-full border border-green-500/40 bg-green-500/20 px-2.5 py-0.5 text-[10px] font-bold text-green-300">
              ● LIVE
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold text-white sm:text-2xl lg:text-3xl">
          {contest.title}
        </h2>
        {contest.description && (
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-gray-400">
            {contest.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-blue-400" />{' '}
            {fmtDateTime(contest.start_time)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-purple-400" />{' '}
            {fmtDuration(contest.duration)}
          </span>
          {contest.type && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-green-400" />{' '}
              {contest.type === 'team' ? 'Team' : 'Individual'}
            </span>
          )}
          {contest.division && (
            <span className="flex items-center gap-1.5">
              <Hash className="h-4 w-4 text-orange-400" /> Div{' '}
              {contest.division}
            </span>
          )}
        </div>

        {contest.status === 'upcoming' && (
          <div className="mt-3">
            <CountdownDisplay
              targetIso={contest.start_time}
              label="Starts in"
            />
          </div>
        )}
        {contest.status === 'running' && end && (
          <div className="mt-3">
            <CountdownDisplay targetIso={end} label="Ends in" />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <JoinButton
            contest={contest}
            isJoined={isJoined}
            userId={userId}
            onDone={onFlash}
            compact={false}
          />
          {contest.contest_url && (
            <a
              href={contest.contest_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10"
            >
              Open Platform <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contest Card ─────────────────────────────────────────────────────────────

function ContestCard({ contest, isJoined, userId, onFlash }) {
  const ss = STATUS_STYLES[contest.status] || STATUS_STYLES.upcoming;
  const ps = platStyle(contest.platform);
  const end = endTime(contest.start_time, contest.duration);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-all hover:border-white/15 hover:bg-white/5">
      {/* Header colour strip */}
      <div
        className={`h-1.5 w-full ${contest.status === 'running' ? 'bg-green-500' : contest.status === 'upcoming' ? 'bg-blue-500' : 'bg-gray-600'}`}
      />

      <div className="flex flex-1 flex-col p-4 pt-3.5">
        {/* Badges */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {contest.platform && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${ps.bg} ${ps.border} ${ps.color}`}
            >
              {contest.platform}
            </span>
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${ss.bg} ${ss.border} ${ss.color}`}
          >
            {ss.label}
          </span>
          {contest.is_official && (
            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold text-yellow-300">
              Official
            </span>
          )}
          {contest.status === 'running' && (
            <span className="ml-auto animate-pulse text-[9px] font-bold text-green-400">
              ● LIVE
            </span>
          )}
          {contest.status === 'upcoming' && isSoon(contest.start_time) && (
            <span className="ml-auto rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold text-orange-300">
              Soon
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-sm leading-snug font-bold text-white">
          {contest.title}
        </h3>
        {contest.description && (
          <p className="mt-1 line-clamp-2 text-[11px] text-gray-600">
            {contest.description}
          </p>
        )}

        <div className="mt-3 space-y-1.5 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0 text-blue-400" />
            <span>{fmtDateTime(contest.start_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 shrink-0 text-purple-400" />
            <span>{fmtDuration(contest.duration)}</span>
            {contest.type && (
              <>
                <span className="text-white/20">·</span>
                <Users className="h-3 w-3 text-green-400" />
                <span className="capitalize">{contest.type}</span>
              </>
            )}
            {contest.division && (
              <>
                <span className="text-white/20">·</span>
                <span>Div {contest.division}</span>
              </>
            )}
          </div>
        </div>

        {/* Countdown */}
        {contest.status === 'upcoming' && !isPast(contest.start_time) && (
          <div className="mt-2.5">
            <CountdownDisplay targetIso={contest.start_time} label="In" />
          </div>
        )}
        {contest.status === 'running' && end && (
          <div className="mt-2.5">
            <CountdownDisplay targetIso={end} label="Ends in" />
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <JoinButton
              contest={contest}
              isJoined={isJoined}
              userId={userId}
              onDone={onFlash}
              compact={false}
            />
          </div>
          {contest.contest_url && (
            <a
              href={contest.contest_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center rounded-xl border border-white/8 bg-white/3 px-2.5 py-2 text-gray-500 transition-colors hover:bg-white/8 hover:text-gray-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── My Participation Row ─────────────────────────────────────────────────────

function MyParticipationRow({ par, userId, onFlash }) {
  const contest = par.contests;
  if (!contest) return null;
  const ss = STATUS_STYLES[contest.status] || STATUS_STYLES.finished;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-4 py-3 transition-colors hover:bg-white/4">
      {/* Date block */}
      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/8 bg-white/4 py-2 text-center">
        <span className="text-[10px] font-semibold text-gray-500 uppercase">
          {new Date(contest.start_time).toLocaleDateString('en-US', {
            month: 'short',
          })}
        </span>
        <span className="text-lg leading-none font-bold text-white tabular-nums">
          {new Date(contest.start_time).getDate()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-200">
          {contest.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-600">
          {contest.platform && <span>{contest.platform}</span>}
          <span
            className={`rounded-full border px-1.5 py-0.5 font-semibold ${ss.bg} ${ss.border} ${ss.color}`}
          >
            {ss.label}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        {par.rank && (
          <span
            className={`text-sm font-bold tabular-nums ${par.rank === 1 ? 'text-yellow-400' : par.rank === 2 ? 'text-gray-300' : par.rank === 3 ? 'text-orange-400' : 'text-gray-400'}`}
          >
            {rankLabel(par.rank)}
          </span>
        )}
        {par.score != null && (
          <span className="text-[11px] text-gray-500">{par.score} pts</span>
        )}
        {par.problems_solved != null && (
          <span className="text-[11px] text-gray-500">
            {par.problems_solved} solved
          </span>
        )}
        {!par.rank && !par.score && contest.status === 'upcoming' && (
          <JoinButton
            contest={contest}
            isJoined={true}
            userId={userId}
            onDone={onFlash}
            compact={true}
          />
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard Modal ────────────────────────────────────────────────────────

function LeaderboardModal({ contest, participants, userId, onClose }) {
  useScrollLock();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/12 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4.5 w-4.5 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Leaderboard</h2>
            <span className="text-xs text-gray-500">— {contest.title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4">
          {participants.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No results yet.
            </p>
          ) : (
            <div className="space-y-2">
              {participants.slice(0, 50).map((p, i) => {
                const rank = p.rank ?? i + 1;
                const isSelf = p.user_id === userId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                      isSelf
                        ? 'border border-yellow-500/25 bg-yellow-500/8'
                        : 'border border-white/5 bg-white/2'
                    }`}
                  >
                    <span
                      className={`w-7 text-center text-sm font-bold tabular-nums ${
                        rank === 1
                          ? 'text-yellow-400'
                          : rank === 2
                            ? 'text-gray-300'
                            : rank === 3
                              ? 'text-orange-400'
                              : 'text-gray-600'
                      }`}
                    >
                      {rank === 1
                        ? '🥇'
                        : rank === 2
                          ? '🥈'
                          : rank === 3
                            ? '🥉'
                            : `#${rank}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-xs font-medium ${isSelf ? 'text-yellow-200' : 'text-gray-300'}`}
                      >
                        {p.users?.full_name ?? 'Unknown'} {isSelf && '(you)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      {p.problems_solved != null && (
                        <span>{p.problems_solved} solved</span>
                      )}
                      {p.score != null && (
                        <span className="font-semibold text-gray-300">
                          {p.score} pts
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemberContestsClient({
  contests,
  myParticipations,
  userId,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [platFilter, setPlatFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [flash, setFlash] = useState(null);
  const [leaderboardContest, setLeaderboardContest] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  // Set of joined contest IDs
  const joinedIds = useMemo(
    () => new Set(myParticipations.map((p) => p.contest_id)),
    [myParticipations]
  );

  // Platforms list
  const platforms = useMemo(
    () => ['all', ...new Set(contests.map((c) => c.platform).filter(Boolean))],
    [contests]
  );

  // Filter helper
  const applyFilters = useCallback(
    (list) => {
      return list.filter((c) => {
        if (platFilter !== 'all' && c.platform !== platFilter) return false;
        if (typeFilter !== 'all' && c.type !== typeFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          c.title?.toLowerCase().includes(q) ||
          c.platform?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
        );
      });
    },
    [platFilter, typeFilter, search]
  );

  const allFiltered = useMemo(
    () => applyFilters(contests),
    [contests, applyFilters]
  );
  const upcomingFiltered = useMemo(
    () => applyFilters(contests.filter((c) => c.status === 'upcoming')),
    [contests, applyFilters]
  );
  const runningFiltered = useMemo(
    () => applyFilters(contests.filter((c) => c.status === 'running')),
    [contests, applyFilters]
  );
  const finishedFiltered = useMemo(
    () => applyFilters(contests.filter((c) => c.status === 'finished')),
    [contests, applyFilters]
  );
  const myFiltered = useMemo(
    () =>
      myParticipations.filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return p.contests?.title?.toLowerCase().includes(q);
      }),
    [myParticipations, search]
  );

  // Featured: is_official & (running or upcoming)
  const featuredContest = useMemo(
    () =>
      contests.find(
        (c) => c.is_official && ['running', 'upcoming'].includes(c.status)
      ) || null,
    [contests]
  );

  // Stats
  const totalWins = myParticipations.filter((p) => p.rank === 1).length;
  const totalSolved = myParticipations.reduce(
    (s, p) => s + (p.problems_solved ?? 0),
    0
  );

  async function openLeaderboard(contest) {
    setLeaderboardContest(contest);
    setLeaderboardData([]);
    setLeaderboardLoading(true);
    try {
      const res = await fetch(
        `/api/account/contests/${contest.id}/leaderboard`
      ).catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        setLeaderboardData(json.participants ?? []);
      }
    } finally {
      setLeaderboardLoading(false);
    }
  }

  function TabBtn({ id, label, count, accent }) {
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
              accent
                ? 'bg-green-500/20 text-green-400'
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

  const tabContests = {
    all: allFiltered,
    upcoming: upcomingFiltered,
    live: runningFiltered,
    finished: finishedFiltered,
  };

  const emptyIcons = {
    all: <Target className="mb-3 h-12 w-12 text-gray-700" />,
    upcoming: <Calendar className="mb-3 h-12 w-12 text-gray-700" />,
    live: <Flame className="mb-3 h-12 w-12 text-gray-700" />,
    finished: <Medal className="mb-3 h-12 w-12 text-gray-700" />,
  };
  const emptyLabels = {
    all: 'No contests found',
    upcoming: 'No upcoming contests',
    live: 'No live contests right now',
    finished: 'No finished contests',
  };

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Contests
          </h1>
          <p className="text-sm text-gray-500">
            Compete, sharpen your skills, and earn recognition.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {featuredContest && (
            <button
              onClick={() => openLeaderboard(featuredContest)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-3.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/8"
            >
              <BarChart2 className="h-3.5 w-3.5 text-yellow-400" /> Leaderboard
            </button>
          )}
        </div>
      </div>

      {/* ── Flash ───────────────────────────────────────────────────────── */}
      {flash && <Flash msg={flash} onClose={() => setFlash(null)} />}

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: Trophy,
            label: 'Total Contests',
            value: contests.length,
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
          },
          {
            icon: Flame,
            label: 'Live / Upcoming',
            value: contests.filter((c) => c.status !== 'finished').length,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
          {
            icon: Swords,
            label: 'Participated',
            value: myParticipations.length,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            icon: Medal,
            label: 'Wins',
            value: totalWins,
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
              <Icon className={`h-4 w-4 ${color}`} />
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

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search contests…"
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
        <div className="flex gap-2">
          <div className="relative">
            <Tag className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <select
              value={platFilter}
              onChange={(e) => setPlatFilter(e.target.value)}
              className="w-36 appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-7 pl-8 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
            >
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p === 'all' ? 'All Platforms' : p}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          <div className="relative">
            <Users className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-32 appearance-none rounded-xl border border-white/10 bg-white/4 py-2.5 pr-7 pl-8 text-sm text-white focus:border-white/20 focus:outline-none [&>option]:bg-gray-900"
            >
              {['all', 'individual', 'team'].map((t) => (
                <option key={t} value={t}>
                  {t === 'all'
                    ? 'All Types'
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>

      {/* ── Featured Hero ────────────────────────────────────────────────── */}
      {featuredContest && (
        <FeaturedHero
          contest={featuredContest}
          isJoined={joinedIds.has(featuredContest.id)}
          userId={userId}
          onFlash={setFlash}
        />
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-1.5">
        <TabBtn id="all" label="All" count={allFiltered.length} />
        <TabBtn
          id="live"
          label="Live Now"
          count={runningFiltered.length}
          accent={runningFiltered.length > 0}
        />
        <TabBtn
          id="upcoming"
          label="Upcoming"
          count={upcomingFiltered.length}
        />
        <TabBtn
          id="finished"
          label="Finished"
          count={finishedFiltered.length}
        />
        <TabBtn id="my" label="My Contests" count={myParticipations.length} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
           CONTEST GRID TABS (all / live / upcoming / finished)
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab !== 'my' && (
        <>
          {(tabContests[activeTab] ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
              {emptyIcons[activeTab]}
              <p className="text-sm font-medium text-gray-500">
                {emptyLabels[activeTab]}
              </p>
              {(search || platFilter !== 'all' || typeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setPlatFilter('all');
                    setTypeFilter('all');
                  }}
                  className="mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear filters <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(tabContests[activeTab] ?? []).map((contest) => (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  isJoined={joinedIds.has(contest.id)}
                  userId={userId}
                  onFlash={setFlash}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           MY CONTESTS TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my' && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Swords className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">
              My Participations
            </h2>
            <span className="ml-auto rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">
              {myParticipations.length} total
            </span>
          </div>

          {myFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Swords className="mb-3 h-10 w-10 text-gray-700" />
              <p className="text-sm font-medium text-gray-500">
                {myParticipations.length === 0
                  ? "You haven't joined any contests yet"
                  : 'No results for this search'}
              </p>
              {myParticipations.length === 0 && (
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className="mt-3 flex items-center gap-1 text-xs text-yellow-400 transition-colors hover:text-yellow-300"
                >
                  Browse upcoming contests <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {myFiltered.map((par) => (
                <MyParticipationRow
                  key={par.id}
                  par={par}
                  userId={userId}
                  onFlash={setFlash}
                />
              ))}
            </div>
          )}

          {/* Aggregate stats row */}
          {myParticipations.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/6 pt-5">
              {[
                {
                  label: 'Best Rank',
                  value:
                    Math.min(
                      ...myParticipations.map((p) => p.rank ?? Infinity)
                    ) === Infinity
                      ? '—'
                      : `#${Math.min(...myParticipations.map((p) => p.rank ?? Infinity))}`,
                  color: 'text-yellow-400',
                },
                {
                  label: 'Problems Solved',
                  value: totalSolved,
                  color: 'text-blue-400',
                },
                {
                  label: 'Wins (1st)',
                  value: totalWins,
                  color: 'text-purple-400',
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/6 bg-white/2 p-3 text-center"
                >
                  <p className={`text-lg font-bold tabular-nums ${color}`}>
                    {value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Leaderboard Modal ──────────────────────────────────────────── */}
      {leaderboardContest && (
        <LeaderboardModal
          contest={leaderboardContest}
          participants={leaderboardLoading ? [] : leaderboardData}
          userId={userId}
          onClose={() => {
            setLeaderboardContest(null);
            setLeaderboardData([]);
          }}
        />
      )}
    </>
  );
}
