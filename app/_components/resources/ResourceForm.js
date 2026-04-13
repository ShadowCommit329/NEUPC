'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  AlertCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Zap,
  Sparkles,
  X,
} from 'lucide-react';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';
import ResourceEmbed from '@/app/_components/resources/ResourceEmbed';
import {
  uploadResourceMediaAction,
  deleteResourceMediaAction,
  generateResourceTextAction,
} from '@/app/_lib/resource-actions';
import { TEXT_MODELS, DEFAULT_TEXT_MODEL } from '@/app/_lib/text-gen';
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  MAX_UPLOAD_BYTES,
} from '@/app/_lib/resources/constants';

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-blue-500/40 focus:bg-white/7 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50';
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-400';
const hintClass = 'mt-1.5 text-[11px] text-gray-600';
const CLIENT_SAFE_UPLOAD_BYTES = MAX_UPLOAD_BYTES;
const CLIENT_SAFE_UPLOAD_MB = Math.floor(
  CLIENT_SAFE_UPLOAD_BYTES / (1024 * 1024)
);

/** Section wrapper with icon, title, and description */
function FormSection({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/3 p-5 backdrop-blur-sm transition-colors hover:border-white/12 sm:p-7">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Toggle switch for boolean options */
function Toggle({ value, onChange, label, description }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 transition-all hover:border-white/15 hover:bg-white/5"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div
        role="switch"
        aria-checked={value}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          value ? 'bg-blue-500' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            value ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
}

/** AI Write Button for generating titles, descriptions, and content */
function AiWriteButton({ mode, onGenerated, context, existingContent }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(DEFAULT_TEXT_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const modeLabels = {
    title: 'Generate Title',
    description: 'Generate Description',
    content: 'Generate Content',
    improve: 'Improve Content',
  };

  const placeholders = {
    title: 'e.g. Best practices for React performance',
    description: 'e.g. Write a summary about advanced CSS techniques',
    content:
      'e.g. Create beginner-friendly content about web development fundamentals',
    improve: 'e.g. Make it more professional and add more examples',
  };

  const handleGenerate = async () => {
    if (loading) return;
    if (!prompt.trim() && mode !== 'improve') return;
    setError(null);
    setLoading(true);
    try {
      const fullPrompt = context
        ? `Resource context: ${context}\n\nRequest: ${prompt}`
        : prompt;
      const result = await generateResourceTextAction(
        fullPrompt,
        mode,
        model,
        existingContent
      );
      if (result?.error) {
        setError(result.error);
      } else if (result?.text) {
        onGenerated(result.text);
        setPrompt('');
        setOpen(false);
      }
    } catch {
      setError('Generation failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-300 transition-all hover:border-purple-500/40 hover:bg-purple-500/20"
      >
        <Sparkles className="h-3 w-3" />
        {mode === 'improve' ? 'AI Improve' : 'AI Write'}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <Sparkles className="h-3.5 w-3.5" />
          {modeLabels[mode]}
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md p-0.5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {TEXT_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModel(m.id)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
              model === m.id
                ? 'border border-purple-500/50 bg-purple-500/20 text-purple-200'
                : 'border border-white/8 bg-white/3 text-gray-500 hover:border-white/15 hover:text-gray-300'
            }`}
            title={m.description}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder={placeholders[mode]}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 transition-all outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || (!prompt.trim() && mode !== 'improve')}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

function defaultValue(initialData) {
  const initial = initialData || {};
  return {
    title: initial.title || '',
    description: initial.description || '',
    resource_type: initial.resource_type || 'external_link',
    content:
      typeof initial.content === 'string'
        ? initial.content
        : initial.content?.html || '',
    embed_url: initial.embed_url || '',
    file_url: initial.file_url || '',
    thumbnail: initial.thumbnail || '',
    category_id: initial.category_id || '',
    tags: (initial.tags || []).map((t) => t.name || t).join(', '),
    visibility: initial.visibility || 'members',
    status: initial.status || 'published',
    is_pinned: Boolean(initial.is_pinned),
    scheduled_for: initial.scheduled_for
      ? String(initial.scheduled_for).slice(0, 16)
      : '',
    media_mime_type:
      initial.content?.uploadedMediaMimeType ||
      initial.content?.mediaMimeType ||
      '',
    media_file: null,
    thumbnail_file: null,
  };
}

export default function ResourceForm({
  mode = 'create',
  initialData,
  categories = [],
  onCancel,
  onSubmit,
  pending,
  onFormChange,
}) {
  const [form, setForm] = useState(defaultValue(initialData));
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const mediaInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  // Emit form changes to parent for live preview
  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

  const canPreview = useMemo(
    () =>
      ['youtube', 'facebook_post', 'linkedin_post', 'external_link'].includes(
        form.resource_type
      ) && form.embed_url,
    [form.resource_type, form.embed_url]
  );

  const patch = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const isImportType = ['image', 'video', 'file'].includes(form.resource_type);

  const mediaAccept = useMemo(() => {
    if (form.resource_type === 'image') return 'image/*';
    if (form.resource_type === 'video') return 'video/*';
    return 'image/*,video/*,.pdf,.zip,.doc,.docx,.ppt,.pptx,.txt';
  }, [form.resource_type]);

  const handleImport = async ({ file, kind }) => {
    if (!file) return;

    if (file.size > CLIENT_SAFE_UPLOAD_BYTES) {
      setUploadError(
        `File is too large for in-app upload (${CLIENT_SAFE_UPLOAD_MB}MB max). Upload to cloud storage and paste the shared URL in the field below.`
      );
      return;
    }

    setUploadError('');
    if (kind === 'media') setUploadingMedia(true);
    if (kind === 'thumbnail') setUploadingThumb(true);

    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('kind', kind);

      const result = await uploadResourceMediaAction(fd);
      if (result?.error) {
        setUploadError(result.error);
        return;
      }

      if (result?.url) {
        if (kind === 'media') {
          patch('file_url', result.url);
          patch('media_mime_type', result.mimeType || file.type || '');
          if (form.resource_type === 'image' && !form.thumbnail) {
            patch('thumbnail', result.url);
          }
        }
        if (kind === 'thumbnail') {
          patch('thumbnail', result.url);
        }
      }
    } catch (err) {
      setUploadError(
        err?.message || 'Import to Google Drive failed. Please try again.'
      );
    } finally {
      if (kind === 'media') setUploadingMedia(false);
      if (kind === 'thumbnail') setUploadingThumb(false);
    }
  };

  const clearDriveUrl = async ({ field, value }) => {
    patch(field, '');
    if (!value) return;
    deleteResourceMediaAction(value).catch(() => {});
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMediaDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleImport({ file, kind: 'media' });
    }
  };

  const handleThumbnailDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleImport({ file, kind: 'thumbnail' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('Title is required.');
    if (!form.category_id) return setError('Category is required.');

    const embedTypes = [
      'youtube',
      'facebook_post',
      'linkedin_post',
      'external_link',
    ];
    if (embedTypes.includes(form.resource_type) && !form.embed_url.trim()) {
      return setError(
        'Embed or external URL is required for this resource type.'
      );
    }

    if (
      ['image', 'video', 'file'].includes(form.resource_type) &&
      !form.file_url.trim()
    ) {
      return setError('Please upload a file for this resource type.');
    }

    if (form.resource_type === 'rich_text' && !form.content.trim()) {
      return setError('Rich text content is required.');
    }

    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              Validation error
            </p>
            <p className="mt-0.5 text-xs text-red-400/80">{error}</p>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <FormSection
        icon={FileText}
        title="Basic Information"
        description="Title, type, and description of your resource"
      >
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={labelClass}>Resource Title *</label>
            <AiWriteButton
              mode="title"
              onGenerated={(text) => patch('title', text)}
              context={form.description || form.resource_type || ''}
            />
          </div>
          <input
            value={form.title}
            onChange={(e) => patch('title', e.target.value)}
            placeholder="e.g., Advanced React Patterns, Machine Learning Guide"
            className={inputClass}
          />
          <p className={hintClass}>Brief, descriptive title for the resource</p>
        </div>

        <div>
          <label className={labelClass}>Resource Type *</label>
          <select
            value={form.resource_type}
            onChange={(e) => patch('resource_type', e.target.value)}
            className={inputClass}
            style={{
              colorScheme: 'dark',
              color: 'white',
              backgroundColor: 'rgb(255 255 255 / 0.05)',
              borderColor: 'rgb(255 255 255 / 0.1)',
            }}
          >
            {RESOURCE_TYPES.map((type) => (
              <option
                key={type}
                value={type}
                style={{
                  backgroundColor: '#0a0d14',
                  color: 'white',
                  padding: '8px',
                }}
              >
                {RESOURCE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <p className={hintClass}>
            Choose the resource type to determine how it will be displayed
          </p>
        </div>

        {/* Thumbnail/Cover Image Upload */}
        <div>
          <label className={labelClass}>Cover Image</label>
          {form.thumbnail ? (
            <div className="relative overflow-hidden rounded-xl border border-white/10">
              <img
                src={form.thumbnail}
                alt="Cover image preview"
                className="h-40 w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
              <button
                type="button"
                onClick={() => {
                  if (form.thumbnail) {
                    deleteResourceMediaAction(form.thumbnail).catch(() => {});
                  }
                  patch('thumbnail', '');
                }}
                className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 backdrop-blur-sm transition-all hover:border-red-500/50 hover:bg-red-500/30"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 backdrop-blur-sm transition-all hover:border-blue-500/50 hover:bg-blue-500/30"
              >
                <Upload className="h-3 w-3" />
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Upload Zone */}
              <label
                onDragOver={handleDragOver}
                onDrop={handleThumbnailDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-500/30 bg-blue-500/5 px-6 py-10 text-center transition-all hover:border-blue-500/50 hover:bg-blue-500/10 ${
                  uploadingThumb ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {uploadingThumb ? (
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-400" />
                ) : (
                  <Upload className="mb-3 h-8 w-8 text-blue-400" />
                )}
                <p className="text-sm font-medium text-gray-300">
                  {uploadingThumb
                    ? 'Uploading…'
                    : 'Click to upload or drag & drop'}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  PNG, JPG, WebP (up to {CLIENT_SAFE_UPLOAD_MB}MB)
                </p>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingThumb}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleImport({ file, kind: 'thumbnail' });
                    }
                    e.target.value = '';
                  }}
                />
              </label>

              {/* URL Option */}
              <div>
                <p className="mb-2 text-[11px] font-semibold text-gray-500 uppercase">
                  Or use a link
                </p>
                <input
                  value={form.thumbnail}
                  onChange={(e) => patch('thumbnail', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={inputClass}
                />
              </div>
            </div>
          )}
          <p className={hintClass}>
            Display image that represents your resource
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={labelClass}>Description</label>
            <AiWriteButton
              mode="description"
              onGenerated={(text) => patch('description', text)}
              context={form.title || form.resource_type || ''}
            />
          </div>
          <textarea
            value={form.description}
            onChange={(e) => patch('description', e.target.value)}
            placeholder="Add a brief description of this resource..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
          <p className={hintClass}>
            Optional: Provide context and details about the resource
          </p>
        </div>
      </FormSection>

      {/* Media & Content */}
      {form.resource_type === 'rich_text' ? (
        <FormSection
          icon={ImageIcon}
          title="Rich Content"
          description="Write your article content with formatting"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">Content</h3>
            <div className="flex items-center gap-1.5">
              <AiWriteButton
                mode="content"
                onGenerated={(html) => patch('content', html)}
                context={`${form.title || ''} — ${form.description || ''}`}
              />
              {form.content && (
                <AiWriteButton
                  mode="improve"
                  onGenerated={(html) => patch('content', html)}
                  existingContent={form.content}
                />
              )}
            </div>
          </div>
          <RichTextEditor
            value={form.content}
            onChange={(html) => patch('content', html)}
            placeholder="Write your article content here... Use the toolbar to format text, add images, code blocks, and more."
          />
        </FormSection>
      ) : isImportType ? (
        <FormSection
          icon={ImageIcon}
          title="Media Files"
          description="Upload files directly to Google Drive"
        >
          {/* Media Upload Zone */}
          <div>
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-300">
                {form.resource_type === 'image'
                  ? 'Image File'
                  : form.resource_type === 'video'
                    ? 'Video File'
                    : 'Document File'}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {form.resource_type === 'image'
                  ? 'Upload a high-quality image'
                  : form.resource_type === 'video'
                    ? 'Upload a video file'
                    : 'Upload a document or file'}
              </p>
            </div>
            {form.file_url ? (
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                {form.resource_type === 'image' ? (
                  <img
                    src={form.file_url}
                    alt="Media preview"
                    className="h-48 w-full object-cover"
                  />
                ) : form.resource_type === 'video' ? (
                  <video
                    src={form.file_url}
                    controls
                    className="h-48 w-full bg-black object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-xl bg-white/2">
                    <a
                      href={form.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      View Uploaded File
                    </a>
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                <button
                  type="button"
                  onClick={() => {
                    if (form.file_url) {
                      deleteResourceMediaAction(form.file_url).catch(() => {});
                    }
                    patch('file_url', '');
                    patch('media_mime_type', '');
                  }}
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 backdrop-blur-sm transition-all hover:border-red-500/50 hover:bg-red-500/30"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            ) : (
              <label
                onDragOver={handleDragOver}
                onDrop={handleMediaDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/2 px-6 py-12 text-center transition-all hover:border-blue-500/30 hover:bg-blue-500/5 ${
                  uploadingMedia ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {uploadingMedia ? (
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-400" />
                ) : (
                  <Upload className="mb-3 h-8 w-8 text-gray-600" />
                )}
                <p className="text-sm font-medium text-gray-300">
                  {uploadingMedia
                    ? 'Uploading…'
                    : 'Click to upload or drag & drop'}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {form.resource_type === 'image'
                    ? `Images (up to ${CLIENT_SAFE_UPLOAD_MB}MB)`
                    : form.resource_type === 'video'
                      ? `Videos (up to ${CLIENT_SAFE_UPLOAD_MB}MB)`
                      : `Files (PDF, ZIP, DOC, PPT, TXT up to ${CLIENT_SAFE_UPLOAD_MB}MB)`}
                </p>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept={mediaAccept}
                  className="hidden"
                  disabled={uploadingMedia}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleImport({ file, kind: 'media' });
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            )}
            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {uploadError}
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/3 p-3">
              <p className="mb-2 text-xs font-semibold text-gray-300">
                Large file fallback (up to 100GB)
              </p>
              <input
                value={form.file_url}
                onChange={(e) => patch('file_url', e.target.value)}
                placeholder="Paste external file URL (Drive/Dropbox/CDN)"
                className={inputClass}
              />
              <p className="mt-1.5 text-[11px] text-gray-600">
                For very large files, upload directly to cloud storage and paste
                the shared URL here.
              </p>
            </div>
          </div>

          {/* Thumbnail is now in Basic Information section for consistency */}
        </FormSection>
      ) : (
        <FormSection
          icon={ImageIcon}
          title="Link & Media"
          description="External links or embedded content"
        >
          <div>
            <label className={labelClass}>Embed or External URL</label>
            <input
              value={form.embed_url}
              onChange={(e) => patch('embed_url', e.target.value)}
              placeholder="https://example.com or YouTube/LinkedIn URL"
              className={inputClass}
            />
            <p className={hintClass}>
              URL for YouTube, social posts, external links, or articles
            </p>
          </div>
        </FormSection>
      )}

      {/* Preview */}
      {canPreview && (
        <FormSection
          icon={ImageIcon}
          title="Preview"
          description="How your resource will appear"
        >
          <ResourceEmbed resource={form} />
        </FormSection>
      )}

      {/* Organization */}
      <FormSection
        icon={Zap}
        title="Organization"
        description="Category, tags, and visibility"
      >
        <div>
          <label className={labelClass}>Category *</label>
          <select
            value={form.category_id}
            onChange={(e) => patch('category_id', e.target.value)}
            className={inputClass}
            style={{
              colorScheme: 'dark',
              color: 'white',
              backgroundColor: 'rgb(255 255 255 / 0.05)',
              borderColor: 'rgb(255 255 255 / 0.1)',
            }}
          >
            <option
              value=""
              style={{
                backgroundColor: '#0a0d14',
                color: 'white',
                padding: '8px',
              }}
            >
              Select a category
            </option>
            {categories.map((c) => (
              <option
                key={c.id}
                value={c.id}
                style={{
                  backgroundColor: '#0a0d14',
                  color: 'white',
                  padding: '8px',
                }}
              >
                {c.name}
              </option>
            ))}
          </select>
          <p className={hintClass}>
            Choose a category to organize this resource
          </p>
        </div>

        <div>
          <label className={labelClass}>Tags (Optional)</label>
          <input
            value={form.tags}
            onChange={(e) => patch('tags', e.target.value)}
            placeholder="e.g., react, typescript, tutorial"
            className={inputClass}
          />
          <p className={hintClass}>
            Comma-separated tags to help with discovery and filtering
          </p>
        </div>

        <div>
          <label className={labelClass}>Visibility</label>
          <select
            value={form.visibility}
            onChange={(e) => patch('visibility', e.target.value)}
            className={inputClass}
            style={{
              colorScheme: 'dark',
              color: 'white',
              backgroundColor: 'rgb(255 255 255 / 0.05)',
              borderColor: 'rgb(255 255 255 / 0.1)',
            }}
          >
            <option
              value="members"
              style={{
                backgroundColor: '#0a0d14',
                color: 'white',
                padding: '8px',
              }}
            >
              Members Only
            </option>
            <option
              value="public"
              style={{
                backgroundColor: '#0a0d14',
                color: 'white',
                padding: '8px',
              }}
            >
              Public
            </option>
          </select>
          <p className={hintClass}>Control who can access this resource</p>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={(e) => patch('status', e.target.value)}
            className={inputClass}
            style={{
              colorScheme: 'dark',
              color: 'white',
              backgroundColor: 'rgb(255 255 255 / 0.05)',
              borderColor: 'rgb(255 255 255 / 0.1)',
            }}
          >
            <option
              value="draft"
              style={{
                backgroundColor: '#0a0d14',
                color: 'white',
                padding: '8px',
              }}
            >
              Draft
            </option>
            <option
              value="scheduled"
              style={{
                backgroundColor: '#0a0d14',
                color: 'white',
                padding: '8px',
              }}
            >
              Scheduled
            </option>
            <option
              value="published"
              style={{
                backgroundColor: '#0a0d14',
                color: 'white',
                padding: '8px',
              }}
            >
              Published
            </option>
            <option
              value="archived"
              style={{
                backgroundColor: '#0a0d14',
                color: 'white',
                padding: '8px',
              }}
            >
              Archived
            </option>
          </select>
          <p className={hintClass}>
            Manage the publication status of this resource
          </p>
        </div>

        {form.status === 'scheduled' && (
          <div>
            <label className={labelClass}>Schedule For</label>
            <input
              type="datetime-local"
              value={form.scheduled_for}
              onChange={(e) => patch('scheduled_for', e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>
              Set a future date and time for automatic publishing
            </p>
          </div>
        )}

        <Toggle
          value={form.is_pinned}
          onChange={(v) => patch('is_pinned', v)}
          label="Pin Resource"
          description="Feature this resource at the top of lists"
        />
      </FormSection>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-white/8 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving…</span>
            </>
          ) : mode === 'edit' ? (
            'Update Resource'
          ) : (
            'Create Resource'
          )}
        </button>
      </div>
    </form>
  );
}
