/**
 * @file Gallery management client — executive interface for uploading,
 *   categorising, and managing photo / video media with event tagging.
 * @module ExecutiveManageGalleryClient
 */

'use client';

import { useState, useTransition } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  Upload,
  Star,
  Tag,
  ChevronDown,
  Grid,
  List,
} from 'lucide-react';
import {
  execAddGalleryItemAction,
  execBulkAddGalleryAction,
  execUpdateGalleryItemAction,
  execDeleteGalleryItemAction,
} from '@/app/_lib/executive-actions';
import { useScrollLock } from '@/app/_lib/hooks';

function AddItemModal({ events, onClose, onSuccess }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  useScrollLock();
  const [mode, setMode] = useState('single'); // 'single' | 'bulk'

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.target);
    startTransition(async () => {
      const res =
        mode === 'bulk'
          ? await execBulkAddGalleryAction(fd)
          : await execAddGalleryItemAction(fd);
      if (res?.error) return setError(res.error);
      onSuccess(res);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="text-xl font-bold text-white">Add Gallery Images</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b border-white/10">
          {['single', 'bulk'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === m ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              {m === 'single' ? 'Single Image' : 'Bulk Upload'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {mode === 'single' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">
                  Image URL *
                </label>
                <input
                  name="url"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">
                    Type
                  </label>
                  <select
                    name="type"
                    className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">
                    Category
                  </label>
                  <input
                    name="category"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                    placeholder="e.g. Contest 2025"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">
                  Caption
                </label>
                <input
                  name="caption"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                  placeholder="Image caption..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">
                  Event (optional)
                </label>
                <select
                  name="event_id"
                  className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
                >
                  <option value="">No event</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="is_featured"
                  type="checkbox"
                  value="true"
                  id="gal_featured"
                  className="h-4 w-4 accent-amber-500"
                />
                <label
                  htmlFor="gal_featured"
                  className="cursor-pointer text-sm text-gray-400"
                >
                  Featured Image
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">
                  Image URLs (one per line, max 50) *
                </label>
                <textarea
                  name="urls"
                  required
                  rows={8}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white placeholder-gray-500 focus:outline-none"
                  placeholder="https://cdn.example.com/image1.jpg&#10;https://cdn.example.com/image2.jpg"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">
                    Type
                  </label>
                  <select
                    name="type"
                    className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">
                    Category
                  </label>
                  <input
                    name="category"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                    placeholder="e.g. Workshop 2025"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">
                  Event (optional)
                </label>
                <select
                  name="event_id"
                  className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
                >
                  <option value="">No event</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-gray-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {isPending ? 'Uploading…' : 'Add Images'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageGalleryClient({ initialItems, events }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [lightbox, setLightbox] = useState(null);
  useScrollLock(!!lightbox);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const filtered = items.filter((i) => {
    const matchSearch =
      !search ||
      i.caption?.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === 'all' || i.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSingle = (id) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await execDeleteGalleryItemAction(fd);
      if (res?.error) return showToast(res.error, 'error');
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast('Image deleted.');
    });
  };

  const handleDeleteBulk = () => {
    startTransition(async () => {
      for (const id of selected) {
        const fd = new FormData();
        fd.set('id', id);
        await execDeleteGalleryItemAction(fd);
      }
      setItems((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      showToast(`Deleted ${selected.size} images.`);
    });
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    showToast('Images added!');
    window.location.reload();
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gallery Management</h1>
          <p className="mt-1 text-gray-400">Manage club photos and media</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Add Images
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Total Images',
            value: items.length,
            color: 'text-blue-400',
          },
          {
            label: 'Categories',
            value: categories.length,
            color: 'text-cyan-400',
          },
          {
            label: 'Featured',
            value: items.filter((i) => i.is_featured).length,
            color: 'text-amber-400',
          },
          { label: 'Selected', value: selected.size, color: 'text-red-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
          >
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <span className="text-sm text-red-300">
            {selected.size} image(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5"
            >
              Deselect All
            </button>
            <button
              onClick={handleDeleteBulk}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by caption or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-gray-900 px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-20 text-center">
          <ImageIcon className="mb-4 h-14 w-14 text-gray-600" />
          <p className="text-xl font-semibold text-gray-300">No images found</p>
          <p className="mt-2 text-sm text-gray-500">
            Add photos to build the gallery
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all ${selected.has(item.id) ? 'border-blue-500/60 ring-2 ring-blue-500/30' : 'border-white/10 hover:border-white/25'}`}
            >
              <div
                className="aspect-square bg-gray-800"
                onClick={() => setLightbox(item)}
              >
                <img
                  src={item.url}
                  alt={item.caption || ''}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between bg-black/50 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex justify-between">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                  {item.is_featured && (
                    <Star
                      className="h-4 w-4 text-amber-400"
                      fill="currentColor"
                    />
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingle(item.id);
                    }}
                    disabled={isPending}
                    className="rounded-lg bg-red-600/80 p-1.5 text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {item.category && (
                <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 to-transparent p-1.5">
                  <p className="truncate text-xs text-gray-300">
                    {item.category}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.url}
              alt={lightbox.caption || ''}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            {lightbox.caption && (
              <p className="mt-3 text-center text-sm text-gray-300">
                {lightbox.caption}
              </p>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 rounded-full border border-white/10 bg-gray-900 p-2 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddItemModal
          events={events}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {toast && (
        <div
          className={`fixed right-6 bottom-6 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${toast.type === 'error' ? 'border-red-500/30 bg-red-500/20 text-red-300' : 'border-green-500/30 bg-green-500/20 text-green-300'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
