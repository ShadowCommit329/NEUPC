/**
 * @file Mentor resources client — curated resource library with
 *   sharing controls and mentee assignment capabilities.
 * @module MentorResourcesClient
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  X,
  ExternalLink,
  Tag,
} from 'lucide-react';
import {
  createResourceAction,
  deleteResourceAction,
} from '@/app/_lib/mentor-actions';
import { useScrollLock } from '@/app/_lib/hooks';

const TYPE_COLORS = {
  article: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  video: 'bg-red-500/20 text-red-400 border-red-500/30',
  course: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  book: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  tool: 'bg-green-500/20 text-green-400 border-green-500/30',
  documentation: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const DIFFICULTY_COLORS = {
  beginner: 'text-green-400',
  intermediate: 'text-amber-400',
  advanced: 'text-red-400',
};

function ResourceModal({ onClose, onCreated, mentorId }) {
  const [loading, setLoading] = useState(false);
  useScrollLock();
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const addTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !tags.includes(val)) setTags([...tags, val]);
      setTagInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.target);
    fd.set('tags', JSON.stringify(tags));
    fd.set('created_by', mentorId);
    const result = await createResourceAction(fd);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onCreated?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Add Resource</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Title *
            </label>
            <input
              name="title"
              required
              placeholder="Resource title"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              URL *
            </label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              placeholder="What is this resource about?"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Type
              </label>
              <select
                name="resource_type"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
              >
                {[
                  'article',
                  'video',
                  'course',
                  'book',
                  'tool',
                  'documentation',
                  'other',
                ].map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Difficulty
              </label>
              <select
                name="difficulty"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="">Not specified</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Category
            </label>
            <input
              name="category"
              placeholder="e.g. Algorithms, Data Structures…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Tags
            </label>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Type and press Enter…"
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_free"
              id="is_free"
              defaultChecked
              className="rounded border-white/20 bg-white/5"
            />
            <label htmlFor="is_free" className="text-sm text-gray-300">
              Free resource
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MentorResourcesClient({ resources = [], mentorId }) {
  const router = useRouter();
  const [localResources, setLocalResources] = useState(resources);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);

  // Auto-clear feedback messages after 4 seconds.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const filtered = localResources.filter((r) => {
    const matchSearch =
      !search ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || r.resource_type === filterType;
    return matchSearch && matchType;
  });

  const myResources = filtered.filter((r) => r.created_by === mentorId);
  const otherResources = filtered.filter((r) => r.created_by !== mentorId);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    setDeleting(id);
    const fd = new FormData();
    fd.set('id', id);
    const result = await deleteResourceAction(fd);
    setDeleting(null);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setLocalResources((prev) => prev.filter((r) => r.id !== id));
      setMessage({ type: 'success', text: 'Resource deleted.' });
    }
  };

  const stats = {
    total: localResources.length,
    my: localResources.filter((r) => r.created_by === mentorId).length,
    free: localResources.filter((r) => r.is_free).length,
    videos: localResources.filter((r) => r.resource_type === 'video').length,
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Resources</h1>
          <p className="mt-1 text-gray-400">
            Curate and share learning resources
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-400' },
          { label: 'Added by Me', value: stats.my, color: 'text-green-400' },
          { label: 'Free', value: stats.free, color: 'text-emerald-400' },
          { label: 'Videos', value: stats.videos, color: 'text-red-400' },
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All Types</option>
          {[
            'article',
            'video',
            'course',
            'book',
            'tool',
            'documentation',
            'other',
          ].map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {message && (
        <div
          className={`rounded-xl p-3 text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
        >
          {message.text}
        </div>
      )}

      {/* My Resources */}
      {myResources.length > 0 && (
        <ResourceGrid
          title="My Resources"
          resources={myResources}
          onDelete={handleDelete}
          deleting={deleting}
          canDelete
        />
      )}

      {/* Other Resources */}
      {otherResources.length > 0 && (
        <ResourceGrid
          title="All Resources"
          resources={otherResources}
          onDelete={handleDelete}
          deleting={deleting}
          canDelete={false}
        />
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">
            No resources found
          </p>
        </div>
      )}

      {showModal && (
        <ResourceModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            router.refresh();
          }}
          mentorId={mentorId}
        />
      )}
    </div>
  );
}

function ResourceGrid({ title, resources, onDelete, deleting, canDelete }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold tracking-wider text-gray-500 uppercase">
        {title} ({resources.length})
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r) => (
          <div
            key={r.id}
            className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-colors hover:bg-white/10"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[r.resource_type] || TYPE_COLORS.other}`}
              >
                {r.resource_type}
              </span>
              <div className="flex items-center gap-1">
                {r.is_free && (
                  <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                    Free
                  </span>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(r.id)}
                    disabled={deleting === r.id}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <h3 className="mb-1 line-clamp-2 font-semibold text-white">
              {r.title}
            </h3>
            {r.description && (
              <p className="mb-3 line-clamp-2 text-sm text-gray-400">
                {r.description}
              </p>
            )}

            <div className="mt-auto space-y-2">
              {r.category && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Tag className="h-3 w-3" />
                  {r.category}
                  {r.difficulty && (
                    <span
                      className={`ml-1 ${DIFFICULTY_COLORS[r.difficulty] || ''}`}
                    >
                      · {r.difficulty}
                    </span>
                  )}
                </div>
              )}
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20"
              >
                Open Resource
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
