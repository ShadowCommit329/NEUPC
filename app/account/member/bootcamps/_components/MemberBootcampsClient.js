'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import SafeImg from '@/app/_components/ui/SafeImg';
import {
  BookOpen, Clock, Play, Search, ArrowRight, Loader2,
  GraduationCap, Zap, Trophy, ChevronRight, Star,
  Sparkles, CheckCircle2, X,
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

const ACCENT_COLORS = [
  { bar: 'bg-violet-500', text: 'text-violet-400', glow: 'shadow-violet-500/25',
    pill: 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20',
    progress: 'from-violet-500 to-violet-400', btn: 'bg-violet-500 hover:bg-violet-400',
    border: 'border-violet-500/20', soft: 'bg-violet-500/8' },
  { bar: 'bg-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/25',
    pill: 'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20',
    progress: 'from-blue-500 to-blue-400', btn: 'bg-blue-500 hover:bg-blue-400',
    border: 'border-blue-500/20', soft: 'bg-blue-500/8' },
  { bar: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/25',
    pill: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
    progress: 'from-amber-500 to-amber-400', btn: 'bg-amber-500 hover:bg-amber-400',
    border: 'border-amber-500/20', soft: 'bg-amber-500/8' },
  { bar: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/25',
    pill: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
    progress: 'from-emerald-500 to-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-400',
    border: 'border-emerald-500/20', soft: 'bg-emerald-500/8' },
  { bar: 'bg-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/25',
    pill: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
    progress: 'from-rose-500 to-rose-400', btn: 'bg-rose-500 hover:bg-rose-400',
    border: 'border-rose-500/20', soft: 'bg-rose-500/8' },
];

const CARD_GRADIENTS = [
  'from-violet-600 to-indigo-700', 'from-cyan-500 to-blue-700',
  'from-rose-500 to-pink-700', 'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-700', 'from-emerald-500 to-teal-700',
];

// ─── Enrolled Card ─────────────────────────────────────────────────────────────

function EnrolledCard({ bootcamp, enrollment, colorIdx }) {
  const c = ACCENT_COLORS[colorIdx % ACCENT_COLORS.length];
  const progress = enrollment?.progress_percent || 0;
  const completedLessons = enrollment?.completed_lessons || 0;
  const totalLessons = bootcamp?.total_lessons || 0;
  const duration = formatDuration(bootcamp?.total_duration);
  const lastOpened = timeAgo(enrollment?.last_accessed_at);
  const remainingLessons = totalLessons - completedLessons;
  const isComplete = remainingLessons === 0 && totalLessons > 0;

  return (
    <Link
      href={`/account/member/bootcamps/${bootcamp.id}`}
      className={`group relative flex overflow-hidden rounded-2xl border border-white/8 bg-[#0d1117] transition-all duration-300 hover:border-white/15 hover:shadow-xl hover:-translate-y-0.5 ${c.glow} shadow-lg`}
    >
      {/* Accent bar */}
      <div className={`w-1 shrink-0 ${c.bar} transition-all duration-300 group-hover:w-1.5`} />

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5 min-w-0">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {bootcamp.category && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.pill}`}>
                {bootcamp.category}
              </span>
            )}
            {bootcamp.difficulty_level && (
              <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-gray-500">
                {bootcamp.difficulty_level}
              </span>
            )}
            {isComplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                <Trophy className="h-2.5 w-2.5" /> Complete
              </span>
            )}
          </div>
          {lastOpened && (
            <span className="shrink-0 text-[10px] text-gray-600">{lastOpened}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold leading-snug tracking-tight text-white/95 transition-colors group-hover:text-white line-clamp-2">
          {bootcamp.title || 'Untitled Bootcamp'}
        </h3>

        {/* Current lesson chip */}
        {enrollment?.current_lesson_title && (
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-white/6 bg-white/4 px-3 py-1.5 text-[11px] text-gray-400 transition-colors group-hover:border-white/10 max-w-full">
            <Play className={`h-3 w-3 shrink-0 ${c.text}`} />
            <span className="truncate">Lesson {completedLessons + 1} · {enrollment.current_lesson_title}</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">{completedLessons} / {totalLessons} lessons</span>
            <span className={`font-bold tabular-nums ${c.text}`}>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${c.progress} transition-all duration-700`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/6 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <Clock className="h-3 w-3" />
            {remainingLessons > 0
              ? `${remainingLessons} lesson${remainingLessons !== 1 ? 's' : ''} left`
              : 'All done'}
            {duration && ` · ${duration}`}
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all duration-200 ${c.btn}`}>
            <Play className="h-3 w-3 fill-current" />
            {isComplete ? 'Review' : 'Resume'}
          </span>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="hidden w-32 shrink-0 overflow-hidden sm:block md:w-40">
        {bootcamp.thumbnail ? (
          <div className="relative h-full w-full">
            <SafeImg
              src={bootcamp.thumbnail}
              alt={bootcamp.title || ''}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117]/60 to-transparent" />
          </div>
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${c.soft}`}>
            <BookOpen className={`h-8 w-8 ${c.text} opacity-40`} />
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Available Card ────────────────────────────────────────────────────────────

function AvailableCard({ bootcamp, onEnroll, isEnrolling, colorIdx }) {
  const gradient = CARD_GRADIENTS[colorIdx % CARD_GRADIENTS.length];
  const totalLessons = bootcamp.total_lessons || 0;
  const duration = formatDuration(bootcamp.total_duration);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d1117] shadow-lg transition-all duration-300 hover:border-white/15 hover:shadow-xl hover:-translate-y-1">
      {/* Banner */}
      {bootcamp.thumbnail ? (
        <div className="relative h-36 w-full shrink-0 overflow-hidden">
          <SafeImg
            src={bootcamp.thumbnail}
            alt={bootcamp.title || ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117]/80 via-[#0d1117]/20 to-transparent" />
          {bootcamp.is_featured && (
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30 backdrop-blur-sm">
                <Star className="h-2.5 w-2.5 fill-current" /> Featured
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={`relative flex h-36 w-full shrink-0 items-center justify-center bg-gradient-to-br ${gradient}`}>
          <BookOpen className="h-10 w-10 text-white/30" />
          {bootcamp.is_featured && (
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
                <Star className="h-2.5 w-2.5 fill-current" /> Featured
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Category + level */}
        <div className="flex flex-wrap items-center gap-1.5">
          {bootcamp.category && (
            <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-violet-300 ring-1 ring-violet-500/20">
              {bootcamp.category}
            </span>
          )}
          {bootcamp.difficulty_level && (
            <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-gray-500">
              {bootcamp.difficulty_level}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[14px] font-bold leading-snug tracking-tight text-white/90 transition-colors group-hover:text-white line-clamp-2 flex-1">
          {bootcamp.title || 'Untitled Bootcamp'}
        </h3>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          {totalLessons > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {totalLessons} lessons
            </span>
          )}
          {duration && (
            <>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {duration}
              </span>
            </>
          )}
          {bootcamp.price > 0 && (
            <>
              <span className="text-gray-700">·</span>
              <span className="font-bold text-white/70">৳{bootcamp.price.toLocaleString()}</span>
            </>
          )}
        </div>

        {/* Enroll button */}
        <button
          onClick={() => onEnroll(bootcamp.id)}
          disabled={isEnrolling}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600/80 to-violet-700/80 py-2.5 text-[12.5px] font-semibold text-white ring-1 ring-violet-500/30 transition-all hover:from-violet-500 hover:to-violet-600 hover:ring-violet-400/40 hover:shadow-lg hover:shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
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

// ─── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ enrolled, totalCompleted, available }) {
  const stats = [
    { icon: GraduationCap, label: 'Enrolled', value: enrolled, color: 'text-violet-400' },
    { icon: CheckCircle2, label: 'Lessons Done', value: totalCompleted, color: 'text-emerald-400' },
    { icon: Sparkles, label: 'Available', value: available, color: 'text-amber-400' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-white/6 bg-white/2 p-3 sm:p-4 text-center">
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
          <span className={`text-xl sm:text-2xl font-extrabold tabular-nums ${color}`}>{value}</span>
          <span className="text-[10px] sm:text-[11px] text-gray-600">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty States ──────────────────────────────────────────────────────────────

function EmptyEnrolled({ onBrowse }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 py-14 sm:py-20 text-center px-4">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/25">
        <GraduationCap className="h-8 w-8 text-violet-400" />
      </div>
      <p className="mb-1 text-[15px] font-bold text-white">No enrollments yet</p>
      <p className="mb-6 max-w-xs text-[13px] text-gray-500">
        Start learning by enrolling in a bootcamp below.
      </p>
      <button
        onClick={onBrowse}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 hover:shadow-violet-500/30 active:scale-95"
      >
        <BookOpen className="h-4 w-4" />
        Browse Bootcamps
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptySearch({ query, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/6 py-12 text-center px-4">
      <Search className="mb-3 h-8 w-8 text-gray-700" />
      <p className="text-[13px] font-semibold text-gray-400">No results for &ldquo;{query}&rdquo;</p>
      <button onClick={onClear} className="mt-3 text-[12px] text-violet-400 hover:text-violet-300 transition-colors">
        Clear search
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MemberBootcampsClient({ bootcamps = [], enrollmentMap = {} }) {
  const [search, setSearch] = useState('');
  const [, startTransition] = useTransition();
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
    return enrolledBootcamps.filter((e) => e.bootcamp?.title?.toLowerCase().includes(q));
  }, [enrolledBootcamps, search]);

  const filteredAvailable = useMemo(() => {
    let list = [...availableBootcamps];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) => b.title?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    return list;
  }, [availableBootcamps, search]);

  const visibleAvailable = showAvailableAll ? filteredAvailable : filteredAvailable.slice(0, 6);

  const totalLessonsCompleted = enrolledBootcamps.reduce(
    (sum, e) => sum + (e.enrollment?.completed_lessons || 0), 0
  );

  const handleEnroll = async (bootcampId) => {
    setEnrollingId(bootcampId);
    startTransition(async () => {
      try {
        const result = await enrollUser(bootcampId);
        if (result.success) {
          setLocalEnrollmentMap((prev) => ({
            ...prev,
            [bootcampId]: { ...result.enrollment, progress_percent: 0, completed_lessons: 0 },
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
    <div className="flex flex-col gap-6 sm:gap-8">

      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-violet-500/8 via-white/2 to-indigo-500/5 p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-indigo-500/6 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-violet-400" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-violet-400">Learning Hub</span>
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-white">
              My Bootcamps
            </h1>
            <p className="mt-1 text-[12px] sm:text-[13px] text-gray-500">
              {enrolledBootcamps.length > 0
                ? `${enrolledBootcamps.length} enrolled · ${totalLessonsCompleted} lessons completed`
                : 'Start learning today'}
              {availableBootcamps.length > 0 && ` · ${availableBootcamps.length} available`}
            </p>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bootcamps…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full sm:w-56 rounded-xl border border-white/8 bg-white/5 pl-9 pr-9 text-[12.5px] text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/40 focus:bg-white/8 focus:ring-1 focus:ring-violet-500/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      {(enrolledBootcamps.length > 0 || availableBootcamps.length > 0) && (
        <StatsBar
          enrolled={enrolledBootcamps.length}
          totalCompleted={totalLessonsCompleted}
          available={availableBootcamps.length}
        />
      )}

      {/* ── Enrolled Section ── */}
      {enrolledBootcamps.length === 0 ? (
        <EmptyEnrolled
          onBrowse={() =>
            document.getElementById('available-section')?.scrollIntoView({ behavior: 'smooth' })
          }
        />
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-white">Continue Learning</h2>
              <p className="mt-0.5 text-[12px] text-gray-500">Pick up where you left off</p>
            </div>
            <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-400 ring-1 ring-violet-500/20">
              {enrolledBootcamps.length} course{enrolledBootcamps.length !== 1 ? 's' : ''}
            </span>
          </div>
          {filteredEnrolled.length === 0 ? (
            <EmptySearch query={search} onClear={() => setSearch('')} />
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

      {/* ── Available Section ── */}
      {availableBootcamps.length > 0 && (
        <section id="available-section">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-white">Available Bootcamps</h2>
              <p className="mt-0.5 text-[12px] text-gray-500">Expand your skills — enroll for free</p>
            </div>
            {filteredAvailable.length > 6 && (
              <button
                onClick={() => setShowAvailableAll((v) => !v)}
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-violet-400 transition-colors hover:text-violet-300"
              >
                {showAvailableAll ? 'Show less' : `View all ${filteredAvailable.length}`}
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showAvailableAll ? 'rotate-90' : ''}`} />
              </button>
            )}
          </div>
          {filteredAvailable.length === 0 ? (
            <EmptySearch query={search} onClear={() => setSearch('')} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visibleAvailable.map((bootcamp, i) => (
                <AvailableCard
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
