/**
 * @file Bootcamp learning view client — displays curriculum sidebar
 *   with nested courses/modules/lessons and the current lesson content.
 * @module BootcampLearningClient
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Play,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  FileText,
  Lock,
  Menu,
  X,
  GraduationCap,
  BarChart2,
  List,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

// ─── Lesson Item ──────────────────────────────────────────────────────────────

function LessonItem({ lesson, isActive, isCompleted, onClick }) {
  const hasVideo = lesson.video_source !== 'none';

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
        isActive
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'text-gray-400 hover:bg-white/6 hover:text-gray-200'
      }`}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : hasVideo ? (
          <Play
            className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-gray-600'}`}
          />
        ) : (
          <FileText
            className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-gray-600'}`}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-medium ${
            isActive ? 'text-emerald-400' : 'text-gray-300'
          }`}
        >
          {lesson.title}
        </p>
        {lesson.duration > 0 && (
          <p className="mt-0.5 text-[10px] text-gray-600">
            {formatDuration(lesson.duration)}
          </p>
        )}
      </div>

      {/* Free preview badge */}
      {lesson.is_free_preview && (
        <span className="shrink-0 rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">
          Free
        </span>
      )}
    </button>
  );
}

// ─── Module Accordion ─────────────────────────────────────────────────────────

function ModuleAccordion({
  module,
  isExpanded,
  onToggle,
  currentLessonId,
  lessonProgress,
  onSelectLesson,
}) {
  const completedCount =
    module.lessons?.filter((l) => lessonProgress[l.id]?.is_completed).length ||
    0;
  const totalCount = module.lessons?.length || 0;

  return (
    <div className="overflow-hidden rounded-xl border border-white/6 bg-white/2">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {module.title}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-600">
            {completedCount}/{totalCount} lessons completed
          </p>
        </div>
        {/* Progress circle */}
        <div className="relative h-8 w-8 shrink-0">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-white/10"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${(completedCount / totalCount) * 88} 88`}
              className="text-emerald-500"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
            {totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0}
            %
          </span>
        </div>
      </button>

      {isExpanded && module.lessons?.length > 0 && (
        <div className="space-y-0.5 border-t border-white/5 px-2 py-2">
          {module.lessons.map((lesson) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              isActive={lesson.id === currentLessonId}
              isCompleted={lessonProgress[lesson.id]?.is_completed}
              onClick={() => onSelectLesson(lesson)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Course Accordion ─────────────────────────────────────────────────────────

function CourseAccordion({
  course,
  isExpanded,
  onToggle,
  currentLessonId,
  lessonProgress,
  onSelectLesson,
  expandedModules,
  onToggleModule,
}) {
  const totalLessons =
    course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const completedLessons =
    course.modules?.reduce(
      (sum, m) =>
        sum +
        (m.lessons?.filter((l) => lessonProgress[l.id]?.is_completed).length ||
          0),
      0
    ) || 0;

  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-xl bg-white/4 px-4 py-3.5 text-left transition-colors hover:bg-white/6"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
        <BookOpen className="h-4 w-4 shrink-0 text-violet-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">
            {course.title}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500">
            {completedLessons}/{totalLessons} lessons •{' '}
            {formatMinutes(course.total_duration)}
          </p>
        </div>
      </button>

      {isExpanded && course.modules?.length > 0 && (
        <div className="ml-4 space-y-2">
          {course.modules.map((module) => (
            <ModuleAccordion
              key={module.id}
              module={module}
              isExpanded={expandedModules.includes(module.id)}
              onToggle={() => onToggleModule(module.id)}
              currentLessonId={currentLessonId}
              lessonProgress={lessonProgress}
              onSelectLesson={onSelectLesson}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Curriculum Sidebar ───────────────────────────────────────────────────────

function CurriculumSidebar({
  bootcamp,
  currentLessonId,
  lessonProgress,
  onSelectLesson,
  isOpen,
  onClose,
}) {
  const [expandedCourses, setExpandedCourses] = useState([]);
  const [expandedModules, setExpandedModules] = useState([]);

  // Auto-expand course/module containing current lesson
  useEffect(() => {
    if (!currentLessonId || !bootcamp?.courses) return;

    for (const course of bootcamp.courses) {
      for (const mod of course.modules || []) {
        const hasLesson = mod.lessons?.some((l) => l.id === currentLessonId);
        if (hasLesson) {
          setExpandedCourses((prev) =>
            prev.includes(course.id) ? prev : [...prev, course.id]
          );
          setExpandedModules((prev) =>
            prev.includes(mod.id) ? prev : [...prev, mod.id]
          );
          return;
        }
      }
    }
  }, [currentLessonId, bootcamp?.courses]);

  const toggleCourse = (id) => {
    setExpandedCourses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleModule = (id) => {
    setExpandedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Calculate overall progress
  const totalLessons =
    bootcamp?.courses?.reduce(
      (sum, c) =>
        sum + c.modules?.reduce((s, m) => s + (m.lessons?.length || 0), 0),
      0
    ) || 0;
  const completedLessons = Object.values(lessonProgress).filter(
    (p) => p.is_completed
  ).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/8 p-4">
        <div className="flex items-center justify-between">
          <Link
            href="/account/member/bootcamps"
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to bootcamps</span>
          </Link>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/8 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-3 line-clamp-2 text-sm font-bold text-white">
          {bootcamp?.title}
        </h2>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Overall Progress</span>
            <span className="font-semibold text-white">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-gray-600">
            {completedLessons} of {totalLessons} lessons completed
          </p>
        </div>
      </div>

      {/* Curriculum */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {bootcamp?.courses?.map((course) => (
          <CourseAccordion
            key={course.id}
            course={course}
            isExpanded={expandedCourses.includes(course.id)}
            onToggle={() => toggleCourse(course.id)}
            currentLessonId={currentLessonId}
            lessonProgress={lessonProgress}
            onSelectLesson={onSelectLesson}
            expandedModules={expandedModules}
            onToggleModule={toggleModule}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden w-80 shrink-0 border-r border-white/8 bg-[#0d1117] lg:block">
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-[#0d1117] shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Lesson Not Found ─────────────────────────────────────────────────────────

function LessonNotFound({ bootcamp, onSelectLesson }) {
  // Find first lesson
  const firstLesson = bootcamp?.courses?.[0]?.modules?.[0]?.lessons?.[0];

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
        <GraduationCap className="h-8 w-8 text-violet-400" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-white">
        Ready to Start Learning?
      </h2>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        Select a lesson from the curriculum to begin, or start with the first
        lesson.
      </p>
      {firstLesson && (
        <button
          onClick={() => onSelectLesson(firstLesson)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <Play className="h-4 w-4 fill-current" />
          Start First Lesson
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BootcampLearningClient({
  bootcamp,
  enrollment,
  lessonProgress,
  initialLessonId,
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState(
    initialLessonId || null
  );

  // Find current lesson data
  const currentLesson = useMemo(() => {
    if (!currentLessonId || !bootcamp?.courses) return null;

    for (const course of bootcamp.courses) {
      for (const mod of course.modules || []) {
        const lesson = mod.lessons?.find((l) => l.id === currentLessonId);
        if (lesson) {
          return {
            ...lesson,
            moduleName: mod.title,
            courseName: course.title,
          };
        }
      }
    }
    return null;
  }, [currentLessonId, bootcamp?.courses]);

  // Get all lessons in order for prev/next navigation
  const allLessons = useMemo(() => {
    const lessons = [];
    bootcamp?.courses?.forEach((course) => {
      course.modules?.forEach((mod) => {
        mod.lessons?.forEach((lesson) => {
          lessons.push({
            ...lesson,
            moduleName: mod.title,
            courseName: course.title,
          });
        });
      });
    });
    return lessons;
  }, [bootcamp?.courses]);

  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const handleSelectLesson = useCallback(
    (lesson) => {
      setCurrentLessonId(lesson.id);
      setSidebarOpen(false);
      // Update URL without full navigation
      router.push(`/account/member/bootcamps/${bootcamp.id}/${lesson.id}`, {
        scroll: false,
      });
    },
    [bootcamp?.id, router]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <CurriculumSidebar
        bootcamp={bootcamp}
        currentLessonId={currentLessonId}
        lessonProgress={lessonProgress}
        onSelectLesson={handleSelectLesson}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b border-white/8 bg-[#0d1117] px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-gray-400 hover:bg-white/8 hover:text-white"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {currentLesson?.title || bootcamp?.title}
            </p>
            {currentLesson && (
              <p className="truncate text-[10px] text-gray-500">
                {currentLesson.courseName} • {currentLesson.moduleName}
              </p>
            )}
          </div>
        </div>

        {/* Lesson content or welcome screen */}
        {currentLesson ? (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Lesson header */}
            <div className="border-b border-white/8 bg-[#0d1117] px-6 py-4">
              <div className="hidden text-[11px] text-gray-500 lg:block">
                {currentLesson.courseName} → {currentLesson.moduleName}
              </div>
              <h1 className="mt-1 text-xl font-bold text-white lg:text-2xl">
                {currentLesson.title}
              </h1>
              {currentLesson.duration > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(currentLesson.duration)}
                </div>
              )}
            </div>

            {/* Video/content placeholder - will be replaced with actual VideoPlayer */}
            <div className="flex-1 p-6">
              <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-900">
                <div className="text-center">
                  <Play className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                  <p className="text-sm text-gray-500">
                    Video player will be rendered here
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Lesson ID: {currentLesson.id}
                  </p>
                </div>
              </div>

              {/* Description */}
              {currentLesson.description && (
                <div className="mt-6 rounded-xl border border-white/8 bg-white/3 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">
                    About this lesson
                  </h3>
                  <p className="text-sm text-gray-400">
                    {currentLesson.description}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="shrink-0 border-t border-white/8 bg-[#0d1117] px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                {prevLesson ? (
                  <button
                    onClick={() => handleSelectLesson(prevLesson)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/8 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                ) : (
                  <div />
                )}

                {/* Mark complete button */}
                <button
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    lessonProgress[currentLessonId]?.is_completed
                      ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {lessonProgress[currentLessonId]?.is_completed
                    ? 'Completed'
                    : 'Mark as Complete'}
                </button>

                {nextLesson ? (
                  <button
                    onClick={() => handleSelectLesson(nextLesson)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/8 hover:text-white"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </div>
        ) : (
          <LessonNotFound
            bootcamp={bootcamp}
            onSelectLesson={handleSelectLesson}
          />
        )}
      </div>
    </div>
  );
}
