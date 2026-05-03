'use client';

import { X, Clock, Play, Save, Loader2, GripVertical, BookOpen, ChevronRight, AlertCircle } from 'lucide-react';
import LessonContentRenderer from '@/app/account/member/bootcamps/[bootcampId]/[lessonId]/_components/LessonContentRenderer';
import VideoPlayer from '@/app/account/member/bootcamps/[bootcampId]/[lessonId]/_components/VideoPlayer';
import MultiBlockEditor from './MultiBlockEditor';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LessonFullscreenEditorModal({
  form,
  set,
  handleChange,
  errors,
  durationMins,
  handleSave,
  saving,
  onClose,
  syllabusUI,
}) {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }

  const handleClose = () => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'auto';
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#080b11] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0d1117] px-4 py-3 sm:px-6 sm:py-4 shadow-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleClose}
            className="group flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/20">
                Fullscreen Mode
              </span>
              <span className="text-sm font-semibold text-white hidden sm:inline">
                {form.title || 'Untitled Lesson'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Exit Fullscreen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-violet-500/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Leftmost Side: Syllabus */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-white/10 bg-[#010f1f] p-4 lg:p-6 custom-scrollbar flex flex-col gap-4">
          {syllabusUI}
        </div>

        {/* Middle Side: Editor */}
        <div className="flex-[3] min-w-0 overflow-y-auto border-r border-white/10 bg-[#0a0d14] p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-20">
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

            {/* Notes / content block */}
            <div className="bg-[#010f1f] rounded-xl border border-[#464554] relative group">
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-[#122131] text-[#d4e4fa] p-2 rounded-lg">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <h4 className="text-base font-semibold text-[#d4e4fa]">Lesson Notes</h4>
                </div>

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
          </div>
        </div>

        {/* Rightmost Side: Preview */}
        <div className="flex-[2] min-w-0 overflow-y-auto bg-[#080b11] p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto pb-20">
            {/* Title */}
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white lg:text-3xl mb-4">
              {form.title || 'Lesson Title'}
            </h1>
            {form.duration > 0 && (
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-400">
                <Clock className="h-4 w-4 text-violet-400" />
                {formatDuration(form.duration)}
              </div>
            )}

            {/* Legacy Global Video Player (if any) */}
            {(form.video_source && form.video_source !== 'none') && (
              <div className="mb-4">
                <VideoPlayer lesson={form} />
              </div>
            )}

            {/* Content Blocks — no wrapping styles */}
            {form.content ? (
              <LessonContentRenderer content={form.content} lessonId={form.id} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-white/10 border-dashed rounded-3xl bg-white/2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 mb-4">
                  <Play className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-gray-400 font-medium">No content added yet.</p>
                <p className="text-xs text-gray-600 mt-1">Add text, HTML, markdown, or video blocks in the editor.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
