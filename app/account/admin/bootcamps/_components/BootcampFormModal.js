/**
 * @file Bootcamp create/edit form modal.
 * @module BootcampFormModal
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  GraduationCap,
  Save,
  Loader2,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  Users,
  Tag,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { createBootcamp, updateBootcamp } from '@/app/_lib/bootcamp-actions';
import {
  BOOTCAMP_STATUSES,
  getStatusConfig,
  validateBootcamp,
} from './bootcampConfig';
import toast from 'react-hot-toast';

export default function BootcampFormModal({ bootcamp, onClose, onSaved }) {
  const isEdit = !!bootcamp;
  const formRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Form state
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

  // Auto-generate slug from title
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
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
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
              <GraduationCap className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isEdit ? 'Edit Bootcamp' : 'Create Bootcamp'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEdit
                  ? 'Update bootcamp details'
                  : 'Add a new bootcamp program'}
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
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4"
        >
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
                placeholder="e.g., Full Stack Web Development Bootcamp"
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

            {/* Slug */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">
                  /account/member/bootcamps/
                </span>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="full-stack-bootcamp"
                  className={`flex-1 rounded-xl border bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:bg-white/6 ${
                    errors.slug
                      ? 'border-red-500/50'
                      : 'border-white/8 focus:border-white/20'
                  }`}
                />
              </div>
              {errors.slug && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {errors.slug}
                </p>
              )}
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
                rows={3}
                placeholder="Describe what students will learn..."
                className="w-full resize-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
              />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Thumbnail */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Thumbnail URL
                </label>
                <input
                  type="text"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
                />
              </div>

              {/* Price */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Price (BDT)
                </label>
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
                    className={`w-full rounded-xl border bg-white/4 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-600 transition-all outline-none focus:bg-white/6 ${
                      errors.price
                        ? 'border-red-500/50'
                        : 'border-white/8 focus:border-white/20'
                    }`}
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.price}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full appearance-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
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

              {/* Batch Info */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Batch Info
                </label>
                <input
                  type="text"
                  name="batch_info"
                  value={formData.batch_info}
                  onChange={handleChange}
                  placeholder="e.g., Batch 5 - Spring 2026"
                  className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:border-white/20 focus:bg-white/6"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className={`w-full rounded-xl border bg-white/4 px-3 py-2.5 text-sm text-white transition-all outline-none focus:bg-white/6 ${
                    errors.end_date
                      ? 'border-red-500/50'
                      : 'border-white/8 focus:border-white/20'
                  }`}
                  style={{ colorScheme: 'dark' }}
                />
                {errors.end_date && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.end_date}
                  </p>
                )}
              </div>

              {/* Max Students */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Max Students
                </label>
                <div className="relative">
                  <Users className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-600" />
                  <input
                    type="number"
                    name="max_students"
                    value={formData.max_students}
                    onChange={handleChange}
                    min="1"
                    placeholder="Leave empty for unlimited"
                    className={`w-full rounded-xl border bg-white/4 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-600 transition-all outline-none focus:bg-white/6 ${
                      errors.max_students
                        ? 'border-red-500/50'
                        : 'border-white/8 focus:border-white/20'
                    }`}
                  />
                </div>
                {errors.max_students && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.max_students}
                  </p>
                )}
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-white/10 peer-checked:bg-amber-500/30 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-gray-400 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-amber-400" />
                </label>
                <span className="text-xs text-gray-400">
                  Featured on homepage
                </span>
              </div>
            </div>

            {/* Thumbnail Preview */}
            {formData.thumbnail && (
              <div className="overflow-hidden rounded-xl border border-white/8">
                <img
                  src={formData.thumbnail}
                  alt="Thumbnail preview"
                  className="aspect-video w-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
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
                {isEdit ? 'Update' : 'Create'} Bootcamp
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
