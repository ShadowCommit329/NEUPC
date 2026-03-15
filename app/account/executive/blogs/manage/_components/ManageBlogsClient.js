/**
 * @file Blog management client — executive interface for creating,
 *   editing, publishing, and featuring blog posts with engagement
 *   metrics.
 * @module ExecutiveManageBlogsClient
 */

'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  PenTool,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Eye,
  Star,
  Tag,
} from 'lucide-react';
import {
  execCreateBlogAction,
  execUpdateBlogAction,
  execDeleteBlogAction,
  execUploadBlogImageAction,
} from '@/app/_lib/executive-actions';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';
import { useScrollLock } from '@/app/_lib/hooks';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  published: {
    label: 'Published',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  archived: {
    label: 'Archived',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};

const CATEGORIES = [
  'Competitive Programming',
  'Programming',
  'WebDev',
  'AI-ML',
  'Career',
  'News',
  'Tutorial',
  'Other',
];

function BlogModal({ blog, onClose, onSuccess }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const isEdit = !!blog?.id;
  useScrollLock();
  const [content, setContent] = useState(blog?.content || '');
  const [autoReadTime, setAutoReadTime] = useState('');

  useEffect(() => {
    setContent(blog?.content || '');
  }, [blog?.id]);

  // Auto-estimate read time from content
  useEffect(() => {
    if (content) {
      const text = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = text ? text.split(' ').length : 0;
      setAutoReadTime(String(Math.max(1, Math.round(words / 200))));
    }
  }, [content]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.target);
    if (isEdit) fd.set('id', blog.id);
    startTransition(async () => {
      const res = isEdit
        ? await execUpdateBlogAction(fd)
        : await execCreateBlogAction(fd);
      if (res?.error) return setError(res.error);
      onSuccess();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Edit Blog Post' : 'Create Blog Post'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Title *
              </label>
              <input
                name="title"
                defaultValue={blog?.title || ''}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Blog post title"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Category
              </label>
              <select
                name="category"
                defaultValue={blog?.category || ''}
                className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
              >
                <option value="">No category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Status
              </label>
              <select
                name="status"
                defaultValue={blog?.status || 'draft'}
                className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Thumbnail URL
              </label>
              <input
                name="thumbnail"
                defaultValue={blog?.thumbnail || ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Read Time (mins)
              </label>
              <input
                name="read_time"
                type="number"
                defaultValue={blog?.read_time || autoReadTime || ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder={autoReadTime || '5'}
                min={1}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Excerpt
              </label>
              <textarea
                name="excerpt"
                defaultValue={blog?.excerpt || ''}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Short summary..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Content *
              </label>
              <input type="hidden" name="content" value={content} readOnly />
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your blog content here…"
                uploadImageAction={execUploadBlogImageAction}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Tags (comma separated)
              </label>
              <input
                name="tags"
                defaultValue={blog?.tags?.join(', ') || ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="algorithms, dp, tutorial"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                name="is_featured"
                type="checkbox"
                value="true"
                id="is_featured_blog"
                defaultChecked={blog?.is_featured}
                className="h-4 w-4 accent-purple-500"
              />
              <label
                htmlFor="is_featured_blog"
                className="cursor-pointer text-sm text-gray-400"
              >
                Featured Post
              </label>
            </div>
          </div>

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
              {isPending ? 'Saving…' : isEdit ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageBlogsClient({ initialBlogs }) {
  const [blogs, setBlogs] = useState(initialBlogs);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState(null);
  useScrollLock(!!deleteId);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = blogs.filter((b) => {
    const matchSearch =
      !search || b.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSuccess = () => {
    setModal(null);
    showToast('Blog post saved!');
    window.location.reload();
  };

  const handleDelete = (id) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await execDeleteBlogAction(fd);
      if (res?.error) return showToast(res.error, 'error');
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      setDeleteId(null);
      showToast('Blog post deleted.');
    });
  };

  const stats = {
    total: blogs.length,
    published: blogs.filter((b) => b.status === 'published').length,
    draft: blogs.filter((b) => b.status === 'draft').length,
    totalViews: blogs.reduce((sum, b) => sum + (b.views || 0), 0),
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Blog Management</h1>
          <p className="mt-1 text-gray-400">
            Create and manage club blog posts
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Posts', value: stats.total, color: 'text-blue-400' },
          {
            label: 'Published',
            value: stats.published,
            color: 'text-green-400',
          },
          { label: 'Drafts', value: stats.draft, color: 'text-amber-400' },
          {
            label: 'Total Views',
            value: stats.totalViews.toLocaleString(),
            color: 'text-purple-400',
          },
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
            placeholder="Search blogs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-gray-900 px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Blogs Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <PenTool className="mb-4 h-12 w-12 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">
            No blog posts found
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {[
                    'Title',
                    'Category',
                    'Status',
                    'Author',
                    'Views',
                    'Date',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-400 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((b) => {
                  const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.draft;
                  return (
                    <tr
                      key={b.id}
                      className="transition-colors hover:bg-white/3"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {b.is_featured && (
                            <Star
                              className="h-3.5 w-3.5 shrink-0 text-amber-400"
                              fill="currentColor"
                            />
                          )}
                          <p className="max-w-50 truncate text-sm font-medium text-white">
                            {b.title}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {b.category ? (
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                            {b.category}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sc.color}`}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {b.author?.full_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        <Eye className="mr-1 inline h-3.5 w-3.5" />
                        {(b.views || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {b.created_at
                          ? new Date(b.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setModal(b)}
                            className="rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(b.id)}
                            className="rounded-lg border border-red-500/20 p-1.5 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <BlogModal
          blog={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              Delete Blog Post?
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
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
