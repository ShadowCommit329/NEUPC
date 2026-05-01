/**
 * @file Member bootcamps client — redesigned to match the NEUPC member panel
 *   HTML reference (bootcamps.html). Enrolled bootcamps show as horizontal
 *   cards with a colored left bar; available bootcamps show as a 3-col mini grid.
 * @module MemberBootcampsClient
 */

'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Play,
  Search,
  ArrowRight,
  Users,
  Loader2,
  GraduationCap,
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

// Cycles through accent colors for enrolled cards (matches the HTML bar colors)
const BAR_COLORS = [
  { bar: 'bg-[#7c83ff]', pill: 'bg-[rgba(124,131,255,0.12)] text-[#aab0ff] border border-[rgba(124,131,255,0.20)]', progress: 'bg-[#7c83ff]' },
  { bar: 'bg-[#60a5fa]', pill: 'bg-[rgba(96,165,250,0.12)] text-[#93c5fd] border border-[rgba(96,165,250,0.20)]', progress: 'bg-[#60a5fa]' },
  { bar: 'bg-[#fbbf24]', pill: 'bg-[rgba(251,191,36,0.12)] text-[#fcd34d] border border-[rgba(251,191,36,0.20)]', progress: 'bg-[#fbbf24]' },
  { bar: 'bg-[#4ade80]', pill: 'bg-[rgba(74,222,128,0.12)] text-[#86efac] border border-[rgba(74,222,128,0.20)]', progress: 'bg-[#4ade80]' },
];

const MINI_COLORS = [
  { icon: 'from-[#a78bfa] to-[#7c3aed]' },
  { icon: 'from-[#22d3ee] to-[#0e7490]' },
  { icon: 'from-[#fb7185] to-[#be123c]' },
  { icon: 'from-[#fbbf24] to-[#d97706]' },
  { icon: 'from-[#7c83ff] to-[#5b62cc]' },
  { icon: 'from-[#4ade80] to-[#22a360]' },
];

// ─── Enrolled Card ─────────────────────────────────────────────────────────────

function EnrolledCard({ bootcamp, enrollment, colorIdx }) {
  const colors = BAR_COLORS[colorIdx % BAR_COLORS.length];
  const progress = enrollment?.progress_percent || 0;
  const completedLessons = enrollment?.completed_lessons || 0;
  const totalLessons = bootcamp?.total_lessons || 0;
  const duration = formatDuration(bootcamp?.total_duration);
  const lastOpened = timeAgo(enrollment?.last_accessed_at);

  // Build a current-lesson label from data if available
  const currentLesson = enrollment?.current_lesson_title
    ? `Lesson ${(completedLessons || 0) + 1} · ${enrollment.current_lesson_title}`
    : totalLessons > 0
    ? `Lesson ${Math.min(completedLessons + 1, totalLessons)} of ${totalLessons}`
    : null;

  const remainingLessons = totalLessons - completedLessons;

  return (
    <Link
      href={`/account/member/bootcamps/${bootcamp.id}`}
      className="group flex overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121317] transition-colors hover:border-[rgba(255,255,255,0.09)]"
    >
      {/* Colored left bar */}
      <div className={`w-[3px] shrink-0 ${colors.bar}`} />

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 px-[18px] py-4">
        {/* Row 1: track pill + last opened */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {bootcamp.category && (
              <span className={`inline-flex items-center rounded-full px-[7px] py-[2px] text-[11px] font-medium ${colors.pill}`}>
                {bootcamp.category}
              </span>
            )}
            {bootcamp.difficulty_level && (
              <span className="font-mono text-[11px] text-[#8a8d96]">
                {bootcamp.difficulty_level}
              </span>
            )}
          </div>
          {lastOpened && (
            <span className="text-[11.5px] text-[#8a8d96]">
              Last opened {lastOpened}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[#ededee]">
          {bootcamp.title || 'Untitled Bootcamp'}
        </div>

        {/* Current lesson badge */}
        {currentLesson && (
          <div className="inline-flex items-center gap-2 self-start rounded-[6px] border border-[rgba(255,255,255,0.06)] bg-[#181a1f] px-[10px] py-[6px] text-[12.5px] text-[#b4b6bd]">
            <Play className="h-[11px] w-[11px] text-[#aab0ff]" />
            <span>{currentLesson}</span>
          </div>
        )}

        {/* Progress row */}
        <div className="flex flex-1 flex-col gap-[5px] pt-1">
          <div className="flex justify-between text-[12px]">
            <span className="text-[#b4b6bd]">
              {completedLessons} of {totalLessons} lessons
            </span>
            <span className="font-medium text-[#ededee] tabular-nums">
              {progress}%
            </span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#1f2127]">
            <div
              className={`h-full rounded-full transition-all ${colors.progress}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-2">
          <span className="flex items-center gap-1 text-[11.5px] text-[#8a8d96]">
            <Clock className="h-[11px] w-[11px]" />
            {remainingLessons > 0 ? `${remainingLessons} lessons remaining` : 'All lessons complete'}
            {duration && ` · ~${duration}`}
          </span>
          <span className="inline-flex items-center gap-[5px] rounded-[6px] bg-[#ededee] px-[11px] py-[5px] text-[12.5px] font-medium text-[#08090b] transition-colors group-hover:bg-white">
            <Play className="h-[11px] w-[11px] fill-current" />
            Resume
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Available Mini Card ───────────────────────────────────────────────────────

function AvailableMiniCard({ bootcamp, onEnroll, isEnrolling, colorIdx }) {
  const colors = MINI_COLORS[colorIdx % MINI_COLORS.length];
  const totalLessons = bootcamp.total_lessons || 0;
  const duration = formatDuration(bootcamp.total_duration);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121317] p-4 transition-colors hover:border-[rgba(255,255,255,0.09)]">
      {/* Icon */}
      <div className={`flex h-8 w-8 items-center justify-center rounded-[6px] bg-gradient-to-br ${colors.icon}`}>
        <BookOpen className="h-4 w-4 text-white" />
      </div>

      {/* Title */}
      <div className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-[#ededee]">
        {bootcamp.title || 'Untitled Bootcamp'}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-1 text-[11.5px] text-[#8a8d96]">
        {bootcamp.difficulty_level && <span>{bootcamp.difficulty_level}</span>}
        {bootcamp.difficulty_level && totalLessons > 0 && <span>·</span>}
        {totalLessons > 0 && <span className="tabular-nums">{totalLessons} lessons</span>}
        {duration && <span>·</span>}
        {duration && <span className="tabular-nums">{duration}</span>}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-2">
        {bootcamp.instructor_name ? (
          <span className="text-[11.5px] text-[#8a8d96]">{bootcamp.instructor_name}</span>
        ) : (
          <span />
        )}
        <button
          onClick={() => onEnroll(bootcamp.id)}
          disabled={isEnrolling}
          className="inline-flex items-center gap-[5px] rounded-[6px] border border-[rgba(255,255,255,0.09)] bg-transparent px-[9px] py-[5px] text-[12px] font-medium text-[#ededee] transition-colors hover:bg-[#181a1f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnrolling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Users className="h-3 w-3" />
          )}
          {isEnrolling ? 'Enrolling…' : 'Enroll'}
        </button>
      </div>
    </div>
  );
}

// ─── Empty States ──────────────────────────────────────────────────────────────

function EmptyEnrolled({ onBrowse }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121317] py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(124,131,255,0.10)]">
        <GraduationCap className="h-7 w-7 text-[#aab0ff]" />
      </div>
      <p className="mb-1 text-[15px] font-semibold text-[#ededee]">No enrollments yet</p>
      <p className="mb-4 max-w-xs text-[13px] text-[#8a8d96]">
        Check out the available bootcamps below to start learning.
      </p>
      <button
        onClick={onBrowse}
        className="inline-flex items-center gap-2 rounded-[6px] border border-[rgba(255,255,255,0.09)] bg-[#181a1f] px-[12px] py-[7px] text-[12.5px] font-medium text-[#ededee] transition-colors hover:bg-[#1f2127]"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Browse Available Bootcamps
        <ArrowRight className="h-3.5 w-3.5" />
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
    // Most recently accessed first
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
    // Featured first
    list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    return list;
  }, [availableBootcamps, search]);

  const visibleAvailable = showAvailableAll
    ? filteredAvailable
    : filteredAvailable.slice(0, 6);

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
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white/90">
            Bootcamps
          </h1>
          <p className="mt-1 text-[13px] text-white/40">
            {enrolledBootcamps.length} enrolled · {totalLessonsCompleted} lessons completed
            {availableBootcamps.length > 0 && ` · ${availableBootcamps.length} available`}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-[9px] h-[13px] w-[13px] -translate-y-1/2 text-[#5b5e66]" />
          <input
            type="text"
            placeholder="Search bootcamps…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[30px] w-52 rounded-[6px] border border-[rgba(255,255,255,0.06)] bg-[#121317] pl-7 pr-3 text-[12.5px] text-[#ededee] placeholder-[#5b5e66] outline-none transition-colors focus:border-[rgba(255,255,255,0.09)] focus:bg-[#181a1f]"
          />
        </div>
      </div>

      {/* ── Enrolled section ── */}
      {enrolledBootcamps.length === 0 ? (
        <EmptyEnrolled onBrowse={() => document.getElementById('available-section')?.scrollIntoView({ behavior: 'smooth' })} />
      ) : (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#ededee]">Continue learning</p>
              <p className="text-[12px] text-[#8a8d96]">Pick up where you left off</p>
            </div>
          </div>

          {filteredEnrolled.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#5b5e66]">No bootcamps match your search.</p>
          ) : (
            <div className="flex flex-col gap-[10px]">
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
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#ededee]">Available bootcamps</p>
              <p className="text-[12px] text-[#8a8d96]">Expand your skills</p>
            </div>
            {filteredAvailable.length > 6 && (
              <button
                onClick={() => setShowAvailableAll((v) => !v)}
                className="inline-flex items-center gap-1 text-[12.5px] text-[#aab0ff] hover:text-[#8b91ff]"
              >
                {showAvailableAll ? 'Show less' : 'Browse all'}
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {filteredAvailable.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#5b5e66]">No bootcamps match your search.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
