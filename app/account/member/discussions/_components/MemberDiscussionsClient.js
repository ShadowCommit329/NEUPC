/**
 * @file Member discussions client — forum interface for browsing,
 *   creating, and voting on discussion threads with category filtering.
 * @module MemberDiscussionsClient
 */

'use client';

import {
  useState,
  useMemo,
  useTransition,
  useCallback,
  useEffect,
} from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  ChevronLeft,
  Tag,
  Pin,
  Lock,
  CheckCircle2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  Trash2,
  X,
  ChevronDown,
  Award,
  Loader2,
  BookOpen,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  createThreadAction,
  createReplyAction,
  voteThreadAction,
  voteReplyAction,
  markSolutionAction,
  deleteThreadAction,
  deleteReplyAction,
  fetchThreadDetailAction,
  markThreadSolvedAction,
} from '@/app/_lib/member-discussions-actions';
import { useScrollLock } from '@/app/_lib/hooks';
import { getInitials } from '@/app/_lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// initials() replaced by getInitials() from shared utils

function avatarColor(str) {
  const colors = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];
  let h = 0;
  for (let i = 0; i < (str?.length ?? 0); i++)
    h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function Avatar({ name, size = 'md' }) {
  const sz = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sz} ${avatarColor(name)}`}
    >
      {getInitials(name)}
    </span>
  );
}

// ─── Create Thread Modal ───────────────────────────────────────────────────────

function CreateThreadModal({ categories, userId, onClose, onCreated }) {
  useScrollLock();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    categoryId: '',
    title: '',
    content: '',
    tags: '',
  });
  const [error, setError] = useState('');

  function handle(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.categoryId || !form.title.trim() || !form.content.trim()) {
      setError('Category, title and content are required.');
      return;
    }
    setError('');
    startTransition(async () => {
      const res = await createThreadAction({
        categoryId: form.categoryId,
        title: form.title,
        content: form.content,
        tags: form.tags,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      onCreated?.(res.thread);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl space-y-5 rounded-2xl border border-white/10 bg-[#0f1117] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            New Discussion Thread
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wider text-white/60 uppercase">
              Category <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={form.categoryId}
                onChange={(e) => handle('categoryId', e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-8 text-sm text-white transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
              >
                <option value="" className="bg-[#0f1117]">
                  — Select a category —
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0f1117]">
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white/40"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wider text-white/60 uppercase">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handle('title', e.target.value)}
              placeholder="What's your question or topic?"
              maxLength={160}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wider text-white/60 uppercase">
              Content <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => handle('content', e.target.value)}
              placeholder="Describe your topic in detail..."
              rows={5}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wider text-white/60 uppercase">
              Tags{' '}
              <span className="font-normal text-white/30">
                (comma-separated)
              </span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => handle('tags', e.target.value)}
              placeholder="e.g. algorithms, dp, graphs"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {isPending ? 'Posting…' : 'Post Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Thread Card ───────────────────────────────────────────────────────────────

function ThreadCard({ thread, voteMap, userId, onClick }) {
  const vote = voteMap.get(thread.id);
  const upCount = thread._voteCount ?? 0;

  return (
    <button
      onClick={() => onClick(thread.id)}
      className="group w-full rounded-2xl border border-white/8 bg-white/3 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:border-white/15 hover:bg-white/5 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Avatar name={thread.users?.full_name} size="md" />

        <div className="min-w-0 flex-1">
          {/* Header badges */}
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {thread.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/15 px-2 py-0.5 text-xs text-amber-400">
                <Pin size={10} /> Pinned
              </span>
            )}
            {thread.is_solved && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-400">
                <CheckCircle2 size={10} /> Solved
              </span>
            )}
            {thread.is_locked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-white/40">
                <Lock size={10} /> Locked
              </span>
            )}
            {thread.discussion_categories?.name && (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/15 px-2 py-0.5 text-xs text-violet-400">
                {thread.discussion_categories.name}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-1.5 line-clamp-2 text-sm leading-snug font-semibold text-white transition-colors group-hover:text-violet-300">
            {thread.title}
          </h3>

          {/* Content preview */}
          <p className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-white/50">
            {thread.content}
          </p>

          {/* Tags */}
          {thread.tags?.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1">
              {thread.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/8 bg-white/5 px-1.5 py-0.5 text-xs text-white/40"
                >
                  #{tag}
                </span>
              ))}
              {thread.tags.length > 4 && (
                <span className="text-xs text-white/30">
                  +{thread.tags.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
            <span className="font-medium text-white/60">
              {thread.users?.full_name ?? 'Unknown'}
            </span>
            <span>{timeAgo(thread.created_at)}</span>
            <span className="flex items-center gap-1">
              <Eye size={11} /> {thread.views ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp size={11} /> {upCount}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Thread Detail View ────────────────────────────────────────────────────────

function ThreadDetail({ threadId, userId, userVotes, onBack }) {
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [localVotes, setLocalVotes] = useState(() => {
    const m = new Map();
    userVotes.forEach((v) => {
      if (v.reply_id) m.set(`reply-${v.reply_id}`, v.vote_type);
      if (v.thread_id) m.set(`thread-${v.thread_id}`, v.vote_type);
    });
    return m;
  });
  const [voteLoading, setVoteLoading] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetchThreadDetailAction(threadId);
    if (!res.error) {
      setThread(res.thread);
      setReplies(res.replies ?? []);
    }
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleVoteThread(voteType) {
    const key = `thread-${threadId}`;
    const current = localVotes.get(key) ?? null;
    setVoteLoading(key);
    const res = await voteThreadAction({
      threadId,
      voteType,
      currentVote: current,
    });
    if (!res?.error) {
      setLocalVotes((prev) => {
        const next = new Map(prev);
        if (current === voteType) next.delete(key);
        else next.set(key, voteType);
        return next;
      });
    }
    setVoteLoading(null);
  }

  async function handleVoteReply(replyId, voteType) {
    const key = `reply-${replyId}`;
    const current = localVotes.get(key) ?? null;
    setVoteLoading(key);
    const res = await voteReplyAction({
      replyId,
      voteType,
      currentVote: current,
    });
    if (!res?.error) {
      setLocalVotes((prev) => {
        const next = new Map(prev);
        if (current === voteType) next.delete(key);
        else next.set(key, voteType);
        return next;
      });
    }
    setVoteLoading(null);
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    setError('');
    const res = await createReplyAction({
      threadId,
      content: replyContent,
      parentId: replyTo?.id ?? null,
    });
    if (res?.error) {
      setError(res.error);
    } else {
      setReplyContent('');
      setReplyTo(null);
      await refresh();
    }
    setSubmitting(false);
  }

  async function handleMarkSolution(replyId, current) {
    await markSolutionAction({ replyId, isSolution: !current });
    await refresh();
  }

  async function handleDeleteThread() {
    if (!confirm('Delete this thread? This cannot be undone.')) return;
    setDeleting('thread');
    await deleteThreadAction({ threadId });
    onBack();
  }

  async function handleDeleteReply(replyId) {
    if (!confirm('Delete this reply?')) return;
    setDeleting(replyId);
    await deleteReplyAction({ replyId });
    await refresh();
    setDeleting(null);
  }

  async function handleToggleSolved() {
    await markThreadSolvedAction({
      threadId,
      isSolved: !thread?.is_solved,
    });
    await refresh();
  }

  if (loading || !thread) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-white/40">
        <Loader2 size={28} className="animate-spin text-violet-400" />
        <span className="text-sm">Loading thread…</span>
      </div>
    );
  }

  const threadVoteKey = `thread-${threadId}`;
  const isAuthor = thread.author_id === userId;

  return (
    <div className="space-y-5">
      {/* Back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ChevronLeft size={16} /> Back to Discussions
        </button>
        <div className="flex items-center gap-2">
          {isAuthor && (
            <>
              <button
                onClick={handleToggleSolved}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  thread.is_solved
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                }`}
              >
                <CheckCircle2 size={13} />
                {thread.is_solved ? 'Mark Unsolved' : 'Mark Solved'}
              </button>
              <button
                onClick={handleDeleteThread}
                disabled={deleting === 'thread'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
              >
                {deleting === 'thread' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thread card */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/3 p-5 backdrop-blur-sm sm:p-6">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {thread.is_pinned && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/15 px-2 py-0.5 text-xs text-amber-400">
              <Pin size={10} /> Pinned
            </span>
          )}
          {thread.is_solved && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-400">
              <CheckCircle2 size={10} /> Solved
            </span>
          )}
          {thread.is_locked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-white/40">
              <Lock size={10} /> Locked
            </span>
          )}
          {thread.discussion_categories?.name && (
            <span className="rounded-full border border-violet-500/20 bg-violet-500/15 px-2 py-0.5 text-xs text-violet-400">
              {thread.discussion_categories.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl leading-snug font-bold text-white sm:text-2xl">
          {thread.title}
        </h2>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <Avatar name={thread.users?.full_name} size="sm" />
            <span className="font-medium text-white/70">
              {thread.users?.full_name ?? 'Unknown'}
            </span>
          </div>
          <span>{timeAgo(thread.created_at)}</span>
          <span className="flex items-center gap-1">
            <Eye size={11} />
            {thread.views ?? 0} views
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} />
            {replies.length} replies
          </span>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/80">
          {thread.content}
        </p>

        {/* Tags */}
        {thread.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/5 px-2 py-0.5 text-xs text-white/50"
              >
                <Tag size={9} /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Vote actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => handleVoteThread('up')}
            disabled={voteLoading === threadVoteKey}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
              localVotes.get(threadVoteKey) === 'up'
                ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                : 'border-white/10 bg-white/5 text-white/50 hover:bg-emerald-500/10 hover:text-emerald-400'
            }`}
          >
            {voteLoading === threadVoteKey ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ThumbsUp size={12} />
            )}
            Helpful
          </button>
          <button
            onClick={() => handleVoteThread('down')}
            disabled={voteLoading === threadVoteKey}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
              localVotes.get(threadVoteKey) === 'down'
                ? 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                : 'border-white/10 bg-white/5 text-white/50 hover:bg-rose-500/10 hover:text-rose-400'
            }`}
          >
            <ThumbsDown size={12} />
            Not helpful
          </button>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-white/60 uppercase">
          <MessageSquare size={14} /> {replies.length}{' '}
          {replies.length === 1 ? 'Reply' : 'Replies'}
        </h3>

        {replies.length === 0 && (
          <div className="py-10 text-center text-sm text-white/30">
            No replies yet. Be the first to respond!
          </div>
        )}

        {replies.map((reply) => {
          const rKey = `reply-${reply.id}`;
          const rVote = localVotes.get(rKey);
          const isReplyAuthor = reply.author_id === userId;

          return (
            <div
              key={reply.id}
              className={`rounded-xl border p-4 transition-colors ${
                reply.is_solution
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-white/8 bg-white/2'
              } ${reply.parent_id ? 'ml-6 sm:ml-10' : ''}`}
            >
              {reply.is_solution && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Award size={12} /> Accepted Solution
                </div>
              )}
              <div className="flex items-start gap-3">
                <Avatar name={reply.users?.full_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white/80">
                      {reply.users?.full_name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-white/40">
                      {timeAgo(reply.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/70">
                    {reply.content}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleVoteReply(reply.id, 'up')}
                      disabled={voteLoading === rKey}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                        rVote === 'up'
                          ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/8 bg-white/5 text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400'
                      }`}
                    >
                      {voteLoading === rKey ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <ThumbsUp size={10} />
                      )}
                      {reply.upvotes ?? 0}
                    </button>
                    {!thread.is_locked && (
                      <button
                        onClick={() => setReplyTo(reply)}
                        className="rounded-lg border border-transparent px-2 py-1 text-xs text-white/40 transition-colors hover:border-violet-400/20 hover:bg-violet-400/10 hover:text-violet-400"
                      >
                        Reply
                      </button>
                    )}
                    {isAuthor &&
                      !reply.is_solution &&
                      thread.author_id === userId && (
                        <button
                          onClick={() =>
                            handleMarkSolution(reply.id, reply.is_solution)
                          }
                          className="flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs text-white/40 transition-colors hover:border-emerald-400/20 hover:bg-emerald-400/10 hover:text-emerald-400"
                        >
                          <CheckCircle2 size={10} /> Mark Solution
                        </button>
                      )}
                    {reply.is_solution && isAuthor && (
                      <button
                        onClick={() =>
                          handleMarkSolution(reply.id, reply.is_solution)
                        }
                        className="rounded-lg px-2 py-1 text-xs text-emerald-400 transition-colors hover:text-white/40"
                      >
                        Unmark
                      </button>
                    )}
                    {(isReplyAuthor || isAuthor) && (
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        disabled={deleting === reply.id}
                        className="ml-auto flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs text-white/30 transition-colors hover:border-rose-400/20 hover:bg-rose-400/10 hover:text-rose-400"
                      >
                        {deleting === reply.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Trash2 size={10} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply form */}
      {!thread.is_locked ? (
        <div className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-4 backdrop-blur-sm sm:p-5">
          {replyTo && (
            <div className="flex items-center justify-between rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs">
              <span className="text-violet-300">
                Replying to{' '}
                <strong>{replyTo.users?.full_name ?? 'reply'}</strong>
              </span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-white/40 transition-colors hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <form onSubmit={handleReply} className="space-y-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply…"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
            />
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {submitting ? 'Posting…' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/3 p-4 text-center text-sm text-white/40">
          <Lock size={14} /> This thread is locked and no longer accepting
          replies.
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MemberDiscussionsClient({
  threads: initialThreads,
  categories,
  userVotes,
  userId,
}) {
  const [activeThread, setActiveThread] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sort, setSort] = useState('latest');

  // Build vote map: threadId → vote_type (for display only in list)
  const threadVoteMap = useMemo(() => {
    const m = new Map();
    userVotes.forEach((v) => {
      if (v.thread_id) m.set(v.thread_id, v.vote_type);
    });
    return m;
  }, [userVotes]);

  // Filter + sort threads
  const filteredThreads = useMemo(() => {
    let list = [...(initialThreads ?? [])];

    if (activeCategory !== 'all') {
      list = list.filter((t) => t.category_id === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.content?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
          t.users?.full_name?.toLowerCase().includes(q)
      );
    }

    if (sort === 'latest')
      list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    else if (sort === 'oldest')
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === 'views')
      list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    else if (sort === 'solved')
      list = list
        .filter((t) => t.is_solved)
        .concat(list.filter((t) => !t.is_solved));
    else if (sort === 'unanswered')
      list = list
        .filter((t) => !t.is_solved)
        .concat(list.filter((t) => t.is_solved));
    else if (sort === 'mine')
      list = list
        .filter((t) => t.author_id === userId)
        .concat(list.filter((t) => t.author_id !== userId));

    // Pinned first
    const pinned = list.filter((t) => t.is_pinned);
    const rest = list.filter((t) => !t.is_pinned);
    return [...pinned, ...rest];
  }, [initialThreads, activeCategory, search, sort, userId]);

  const stats = useMemo(
    () => ({
      total: initialThreads?.length ?? 0,
      solved: initialThreads?.filter((t) => t.is_solved).length ?? 0,
      mine: initialThreads?.filter((t) => t.author_id === userId).length ?? 0,
      cats: categories?.length ?? 0,
    }),
    [initialThreads, userId, categories]
  );

  if (activeThread) {
    return (
      <div className="mx-auto max-w-4xl">
        <ThreadDetail
          threadId={activeThread}
          userId={userId}
          userVotes={userVotes}
          onBack={() => setActiveThread(null)}
        />
      </div>
    );
  }

  return (
    <>
      {showCreate && (
        <CreateThreadModal
          categories={categories}
          userId={userId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
        />
      )}

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Page header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Discussions
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Ask questions, share knowledge, help others
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 sm:self-auto"
          >
            <Plus size={16} /> New Thread
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Total Threads',
              value: stats.total,
              icon: BookOpen,
              color: 'text-violet-400',
            },
            {
              label: 'Solved',
              value: stats.solved,
              icon: CheckCircle2,
              color: 'text-emerald-400',
            },
            {
              label: 'Categories',
              value: stats.cats,
              icon: Tag,
              color: 'text-amber-400',
            },
            {
              label: 'My Threads',
              value: stats.mine,
              icon: Users,
              color: 'text-cyan-400',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 backdrop-blur-sm"
            >
              <Icon size={20} className={color} />
              <div>
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-xs text-white/50">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Sidebar — categories */}
          <aside className="w-full shrink-0 space-y-2 lg:w-52">
            <p className="mb-2 px-1 text-xs font-semibold tracking-wider text-white/40 uppercase">
              Categories
            </p>
            <button
              onClick={() => setActiveCategory('all')}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                activeCategory === 'all'
                  ? 'border border-violet-500/30 bg-violet-600/20 text-violet-300'
                  : 'border border-white/8 bg-white/3 text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              All Threads
              <span className="float-right ml-auto text-xs opacity-60">
                {stats.total}
              </span>
            </button>
            {categories.map((cat) => {
              const count =
                initialThreads?.filter((t) => t.category_id === cat.id)
                  .length ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    activeCategory === cat.id
                      ? 'border border-violet-500/30 bg-violet-600/20 text-violet-300'
                      : 'border border-white/8 bg-white/3 text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {cat.icon && <span>{cat.icon}</span>}
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span className="shrink-0 text-xs opacity-60">{count}</span>
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Main thread list */}
          <div className="min-w-0 flex-1 space-y-4">
            {/* Search + sort */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search threads, tags, authors…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-9 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
                />
              </div>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-8 text-sm text-white transition-colors focus:border-violet-500/50 focus:outline-none"
                >
                  <option value="latest" className="bg-[#0f1117]">
                    Latest
                  </option>
                  <option value="oldest" className="bg-[#0f1117]">
                    Oldest
                  </option>
                  <option value="views" className="bg-[#0f1117]">
                    Most Viewed
                  </option>
                  <option value="solved" className="bg-[#0f1117]">
                    Solved First
                  </option>
                  <option value="unanswered" className="bg-[#0f1117]">
                    Unanswered First
                  </option>
                  <option value="mine" className="bg-[#0f1117]">
                    My Threads
                  </option>
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white/40"
                />
              </div>
            </div>

            {/* Results count */}
            <p className="text-xs text-white/40">
              {filteredThreads.length}{' '}
              {filteredThreads.length === 1 ? 'thread' : 'threads'}
              {search ? ` matching "${search}"` : ''}
              {activeCategory !== 'all'
                ? ` in ${categories.find((c) => c.id === activeCategory)?.name ?? 'category'}`
                : ''}
            </p>

            {/* Thread cards */}
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 bg-white/2 py-20">
                <TrendingUp size={36} className="text-white/20" />
                <p className="text-sm text-white/40">
                  {search
                    ? 'No threads match your search.'
                    : 'No threads in this category yet.'}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm text-violet-400 transition-colors hover:text-violet-300"
                  >
                    <Plus size={14} /> Start the first thread
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredThreads.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    voteMap={threadVoteMap}
                    userId={userId}
                    onClick={setActiveThread}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
