/**
 * @file Lesson create/edit form modal with video source selector.
 * @module LessonFormModal
 */

'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Play,
  Save,
  Loader2,
  FileText,
  HardDrive,
  Youtube,
  Upload,
  Clock,
  Eye,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { updateLesson, validateDriveVideo } from '@/app/_lib/bootcamp-actions';
import {
  VIDEO_SOURCES,
  getVideoSourceConfig,
  validateLesson,
  formatDurationSeconds,
} from './bootcampConfig';
import toast from 'react-hot-toast';

// Video source icons map
const VIDEO_SOURCE_ICONS = {
  none: FileText,
  drive: HardDrive,
  youtube: Youtube,
  upload: Upload,
};

export default function LessonFormModal({ lesson, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [driveValidation, setDriveValidation] = useState(null);
  const [errors, setErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    content: lesson?.content || '',
    video_source: lesson?.video_source || 'none',
    video_id: lesson?.video_id || '',
    video_url: lesson?.video_url || '',
    duration: lesson?.duration || 0,
    is_free_preview: lesson?.is_free_preview || false,
    is_published: lesson?.is_published !== false,
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    // Clear drive validation when video_id changes
    if (name === 'video_id') {
      setDriveValidation(null);
    }
  };

  // Validate Google Drive video
  const handleValidateDrive = async () => {
    if (!formData.video_id) return;

    setValidating(true);
    setDriveValidation(null);

    try {
      const result = await validateDriveVideo(formData.video_id);
      setDriveValidation(result);

      if (result.valid && result.duration && !formData.duration) {
        setFormData((prev) => ({
          ...prev,
          video_id: result.fileId,
          duration: result.duration,
        }));
      } else if (result.valid) {
        setFormData((prev) => ({
          ...prev,
          video_id: result.fileId,
        }));
      }
    } catch (err) {
      setDriveValidation({ valid: false, error: err.message });
    } finally {
      setValidating(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const validation = validateLesson(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      const updatedLesson = await updateLesson(lesson.id, formData);
      toast.success('Lesson updated');
      onSaved?.(updatedLesson);
    } catch (err) {
      toast.error(err.message || 'Failed to save lesson');
    } finally {
      setLoading(false);
    }
  };

  // Convert seconds to mm:ss for input
  const durationToInput = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Parse mm:ss or number to seconds
  const parseDuration = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value.includes(':')) {
      const [mins, secs] = value.split(':').map(Number);
      return (mins || 0) * 60 + (secs || 0);
    }
    return parseInt(value, 10) || 0;
  };

  // Close on escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20">
              <Play className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Edit Lesson</h2>
              <p className="text-xs text-gray-500">
                Configure video and content
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Introduction to React Hooks"
                className={`w-full rounded-xl border bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:bg-white/6 ${
                  errors.title
                    ? 'border-red-500/50'
                    : 'border-white/8 focus:border-white/20'
                }`}
              />
              {errors.title && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Video Source Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Video Source
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {VIDEO_SOURCES.map((source) => {
                  const config = getVideoSourceConfig(source);
                  const Icon = VIDEO_SOURCE_ICONS[source];
                  const isSelected = formData.video_source === source;

                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          video_source: source,
                        }))
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                        isSelected
                          ? 'border-violet-500/50 bg-violet-500/10'
                          : 'border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          isSelected ? 'text-violet-400' : 'text-gray-500'
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          isSelected ? 'text-violet-300' : 'text-gray-500'
                        }`}
                      >
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Source Specific Fields */}
            {formData.video_source === 'drive' && (
              <div className="space-y-3 rounded-xl border border-white/8 bg-white/2 p-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Google Drive File ID or URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="video_id"
                      value={formData.video_id}
                      onChange={handleChange}
                      placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                      className={`flex-1 rounded-xl border bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:bg-white/6 ${
                        errors.video_id
                          ? 'border-red-500/50'
                          : 'border-white/8 focus:border-white/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleValidateDrive}
                      disabled={validating || !formData.video_id}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-blue-500 disabled:opacity-50"
                    >
                      {validating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Validate
                    </button>
                  </div>
                  {errors.video_id && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {errors.video_id}
                    </p>
                  )}
                  {driveValidation && (
                    <div
                      className={`mt-2 flex items-start gap-2 rounded-lg p-2 text-xs ${
                        driveValidation.valid
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {driveValidation.valid ? (
                        <>
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <div>
                            <p className="font-medium">Video accessible</p>
                            {driveValidation.name && (
                              <p className="text-emerald-400/70">
                                {driveValidation.name}
                              </p>
                            )}
                            {driveValidation.duration && (
                              <p className="text-emerald-400/70">
                                Duration:{' '}
                                {formatDurationSeconds(
                                  driveValidation.duration
                                )}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <div>
                            <p className="font-medium">Cannot access video</p>
                            <p className="text-red-400/70">
                              {driveValidation.error}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-600">
                  Paste a Google Drive file ID or share URL. Make sure the file
                  is shared with the service account.
                </p>
              </div>
            )}

            {formData.video_source === 'youtube' && (
              <div className="space-y-3 rounded-xl border border-white/8 bg-white/2 p-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    YouTube Video URL or ID
                  </label>
                  <input
                    type="text"
                    name="video_id"
                    value={formData.video_id}
                    onChange={handleChange}
                    placeholder="e.g., dQw4w9WgXcQ or https://youtube.com/watch?v=..."
                    className={`w-full rounded-xl border bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:bg-white/6 ${
                      errors.video_id
                        ? 'border-red-500/50'
                        : 'border-white/8 focus:border-white/20'
                    }`}
                  />
                  {errors.video_id && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {errors.video_id}
                    </p>
                  )}
                </div>
              </div>
            )}

            {formData.video_source === 'upload' && (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/2 p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-600" />
                <p className="mt-2 text-sm text-gray-400">
                  Upload functionality coming soon
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  For now, use Google Drive or YouTube
                </p>
              </div>
            )}

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Duration (seconds)
                </label>
                <div className="relative">
                  <Clock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-600" />
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                    className="w-full rounded-xl border border-white/8 bg-white/4 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
                  />
                </div>
                {formData.duration > 0 && (
                  <p className="mt-1 text-[10px] text-gray-600">
                    {formatDurationSeconds(formData.duration)}
                  </p>
                )}
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="is_free_preview"
                      checked={formData.is_free_preview}
                      onChange={handleChange}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-white/10 peer-checked:bg-emerald-500/30 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-gray-400 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-emerald-400" />
                  </div>
                  <div>
                    <span className="text-sm text-white">Free Preview</span>
                    <p className="text-[10px] text-gray-600">
                      Allow non-enrolled users to view
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                placeholder="Brief description of the lesson..."
                className="w-full resize-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Lesson Content (Optional)
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={4}
                placeholder="Additional text content, code snippets, or notes..."
                className="w-full resize-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 font-mono text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
              />
              <p className="mt-1 text-[10px] text-gray-600">
                This content will be displayed below the video
              </p>
            </div>

            {/* Published Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/2 p-3">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="text-sm text-white">Published</span>
                  <p className="text-[10px] text-gray-600">
                    Unpublished lessons are hidden from students
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-white/10 peer-checked:bg-emerald-500/30 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-gray-400 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-emerald-400" />
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/8 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/6 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Lesson
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
