/**
 * @file Comments modal — overlay displaying all comments for a specific
 *   blog post with moderation actions (approve / delete).
 * @module AdminCommentsModal
 */

'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  X,
  MessageSquare,
  User,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Search,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { formatBlogDate } from './blogConfig';
import {
  toggleCommentApprovalAction,
  deleteCommentAction,
} from '@/app/_lib/blog-actions';
import { useScrollLock } from '@/app/_lib/hooks';

export default function CommentsModal({ post, onClose }) {
  const [comments, setComments] = useState([]);
  useScrollLock();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | approved | pending
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  async function fetchComments() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/blogs/${post.id}/comments`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      setError('Could not load comments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  function handleToggleApproval(comment) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', comment.id);
      fd.set('approved', String(!comment.is_approved));
      await toggleCommentApprovalAction(fd);
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, is_approved: !c.is_approved } : c
        )
      );
    });
  }

  function handleDelete(id) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      await deleteCommentAction(fd);
      setComments((prev) => prev.filter((c) => c.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  async function handleBulkApprove() {
    setBulkPending(true);
    const ids = [...selected];
    for (const id of ids) {
      const comment = comments.find((c) => c.id === id);
      if (comment && !comment.is_approved) {
        const fd = new FormData();
        fd.set('id', id);
        fd.set('approved', 'true');
        await toggleCommentApprovalAction(fd);
      }
    }
    setComments((prev) =>
      prev.map((c) => (selected.has(c.id) ? { ...c, is_approved: true } : c))
    );
    setSelected(new Set());
    setBulkPending(false);
  }

  async function handleBulkDelete() {
    setBulkPending(true);
    const ids = [...selected];
    for (const id of ids) {
      const fd = new FormData();
      fd.set('id', id);
      await deleteCommentAction(fd);
    }
    setComments((prev) => prev.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
    setBulkPending(false);
  }

  const filtered = comments.filter((c) => {
    const matchesSearch =
      !search ||
      c.content?.toLowerCase().includes(search.toLowerCase()) ||
      c.users?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'approved' && c.is_approved) ||
      (filter === 'pending' && !c.is_approved);
    return matchesSearch && matchesFilter;
  });

  const approved = comments.filter((c) => c.is_approved).length;
  const pending = comments.filter((c) => !c.is_approved).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-gray-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/8 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
            <MessageSquare className="h-4.5 w-4.5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">Comments</h2>
            <p className="truncate text-xs text-gray-500">{post.title}</p>
          </div>
          <button
            onClick={fetchComments}
            className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-white/6 border-b border-white/8">
          {[
            { label: 'Total', value: comments.length, color: 'text-white' },
            { label: 'Approved', value: approved, color: 'text-emerald-400' },
            {
              label: 'Pending',
              value: pending,
              color: pending > 0 ? 'text-amber-400' : 'text-gray-500',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center py-3">
              <span className={`text-lg font-bold tabular-nums ${color}`}>
                {value}
              </span>
              <span className="text-[10px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search comments…"
              className="w-full rounded-lg border border-white/8 bg-white/4 py-1.5 pr-3 pl-7 text-xs text-white placeholder-gray-600 outline-none focus:border-white/20"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'approved', 'pending'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-white/12 text-white'
                    : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b border-white/8 bg-blue-500/5 px-5 py-2.5">
            <button
              onClick={toggleSelectAll}
              className="text-[11px] text-blue-400 transition-colors hover:text-blue-300"
            >
              {selected.size === filtered.length
                ? 'Deselect all'
                : 'Select all'}
            </button>
            <span className="text-[11px] text-gray-500">
              {selected.size} selected
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleBulkApprove}
                disabled={bulkPending}
                className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {bulkPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Approve
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkPending}
                className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
              >
                {bulkPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Comment list */}
        <div className="max-h-[50vh] divide-y divide-white/5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-16 text-gray-500">
              <p className="text-sm">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-500">
              <MessageSquare className="mb-3 h-8 w-8 text-gray-700" />
              <p className="text-sm">No comments found</p>
            </div>
          ) : (
            filtered.map((comment) => (
              <div
                key={comment.id}
                className={`flex gap-3 px-5 py-4 transition-colors ${
                  selected.has(comment.id)
                    ? 'bg-blue-500/5'
                    : !comment.is_approved
                      ? 'bg-amber-500/3'
                      : ''
                }`}
              >
                {/* Selection checkbox */}
                <button
                  onClick={() => toggleSelect(comment.id)}
                  className="mt-1 shrink-0 text-gray-600 transition-colors hover:text-white"
                >
                  {selected.has(comment.id) ? (
                    <CheckSquare className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>

                {/* Avatar */}
                {comment.users?.avatar_url ? (
                  <img
                    src={comment.users.avatar_url}
                    alt={comment.users.full_name}
                    className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-800">
                    <User className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {comment.users?.full_name ?? 'Guest'}
                    </span>
                    {!comment.is_approved && (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400 ring-1 ring-amber-500/20">
                        Pending
                      </span>
                    )}
                    {comment.parent_id && (
                      <span className="text-[10px] text-gray-600">↪ reply</span>
                    )}
                    <span className="ml-auto text-[10px] text-gray-600">
                      {formatBlogDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">
                    {comment.content}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button
                    onClick={() => handleToggleApproval(comment)}
                    disabled={isPending}
                    className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                      comment.is_approved
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
                        : 'bg-amber-500/10 text-amber-400 hover:bg-emerald-500/10 hover:text-emerald-400'
                    }`}
                    title={
                      comment.is_approved ? 'Hide comment' : 'Approve comment'
                    }
                  >
                    {comment.is_approved ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={isPending}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-white/8 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs text-gray-400 transition-colors hover:border-white/20 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
