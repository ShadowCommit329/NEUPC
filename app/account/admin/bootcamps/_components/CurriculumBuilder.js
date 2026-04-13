/**
 * @file Curriculum builder component with accordion-based structure.
 * @module CurriculumBuilder
 *
 * Hierarchical editor for Courses > Modules > Lessons.
 * Supports drag-and-drop reordering and inline editing.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  Edit3,
  Trash2,
  BookOpen,
  Layers,
  Video,
  FileText,
  Eye,
  EyeOff,
  Loader2,
  MoreVertical,
  Play,
  Clock,
} from 'lucide-react';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from '@/app/_lib/bootcamp-actions';
import LessonFormModal from './LessonFormModal';
import { formatDurationSeconds, getVideoSourceConfig } from './bootcampConfig';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Inline Edit Input
// ─────────────────────────────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  onCancel,
  placeholder = 'Enter title...',
}) {
  const [text, setText] = useState(value);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(text);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(text)}
      autoFocus
      placeholder={placeholder}
      className="w-full rounded-lg border border-white/20 bg-white/8 px-2 py-1 text-sm text-white outline-none focus:border-violet-500/50"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson Item
// ─────────────────────────────────────────────────────────────────────────────

function LessonItem({ lesson, onUpdate, onDelete, onEdit }) {
  const [loading, setLoading] = useState(false);

  const handleTogglePublish = async () => {
    setLoading(true);
    try {
      await updateLesson(lesson.id, { is_published: !lesson.is_published });
      onUpdate({ ...lesson, is_published: !lesson.is_published });
    } catch (err) {
      toast.error('Failed to update lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this lesson?')) return;
    setLoading(true);
    try {
      await deleteLesson(lesson.id);
      onDelete(lesson.id);
      toast.success('Lesson deleted');
    } catch (err) {
      toast.error('Failed to delete lesson');
    } finally {
      setLoading(false);
    }
  };

  const sourceConfig = getVideoSourceConfig(lesson.video_source);
  const hasVideo = lesson.video_source && lesson.video_source !== 'none';

  return (
    <div
      className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
        lesson.is_published
          ? 'border-white/6 bg-white/2 hover:border-white/12 hover:bg-white/4'
          : 'border-amber-500/20 bg-amber-500/5'
      }`}
    >
      {/* Drag handle */}
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-700 opacity-0 group-hover:opacity-100" />

      {/* Icon */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          hasVideo
            ? 'bg-violet-500/15 text-violet-400'
            : 'bg-gray-700/30 text-gray-500'
        }`}
      >
        {hasVideo ? (
          <Play className="h-3.5 w-3.5" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-white">{lesson.title}</span>
          {lesson.is_free_preview && (
            <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
              FREE
            </span>
          )}
          {!lesson.is_published && (
            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
              DRAFT
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-600">
          <span className="capitalize">{sourceConfig.label}</span>
          {lesson.duration > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {formatDurationSeconds(lesson.duration)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(lesson)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white/8 hover:text-blue-400"
          title="Edit"
        >
          <Edit3 className="h-3 w-3" />
        </button>
        <button
          onClick={handleTogglePublish}
          disabled={loading}
          className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/8 ${
            lesson.is_published
              ? 'text-gray-500 hover:text-amber-400'
              : 'text-amber-400'
          }`}
          title={lesson.is_published ? 'Unpublish' : 'Publish'}
        >
          {lesson.is_published ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white/8 hover:text-red-400"
          title="Delete"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Accordion
// ─────────────────────────────────────────────────────────────────────────────

function ModuleAccordion({ module, onUpdate, onDelete, onOpenLessonForm }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);

  const lessons = module.lessons || [];

  const handleTitleSave = async (title) => {
    if (!title.trim() || title === module.title) {
      setEditing(false);
      return;
    }
    setLoading(true);
    try {
      await updateModule(module.id, { title: title.trim() });
      onUpdate({ ...module, title: title.trim() });
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update module');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this module and all its lessons?')) return;
    setLoading(true);
    try {
      await deleteModule(module.id);
      onDelete(module.id);
      toast.success('Module deleted');
    } catch (err) {
      toast.error('Failed to delete module');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = async () => {
    setAddingLesson(true);
    try {
      const lesson = await createLesson(module.id, { title: 'New Lesson' });
      const updatedLessons = [...lessons, lesson];
      onUpdate({ ...module, lessons: updatedLessons });
      // Open the lesson editor
      onOpenLessonForm(lesson);
    } catch (err) {
      toast.error('Failed to create lesson');
    } finally {
      setAddingLesson(false);
    }
  };

  const handleLessonUpdate = (updatedLesson) => {
    const updatedLessons = lessons.map((l) =>
      l.id === updatedLesson.id ? updatedLesson : l
    );
    onUpdate({ ...module, lessons: updatedLessons });
  };

  const handleLessonDelete = (lessonId) => {
    const updatedLessons = lessons.filter((l) => l.id !== lessonId);
    onUpdate({ ...module, lessons: updatedLessons });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-white/2">
      {/* Module Header */}
      <div className="flex items-center gap-2 border-b border-white/6 px-3 py-2">
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-700" />

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-white/8 hover:text-white"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
          <Layers className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <InlineEdit
              value={module.title}
              onSave={handleTitleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div
              className="cursor-text truncate text-sm font-medium text-white hover:text-violet-300"
              onClick={() => setEditing(true)}
            >
              {module.title}
            </div>
          )}
          <div className="text-[10px] text-gray-600">
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
            {module.total_duration > 0 &&
              ` · ${formatDurationSeconds(module.total_duration)}`}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={handleAddLesson}
            disabled={addingLesson}
            className="flex h-7 items-center gap-1 rounded-lg bg-white/6 px-2 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            {addingLesson ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Lesson
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-white/8 hover:text-red-400"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Lessons List */}
      {expanded && (
        <div className="space-y-1 p-2">
          {lessons.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-xs text-gray-600">
              No lessons yet. Click &quot;+ Lesson&quot; to add one.
            </div>
          ) : (
            lessons
              .sort((a, b) => a.order_index - b.order_index)
              .map((lesson) => (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  onUpdate={handleLessonUpdate}
                  onDelete={handleLessonDelete}
                  onEdit={onOpenLessonForm}
                />
              ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Course Accordion
// ─────────────────────────────────────────────────────────────────────────────

function CourseAccordion({ course, onUpdate, onDelete, onOpenLessonForm }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingModule, setAddingModule] = useState(false);

  const modules = course.modules || [];

  const handleTitleSave = async (title) => {
    if (!title.trim() || title === course.title) {
      setEditing(false);
      return;
    }
    setLoading(true);
    try {
      await updateCourse(course.id, { title: title.trim() });
      onUpdate({ ...course, title: title.trim() });
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this course and all its modules/lessons?')) return;
    setLoading(true);
    try {
      await deleteCourse(course.id);
      onDelete(course.id);
      toast.success('Course deleted');
    } catch (err) {
      toast.error('Failed to delete course');
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async () => {
    setAddingModule(true);
    try {
      const createdModule = await createModule(course.id, {
        title: 'New Module',
      });
      const updatedModules = [...modules, { ...createdModule, lessons: [] }];
      onUpdate({ ...course, modules: updatedModules });
    } catch (err) {
      toast.error('Failed to create module');
    } finally {
      setAddingModule(false);
    }
  };

  const handleModuleUpdate = (updatedModule) => {
    const updatedModules = modules.map((m) =>
      m.id === updatedModule.id ? updatedModule : m
    );
    onUpdate({ ...course, modules: updatedModules });
  };

  const handleModuleDelete = (moduleId) => {
    const updatedModules = modules.filter((m) => m.id !== moduleId);
    onUpdate({ ...course, modules: updatedModules });
  };

  const totalLessons = modules.reduce(
    (sum, m) => sum + (m.lessons?.length || 0),
    0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117]">
      {/* Course Header */}
      <div className="flex items-center gap-3 border-b border-white/8 bg-[#161b22] px-4 py-3">
        <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-gray-700" />

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-white/8 hover:text-white"
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20">
          <BookOpen className="h-4 w-4 text-violet-400" />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <InlineEdit
              value={course.title}
              onSave={handleTitleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div
              className="cursor-text truncate font-medium text-white hover:text-violet-300"
              onClick={() => setEditing(true)}
            >
              {course.title}
            </div>
          )}
          <div className="text-xs text-gray-600">
            {modules.length} module{modules.length !== 1 ? 's' : ''} ·{' '}
            {totalLessons} lesson
            {totalLessons !== 1 ? 's' : ''}
            {course.total_duration > 0 &&
              ` · ${formatDurationSeconds(course.total_duration)}`}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleAddModule}
            disabled={addingModule}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-white/6 px-3 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            {addingModule ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Module
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-white/8 hover:text-red-400"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Modules List */}
      {expanded && (
        <div className="space-y-2 p-3">
          {modules.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-600">
              No modules yet. Click &quot;+ Module&quot; to add one.
            </div>
          ) : (
            modules
              .sort((a, b) => a.order_index - b.order_index)
              .map((module) => (
                <ModuleAccordion
                  key={module.id}
                  module={module}
                  onUpdate={handleModuleUpdate}
                  onDelete={handleModuleDelete}
                  onOpenLessonForm={onOpenLessonForm}
                />
              ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Curriculum Builder
// ─────────────────────────────────────────────────────────────────────────────

export default function CurriculumBuilder({
  bootcampId,
  initialCourses = [],
  onCoursesChange,
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [addingCourse, setAddingCourse] = useState(false);
  const [lessonModal, setLessonModal] = useState(null); // lesson being edited

  const handleAddCourse = async () => {
    setAddingCourse(true);
    try {
      const course = await createCourse(bootcampId, { title: 'New Course' });
      const newCourse = { ...course, modules: [] };
      setCourses((prev) => [...prev, newCourse]);
      onCoursesChange?.([...courses, newCourse]);
    } catch (err) {
      toast.error('Failed to create course');
    } finally {
      setAddingCourse(false);
    }
  };

  const handleCourseUpdate = useCallback(
    (updatedCourse) => {
      setCourses((prev) => {
        const newCourses = prev.map((c) =>
          c.id === updatedCourse.id ? updatedCourse : c
        );
        onCoursesChange?.(newCourses);
        return newCourses;
      });
    },
    [onCoursesChange]
  );

  const handleCourseDelete = useCallback(
    (courseId) => {
      setCourses((prev) => {
        const newCourses = prev.filter((c) => c.id !== courseId);
        onCoursesChange?.(newCourses);
        return newCourses;
      });
    },
    [onCoursesChange]
  );

  const handleLessonSaved = (updatedLesson) => {
    // Find and update the lesson in the nested structure
    setCourses((prev) => {
      const newCourses = prev.map((course) => ({
        ...course,
        modules: course.modules?.map((module) => ({
          ...module,
          lessons: module.lessons?.map((lesson) =>
            lesson.id === updatedLesson.id ? updatedLesson : lesson
          ),
        })),
      }));
      onCoursesChange?.(newCourses);
      return newCourses;
    });
    setLessonModal(null);
  };

  const totalModules = courses.reduce(
    (sum, c) => sum + (c.modules?.length || 0),
    0
  );
  const totalLessons = courses.reduce(
    (sum, c) =>
      sum +
      (c.modules?.reduce((mSum, m) => mSum + (m.lessons?.length || 0), 0) || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Curriculum</h3>
          <p className="text-xs text-gray-600">
            {courses.length} course{courses.length !== 1 ? 's' : ''} ·{' '}
            {totalModules} module
            {totalModules !== 1 ? 's' : ''} · {totalLessons} lesson
            {totalLessons !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleAddCourse}
          disabled={addingCourse}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-violet-500"
        >
          {addingCourse ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add Course
        </button>
      </div>

      {/* Courses List */}
      <div className="space-y-3">
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-gray-700" />
            <p className="text-sm font-medium text-gray-500">No courses yet</p>
            <p className="mt-1 text-xs text-gray-600">
              Add a course to start building your curriculum
            </p>
            <button
              onClick={handleAddCourse}
              disabled={addingCourse}
              className="mt-4 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-violet-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Course
            </button>
          </div>
        ) : (
          courses
            .sort((a, b) => a.order_index - b.order_index)
            .map((course) => (
              <CourseAccordion
                key={course.id}
                course={course}
                onUpdate={handleCourseUpdate}
                onDelete={handleCourseDelete}
                onOpenLessonForm={setLessonModal}
              />
            ))
        )}
      </div>

      {/* Lesson Form Modal */}
      {lessonModal && (
        <LessonFormModal
          lesson={lessonModal}
          onClose={() => setLessonModal(null)}
          onSaved={handleLessonSaved}
        />
      )}
    </div>
  );
}
