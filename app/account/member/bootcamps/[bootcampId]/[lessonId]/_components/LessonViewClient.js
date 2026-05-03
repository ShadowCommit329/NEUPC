'use client';

import { useState, useCallback, useTransition, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock,
  FileText, Menu, X, Play, Download, BookOpen, Loader2,
  StickyNote, ChevronDown, List,
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { updateLessonProgress, markLessonComplete, markLessonIncomplete, saveLessonNotes } from '@/app/_lib/bootcamp-actions';
import LessonContentRenderer from './LessonContentRenderer';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const CUSTOM_SCROLLBAR_STYLES = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    transition: all 0.2s;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
  }
`;

// ─── Lesson Item ──────────────────────────────────────────────────────────────

function LessonItem({ lesson, isActive, isCompleted, onClick }) {
  const hasVideo = lesson.video_source && lesson.video_source !== 'none';
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
        isActive
          ? 'bg-emerald-500/12 ring-1 ring-emerald-500/20'
          : 'hover:bg-white/5'
      }`}
    >
      <div className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : hasVideo ? (
          <Play className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-gray-600'}`} />
        ) : (
          <FileText className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-gray-600'}`} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-medium leading-snug ${isActive ? 'text-emerald-300' : isCompleted ? 'text-gray-500' : 'text-gray-300 group-hover:text-white'}`}>
          {lesson.title}
        </p>
        {lesson.duration > 0 && (
          <p className="mt-0.5 text-[10px] text-gray-600">{formatDuration(lesson.duration)}</p>
        )}
      </div>
      {lesson.is_free_preview && (
        <span className="shrink-0 rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">Free</span>
      )}
      {isActive && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />}
    </button>
  );
}

// ─── Module Accordion ─────────────────────────────────────────────────────────

function ModuleAccordion({ module, currentLessonId, lessonProgress, onSelectLesson }) {
  const hasActive = module.lessons?.some((l) => l.id === currentLessonId);
  const [isExpanded, setIsExpanded] = useState(hasActive);
  const completedCount = module.lessons?.filter((l) => lessonProgress[l.id]?.is_completed).length || 0;
  const totalCount = module.lessons?.length || 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  return (
    <div className={`overflow-hidden rounded-xl border ${allDone ? 'border-emerald-500/15' : 'border-white/6'} bg-white/2`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-white/4"
      >
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white leading-snug">{module.title}</p>
          <p className="mt-0.5 text-[10px] text-gray-600">{completedCount}/{totalCount} done</p>
        </div>
        {allDone && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
      </button>
      {isExpanded && module.lessons?.length > 0 && (
        <div className="space-y-0.5 border-t border-white/5 px-1.5 py-1.5">
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ bootcamp, currentLessonId, lessonProgress, onSelectLesson, isOpen, onClose }) {
  const totalLessons = bootcamp?.courses?.reduce(
    (sum, c) => sum + c.modules?.reduce((s, m) => s + (m.lessons?.length || 0), 0), 0
  ) || 0;
  const completedLessons = Object.values(lessonProgress).filter((p) => p.is_completed).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const content = (
    <div className="flex h-full flex-col bg-[#080b11]">
      {/* Sidebar header */}
      <div className="shrink-0 border-b border-white/6 p-4">
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/account/member/bootcamps/${bootcamp?.id}`}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-gray-600 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Curriculum
          </Link>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="line-clamp-2 text-[12px] font-bold leading-snug text-white">
          {bootcamp?.title}
        </h2>
        {/* Progress */}
        <div className="mt-3 rounded-xl bg-white/3 px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[10px]">
            <span className="text-gray-600">Progress</span>
            <span className="font-bold text-emerald-400">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-gray-700">{completedLessons}/{totalLessons} complete</p>
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar">
        {bootcamp?.courses?.map((course) =>
          course.modules?.map((module) => (
            <ModuleAccordion
              key={module.id}
              module={module}
              currentLessonId={currentLessonId}
              lessonProgress={lessonProgress}
              onSelectLesson={onSelectLesson}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden w-64 xl:w-72 shrink-0 border-r border-white/6 lg:block">{content}</div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{content}</div>
        </div>
      )}
    </>
  );
}

// ─── Notes Panel ──────────────────────────────────────────────────────────────

function NotesPanel({ lessonId, initialNotes, onSave }) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    startSaving(async () => {
      await onSave(notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }, [notes, onSave]);

  return (
    <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-yellow-400" />
          <h3 className="text-[13px] font-semibold text-white">My Notes</h3>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-white/6 px-3 py-1.5 text-[11px] font-medium text-gray-300 transition-all hover:bg-white/10 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Saved</> : 'Save'}
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Take notes while watching…"
        className="w-full resize-none bg-transparent px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none custom-scrollbar"
        rows={4}
      />
    </div>
  );
}

// ─── Table of Contents ────────────────────────────────────────────────────────

function TableOfContents({ contentRef }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const container = contentRef?.current;
    if (!container) return;
    const timer = setTimeout(() => {
      const els = container.querySelectorAll('h2, h3, h4');
      const items = [];
      els.forEach((el, i) => {
        if (!el.id) el.id = `h-${i}-${el.textContent.slice(0, 20).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}`;
        items.push({ id: el.id, text: el.textContent, level: parseInt(el.tagName.charAt(1)) });
      });
      setHeadings(items);
    }, 500);
    return () => clearTimeout(timer);
  }, [contentRef]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    headings.forEach((h) => { const el = document.getElementById(h.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <div className="sticky top-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <List className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">On this page</span>
      </div>
      <nav className="pr-1">
        <ul className="space-y-0.5 border-l border-white/8">
          {headings.map((h) => {
            const isActive = activeId === h.id;
            const indent = h.level === 2 ? 'pl-3' : h.level === 3 ? 'pl-5' : 'pl-7';
            return (
              <li key={h.id}>
                <button
                  onClick={() => { const el = document.getElementById(h.id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveId(h.id); } }}
                  className={`w-full text-left block py-1.5 ${indent} text-[11px] leading-snug transition-all border-l-2 -ml-px truncate ${
                    isActive ? 'border-violet-500 text-violet-300 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-400 hover:border-gray-600'
                  }`}
                  title={h.text}
                >
                  {h.text}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LessonViewClient({ bootcamp, lesson, lessonProgress, userProgress }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completing, startCompleting] = useTransition();
  const [localProgress, setLocalProgress] = useState(lessonProgress);
  const contentAreaRef = useRef(null);

  // Prevent body scroll while in the lesson view to avoid double scrollbars
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const currentProgress = localProgress[lesson.id];
  const isCompleted = currentProgress?.is_completed;
  const initialPosition = currentProgress?.last_position || 0;

  const allLessons = useMemo(() => {
    const lessons = [];
    bootcamp?.courses?.forEach((course) =>
      course.modules?.forEach((module) =>
        module.lessons?.forEach((l) => lessons.push({ ...l, moduleName: module.title, courseName: course.title }))
      )
    );
    return lessons;
  }, [bootcamp?.courses]);

  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const goToLesson = useCallback(
    (targetLesson) => { setSidebarOpen(false); router.push(`/account/member/bootcamps/${bootcamp.id}/${targetLesson.id}`); },
    [bootcamp?.id, router]
  );

  const handleProgress = useCallback(async (progressData) => {
    try {
      await updateLessonProgress(lesson.id, {
        watch_time: Math.floor(progressData.watchTime),
        last_position: Math.floor(progressData.currentTime),
        is_completed: false,
      });
    } catch {}
  }, [lesson.id]);

  const handleVideoComplete = useCallback(async () => {
    if (!isCompleted) {
      startCompleting(async () => {
        await markLessonComplete(lesson.id);
        setLocalProgress((prev) => ({ ...prev, [lesson.id]: { ...prev[lesson.id], is_completed: true } }));
      });
    }
  }, [lesson.id, isCompleted]);

  const toggleComplete = useCallback(() => {
    startCompleting(async () => {
      if (isCompleted) {
        await markLessonIncomplete(lesson.id);
        setLocalProgress((prev) => ({ ...prev, [lesson.id]: { ...prev[lesson.id], is_completed: false } }));
      } else {
        await markLessonComplete(lesson.id);
        setLocalProgress((prev) => ({ ...prev, [lesson.id]: { ...prev[lesson.id], is_completed: true } }));
      }
    });
  }, [lesson.id, isCompleted]);

  const handleSaveNotes = useCallback(async (notes) => { await saveLessonNotes(lesson.id, notes); }, [lesson.id]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#080b11]">
      <style dangerouslySetInnerHTML={{ __html: CUSTOM_SCROLLBAR_STYLES }} />
      {/* Sidebar */}
      <Sidebar
        bootcamp={bootcamp}
        currentLessonId={lesson.id}
        lessonProgress={localProgress}
        onSelectLesson={goToLesson}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/8 bg-[#0a0d14] px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-gray-400 transition-colors hover:bg-white/8 hover:text-white"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{lesson.title}</p>
          </div>
          {isCompleted && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
        </div>

        {/* Content + TOC */}
        <div className="flex flex-1 overflow-hidden">
          {/* Scrollable main */}
          <div ref={contentAreaRef} className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
            <div className="mx-auto max-w-5xl 2xl:max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8 pb-8">

              {/* Breadcrumb (desktop) */}
              <div className="hidden items-center gap-1.5 text-[11px] text-gray-600 lg:flex">
                <Link href={`/account/member/bootcamps/${bootcamp.id}`} className="hover:text-white transition-colors">
                  {bootcamp.title}
                </Link>
                <span>›</span>
                <span className="text-gray-400 truncate max-w-xs">{lesson.title}</span>
              </div>

              {/* Lesson title block */}
              <div className="rounded-2xl border border-white/6 bg-gradient-to-br from-white/4 to-transparent p-4 sm:p-5">
                <h1 className="text-lg sm:text-xl font-extrabold leading-tight tracking-tight text-white lg:text-2xl">
                  {lesson.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {lesson.duration > 0 && (
                    <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(lesson.duration)}
                    </span>
                  )}
                  {lesson.video_source && lesson.video_source !== 'none' && (
                    <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                      <Play className="h-3.5 w-3.5" /> Video lesson
                    </span>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    </span>
                  )}
                </div>
              </div>

              {/* Video Player */}
              {(lesson.video_source && lesson.video_source !== 'none' && (lesson.video_id || lesson.video_url)) && (
                <VideoPlayer
                  lesson={lesson}
                  initialPosition={initialPosition}
                  onProgress={handleProgress}
                  onComplete={handleVideoComplete}
                />
              )}

              {/* Completion toggle */}
              <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border px-4 py-4 transition-all ${
                isCompleted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/8 bg-white/2'
              }`}>
                <div className="flex items-center gap-3">
                  {isCompleted
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    : <Circle className="h-5 w-5 text-gray-600 shrink-0" />
                  }
                  <div>
                    <p className={`text-sm font-semibold ${isCompleted ? 'text-emerald-300' : 'text-white'}`}>
                      {isCompleted ? 'Lesson complete!' : 'Mark as complete'}
                    </p>
                    <p className="text-[11px] text-gray-600">
                      {isCompleted ? 'Great work — keep going!' : 'Mark done when finished'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleComplete}
                  disabled={completing}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 active:scale-95 ${
                    isCompleted
                      ? 'border border-emerald-500/25 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500'
                  }`}
                >
                  {completing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCompleted ? '✓ Done' : 'Complete Lesson'}
                </button>
              </div>

              {/* Rich content */}
              {lesson.content && (
                <LessonContentRenderer content={lesson.content} lessonId={lesson.id} />
              )}

              {/* Attachments */}
              {lesson.attachments?.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
                    <Download className="h-4 w-4 text-purple-400" />
                    <h3 className="text-[13px] font-semibold text-white">Attachments</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lesson.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/2 px-3 py-2.5 text-xs text-gray-300 transition-all hover:bg-white/5 hover:border-white/10"
                      >
                        <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                        <span className="truncate">{att.name || `Attachment ${i + 1}`}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <NotesPanel
                lessonId={lesson.id}
                initialNotes={currentProgress?.notes}
                onSave={handleSaveNotes}
              />
            </div>
          </div>

          {/* TOC (xl+) */}
          <div className="hidden xl:block w-64 shrink-0 border-l border-white/6 overflow-y-auto custom-scrollbar p-4 pt-8">
            <TableOfContents contentRef={contentAreaRef} />
          </div>
        </div>

        {/* Nav footer */}
        <div className="shrink-0 border-t border-white/6 bg-[#080b11] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {prevLesson ? (
              <button
                onClick={() => goToLesson(prevLesson)}
                className="group flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline max-w-[200px] md:max-w-[300px] xl:max-w-[400px] truncate">{prevLesson.title}</span>
                <span className="sm:hidden">Prev</span>
              </button>
            ) : <div />}

            {/* Lesson counter */}
            <span className="text-[11px] text-gray-600 tabular-nums">
              {currentIndex + 1} / {allLessons.length}
            </span>

            {nextLesson ? (
              <button
                onClick={() => goToLesson(nextLesson)}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-3 sm:px-5 py-2.5 text-[12px] sm:text-[13px] font-bold text-white shadow-md shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-violet-600"
              >
                <span className="hidden sm:inline max-w-[200px] md:max-w-[300px] xl:max-w-[400px] truncate">{nextLesson.title}</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <Link
                href={`/account/member/bootcamps/${bootcamp.id}`}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 sm:px-5 py-2.5 text-[12px] sm:text-[13px] font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Finish Course</span>
                <span className="sm:hidden">Done</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
