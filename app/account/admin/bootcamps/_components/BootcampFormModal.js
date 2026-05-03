'use client';

import { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Save,
  Loader2,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  Globe,
  Lock,
  Star,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import {
  createBootcamp,
  updateBootcamp,
  uploadBootcampThumbnailAction,
} from '@/app/_lib/bootcamp-actions';
import ThumbnailUploader from './ThumbnailUploader';
import {
  BOOTCAMP_STATUSES,
  getStatusConfig,
  validateBootcamp,
} from './bootcampConfig';
import toast from 'react-hot-toast';

const INPUT_CLASS = (err) =>
  `w-full rounded-xl border bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:bg-white/6 ${
    err ? 'border-red-500/50 focus:border-red-500/40' : 'border-white/8 focus:border-violet-500/40'
  }`;

const FIELD = ({ label, required, error, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-400 normal-case">*</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
    {hint && !error && (
      <p className="mt-1 text-[11px] text-gray-600">{hint}</p>
    )}
  </div>
);

export default function BootcampFormModal({ bootcamp, onClose, onSaved }) {
  const isEdit = !!bootcamp;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    title: bootcamp?.title || '',
    slug: bootcamp?.slug || '',
    description: bootcamp?.description || '',
    thumbnail: bootcamp?.thumbnail || '',
    price: bootcamp?.price || 0,
    status: bootcamp?.status || 'draft',
    batch_info: bootcamp?.batch_info || '',
    start_date: bootcamp?.start_date || '',
    end_date: bootcamp?.end_date || '',
    max_students: bootcamp?.max_students || '',
    is_featured: bootcamp?.is_featured || false,
  });

  // Auto-generate slug from title (create mode only)
  useEffect(() => {
    if (!isEdit && formData.title && !formData.slug) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.title, isEdit, formData.slug]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateBootcamp(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          fd.append(key, String(value));
        }
      });

      if (isEdit) {
        await updateBootcamp(bootcamp.id, fd);
        toast.success('Bootcamp updated');
      } else {
        await createBootcamp(fd);
        toast.success('Bootcamp created');
      }

      onSaved?.();
    } catch (err) {
      toast.error(err.message || 'Failed to save bootcamp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl">

        {/* ── Modal Header ──────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/25">
              <GraduationCap className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isEdit ? 'Edit Bootcamp' : 'Create New Track'}
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isEdit
                  ? 'Update bootcamp details'
                  : 'Set up a new learning track'}
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

        {/* ── Form Body ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-themed">
          <div className="p-5 space-y-5">

            {/* Title + Status row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <FIELD label="Title" required error={errors.title}>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Full Stack Web Development"
                    className={INPUT_CLASS(errors.title)}
                    autoFocus
                  />
                </FIELD>
              </div>
              <div className="relative">
                <label className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full appearance-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-violet-500/40 focus:bg-white/6"
                  style={{ colorScheme: 'dark' }}
                >
                  {BOOTCAMP_STATUSES.map((status) => {
                    const config = getStatusConfig(status);
                    return (
                      <option key={status} value={status}>
                        {config.label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Slug */}
            <FIELD label="URL Slug" error={errors.slug} hint="Auto-generated from title. Only lowercase letters, numbers, and hyphens.">
              <div className="flex items-center rounded-xl border border-white/8 bg-white/4 focus-within:border-violet-500/40 transition-all overflow-hidden">
                <span className="pl-3 text-xs text-gray-500 shrink-0 font-mono">/bootcamps/</span>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="my-bootcamp"
                  className="flex-1 bg-transparent px-2 py-2.5 text-sm text-white outline-none placeholder-gray-600"
                />
              </div>
            </FIELD>

            {/* Description */}
            <FIELD label="Short Description">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief overview of what students will learn..."
                className="w-full resize-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-violet-500/40 focus:bg-white/6"
              />
            </FIELD>

            {/* Thumbnail + Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FIELD label="Banner Image">
                {isEdit ? (
                  <ThumbnailUploader
                    bootcampId={bootcamp.id}
                    currentThumbnail={formData.thumbnail}
                    onUploadSuccess={(data) => {
                      if (data?.url)
                        setFormData((prev) => ({ ...prev, thumbnail: data.url }));
                    }}
                    onRemove={() => setFormData((prev) => ({ ...prev, thumbnail: '' }))}
                  />
                ) : (
                  <ThumbnailUploader
                    currentThumbnail={formData.thumbnail}
                    uploadAction={uploadBootcampThumbnailAction}
                    onUploadSuccess={(data) => {
                      if (data?.url)
                        setFormData((prev) => ({ ...prev, thumbnail: data.url }));
                    }}
                    onRemove={() => setFormData((prev) => ({ ...prev, thumbnail: '' }))}
                  />
                )}
              </FIELD>

              <div className="space-y-4">
                <FIELD label="Price (BDT)" error={errors.price}>
                  <div className="relative">
                    <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-600" />
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      placeholder="0 for free"
                      className={`${INPUT_CLASS(errors.price)} pl-9`}
                    />
                  </div>
                </FIELD>

                <FIELD label="Batch Info">
                  <input
                    type="text"
                    name="batch_info"
                    value={formData.batch_info}
                    onChange={handleChange}
                    placeholder="e.g., Batch 5 · Spring 2026"
                    className={INPUT_CLASS(false)}
                  />
                </FIELD>

                {/* Featured toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-white/8 bg-white/4">
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-gray-400">Featured on homepage</span>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={formData.is_featured}
                      onChange={handleChange}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-white/10 border border-white/5 peer-checked:bg-amber-500/30 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-gray-400 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-amber-400" />
                  </label>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FIELD label="Start Date">
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={INPUT_CLASS(false)}
                  style={{ colorScheme: 'dark' }}
                />
              </FIELD>
              <FIELD label="End Date" error={errors.end_date}>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className={INPUT_CLASS(errors.end_date)}
                  style={{ colorScheme: 'dark' }}
                />
              </FIELD>
            </div>

            {/* Max Students */}
            <FIELD label="Max Students" error={errors.max_students} hint="Leave empty for unlimited enrollment.">
              <div className="relative">
                <Users className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-600" />
                <input
                  type="number"
                  name="max_students"
                  value={formData.max_students}
                  onChange={handleChange}
                  min="1"
                  placeholder="Unlimited"
                  className={`${INPUT_CLASS(errors.max_students)} pl-9`}
                />
              </div>
            </FIELD>
          </div>
        </form>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-white/8 px-5 py-4 bg-white/[0.02]">
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
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-violet-500 hover:shadow-[0_0_16px_rgba(124,92,255,0.4)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {isEdit ? 'Update Bootcamp' : 'Create Track'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
