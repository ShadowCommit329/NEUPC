/**
 * @file Gallery item form modal — create / edit dialog for gallery
 *   media with fields for URL, caption, category, tags, event link,
 *   and display order.
 * @module AdminGalleryItemFormModal
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { GALLERY_CATEGORIES } from './galleryConfig';
import {
  addGalleryItemAction,
  updateGalleryItemAction,
} from '@/app/_lib/gallery-actions';

export default function GalleryItemFormModal({
  item,
  events = [],
  defaultEventId,
  onClose,
}) {
  const isEdit = Boolean(item);
  const formRef = useRef(null);

  const [type, setType] = useState(item?.type ?? 'image');
  const [url, setUrl] = useState(item?.url ?? '');
  const [previewUrl, setPreviewUrl] = useState(
    item?.type === 'image' ? (item?.url ?? '') : ''
  );
  const [imgError, setImgError] = useState(false);
  const [featured, setFeatured] = useState(item?.is_featured ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update preview when URL changes (debounced)
  useEffect(() => {
    if (type !== 'image') return;
    const t = setTimeout(() => {
      setImgError(false);
      setPreviewUrl(url);
    }, 600);
    return () => clearTimeout(t);
  }, [url, type]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fd = new FormData(formRef.current);
    fd.set('type', type);
    fd.set('is_featured', String(featured));

    const res = isEdit
      ? await updateGalleryItemAction(fd)
      : await addGalleryItemAction(fd);

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/50 bg-slate-900 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? '✏️ Edit Gallery Item' : '➕ Add Gallery Item'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 p-6">
          {isEdit && <input type="hidden" name="id" value={item.id} />}

          {/* Type Toggle */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Media Type
            </label>
            <div className="flex gap-2">
              {['image', 'video'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'image'
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-red-500 bg-red-600 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {t === 'image' ? '🖼️ Image' : '🎬 Video'}
                </button>
              ))}
            </div>
          </div>

          {/* URL + Preview */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              name="url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === 'image'
                  ? 'https://example.com/photo.jpg'
                  : 'https://youtu.be/…'
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-transparent focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
            {type === 'image' && previewUrl && !imgError && (
              <div className="relative mt-2 aspect-video overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            )}
            {type === 'image' && imgError && previewUrl && (
              <p className="mt-1 text-xs text-red-400">
                ⚠️ Could not load image preview.
              </p>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Caption
            </label>
            <textarea
              name="caption"
              defaultValue={item?.caption ?? ''}
              placeholder="Describe this media…"
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          {/* Category + Display Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Category
              </label>
              <input
                name="category"
                list="gallery-categories"
                defaultValue={item?.category ?? ''}
                placeholder="Select or type…"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
              <datalist id="gallery-categories">
                {GALLERY_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Display Order
              </label>
              <input
                name="display_order"
                type="number"
                min="0"
                defaultValue={item?.display_order ?? 0}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Tags{' '}
              <span className="text-xs text-slate-500">(comma-separated)</span>
            </label>
            <input
              name="tags"
              defaultValue={item?.tags?.join(', ') ?? ''}
              placeholder="workshop, 2024, hackathon"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          {/* Linked Event */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Linked Event
            </label>
            <select
              name="event_id"
              defaultValue={item?.event_id ?? defaultEventId ?? ''}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
            >
              <option value="">— No event —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFeatured((f) => !f)}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${featured ? 'bg-amber-500' : 'bg-slate-700'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${featured ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-sm text-slate-300">Mark as featured ⭐</span>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-700/50 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? 'Saving…' : isEdit ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
