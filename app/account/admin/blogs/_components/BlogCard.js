/**
 * @file Blog card — displays a single post in the admin grid with a
 *   VS Code / GitHub-inspired "code file" aesthetic.
 * @module AdminBlogCard
 */

'use client';

import { useState, useTransition } from 'react';
import {
  Eye,
  Heart,
  MessageSquare,
  Star,
  Edit3,
  Trash2,
  ChevronDown,
  Loader2,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import {
  getStatusConfig,
  getCategoryConfig,
  formatBlogDate,
  formatRelativeDate,
  STATUSES,
} from './blogConfig';
import {
  updateBlogStatusAction,
  toggleBlogFeaturedAction,
  deleteBlogAction,
} from '@/app/_lib/blog-actions';

export default function BlogCard({
  post,
  onEdit,
  onViewComments,
  onPostChange,
  onPostDelete,
}) {
  const [isPending, startTransition] = useTransition();
  const [featuredPending, setFeaturedPending] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [flash, setFlash] = useState(null);

  const sc = getStatusConfig(post.status);
  const cc = getCategoryConfig(post.category);

  const filename =
    (
      post.slug ||
      (post.title ?? 'untitled')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    ).slice(0, 36) + '.md';

  function showFlash(type) {
    setFlash(type);
    setTimeout(() => setFlash(null), 1800);
  }

  async function handleStatusChange(newStatus) {
    setStatusOpen(false);
    if (newStatus === post.status) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', post.id);
      fd.set('status', newStatus);
      const result = await updateBlogStatusAction(fd);
      if (!result?.error) {
        onPostChange?.(post.id, {
          status: newStatus,
          published_at:
            newStatus === 'published' && !post.published_at
              ? new Date().toISOString()
              : post.published_at,
        });
        showFlash('status');
      }
    });
  }

  async function handleToggleFeatured() {
    setFeaturedPending(true);
    const fd = new FormData();
    fd.set('id', post.id);
    fd.set('featured', String(!post.is_featured));
    const result = await toggleBlogFeaturedAction(fd);
    setFeaturedPending(false);
    if (!result?.error) {
      onPostChange?.(post.id, { is_featured: !post.is_featured });
      showFlash('featured');
    }
  }

  async function handleDelete() {
    setDeletePending(true);
    const fd = new FormData();
    fd.set('id', post.id);
    const result = await deleteBlogAction(fd);
    setDeletePending(false);
    if (!result?.error) {
      onPostDelete?.(post.id);
    }
  }

  const author = post.users;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-[#0d1117] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/60 ${sc.cardBorder}`}
    >
      {/* Flash ring */}
      {flash && (
        <div className="pointer-events-none absolute inset-0 z-20 animate-pulse rounded-xl ring-2 ring-white/25" />
      )}

      {/* ── Window chrome ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/6 bg-[#161b22] px-3 py-2">
        <div className="flex shrink-0 items-center gap-1">
          <span className="block h-2.5 w-2.5 rounded-full bg-[#ff5f56]/60 transition-opacity group-hover:bg-[#ff5f56]" />
          <span className="block h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/60 transition-opacity group-hover:bg-[#ffbd2e]" />
          <span className="block h-2.5 w-2.5 rounded-full bg-[#27c93f]/60 transition-opacity group-hover:bg-[#27c93f]" />
        </div>
        <span className="flex-1 truncate font-mono text-[10px] text-gray-600">
          {filename}
        </span>
        <button
          onClick={handleToggleFeatured}
          disabled={featuredPending}
          title={post.is_featured ? 'Remove from featured' : 'Mark as featured'}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
            post.is_featured
              ? 'text-amber-400'
              : 'text-gray-700 hover:text-amber-400'
          }`}
        >
          {featuredPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Star
              className={`h-3 w-3 ${post.is_featured ? 'fill-current' : ''}`}
            />
          )}
        </button>
      </div>

      {/* ── Thumbnail ──────────────────────────────────────────────── */}
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-[#161b22]">
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-linear-to-br ${sc.gradient}`}
          >
            <span className="text-5xl opacity-30 select-none">{cc.emoji}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[#0d1117]/80 via-transparent to-transparent" />

        {/* Category — code-language chip */}
        {post.category && (
          <span
            className={`absolute top-2 right-2 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${cc.color}`}
          >
            <span className="opacity-50">&lt;</span>
            {cc.short}
            <span className="opacity-50">/&gt;</span>
          </span>
        )}

        {/* Status line at bottom */}
        <div className="absolute right-0 bottom-0 left-0 flex items-center gap-1.5 bg-linear-to-r from-black/50 to-transparent px-3 py-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sc.dot}`} />
          <span className="font-mono text-[10px] text-white/50">
            {sc.label.toLowerCase()}
          </span>
          {post.is_featured && (
            <span className="ml-auto flex items-center gap-0.5 font-mono text-[10px] text-amber-400/70">
              <Star className="h-2.5 w-2.5 fill-current" />
              featured
            </span>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <div className="mb-2.5 flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-gray-700">
            //
          </span>
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-gray-100">
            {post.title}
          </h3>
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-600">
            {post.excerpt}
          </p>
        )}

        {/* Tags — code token style */}
        {post.tags?.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <code
                key={tag}
                className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 ring-1 ring-white/5"
              >
                #{tag}
              </code>
            ))}
            {post.tags.length > 3 && (
              <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-700 ring-1 ring-white/5">
                +{post.tags.length - 3}
              </code>
            )}
          </div>
        )}

        {/* Metrics — monospace table */}
        <div className="mt-auto overflow-hidden rounded-lg border border-white/6 bg-[#161b22] font-mono text-[10px] text-gray-600">
          <div className="flex divide-x divide-white/6">
            <span className="flex flex-1 items-center justify-center gap-1 py-1.5 transition-colors hover:text-gray-400">
              <Eye className="h-2.5 w-2.5" />
              {(post.views ?? 0).toLocaleString()}
            </span>
            <span className="flex flex-1 items-center justify-center gap-1 py-1.5 transition-colors hover:text-gray-400">
              <Heart className="h-2.5 w-2.5" />
              {post.likes ?? 0}
            </span>
            <button
              onClick={() => onViewComments(post)}
              className="flex flex-1 items-center justify-center gap-1 py-1.5 transition-colors hover:text-blue-400"
            >
              <MessageSquare className="h-2.5 w-2.5" />
              {post.commentCount ?? 0}
              {post.pendingComments > 0 && (
                <span className="rounded bg-amber-500/20 px-1 text-[9px] text-amber-400">
                  !{post.pendingComments}
                </span>
              )}
            </button>
            <span className="flex flex-1 items-center justify-center gap-1 py-1.5 transition-colors hover:text-gray-400">
              <Clock className="h-2.5 w-2.5" />
              {post.read_time ?? '?'}m
            </span>
          </div>
        </div>

        {/* Author — git blame style */}
        <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
          {author?.avatar_url ? (
            <img
              src={author.avatar_url}
              alt=""
              className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-800 ring-1 ring-white/10">
              <User className="h-2.5 w-2.5 text-gray-500" />
            </div>
          )}
          <span className="flex-1 truncate font-mono text-[10px] text-gray-600">
            @{(author?.full_name ?? 'unknown').split(' ')[0].toLowerCase()}
          </span>
          <span
            className="shrink-0 font-mono text-[10px] text-gray-700"
            title={formatBlogDate(post.created_at)}
          >
            {formatRelativeDate(post.created_at)}
          </span>
        </div>
      </div>

      {/* ── Status bar (VS Code–inspired) ──────────────────────────── */}
      <div className="flex items-center gap-1 border-t border-white/5 bg-[#161b22] px-2 py-1.5">
        {/* Status dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => setStatusOpen((o) => !o)}
            disabled={isPending}
            aria-label={`Status: ${sc.label}`}
            className={`flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-medium transition-colors hover:bg-white/6 ${
              post.status === 'published'
                ? 'text-emerald-400'
                : post.status === 'archived'
                  ? 'text-amber-400'
                  : 'text-gray-500'
            }`}
          >
            {isPending ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            )}
            {sc.label}
            <ChevronDown
              className={`h-2.5 w-2.5 opacity-50 transition-transform ${statusOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {statusOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStatusOpen(false)}
              />
              <div className="absolute bottom-full left-0 z-20 mb-1 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#1c2128] shadow-2xl">
                {STATUSES.map((s) => {
                  const c = getStatusConfig(s);
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[11px] transition-colors hover:bg-white/5 ${
                        s === post.status
                          ? 'bg-white/5 text-white'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* View live */}
          {post.status === 'published' && (
            <a
              href={`/blogs/${post.slug || post.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="View live"
              className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-colors hover:bg-white/6 hover:text-emerald-400"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* GitHub Discussions */}
          <a
            href={`https://github.com/eyasir329/NEUPC/discussions?discussions_q=pathname%3A%2Fblogs%2F${encodeURIComponent(post.slug || post.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View GitHub Discussion"
            className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-colors hover:bg-white/6 hover:text-violet-400"
          >
            <MessageSquare className="h-3 w-3" />
          </a>

          {/* Edit */}
          <button
            onClick={() => onEdit(post)}
            title="Edit"
            className="flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] text-gray-500 transition-colors hover:bg-white/6 hover:text-blue-400"
          >
            <Edit3 className="h-3 w-3" />
            edit
          </button>

          {/* Delete */}
          {deleteConfirm ? (
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleDelete}
                disabled={deletePending}
                className="rounded px-1.5 py-1 font-mono text-[10px] text-red-400 transition-colors hover:bg-red-500/10"
              >
                {deletePending ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  'rm?'
                )}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="rounded px-1.5 py-1 font-mono text-[10px] text-gray-600 transition-colors hover:bg-white/6"
              >
                no
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              title="Delete"
              className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-colors hover:bg-red-500/8 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
