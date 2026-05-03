'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft, ChevronDown, ChevronRight, Play, FileText,
  CheckCircle2, Clock, BookOpen, Layers,
  GraduationCap, ArrowRight, Trophy, Zap,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDurationMins(minutes) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatDurationSecs(seconds) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

// ─── Lesson Row ───────────────────────────────────────────────────────────────

function LessonRow({ lesson, bootcampId, lessonProgress, index }) {
  const progress = lessonProgress?.[lesson.id];
  const isCompleted = progress?.is_completed;
  const hasVideo = lesson.video_source && lesson.video_source !== 'none';

  return (
    <Link
      href={`/account/member/bootcamps/${bootcampId}/${lesson.id}`}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/5"
    >
      {/* Status icon */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center">
        {isCompleted ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/4 text-[10px] font-mono font-semibold text-gray-600 transition-colors group-hover:border-violet-500/30 group-hover:text-violet-400">
            {index + 1}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-medium transition-colors group-hover:text-white ${isCompleted ? 'text-gray-500 line-through decoration-white/20' : 'text-gray-300'}`}>
          {lesson.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {hasVideo ? (
            <span className="flex items-center gap-1 text-[10px] text-gray-600">
              <Play className="h-2.5 w-2.5" /> Video
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-gray-600">
              <FileText className="h-2.5 w-2.5" /> Reading
            </span>
          )}
          {lesson.duration > 0 && (
            <>
              <span className="text-[10px] text-gray-700">·</span>
              <span className="text-[10px] text-gray-600">{formatDurationSecs(lesson.duration)}</span>
            </>
          )}
          {lesson.is_free_preview && (
            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400 ring-1 ring-blue-500/20">
              Free
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-700 transition-all group-hover:translate-x-0.5 group-hover:text-violet-400" />
    </Link>
  );
}

// ─── Module Accordion ─────────────────────────────────────────────────────────

function ModuleAccordion({ module, bootcampId, lessonProgress, moduleIndex, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? moduleIndex === 0);

  const totalLessons = module.lessons?.length || 0;
  const completedCount = module.lessons?.filter((l) => lessonProgress?.[l.id]?.is_completed).length || 0;
  const allDone = completedCount === totalLessons && totalLessons > 0;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${allDone ? 'border-emerald-500/15 bg-emerald-500/3' : 'border-white/6 bg-white/2'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/4"
      >
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-mono font-bold ${allDone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/6 text-gray-400'}`}>
          {allDone ? '✓' : String(moduleIndex + 1).padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{module.title}</p>
          <p className="mt-0.5 text-[11px] text-gray-600">
            {completedCount}/{totalLessons} lessons
            {module.total_duration > 0 && <> · {formatDurationMins(module.total_duration)}</>}
          </p>
        </div>
        {/* Mini progress bar */}
        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/8 sm:block">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-0.5 border-t border-white/5 px-2 py-2">
          {module.lessons?.length > 0 ? (
            module.lessons.map((lesson, i) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                bootcampId={bootcampId}
                lessonProgress={lessonProgress}
                index={i}
              />
            ))
          ) : (
            <p className="px-3 py-4 text-xs text-gray-600">No lessons yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Course Section ───────────────────────────────────────────────────────────

function CourseSection({ course, bootcampId, lessonProgress, courseIndex }) {
  const [open, setOpen] = useState(courseIndex === 0);

  const totalLessons = course.modules?.reduce((s, m) => s + (m.lessons?.length || 0), 0) || 0;
  const completedCount = course.modules?.reduce(
    (s, m) => s + (m.lessons?.filter((l) => lessonProgress?.[l.id]?.is_completed).length || 0), 0
  ) || 0;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-gradient-to-r from-white/4 to-white/2 px-4 py-3.5 text-left shadow-sm transition-all hover:border-violet-500/20 hover:from-violet-500/8 hover:to-white/2"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/20">
          <Layers className="h-4 w-4 text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{course.title}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {completedCount}/{totalLessons} completed · {course.modules?.length || 0} modules · {pct}%
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-2 sm:ml-3 space-y-2 border-l-2 border-violet-500/15 pl-3 sm:pl-4">
          {course.modules?.map((module, mi) => (
            <ModuleAccordion
              key={module.id}
              module={module}
              bootcampId={bootcampId}
              lessonProgress={lessonProgress}
              moduleIndex={mi}
              defaultOpen={mi === 0 && courseIndex === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Progress Ring (SVG) ──────────────────────────────────────────────────────

function ProgressRing({ percent, size = 80 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={6} className="stroke-white/6 fill-none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} strokeWidth={6}
        strokeLinecap="round" fill="none"
        stroke="url(#progressGrad)"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.7s ease' }}
      />
      <defs>
        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, label, color }) {
  return (
    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BootcampLearningClient({ bootcamp, lessonProgress = {} }) {
  const allLessons = useMemo(() => {
    const lessons = [];
    bootcamp?.courses?.forEach((c) => {
      c.modules?.forEach((m) => {
        m.lessons?.forEach((l) => lessons.push(l));
      });
    });
    return lessons;
  }, [bootcamp?.courses]);

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => lessonProgress?.[l.id]?.is_completed).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const isComplete = completedCount === totalLessons && totalLessons > 0;

  const resumeLesson = useMemo(
    () => allLessons.find((l) => !lessonProgress?.[l.id]?.is_completed) || allLessons[0],
    [allLessons, lessonProgress]
  );

  const totalDuration = bootcamp?.total_duration;
  const coursesCount = bootcamp?.courses?.length || 0;
  const modulesCount = bootcamp?.courses?.reduce((s, c) => s + (c.modules?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-[#080b11] text-white">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/6 bg-[#080b11]/95 px-4 py-3 backdrop-blur-xl">
        <Link
          href="/account/member/bootcamps"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-500 transition-colors hover:bg-white/6 hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Bootcamps</span>
          <span className="sm:hidden">Back</span>
        </Link>
        <span className="text-gray-700">·</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/90">
          {bootcamp?.title}
        </span>
        {resumeLesson && (
          <Link
            href={`/account/member/bootcamps/${bootcamp.id}/${resumeLesson.id}`}
            className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 sm:flex"
          >
            <Play className="h-3 w-3 fill-current" />
            {completedCount > 0 ? 'Resume' : 'Start'}
          </Link>
        )}
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ── Hero Card ── */}
        <div className="mb-6 sm:mb-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-white/8 bg-[#0d1117] shadow-2xl shadow-black/40">
          {/* Banner */}
          {bootcamp?.thumbnail ? (
            <div className="relative aspect-[3/1] w-full overflow-hidden">
              <Image
                src={bootcamp.thumbnail}
                alt={bootcamp.title}
                fill
                className="object-cover"
                unoptimized
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/50 to-transparent" />
              {isComplete && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/30 backdrop-blur-sm">
                  <Trophy className="h-3 w-3" /> Course Complete!
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-24 sm:h-32 w-full bg-gradient-to-br from-violet-900/40 via-indigo-900/30 to-[#0d1117]">
              <div className="pointer-events-none absolute inset-0 opacity-30"
                style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(139,92,246,0.3), transparent 60%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.2), transparent 50%)' }}
              />
            </div>
          )}

          {/* Info */}
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold leading-tight tracking-tight text-white">
                  {bootcamp?.title}
                </h1>
                {bootcamp?.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 line-clamp-2">
                    {bootcamp.description}
                  </p>
                )}

                {/* Meta pills */}
                <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                  {coursesCount > 0 && (
                    <StatPill icon={Layers} label={`${coursesCount} course${coursesCount !== 1 ? 's' : ''}`} color="border-violet-500/20 bg-violet-500/8 text-violet-300" />
                  )}
                  {modulesCount > 0 && (
                    <StatPill icon={BookOpen} label={`${modulesCount} modules`} color="border-blue-500/20 bg-blue-500/8 text-blue-300" />
                  )}
                  {totalLessons > 0 && (
                    <StatPill icon={GraduationCap} label={`${totalLessons} lessons`} color="border-emerald-500/20 bg-emerald-500/8 text-emerald-300" />
                  )}
                  {totalDuration > 0 && (
                    <StatPill icon={Clock} label={formatDurationMins(totalDuration)} color="border-amber-500/20 bg-amber-500/8 text-amber-300" />
                  )}
                </div>
              </div>

              {/* Progress widget */}
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3 sm:flex-col sm:items-center sm:gap-2 sm:px-5 sm:py-4 sm:text-center sm:min-w-[120px]">
                <div className="relative flex items-center justify-center">
                  <ProgressRing percent={progressPercent} size={72} />
                  <span className="absolute text-[17px] font-extrabold tabular-nums text-white rotate-90 sm:rotate-0" style={{transform: 'none'}}>
                    {progressPercent}%
                  </span>
                </div>
                <div className="sm:text-center">
                  <p className="text-[13px] font-bold text-white">{progressPercent}%</p>
                  <p className="text-[10px] sm:text-[11px] text-gray-600">{completedCount}/{totalLessons} done</p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8 sm:w-20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resume CTA */}
            {resumeLesson && (
              <div className="mt-4 sm:mt-6 flex flex-col gap-3 rounded-2xl border border-white/6 bg-white/2 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-600">
                    {completedCount > 0 ? 'Continue where you left off' : 'Begin your learning journey'}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-gray-200">
                    {resumeLesson.title}
                  </p>
                </div>
                <Link
                  href={`/account/member/bootcamps/${bootcamp.id}/${resumeLesson.id}`}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 sm:px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/35 active:scale-95"
                >
                  <Zap className="h-4 w-4" />
                  {completedCount > 0 ? 'Resume Learning' : 'Start Learning'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Curriculum ── */}
        <div>
          <div className="mb-4 sm:mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">Course Curriculum</h2>
              <p className="mt-0.5 text-[12px] text-gray-600">{completedCount}/{totalLessons} lessons completed</p>
            </div>
            {progressPercent > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 sm:px-3 py-1 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                {progressPercent}% complete
              </span>
            )}
          </div>

          {bootcamp?.courses?.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {bootcamp.courses.map((course, ci) => (
                <CourseSection
                  key={course.id}
                  course={course}
                  bootcampId={bootcamp.id}
                  lessonProgress={lessonProgress}
                  courseIndex={ci}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/6 bg-gradient-to-br from-white/3 to-transparent py-16 sm:py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                <BookOpen className="h-8 w-8 text-gray-700" />
              </div>
              <p className="text-sm font-bold text-gray-400">No curriculum yet</p>
              <p className="mt-1.5 text-xs text-gray-600">The instructor hasn&apos;t published lessons yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
