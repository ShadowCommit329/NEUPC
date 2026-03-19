'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  PlusCircle,
  Edit3,
  AlertCircle,
  Eye,
  EyeOff,
  Keyboard,
} from 'lucide-react';
import ResourceForm from '@/app/_components/resources/ResourceForm';
import ResourceViewer from '@/app/_components/resources/ResourceViewer';
import {
  createResourceAction,
  updateResourceAction,
} from '@/app/_lib/resource-actions';
import { RESOURCE_TYPE_LABELS } from '@/app/_lib/resources/constants';

function toFormData(form, id = null) {
  const fd = new FormData();
  if (id) fd.set('id', id);

  fd.set('title', form.title || '');
  fd.set('description', form.description || '');
  fd.set('resource_type', form.resource_type || 'external_link');
  fd.set('content', form.content || '');
  fd.set('embed_url', form.embed_url || '');
  fd.set('file_url', form.file_url || '');
  fd.set('media_mime_type', form.media_mime_type || '');
  fd.set('thumbnail', form.thumbnail || '');
  fd.set('category_id', form.category_id || '');
  fd.set('tags', form.tags || '');
  fd.set('visibility', form.visibility || 'members');
  fd.set('status', form.status || 'published');
  fd.set('is_pinned', String(Boolean(form.is_pinned)));
  fd.set(
    'scheduled_for',
    form.scheduled_for ? new Date(form.scheduled_for).toISOString() : ''
  );

  if (form.media_file) fd.set('media_file', form.media_file);
  if (form.thumbnail_file) fd.set('thumbnail_file', form.thumbnail_file);

  return fd;
}

// ─── Progress Steps ────────────────────────────────────────────────────────────

function ProgressSteps({ formData }) {
  const steps = [
    { label: 'Title', done: !!formData?.title?.trim() },
    { label: 'Type', done: !!formData?.resource_type },
    { label: 'Category', done: !!formData?.category_id },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`h-1.5 w-6 rounded-full transition-all duration-500 ${
                step.done ? 'bg-blue-500' : 'bg-white/10'
              }`}
              title={step.label}
            />
          </div>
        ))}
      </div>
      <span className="text-[11px] font-semibold text-gray-400 tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ResourceFormPanel({
  mode = 'create',
  resource,
  categories = [],
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit' && resource;
  const panelRef = useRef(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isPending) return;
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }, [isPending, onClose]);

  // Seed formData from the resource immediately so the progress bar and preview
  // are accurate on first render.
  const [formData, setFormData] = useState(() => {
    if (!resource) return null;
    const tags = (resource.tags || []).map((t) => t.name || t).join(', ');
    return {
      title: resource.title || '',
      description: resource.description || '',
      resource_type: resource.resource_type || 'external_link',
      content:
        typeof resource.content === 'string'
          ? resource.content
          : resource.content?.html || '',
      embed_url: resource.embed_url || '',
      file_url: resource.file_url || '',
      media_mime_type:
        resource.content?.uploadedMediaMimeType ||
        resource.content?.mediaMimeType ||
        '',
      thumbnail: resource.thumbnail || '',
      category_id: resource.category_id || '',
      tags,
      visibility: resource.visibility || 'members',
      status: resource.status || 'published',
      is_pinned: Boolean(resource.is_pinned),
      scheduled_for: resource.scheduled_for
        ? String(resource.scheduled_for).slice(0, 16)
        : '',
      media_file: null,
      thumbnail_file: null,
    };
  });

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Lock body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  function handleHeaderSubmit() {
    const formEl = panelRef.current?.querySelector('form');
    formEl?.requestSubmit();
  }

  const handleSubmit = (form) => {
    setError(null);
    startTransition(async () => {
      try {
        const fd = toFormData(form, isEdit ? resource.id : null);
        const action = isEdit ? updateResourceAction : createResourceAction;
        const result = await action(fd);

        if (result?.error) {
          setError(result.error);
          panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          onSaved?.();
        }, 800);
      } catch (err) {
        setError(err.message || 'An error occurred');
      }
    });
  };

  // Build preview resource from form data
  const previewResource = formData
    ? {
        id: resource?.id || 'preview',
        title: formData.title || 'Untitled Resource',
        description: formData.description || '',
        resource_type: formData.resource_type || 'external_link',
        content: formData.content || '',
        embed_url: formData.embed_url || '',
        file_url: formData.file_url || '',
        thumbnail: formData.thumbnail || '',
        category: formData.category_id
          ? categories.find((c) => c.id === formData.category_id)
          : null,
        tags:
          (formData.tags &&
            formData.tags.split(',').map((t) => ({ name: t.trim() }))) ||
          [],
        visibility: formData.visibility || 'members',
        status: formData.status || 'published',
        is_pinned: formData.is_pinned,
        created_at: resource?.created_at || new Date().toISOString(),
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
          closing ? 'opacity-0' : 'animate-in fade-in'
        }`}
        onClick={handleClose}
      />

      {/* Full-screen modal */}
      <div
        className={`relative m-2 flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0d14] shadow-2xl shadow-black/50 transition-all duration-300 sm:m-3 lg:m-4 ${
          closing ? 'scale-95 opacity-0' : 'animate-in fade-in zoom-in-95'
        }`}
      >
        {/* ─── Sticky header ─────────────────────────────── */}
        <div className="z-30 shrink-0 border-b border-white/[0.06] bg-[#0a0d14]/95 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            {/* Left: icon + Title */}
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isEdit ? 'bg-amber-500/12' : 'bg-blue-500/12'
                }`}
              >
                {isEdit ? (
                  <Edit3 className="h-4 w-4 text-amber-400" />
                ) : (
                  <PlusCircle className="h-4 w-4 text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white sm:text-base">
                  {isEdit ? 'Edit Resource' : 'Create Resource'}
                </h1>
                <p className="hidden truncate text-[11px] text-gray-500 sm:block">
                  {isEdit
                    ? `Editing "${resource.title}"`
                    : 'Fill in the details below — preview updates live'}
                </p>
              </div>
            </div>

            {/* Right: Progress + Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Progress steps */}
              <div className="hidden md:block">
                <ProgressSteps formData={formData} />
              </div>

              {/* Preview toggle */}
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className={`hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all lg:flex ${
                  showPreview
                    ? 'border-blue-500/25 bg-blue-500/10 text-blue-400'
                    : 'border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-white/12 hover:text-white'
                }`}
              >
                {showPreview ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                <span className="hidden xl:inline">Preview</span>
              </button>

              {/* Divider */}
              <div className="hidden h-6 w-px bg-white/[0.06] sm:block" />

              {/* Primary submit */}
              <button
                type="button"
                onClick={handleHeaderSubmit}
                disabled={isPending || success || !formData?.title?.trim()}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all sm:px-5 ${
                  success
                    ? 'bg-emerald-600 shadow-emerald-500/20'
                    : 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30'
                } disabled:opacity-60`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Saved!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {isEdit ? 'Save Changes' : 'Create Resource'}
                    </span>
                  </>
                )}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-gray-400 transition-all hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Body: Form + Preview side-by-side ───────── */}
        <div
          ref={panelRef}
          className="relative flex min-h-0 flex-1 overflow-hidden"
        >
          {/* ─── Left: Scrollable form area ──────────────── */}
          <div
            className={`flex-1 overflow-y-auto transition-all duration-300 ${
              showPreview ? 'lg:w-[55%] lg:flex-none xl:w-[60%]' : 'w-full'
            }`}
          >
            <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              <div className="space-y-4">
                {/* Error banner */}
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-5 py-4">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm font-semibold text-red-300">
                        Something went wrong
                      </p>
                      <p className="mt-0.5 text-xs text-red-400/80">{error}</p>
                    </div>
                  </div>
                )}

                {/* Success banner */}
                {success && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-5 py-4">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-300">
                      Resource {isEdit ? 'updated' : 'created'} successfully!
                    </p>
                  </div>
                )}

                {/* Resource Form */}
                <ResourceForm
                  mode={mode}
                  initialData={resource}
                  categories={categories}
                  pending={isPending}
                  onCancel={handleClose}
                  onSubmit={(form) => {
                    setFormData(form);
                    handleSubmit(form);
                  }}
                  onFormChange={setFormData}
                />
              </div>
            </div>
          </div>

          {/* ─── Right: Live Preview ────────────────────── */}
          {showPreview && previewResource && (
            <div className="hidden flex-col border-l border-white/[0.06] bg-white/[0.015] lg:flex lg:w-[45%] xl:w-[40%]">
              {/* Preview header */}
              <div className="shrink-0 border-b border-white/[0.06] px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                      Live Preview
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-600">
                      {RESOURCE_TYPE_LABELS[previewResource.resource_type]}
                    </p>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10">
                    <Eye className="h-3 w-3 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Preview content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-5">
                  <ResourceViewer resource={previewResource} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Keyboard shortcut hint ─────────────────── */}
        <div className="hidden shrink-0 items-center justify-center gap-2 border-t border-white/[0.04] bg-white/[0.01] py-1.5 text-[10px] text-gray-600 sm:flex">
          <Keyboard className="h-3 w-3" />
          Press{' '}
          <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-gray-500">
            Esc
          </kbd>{' '}
          to close
        </div>
      </div>
    </div>
  );
}
