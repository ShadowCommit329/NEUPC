/**
 * @file Edit modal for event_gallery items (url, type, caption).
 *   Lighter than GalleryItemFormModal — event_gallery has no category/tags/featured.
 * @module AdminEventGalleryItemEditModal
 */

'use client';

import { useState, useRef } from 'react';
import {
  updateEventGalleryItemAction,
  deleteEventGalleryItemAction,
} from '@/app/_lib/gallery-actions';

export default function EventGalleryItemEditModal({ item, onClose }) {
  const formRef = useRef(null);
  const [type, setType] = useState(item?.type ?? 'image');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fd = new FormData(formRef.current);
    fd.set('id', item.id);
    fd.set('type', type);

    const res = await updateEventGalleryItemAction(fd);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      onClose();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const fd = new FormData();
    fd.set('id', item.id);
    const res = await deleteEventGalleryItemAction(fd);
    setDeleting(false);
    if (res?.error) {
      setError(res.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">✏️ Edit Photo</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* URL */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              name="url"
              defaultValue={item?.url ?? ''}
              required
              placeholder="https://…"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Type
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

          {/* Caption */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Caption
            </label>
            <input
              name="caption"
              defaultValue={item?.caption ?? ''}
              placeholder="Photo caption (optional)"
              maxLength={200}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          {confirmDelete ? (
            <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-900/20 p-4">
              <p className="text-sm text-red-300">
                Delete this photo permanently?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl bg-slate-700/50 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-700/50 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
