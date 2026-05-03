'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Plus,
  Loader2,
  GripVertical,
  ChevronRight,
  MoreVertical,
  Play,
  BookOpen,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  HardDrive,
  Youtube,
  Upload,
  FileText,
  Check,
  X,
  Eye,
  EyeOff,
  Maximize2,
} from 'lucide-react';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  reorderCourses,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  validateDriveVideo,
} from '@/app/_lib/bootcamp-actions';
import {
  VIDEO_SOURCES,
  getVideoSourceConfig,
  validateLesson as validateLessonData,
  formatDurationSeconds,
} from './bootcampConfig';
import toast from 'react-hot-toast';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';
import MultiBlockEditor from './MultiBlockEditor';
import LessonFullscreenEditorModal from './LessonFullscreenEditorModal';

// ─── Inline rename input ───────────────────────────────────────────────────────

function InlineRename({ value, onSave, onCancel }) {
  const [text, setText] = useState(value);
  const ref = useRef(null);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={ref}
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
      }}
      className="flex-1 min-w-0 rounded border border-[#c0c1ff]/40 bg-[#0d1c2d] px-2 py-0.5 text-sm text-[#d4e4fa] outline-none focus:border-[#c0c1ff]"
    />
  );
}

// ─── Video source icons ────────────────────────────────────────────────────────

const VIDEO_ICONS = {
  none: FileText,
  drive: HardDrive,
  youtube: Youtube,
  upload: Upload,
};

// ─── Lesson editor (right panel) ───────────────────────────────────────────────

function LessonEditor({ lesson, onSaved, onClose, syllabusUI }) {
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [driveValidation, setDriveValidation] = useState(null);
  const [errors, setErrors] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState(() => {
    let content = lesson.content || '';
    
    // Migration: if the lesson has a legacy global video but no video blocks in content
    if (lesson.video_source && lesson.video_source !== 'none' && lesson.video_id) {
      try {
        let blocks = content ? JSON.parse(content) : [];
        if (Array.isArray(blocks)) {
          const hasVideoBlock = blocks.some(b => b.type === 'video');
          if (!hasVideoBlock) {
            blocks.unshift({
              id: crypto.randomUUID(),
              type: 'video',
              data: {
                videos: [{
                  id: crypto.randomUUID(),
                  video_source: lesson.video_source,
                  video_id: lesson.video_id,
                  duration: lesson.duration || 0
                }]
              }
            });
            content = JSON.stringify(blocks);
          }
        }
      } catch (e) {
        // Not JSON, or other error. Maybe legacy HTML content?
        const legacyVideoBlock = {
          id: crypto.randomUUID(),
          type: 'video',
          data: {
            videos: [{
              id: crypto.randomUUID(),
              video_source: lesson.video_source,
              video_id: lesson.video_id,
              duration: lesson.duration || 0
            }]
          }
        };
        const richTextBlock = {
          id: crypto.randomUUID(),
          type: 'richText',
          content: content
        };
        content = JSON.stringify([legacyVideoBlock, richTextBlock]);
      }
    }

    return {
      title: lesson.title || '',
      description: lesson.description || '',
      content: content,
      video_source: lesson.video_source || 'none',
      video_id: lesson.video_id || '',
      video_url: lesson.video_url || '',
      duration: lesson.duration || 0,
      is_free_preview: lesson.is_free_preview || false,
      is_published: lesson.is_published !== false,
    };
  });

  const set = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
    if (name === 'video_id') setDriveValidation(null);
  };

  const handleValidateDrive = async () => {
    if (!form.video_id) return;
    setValidating(true);
    setDriveValidation(null);
    try {
      const result = await validateDriveVideo(form.video_id);
      setDriveValidation(result);
      if (result.valid) {
        setForm((p) => ({
          ...p,
          video_id: result.fileId || p.video_id,
          duration: !p.duration && result.duration ? result.duration : p.duration,
        }));
      }
    } catch (err) {
      setDriveValidation({ valid: false, error: err.message });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    const validation = validateLessonData(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateLesson(lesson.id, form);
      toast.success('Lesson saved');
      onSaved(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const durationMins = form.duration ? Math.round(form.duration / 60) : '';

  return (
    <div className="xl:col-span-8 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#d4e4fa]">Edit Lesson</h3>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="px-4 py-2 rounded-full bg-[#122131]/50 border border-[#464554] text-[#c0c1ff] text-sm font-semibold hover:bg-[#122131] hover:text-[#e1e0ff] transition-colors flex items-center gap-2 shadow-sm"
        >
          <Maximize2 className="h-4 w-4" />
          Fullscreen Editor
        </button>
      </div>

      {/* Header card */}
      <div className="bg-[#010f1f] rounded-xl border border-[#464554] p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-semibold text-[#908fa0] tracking-wider uppercase block mb-1">
              Lesson Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className={`w-full text-2xl font-bold text-[#d4e4fa] bg-transparent border-0 border-b-2 focus:ring-0 px-0 py-1 outline-none transition-colors ${
                errors.title ? 'border-red-500' : 'border-[#464554] focus:border-[#c0c1ff]'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 pt-6 shrink-0">
            <span className="text-sm text-[#908fa0] font-medium">Status:</span>
            <div className="relative">
              <select
                value={form.is_published ? 'Published' : 'Draft'}
                onChange={(e) => set('is_published', e.target.value === 'Published')}
                className="appearance-none bg-[#0d1c2d] border border-[#464554] text-[#d4e4fa] text-sm font-semibold rounded-lg pl-4 pr-9 py-2 focus:border-[#c0c1ff] focus:ring-1 focus:ring-[#c0c1ff] outline-none cursor-pointer"
              >
                <option>Published</option>
                <option>Draft</option>
              </select>
              <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#908fa0] pointer-events-none h-4 w-4 rotate-90" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <label className="text-xs font-semibold text-[#908fa0] tracking-wider uppercase block mb-1">
              Duration (mins)
            </label>
            <input
              type="number"
              value={durationMins}
              onChange={(e) => set('duration', (parseInt(e.target.value) || 0) * 60)}
              min="0"
              className="w-24 bg-[#051424] border border-[#464554] rounded-lg px-3 py-2 text-sm text-[#d4e4fa] focus:border-[#c0c1ff] focus:ring-1 focus:ring-[#c0c1ff] outline-none"
            />
          </div>
          <div className="flex items-center gap-3 mt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_free_preview}
                onChange={(e) => set('is_free_preview', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 rounded-full bg-[#273647] peer-checked:bg-[#8083ff]/40 transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-[#908fa0] after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-[#c0c1ff]" />
              <span className="text-sm text-[#908fa0]">Free Preview</span>
            </label>
          </div>
        </div>
      </div>

      {/* Legacy video block UI has been removed. Videos are now fully managed within the MultiBlockEditor below. */}

      {/* Notes / content block */}
      <div className="bg-[#010f1f] rounded-xl border border-[#464554] relative group">
        <div className="absolute left-2 top-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="h-5 w-5 text-[#908fa0]" />
        </div>
        <div className="p-6 pl-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-[#122131] text-[#d4e4fa] p-2 rounded-lg">
              <BookOpen className="h-5 w-5" />
            </span>
            <h4 className="text-base font-semibold text-[#d4e4fa]">Lesson Notes</h4>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-semibold text-[#908fa0] tracking-wider uppercase block mb-1">
              Lesson Content Blocks
            </label>
            <div className="rounded-lg overflow-hidden">
              <MultiBlockEditor
                value={form.content}
                onChange={(val) => set('content', val)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="px-6 py-2 rounded-full border border-[#464554] text-[#908fa0] text-sm font-semibold hover:bg-[#0d1c2d] hover:text-[#d4e4fa] transition-colors flex items-center gap-2"
        >
          <Maximize2 className="h-4 w-4" />
          Fullscreen Editor
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 rounded-full border border-[#464554] text-[#d4e4fa] text-sm font-semibold hover:bg-[#0d1c2d] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-full bg-[#8083ff] text-white text-sm font-semibold hover:bg-[#c0c1ff] hover:text-[#1000a9] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {showPreview && (
        <LessonFullscreenEditorModal
          form={form}
          set={set}
          handleChange={handleChange}
          errors={errors}
          durationMins={durationMins}
          handleSave={handleSave}
          saving={saving}
          onClose={() => setShowPreview(false)}
          syllabusUI={syllabusUI}
        />
      )}
    </div>
  );
}

// ─── Module row in syllabus ────────────────────────────────────────────────────

function ModuleRow({
  module,
  moduleIdx,
  courseIdx,
  activeLessonId,
  onSelectLesson,
  onAddLesson,
  onDeleteModule,
  onRenameModule,
  onDeleteLesson,
  onRenameLesson,
  onDragStart,
  onDrop,
  draggedItem,
  courseId,
}) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const lessons = (module.lessons || []).sort((a, b) => a.order_index - b.order_index);
  const isDragged = draggedItem?.id === module.id && draggedItem?.type === 'module';

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart('module', module.id, courseId); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.stopPropagation(); onDrop('module', module.id, courseId); }}
      className={`border border-[#464554] rounded-lg bg-[#051424] overflow-hidden ${isDragged ? 'opacity-50' : ''}`}
    >
      {/* Module header */}
      <div className="px-3 py-3 flex items-center gap-2 hover:bg-[#0d1c2d] transition-colors group/mod relative">
        <GripVertical className="h-4 w-4 text-[#464554] cursor-grab shrink-0" />
        <button onClick={() => setExpanded((v) => !v)} className="text-[#908fa0] shrink-0">
          <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {renaming ? (
          <InlineRename
            value={module.title}
            onSave={(title) => { onRenameModule(module.id, title); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h3
            className="text-sm font-semibold text-[#d4e4fa] flex-1 min-w-0 truncate cursor-pointer hover:text-[#c0c1ff]"
            onDoubleClick={() => setRenaming(true)}
            title="Double-click to rename"
          >
            {courseIdx + 1}.{moduleIdx + 1} {module.title}
          </h3>
        )}

        {!expanded && lessons.length > 0 && (
          <span className="bg-[#273647] text-[#908fa0] text-[10px] font-semibold px-1.5 rounded shrink-0">
            {lessons.length}
          </span>
        )}

        {/* Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="opacity-0 group-hover/mod:opacity-100 text-[#908fa0] hover:text-[#d4e4fa] transition-all p-0.5 rounded"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 bg-[#122131] border border-[#464554] rounded-lg shadow-xl overflow-hidden w-36">
                <button
                  onClick={() => { setRenaming(true); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-[#d4e4fa] hover:bg-[#1c2b3c] transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => { onDeleteModule(module.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete Module
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lessons */}
      {expanded && (
        <div className="flex flex-col bg-[#010f1f] border-t border-[#464554]">
          {lessons.map((lesson, lIdx) => {
            const isActive = lesson.id === activeLessonId;
            return (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                label={`${courseIdx + 1}.${moduleIdx + 1}.${lIdx + 1}`}
                isActive={isActive}
                onSelect={() => onSelectLesson(lesson)}
                onDelete={() => onDeleteLesson(lesson.id, module.id)}
                onRename={(title) => onRenameLesson(lesson.id, title)}
                onDragStart={onDragStart}
                onDrop={onDrop}
                draggedItem={draggedItem}
                moduleId={module.id}
              />
            );
          })}

          {/* Add lesson */}
          <div className="px-3 py-2 pl-10">
            <button
              onClick={async () => {
                setAddingLesson(true);
                await onAddLesson(module.id);
                setAddingLesson(false);
              }}
              disabled={addingLesson}
              className="text-xs text-[#908fa0] hover:text-[#c0c1ff] flex items-center gap-1 transition-colors font-medium disabled:opacity-50"
            >
              {addingLesson ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lesson row ────────────────────────────────────────────────────────────────

function LessonRow({ lesson, label, isActive, onSelect, onDelete, onRename, onDragStart, onDrop, draggedItem, moduleId }) {
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const hasVideo = lesson.video_source && lesson.video_source !== 'none';
  const isDragged = draggedItem?.id === lesson.id && draggedItem?.type === 'lesson';

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart('lesson', lesson.id, moduleId); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.stopPropagation(); onDrop('lesson', lesson.id, moduleId); }}
      className={`px-3 py-2 flex items-center gap-2 pl-8 cursor-pointer group/lesson border-l-4 transition-colors ${
        isActive
          ? 'bg-[#c0c1ff]/10 border-[#c0c1ff]'
          : 'border-transparent hover:bg-[#0d1c2d]'
      } ${isDragged ? 'opacity-50' : ''}`}
      onClick={() => !renaming && onSelect()}
    >
      <GripVertical className="h-3.5 w-3.5 text-[#464554] cursor-grab shrink-0" />
      <span className={`shrink-0 ${isActive ? 'text-[#d0bcff]' : 'text-[#908fa0]'}`}>
        {isActive
          ? <Check className="h-4 w-4 text-[#d0bcff]" />
          : hasVideo
          ? <Play className="h-4 w-4" />
          : <BookOpen className="h-4 w-4" />}
      </span>

      {renaming ? (
        <InlineRename
          value={lesson.title}
          onSave={(title) => { onRename(title); setRenaming(false); }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <span
          className={`text-sm flex-1 min-w-0 truncate ${isActive ? 'text-[#c0c1ff] font-medium' : 'text-[#d4e4fa]'}`}
          onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); }}
          title={`${label} ${lesson.title} — double-click to rename`}
        >
          {label} {lesson.title}
        </span>
      )}

      {!lesson.is_published && (
        <span className="shrink-0 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 rounded font-semibold">
          DRAFT
        </span>
      )}
      {lesson.is_free_preview && (
        <span className="shrink-0 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded font-semibold">
          FREE
        </span>
      )}

      {/* Context menu */}
      <div className="relative shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="opacity-0 group-hover/lesson:opacity-100 text-[#908fa0] hover:text-[#d4e4fa] transition-all p-0.5 rounded"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-5 z-20 bg-[#122131] border border-[#464554] rounded-lg shadow-xl overflow-hidden w-32">
              <button
                onClick={(e) => { e.stopPropagation(); setRenaming(true); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-[#d4e4fa] hover:bg-[#1c2b3c] transition-colors"
              >
                Rename
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Course (top-level group) in syllabus ─────────────────────────────────────

function CourseRow({
  course,
  courseIdx,
  activeLessonId,
  onSelectLesson,
  onAddModule,
  onAddLesson,
  onDeleteCourse,
  onDeleteModule,
  onDeleteLesson,
  onRenameCourse,
  onRenameModule,
  onRenameLesson,
  onDragStart,
  onDrop,
  draggedItem,
}) {
  const [renaming, setRenaming] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [addingModule, setAddingModule] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const modules = (course.modules || []).sort((a, b) => a.order_index - b.order_index);
  const isDragged = draggedItem?.id === course.id && draggedItem?.type === 'course';

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart('course', course.id, null); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.stopPropagation(); onDrop('course', course.id, null); }}
      className={`border border-[#464554] rounded-lg bg-[#051424] overflow-hidden ${isDragged ? 'opacity-50' : ''}`}
    >
      {/* Course header — acts as top-level module group */}
      <div className="px-3 py-3 flex items-center gap-2 bg-[#0d1c2d] hover:bg-[#122131] transition-colors group/course">
        <GripVertical className="h-4 w-4 text-[#464554] cursor-grab shrink-0" />
        <button onClick={() => setExpanded((v) => !v)} className="text-[#908fa0] shrink-0">
          <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {renaming ? (
          <InlineRename
            value={course.title}
            onSave={(title) => { onRenameCourse(course.id, title); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h3
            className="text-sm font-bold text-[#d4e4fa] flex-1 min-w-0 truncate cursor-pointer hover:text-[#c0c1ff]"
            onDoubleClick={() => setRenaming(true)}
            title="Double-click to rename"
          >
            {courseIdx + 1}. {course.title}
          </h3>
        )}

        <button
          onClick={async () => {
            setAddingModule(true);
            await onAddModule(course.id);
            setAddingModule(false);
          }}
          disabled={addingModule}
          className="opacity-0 group-hover/course:opacity-100 text-[#c0c1ff] hover:text-[#e1e0ff] text-xs flex items-center gap-1 font-medium transition-all disabled:opacity-50 shrink-0"
        >
          {addingModule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Module
        </button>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="opacity-0 group-hover/course:opacity-100 text-[#908fa0] hover:text-[#d4e4fa] transition-all p-0.5 rounded"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 bg-[#122131] border border-[#464554] rounded-lg shadow-xl overflow-hidden w-36">
                <button
                  onClick={() => { setRenaming(true); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-[#d4e4fa] hover:bg-[#1c2b3c] transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => { onDeleteCourse(course.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete Course
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modules */}
      {expanded && (
        <div className="flex flex-col gap-2 p-2">
          {modules.length === 0 && (
            <p className="text-xs text-[#908fa0] text-center py-3">
              No modules. Click "+ Module" above.
            </p>
          )}
          {modules.map((mod, modIdx) => (
            <ModuleRow
              key={mod.id}
              module={mod}
              moduleIdx={modIdx}
              courseIdx={courseIdx}
              activeLessonId={activeLessonId}
              onSelectLesson={onSelectLesson}
              onAddLesson={onAddLesson}
              onDeleteModule={onDeleteModule}
              onRenameModule={onRenameModule}
              onDeleteLesson={onDeleteLesson}
              onRenameLesson={onRenameLesson}
              onDragStart={onDragStart}
              onDrop={onDrop}
              draggedItem={draggedItem}
              courseId={course.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main CurriculumBuilder ────────────────────────────────────────────────────

export default function CurriculumBuilder({ bootcampId, initialCourses = [], onCoursesChange }) {
  const [courses, setCourses] = useState(
    initialCourses.sort((a, b) => a.order_index - b.order_index)
  );
  const [activeLesson, setActiveLesson] = useState(null);
  const [addingCourse, setAddingCourse] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = (type, id, parentId) => {
    setDraggedItem({ type, id, parentId });
  };

  const handleDrop = async (type, targetId, targetParentId) => {
    if (!draggedItem || draggedItem.type !== type) return;
    if (draggedItem.id === targetId) return;
    if (draggedItem.parentId !== targetParentId) return;

    const reorderList = (items) => {
      const dragIdx = items.findIndex((i) => i.id === draggedItem.id);
      const dropIdx = items.findIndex((i) => i.id === targetId);
      if (dragIdx === -1 || dropIdx === -1) return null;
      
      const newItems = [...items];
      const [dragged] = newItems.splice(dragIdx, 1);
      newItems.splice(dropIdx, 0, dragged);
      return newItems.map((item, index) => ({ ...item, order_index: index }));
    };

    try {
      if (type === 'course') {
        const newCourses = reorderList(courses);
        if (newCourses) {
          sync(newCourses);
          await reorderCourses(bootcampId, newCourses.map(c => c.id));
        }
      } else if (type === 'module') {
        const courseId = targetParentId;
        const course = courses.find(c => c.id === courseId);
        const newModules = reorderList(course.modules || []);
        if (newModules) {
          sync(courses.map(c => c.id === courseId ? { ...c, modules: newModules } : c));
          await reorderModules(courseId, newModules.map(m => m.id));
        }
      } else if (type === 'lesson') {
        const moduleId = targetParentId;
        let targetCourseId = null;
        for (const c of courses) {
          if ((c.modules || []).some(m => m.id === moduleId)) {
            targetCourseId = c.id;
            break;
          }
        }
        if (targetCourseId) {
          const course = courses.find(c => c.id === targetCourseId);
          const module = course.modules.find(m => m.id === moduleId);
          const newLessons = reorderList(module.lessons || []);
          if (newLessons) {
            sync(courses.map(c => c.id === targetCourseId ? {
              ...c,
              modules: (c.modules || []).map(m => m.id === moduleId ? { ...m, lessons: newLessons } : m)
            } : c));
            await reorderLessons(moduleId, newLessons.map(l => l.id));
          }
        }
      }
    } catch (err) {
      toast.error('Failed to save order');
    }
    setDraggedItem(null);
  };

  const sync = (newCourses) => {
    setCourses(newCourses);
    onCoursesChange?.(newCourses);
  };

  // ── Lesson selection ────────────────────────────────────────────────────────
  const handleSelectLesson = (lesson) => setActiveLesson(lesson);

  const handleLessonSaved = (updated) => {
    setActiveLesson(updated);
    sync(courses.map((c) => ({
      ...c,
      modules: (c.modules || []).map((m) => ({
        ...m,
        lessons: (m.lessons || []).map((l) => l.id === updated.id ? updated : l),
      })),
    })));
  };

  // ── Add course ──────────────────────────────────────────────────────────────
  const handleAddCourse = async () => {
    setAddingCourse(true);
    try {
      const course = await createCourse(bootcampId, { title: 'New Course' });
      sync([...courses, { ...course, modules: [] }]);
    } catch (err) {
      toast.error('Failed to create course');
    } finally {
      setAddingCourse(false);
    }
  };

  // ── Rename course ───────────────────────────────────────────────────────────
  const handleRenameCourse = async (courseId, title) => {
    try {
      await updateCourse(courseId, { title });
      sync(courses.map((c) => c.id === courseId ? { ...c, title } : c));
    } catch (err) {
      toast.error('Failed to rename course');
    }
  };

  // ── Delete course ───────────────────────────────────────────────────────────
  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Delete this course and everything inside?')) return;
    try {
      await deleteCourse(courseId);
      const newCourses = courses.filter((c) => c.id !== courseId);
      sync(newCourses);
      if (activeLesson) {
        const stillExists = newCourses.some((c) =>
          (c.modules || []).some((m) =>
            (m.lessons || []).some((l) => l.id === activeLesson.id)
          )
        );
        if (!stillExists) setActiveLesson(null);
      }
      toast.success('Course deleted');
    } catch (err) {
      toast.error('Failed to delete course');
    }
  };

  // ── Add module ──────────────────────────────────────────────────────────────
  const handleAddModule = async (courseId) => {
    try {
      const mod = await createModule(courseId, { title: 'New Module' });
      sync(courses.map((c) =>
        c.id === courseId
          ? { ...c, modules: [...(c.modules || []), { ...mod, lessons: [] }] }
          : c
      ));
    } catch (err) {
      toast.error('Failed to create module');
    }
  };

  // ── Rename module ───────────────────────────────────────────────────────────
  const handleRenameModule = async (moduleId, title) => {
    try {
      await updateModule(moduleId, { title });
      sync(courses.map((c) => ({
        ...c,
        modules: (c.modules || []).map((m) => m.id === moduleId ? { ...m, title } : m),
      })));
    } catch (err) {
      toast.error('Failed to rename module');
    }
  };

  // ── Delete module ───────────────────────────────────────────────────────────
  const handleDeleteModule = async (moduleId) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    try {
      await deleteModule(moduleId);
      const newCourses = courses.map((c) => ({
        ...c,
        modules: (c.modules || []).filter((m) => m.id !== moduleId),
      }));
      sync(newCourses);
      if (activeLesson) {
        const stillExists = newCourses.some((c) =>
          (c.modules || []).some((m) =>
            (m.lessons || []).some((l) => l.id === activeLesson.id)
          )
        );
        if (!stillExists) setActiveLesson(null);
      }
      toast.success('Module deleted');
    } catch (err) {
      toast.error('Failed to delete module');
    }
  };

  // ── Add lesson ──────────────────────────────────────────────────────────────
  const handleAddLesson = async (moduleId) => {
    try {
      const lesson = await createLesson(moduleId, { title: 'New Lesson' });
      sync(courses.map((c) => ({
        ...c,
        modules: (c.modules || []).map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...(m.lessons || []), lesson] }
            : m
        ),
      })));
      setActiveLesson(lesson);
    } catch (err) {
      toast.error('Failed to create lesson');
    }
  };

  // ── Rename lesson ───────────────────────────────────────────────────────────
  const handleRenameLesson = async (lessonId, title) => {
    try {
      await updateLesson(lessonId, { title });
      const newCourses = courses.map((c) => ({
        ...c,
        modules: (c.modules || []).map((m) => ({
          ...m,
          lessons: (m.lessons || []).map((l) => l.id === lessonId ? { ...l, title } : l),
        })),
      }));
      sync(newCourses);
      if (activeLesson?.id === lessonId) setActiveLesson((p) => ({ ...p, title }));
    } catch (err) {
      toast.error('Failed to rename lesson');
    }
  };

  // ── Delete lesson ───────────────────────────────────────────────────────────
  const handleDeleteLesson = async (lessonId, moduleId) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await deleteLesson(lessonId);
      sync(courses.map((c) => ({
        ...c,
        modules: (c.modules || []).map((m) =>
          m.id === moduleId
            ? { ...m, lessons: (m.lessons || []).filter((l) => l.id !== lessonId) }
            : m
        ),
      })));
      if (activeLesson?.id === lessonId) setActiveLesson(null);
      toast.success('Lesson deleted');
    } catch (err) {
      toast.error('Failed to delete lesson');
    }
  };

  const totalModules = courses.reduce((s, c) => s + (c.modules?.length || 0), 0);
  const totalLessons = courses.reduce(
    (s, c) => s + (c.modules || []).reduce((ms, m) => ms + (m.lessons?.length || 0), 0),
    0
  );

  const syllabusUI = (
    <>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#d4e4fa]">Syllabus</h2>
            <p className="text-[11px] text-[#908fa0]">
              {courses.length} course{courses.length !== 1 ? 's' : ''} · {totalModules} module{totalModules !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleAddCourse}
            disabled={addingCourse}
            className="text-[#c0c1ff] hover:text-[#e1e0ff] text-sm flex items-center gap-1 font-medium transition-colors disabled:opacity-50"
          >
            {addingCourse ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add Module
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3 text-[#908fa0]">
              <BookOpen className="h-10 w-10 text-[#464554]" />
              <p className="text-sm">No modules yet. Click &quot;Add Module&quot; to start.</p>
            </div>
          ) : (
            courses.map((course, courseIdx) => (
              <CourseRow
                key={course.id}
                course={course}
                courseIdx={courseIdx}
                activeLessonId={activeLesson?.id}
                onSelectLesson={handleSelectLesson}
                onAddModule={handleAddModule}
                onAddLesson={handleAddLesson}
                onDeleteCourse={handleDeleteCourse}
                onDeleteModule={handleDeleteModule}
                onDeleteLesson={handleDeleteLesson}
                onRenameCourse={handleRenameCourse}
                onRenameModule={handleRenameModule}
                onRenameLesson={handleRenameLesson}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                draggedItem={draggedItem}
              />
            ))
          )}
        </div>
    </>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* ── Left: Syllabus ─────────────────────────────────────────────────── */}
      <div className="xl:col-span-4 flex flex-col gap-4 bg-[#010f1f] p-4 rounded-xl border border-[#464554] min-h-[500px]">
        {syllabusUI}
      </div>

      {/* ── Right: Editor or placeholder ───────────────────────────────────── */}
      {activeLesson ? (
        <LessonEditor
          key={activeLesson.id}
          lesson={activeLesson}
          onSaved={handleLessonSaved}
          onClose={() => setActiveLesson(null)}
          syllabusUI={syllabusUI}
        />
      ) : (
        <div className="xl:col-span-8">
          <div className="bg-[#010f1f] rounded-xl border border-[#464554] p-12 text-center flex flex-col items-center gap-4 text-[#908fa0]">
            <Play className="h-10 w-10 text-[#464554]" />
            <p>Select a lesson from the syllabus or create one to edit content.</p>
          </div>
        </div>
      )}
    </div>
  );
}
