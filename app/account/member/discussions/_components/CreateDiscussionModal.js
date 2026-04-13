/**
 * @file Create Discussion Modal Component
 * Modal for creating new help desk discussions.
 *
 * @module CreateDiscussionModal
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, AlertCircle, ChevronDown } from 'lucide-react';
import { useScrollLock } from '@/app/_lib/hooks';
import {
  DISCUSSION_TYPES,
  DISCUSSION_TYPE_KEYS,
  DISCUSSION_PLATFORMS,
  requiresLMSContext,
} from '@/app/_lib/discussion-config';
import {
  createDiscussionAction,
  fetchUserBootcampsAction,
} from '@/app/_lib/discussion-actions';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';
import { TypeBadge } from '@/app/_components/discussions';

/**
 * Create Discussion Modal.
 */
export default function CreateDiscussionModal({
  bootcamps: initialBootcamps = [],
  onClose,
  onCreated,
}) {
  useScrollLock();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('general_question');
  const [platform, setPlatform] = useState('web');
  const [bootcampId, setBootcampId] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [moduleId, setModuleId] = useState(null);
  const [lessonId, setLessonId] = useState(null);
  const [tags, setTags] = useState('');

  // UI state
  const [bootcamps, setBootcamps] = useState(initialBootcamps);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Fetch bootcamps if not provided
  useEffect(() => {
    if (initialBootcamps.length === 0) {
      fetchUserBootcampsAction().then((result) => {
        if (result.bootcamps) {
          setBootcamps(result.bootcamps);
        }
      });
    }
  }, [initialBootcamps]);

  // Get selected bootcamp data
  const selectedBootcamp = bootcamps.find((b) => b.id === bootcampId);
  const courses = selectedBootcamp?.courses || [];
  const selectedCourse = courses.find((c) => c.id === courseId);
  const modules = selectedCourse?.modules || [];
  const selectedModule = modules.find((m) => m.id === moduleId);
  const lessons = selectedModule?.lessons || [];

  // Reset child selections when parent changes
  useEffect(() => {
    setCourseId(null);
    setModuleId(null);
    setLessonId(null);
  }, [bootcampId]);

  useEffect(() => {
    setModuleId(null);
    setLessonId(null);
  }, [courseId]);

  useEffect(() => {
    setLessonId(null);
  }, [moduleId]);

  // Handle submit
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');

      if (!title.trim()) {
        setError('Title is required');
        return;
      }

      if (!content.trim()) {
        setError('Content is required');
        return;
      }

      setIsSubmitting(true);

      try {
        const result = await createDiscussionAction({
          title: title.trim(),
          content,
          type,
          platform,
          bootcampId,
          courseId,
          moduleId,
          lessonId,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        });

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.thread) {
          onCreated(result.thread);
        }
      } catch (err) {
        setError('Failed to create discussion. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      title,
      content,
      type,
      platform,
      bootcampId,
      courseId,
      moduleId,
      lessonId,
      tags,
      onCreated,
    ]
  );

  const needsLMS = requiresLMSContext(type);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-gray-950 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">New Discussion</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Type selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Discussion Type
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-left transition-colors hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  <TypeBadge type={type} size="sm" />
                  <span className="text-sm text-gray-300">
                    {DISCUSSION_TYPES[type]?.description}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {showTypeDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowTypeDropdown(false)}
                  />
                  <div className="absolute left-0 z-50 mt-1 w-full rounded-xl border border-white/10 bg-gray-900 py-1 shadow-xl">
                    {DISCUSSION_TYPE_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setType(key);
                          setShowTypeDropdown(false);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 ${
                          type === key ? 'bg-blue-500/10' : ''
                        }`}
                      >
                        <TypeBadge type={key} size="sm" />
                        <span className="text-sm text-gray-400">
                          {DISCUSSION_TYPES[key].description}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your issue or question..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-blue-500/50"
              required
            />
          </div>

          {/* LMS Context (for course/assignment issues) */}
          {needsLMS && bootcamps.length > 0 && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm font-medium text-gray-300">
                Related Course (Optional)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Bootcamp */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Bootcamp
                  </label>
                  <select
                    value={bootcampId || ''}
                    onChange={(e) => setBootcampId(e.target.value || null)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors outline-none focus:border-blue-500/50"
                  >
                    <option value="">Select bootcamp...</option>
                    {bootcamps.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course */}
                {bootcampId && courses.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Course
                    </label>
                    <select
                      value={courseId || ''}
                      onChange={(e) => setCourseId(e.target.value || null)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors outline-none focus:border-blue-500/50"
                    >
                      <option value="">Select course...</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Module */}
                {courseId && modules.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Module
                    </label>
                    <select
                      value={moduleId || ''}
                      onChange={(e) => setModuleId(e.target.value || null)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors outline-none focus:border-blue-500/50"
                    >
                      <option value="">Select module...</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Lesson */}
                {moduleId && lessons.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Lesson
                    </label>
                    <select
                      value={lessonId || ''}
                      onChange={(e) => setLessonId(e.target.value || null)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors outline-none focus:border-blue-500/50"
                    >
                      <option value="">Select lesson...</option>
                      {lessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Platform (for bug reports) */}
          {(type === 'bug_report' || type === 'ui_issue') && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Platform
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(DISCUSSION_PLATFORMS).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPlatform(key)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      platform === key
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Description
            </label>
            <div className="min-h-[250px]">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Describe your issue or question in detail. Include any relevant steps to reproduce, expected behavior, etc."
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="tags"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Tags (Optional)
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Separate tags with commas (e.g., video, assignment, login)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-white/8 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition-colors hover:border-white/20 hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Create Discussion
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
