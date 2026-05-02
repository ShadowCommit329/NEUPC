'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import SafeImg from '@/app/_components/ui/SafeImg';
import {
  BookOpen,
  Clock,
  Play,
  Search,
  ArrowRight,
  Users,
  Loader2,
  GraduationCap,
  Zap,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import { enrollUser } from '@/app/_lib/bootcamp-actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function timeAgo(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

const BAR_COLORS = [
  {
    bar: 'bg-violet-500',
    glow: 'shadow-violet-500/20',
    pill: 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20',
    progress: 'bg-gradient-to-r from-violet-500 to-violet-400',
    accent: 'text-violet-400',
    resumeBg: 'bg-violet-500 hover:bg-violet-400',
  },
  {
    bar: 'bg-blue-500',
    glow: 'shadow-blue-500/20',
    pill: 'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20',
    progress: 'bg-gradient-to-r from-blue-500 to-blue-400',
    accent: 'text-blue-400',
    resumeBg: 'bg-blue-500 hover:bg-blue-400',
  },
  {
    bar: 'bg-amber-500',
    glow: 'shadow-amber-500/20',
    pill: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
    progress: 'bg-gradient-to-r from-amber-500 to-amber-400',
    accent: 'text-amber-400',
    resumeBg: 'bg-amber-500 hover:bg-amber-400',
  },
  {
    bar: 'bg-emerald-500',
    glow: 'shadow-emerald-500/20',
    pill: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
    progress: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    accent: 'text-emerald-400',
    resumeBg: 'bg-emerald-500 hover:bg-emerald-400',
  },
];

const CARD_GRADIENTS = [
  'from-violet-600 to-indigo-700',
  'from-cyan-500 to-blue-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-700',
  'from-emerald-500 to-teal-700',
];

// ─── Enrolled Card ─────────────────────────────────────────────────────────────

function EnrolledCard({ bootcamp, enrollment, colorIdx }) {
  const colors = BAR_COLORS[colorIdx % BAR_COLORS.length];
  const progress = enrollment?.progress_percent || 0;
  const completedLessons = enrollment?.completed_lessons || 0;
  const totalLessons = bootcamp?.total_lessons || 0;
  const duration = formatDuration(bootcamp?.total_duration);
  const lastOpened = timeAgo(enrollment?.last_accessed_at);
  const remainingLessons = totalLessons - completedLessons;
  const isComplete = remainingLessons === 0 && totalLessons > 0;

  const currentLesson = enrollment?.current_lesson_title
    ? `Lesson ${(completedLessons || 0) + 1} · ${enrollment.current_lesson_title}`
    : totalLessons > 0
    ? `Lesson ${Math.min(completedLessons + 1, totalLessons)} of ${totalLessons}`
    : null;

  return (
    <Link
      href={`/account/member/bootcamps/${bootcamp.id}`}
      className={`group relative flex overflow-hidden rounded-2xl border border-white/8 bg-[#0d1117] shadow-lg transition-all duration-300 hover:border-white/15 hover:shadow-xl ${colors.glow}`}
    >
      {/* Accent left bar */}
      <div className={`w-1 shrink-0 ${colors.bar}`} />

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {bootcamp.category && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colors.pill}`}>
                {bootcamp.category}
              </span>
            )}
            {bootcamp.difficulty_level && (
              <span className="font-mono text-[11px] text-gray-500">
                {bootcamp.difficulty_level}
              </span>
            )}
            {isComplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                <Trophy className="h-2.5 w-2.5" />
                Complete
              </span>
            )}
          </div>
          {lastOpened && (
            <span className="shrink-0 text-[11px] text-gray-600">{lastOpened}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[16px] font-bold leading-snug tracking-tight text-white/95 transition-colors group-hover:text-white">
          {bootcamp.title || 'Untitled Bootcamp'}
        </h3>

        {/* Current lesson */}
        {currentLesson && (
          <div className={`inline-flex items-center gap-2 self-start rounded-xl border border-white/6 bg-white/4 px-3 py-1.5 text-[12px] text-gray-400 transition-colors group-hover:border-white/10`}>
            <Play className={`h-3 w-3 ${colors.accent}`} />
            <span>{currentLesson}</span>
          </div>
        )}

        {/* Progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-gray-500">
              {completedLessons} / {totalLessons} lessons
            </span>
            <span className={`font-bold tabular-nums ${colors.accent}`}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colors.progress}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/6 pt-2">
          <div className="flex items-center gap-1.5 text-[11.5px] text-gray-600">
            <Clock className="h-3 w-3" />
            {remainingLessons > 0
              ? `${remainingLessons} lesson${remainingLessons !== 1 ? 's' : ''} left`
              : 'All done'}
            {duration && ` · ${duration}`}
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-all ${colors.resumeBg}`}>
            <Play className="h-3 w-3 fill-current" />
            {isComplete ? 'Review' : 'Resume'}
          </span>
        </div>
      </div>

      {/* Thumbnail */}
      {bootcamp.thumbnail ? (
        <div className="relative hidden w-[150px] shrink-0 overflow-hidden sm:block">
          <SafeImg
            src={bootcamp.thumbnail}
            alt={bootcamp.title || ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117]/40 to-transparent" />
        </div>
      ) : (
        <div className="hidden w-[150px] shrink-0 items-center justify-center bg-white/2 sm:flex">
          <BookOpen className="h-8 w-8 text-white/10" />
        </div>
      )}
    </Link>
  );
}

// ─── Available Card ────────────────────────────────────────────────────────────

function AvailableMiniCard({ bootcamp, onEnroll, isEnrolling, colorIdx }) {
  const gradient = CARD_GRADIENTS[colorIdx % CARD_GRADIENTS.length];
  const totalLessons = bootcamp.total_lessons || 0;
  const duration = formatDuration(bootcamp.total_duration);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d1117] shadow-lg transition-all duration-300 hover:border-white/15 hover:shadow-xl hover:-translate-y-0.5">
      {/* Banner */}
      {bootcamp.thumbnail ? (
        <div className="relative h-[120px] w-full shrink-0 overflow-hidden">
          <SafeImg
            src={bootcamp.thumbnail}
            alt={bootcamp.title || ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117]/70 via-transparent to-transparent" />
          {bootcamp.is_featured && (
            <div className="absolute top-2 right-2">
              <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30 backdrop-blur-sm">
                ★ Featured
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={`flex h-[120px] w-full shrink-0 items-center justify-center bg-gradient-to-br ${gradient} relative`}>
          <BookOpen className="h-9 w-9 text-white/50" />
          {bootcamp.is_featured && (
            <div className="absolute top-2 right-2">
              <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
                ★ Featured
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Title */}
        <h3 className="text-[14px] font-bold leading-snug tracking-tight text-white/90 transition-colors group-hover:text-white line-clamp-2">
          {bootcamp.title || 'Untitled Bootcamp'}
        </h3>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
          {bootcamp.difficulty_level && (
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-gray-400">
              {bootcamp.difficulty_level}
            </span>
          )}
          {totalLessons > 0 && (
            <span className="tabular-nums">{totalLessons} lessons</span>
          )}
          {duration && (
            <>
              <span>·</span>
              <span>{duration}</span>
            </>
          )}
        </div>

        {/* Price if any */}
        {bootcamp.price > 0 && (
          <p className="text-[12px] font-bold text-white/80">
            ৳{bootcamp.price.toLocaleString()}
          </p>
        )}

        {/* Enroll button */}
        <button
          onClick={() => onEnroll(bootcamp.id)}
          disabled={isEnrolling}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-white/6 py-2.5 text-[12.5px] font-semibold text-white/90 ring-1 ring-white/10 transition-all hover:bg-violet-500/20 hover:text-violet-300 hover:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnrolling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {isEnrolling ? 'Enrolling…' : 'Enroll Free'}
        </button>
      </div>
    </div>
  );
}

// ─── Empty States ──────────────────────────────────────────────────────────────

function EmptyEnrolled({ onBrowse }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/25">
        <GraduationCap className="h-8 w-8 text-violet-400" />
      </div>
      <p className="mb-1 text-[16px] font-bold text-white">No enrollments yet</p>
      <p className="mb-5 max-w-xs text-[13px] text-gray-500">
        Start learning by enrolling in an available bootcamp below.
      </p>
      <button
        onClick={onBrowse}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 hover:shadow-violet-500/30"
      >
        <BookOpen className="h-4 w-4" />
        Browse Bootcamps
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MemberBootcampsClient({
  bootcamps = [],
  enrollmentMap = {},
}) {
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [enrollingId, setEnrollingId] = useState(null);
  const [localEnrollmentMap, setLocalEnrollmentMap] = useState(enrollmentMap);
  const [showAvailableAll, setShowAvailableAll] = useState(false);

  const { enrolledBootcamps, availableBootcamps } = useMemo(() => {
    const enrolled = [];
    const available = [];
    for (const b of bootcamps) {
      const enrollment = localEnrollmentMap[b.id];
      if (enrollment) enrolled.push({ bootcamp: b, enrollment });
      else available.push(b);
    }
    enrolled.sort(
      (a, b) =>
        new Date(b.enrollment?.last_accessed_at || b.enrollment?.enrolled_at || 0) -
        new Date(a.enrollment?.last_accessed_at || a.enrollment?.enrolled_at || 0)
    );
    return { enrolledBootcamps: enrolled, availableBootcamps: available };
  }, [bootcamps, localEnrollmentMap]);

  const filteredEnrolled = useMemo(() => {
    if (!search) return enrolledBootcamps;
    const q = search.toLowerCase();
    return enrolledBootcamps.filter((e) =>
      e.bootcamp?.title?.toLowerCase().includes(q)
    );
  }, [enrolledBootcamps, search]);

  const filteredAvailable = useMemo(() => {
    let list = [...availableBootcamps];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    return list;
  }, [availableBootcamps, search]);

  const visibleAvailable = showAvailableAll ? filteredAvailable : filteredAvailable.slice(0, 6);

  const totalLessonsCompleted = enrolledBootcamps.reduce(
    (sum, e) => sum + (e.enrollment?.completed_lessons || 0),
    0
  );

  const handleEnroll = async (bootcampId) => {
    setEnrollingId(bootcampId);
    startTransition(async () => {
      try {
        const result = await enrollUser(bootcampId);
        if (result.success) {
          setLocalEnrollmentMap((prev) => ({
            ...prev,
            [bootcampId]: {
              ...result.enrollment,
              progress_percent: 0,
              completed_lessons: 0,
            },
          }));
        }
      } catch {
        // silently ignore
      } finally {
        setEnrollingId(null);
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-violet-500/8 via-white/3 to-indigo-500/5 p-6">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-white">
              My Bootcamps
            </h1>
            <p className="mt-1 text-[13px] text-gray-500">
              {enrolledBootcamps.length > 0
                ? `${enrolledBootcamps.length} enrolled · ${totalLessonsCompleted} lessons completed`
                : 'Start learning today'}
              {availableBootcamps.length > 0 && ` · ${availableBootcamps.length} available`}
            </p>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search bootcamps…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-52 rounded-xl border border-white/8 bg-white/5 pl-8 pr-3 text-[12.5px] text-white placeholder-gray-600 outline-none transition-all focus:border-white/15 focus:bg-white/8"
            />
          </div>
        </div>
      </div>

      {/* ── Enrolled section ── */}
      {enrolledBootcamps.length === 0 ? (
        <EmptyEnrolled
          onBrowse={() =>
            document.getElementById('available-section')?.scrollIntoView({ behavior: 'smooth' })
          }
        />
      ) : (
        <section>
          <div className="mb-4">
            <h2 className="text-[15px] font-bold text-white">Continue learning</h2>
            <p className="mt-0.5 text-[12px] text-gray-500">Pick up where you left off</p>
          </div>
          {filteredEnrolled.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-gray-600">No bootcamps match your search.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredEnrolled.map(({ bootcamp, enrollment }, i) => (
                <EnrolledCard
                  key={bootcamp.id}
                  bootcamp={bootcamp}
                  enrollment={enrollment}
                  colorIdx={i}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Available section ── */}
      {availableBootcamps.length > 0 && (
        <section id="available-section">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-white">Available bootcamps</h2>
              <p className="mt-0.5 text-[12px] text-gray-500">Expand your skills</p>
            </div>
            {filteredAvailable.length > 6 && (
              <button
                onClick={() => setShowAvailableAll((v) => !v)}
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-violet-400 transition-colors hover:text-violet-300"
              >
                {showAvailableAll ? 'Show less' : `View all ${filteredAvailable.length}`}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {filteredAvailable.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-gray-600">No bootcamps match your search.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visibleAvailable.map((bootcamp, i) => (
                <AvailableMiniCard
                  key={bootcamp.id}
                  bootcamp={bootcamp}
                  onEnroll={handleEnroll}
                  isEnrolling={enrollingId === bootcamp.id}
                  colorIdx={i}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
