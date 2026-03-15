/**
 * @file Blog form modal — create / edit dialog for blog posts with
 *   fields for title, slug, excerpt, body, category, tags, thumbnail,
 *   and publish settings.
 * @module AdminBlogFormModal
 */

'use client';

import {
  useState,
  useMemo,
  useTransition,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Image,
  Tag,
  Star,
  Clock,
  BookOpen,
  Upload,
  Link2,
  RefreshCw,
  Hash,
} from 'lucide-react';
import {
  CATEGORIES,
  STATUSES,
  getStatusConfig,
  getCategoryConfig,
  generateSlug,
} from './blogConfig';
import {
  createBlogAction,
  updateBlogAction,
  uploadBlogImageAction,
} from '@/app/_lib/blog-actions';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';
import { useScrollLock } from '@/app/_lib/hooks';

// ─── Segmented select ─────────────────────────────────────────────────────────

function SegmentedSelect({ options, value, onChange, renderOption }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            value === opt
              ? 'bg-white/15 text-white ring-1 ring-white/20'
              : 'bg-white/4 text-gray-400 hover:bg-white/8 hover:text-gray-200'
          }`}
        >
          {renderOption ? renderOption(opt) : opt}
        </button>
      ))}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-2.5 select-none"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
          value ? 'bg-amber-500' : 'bg-white/12'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="text-xs text-gray-300">{label}</span>
    </button>
  );
}

export default function BlogFormModal({
  mode = 'create',
  post = null,
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit' && post;
  useScrollLock();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState(isEdit ? (post.title ?? '') : '');
  const [slug, setSlug] = useState(isEdit ? (post.slug ?? '') : '');
  const [slugManual, setSlugManual] = useState(!!isEdit);
  const [excerpt, setExcerpt] = useState(isEdit ? (post.excerpt ?? '') : '');
  const [content, setContent] = useState(isEdit ? (post.content ?? '') : '');
  const [thumbnail, setThumbnail] = useState(
    isEdit ? (post.thumbnail ?? '') : ''
  );
  const [category, setCategory] = useState(isEdit ? (post.category ?? '') : '');
  const [status, setStatus] = useState(
    isEdit ? (post.status ?? 'draft') : 'draft'
  );
  const [tags, setTags] = useState(isEdit ? (post.tags ?? []).join(', ') : '');
  const [isFeatured, setIsFeatured] = useState(
    isEdit ? (post.is_featured ?? false) : false
  );
  const [readTime, setReadTime] = useState(
    isEdit ? (post.read_time ?? '') : ''
  );
  const [readTimeManual, setReadTimeManual] = useState(false);

  // Auto-generate slug from title (unless manually overridden)
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManual]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const form = document.getElementById('blog-form');
        if (form) form.requestSubmit();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle thumbnail file upload
  const handleThumbnailUpload = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.set('image', file);
      const result = await uploadBlogImageAction(fd);
      if (result?.url) {
        setThumbnail(result.url);
      } else if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError('Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  }, []);

  // Word count from content
  const wordCount = useMemo(() => {
    if (!content) return 0;
    const text = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? text.split(' ').length : 0;
  }, [content]);

  // Auto-estimate read time from content (unless manually overridden)
  useEffect(() => {
    if (readTimeManual) return;
    if (content) {
      const text = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = text ? text.split(' ').length : 0;
      setReadTime(String(Math.max(1, Math.round(words / 200))));
    }
  }, [content, readTimeManual]);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Content is required.');
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      if (isEdit) fd.set('id', post.id);
      fd.set('title', title);
      fd.set('slug', slug);
      fd.set('excerpt', excerpt);
      fd.set('content', content);
      fd.set('thumbnail', thumbnail);
      fd.set('category', category);
      fd.set('status', status);
      fd.set('tags', tags);
      fd.set('is_featured', String(isFeatured));
      if (readTime) fd.set('read_time', readTime);

      const action = isEdit ? updateBlogAction : createBlogAction;
      const result = await action(fd);

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        onSaved?.();
        setTimeout(() => onClose(), 1200);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-gray-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/8 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
            <BookOpen className="h-4.5 w-4.5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">
              {isEdit ? 'Edit Blog Post' : 'New Blog Post'}
            </h2>
            <p className="text-xs text-gray-500">
              {isEdit ? `Editing: ${post.title}` : 'Fill in the details below'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="divide-y divide-white/6">
          {/* ── Section 1: Basic Info ───────────────────────────────────────────── */}
          <Section label="Basic Info" icon={FileText}>
            <Field label="Title *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Guide to Dynamic Programming"
                className="input-field"
                maxLength={200}
              />
            </Field>
            <Field label="Excerpt">
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short summary shown in blog cards…"
                rows={2}
                className="input-field resize-none"
                maxLength={400}
              />
            </Field>
            <Field label="Content *">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your blog content here…"
                uploadImageAction={uploadBlogImageAction}
              />
            </Field>
          </Section>

          {/* ── Section 2: Meta ─────────────────────────────────────────────────── */}
          <Section label="Category & Status" icon={Tag}>
            <Field label="Category">
              <SegmentedSelect
                options={CATEGORIES}
                value={category}
                onChange={setCategory}
                renderOption={(opt) => {
                  const c = getCategoryConfig(opt);
                  return (
                    <span>
                      {c.emoji} {c.short}
                    </span>
                  );
                }}
              />
            </Field>
            <Field label="Status">
              <SegmentedSelect
                options={STATUSES}
                value={status}
                onChange={setStatus}
                renderOption={(opt) => {
                  const s = getStatusConfig(opt);
                  return (
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  );
                }}
              />
            </Field>
            <div className="flex items-center gap-6">
              <Toggle
                value={isFeatured}
                onChange={setIsFeatured}
                label="Featured post"
              />
            </div>
          </Section>

          {/* ── Section 3: Media & Misc ──────────────────────────────────────────── */}
          <Section label="Media & Details" icon={Image}>
            <Field label="Thumbnail">
              <div className="flex gap-2">
                <input
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="Paste URL or upload an image…"
                  className="input-field flex-1"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailUpload(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-gray-400 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-50"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Upload
                </button>
                {thumbnail && (
                  <img
                    src={thumbnail}
                    alt="preview"
                    className="h-9.5 w-15 rounded-lg border border-white/8 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tags (comma-separated)">
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="dp, graph, tips"
                  className="input-field"
                />
              </Field>
              <Field label="Read Time (min)">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={readTime}
                  onChange={(e) => {
                    setReadTime(e.target.value);
                    setReadTimeManual(true);
                  }}
                  placeholder="auto"
                  className="input-field"
                />
              </Field>
            </div>
          </Section>

          {/* ── Footer ──────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            {error ? (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            ) : success ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isEdit ? 'Updated!' : 'Created!'}
              </div>
            ) : (
              <span className="text-[10px] text-gray-600">Ctrl+S to save</span>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-gray-400 transition-colors hover:border-white/20 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || success}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Create Post'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          border-radius: 0.625rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: #f4f4f5;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field::placeholder {
          color: #52525b;
        }
        .input-field:focus {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.06);
        }
        .input-field:-webkit-autofill {
          -webkit-text-fill-color: #f4f4f5;
        }
      `}</style>
    </div>
  );
}

function Section({ label, icon: Icon, children }) {
  return (
    <div className="space-y-4 px-6 py-5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-400">
          {label}
        </label>
        {hint && (
          <span className="text-[10px] text-gray-600 tabular-nums">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
