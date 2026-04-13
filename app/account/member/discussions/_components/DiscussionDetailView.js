/**
 * @file Discussion Detail View Component
 * Displays a single discussion with replies, voting, and reply functionality.
 * Includes real-time updates for replies.
 *
 * @module DiscussionDetailView
 */

'use client';

import {
  useState,
  useCallback,
  useEffect,
  useTransition,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Eye,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Send,
  Edit2,
  Trash2,
  MoreVertical,
  AlertCircle,
  Lock,
  Pin,
  User,
  Reply as ReplyIcon,
  Wifi,
} from 'lucide-react';
import {
  getStatusConfig,
  getTypeConfig,
  getPriorityConfig,
  getRoleBadgeConfig,
  isStaffRole,
  STAFF_ROLES,
} from '@/app/_lib/discussion-config';
import { formatRelativeTime } from '@/app/_lib/utils';
import {
  fetchDiscussionDetailAction,
  createReplyAction,
  voteThreadAction,
  voteReplyAction,
  markAcceptedAnswerAction,
  deleteReplyAction,
} from '@/app/_lib/discussion-actions';
import {
  StatusBadge,
  TypeBadge,
  PriorityBadge,
  RoleBadge,
} from '@/app/_components/discussions';
import { useDiscussionRealtime } from '@/app/_hooks/useDiscussionRealtime';
import {
  useThreadVoting,
  useReplyVoting,
  getVoteScore,
  getVoteScoreColor,
} from '@/app/_hooks/useVoting';
import RichTextEditor from '@/app/_components/ui/RichTextEditor';

/**
 * Vote button component.
 */
function VoteButton({ type, count, isActive, onClick, disabled }) {
  const Icon = type === 'upvote' ? ThumbsUp : ThumbsDown;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors ${
        isActive
          ? type === 'upvote'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Icon className="h-4 w-4" />
      <span>{count || 0}</span>
    </button>
  );
}

/**
 * Author info component.
 */
function AuthorInfo({ author, role, createdAt, isEdited }) {
  const roleConfig = getRoleBadgeConfig(role);
  const isStaff = isStaffRole(role);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
        <User className="h-5 w-5 text-blue-400" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`font-medium ${isStaff ? roleConfig.textColor : 'text-white'}`}
          >
            {author?.full_name || author?.email?.split('@')[0] || 'User'}
          </span>
          {isStaff && <RoleBadge role={role} size="sm" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(createdAt)}</span>
          {isEdited && <span className="italic">(edited)</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Reply component.
 */
function ReplyItem({
  reply,
  threadAuthorId,
  currentUserId,
  isAccepted,
  onAccept,
  onVote,
  onDelete,
  onReply,
  depth = 0,
}) {
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const authorRole = reply.author?.user_roles?.[0]?.role?.name || 'member';
  const isStaff = isStaffRole(authorRole);
  const canAccept = threadAuthorId === currentUserId && !isAccepted;
  const canDelete = reply.author_id === currentUserId || isStaff;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    setIsDeleting(true);
    await onDelete(reply.id);
    setIsDeleting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border ${
        isAccepted
          ? 'border-green-500/30 bg-green-500/5'
          : isStaff
            ? 'border-blue-500/20 bg-blue-500/5'
            : 'border-white/5 bg-white/[0.02]'
      } p-4`}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth * 24, 72)}px` : 0 }}
    >
      {/* Accepted badge */}
      {isAccepted && (
        <div className="absolute -top-2 right-4 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
          <CheckCircle className="h-3 w-3" />
          Accepted Answer
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <AuthorInfo
          author={reply.author}
          role={authorRole}
          createdAt={reply.created_at}
          isEdited={reply.updated_at !== reply.created_at}
        />

        {/* Actions menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-gray-300"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-full right-0 z-10 mt-1 w-40 rounded-lg border border-white/10 bg-gray-900 py-1 shadow-xl"
              >
                {canAccept && (
                  <button
                    type="button"
                    onClick={() => {
                      onAccept(reply.id);
                      setShowActions(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
                  >
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Accept Answer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onReply(reply);
                    setShowActions(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
                >
                  <ReplyIcon className="h-4 w-4" />
                  Reply
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete();
                      setShowActions(false);
                    }}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div
        className="prose prose-sm prose-invert max-w-none text-gray-300"
        dangerouslySetInnerHTML={{ __html: reply.content }}
      />

      {/* Footer */}
      <div className="mt-3 flex items-center gap-4 border-t border-white/5 pt-3">
        <VoteButton
          type="upvote"
          count={reply.upvotes || 0}
          isActive={reply.user_vote === 'upvote'}
          onClick={() => onVote(reply.id, 'upvote', reply.user_vote)}
        />
        <VoteButton
          type="downvote"
          count={reply.downvotes || 0}
          isActive={reply.user_vote === 'downvote'}
          onClick={() => onVote(reply.id, 'downvote', reply.user_vote)}
        />
      </div>

      {/* Nested replies */}
      {reply.children?.length > 0 && (
        <div className="mt-4 space-y-3">
          {reply.children.map((child) => (
            <ReplyItem
              key={child.id}
              reply={child}
              threadAuthorId={threadAuthorId}
              currentUserId={currentUserId}
              isAccepted={false}
              onAccept={onAccept}
              onVote={onVote}
              onDelete={onDelete}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Reply form component.
 */
function ReplyForm({ threadId, parentReply, onSubmit, onCancel }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Reply content is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const result = await onSubmit({
      threadId,
      content,
      parentId: parentReply?.id || null,
    });

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setContent('');
      setIsSubmitting(false);
      if (onCancel) onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {parentReply && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <ReplyIcon className="h-4 w-4 text-gray-400" />
          <span className="text-gray-400">Replying to</span>
          <span className="font-medium text-white">
            {parentReply.author?.full_name || 'User'}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto text-gray-400 hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}

      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Write your reply..."
        minHeight="120px"
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? 'Posting...' : 'Post Reply'}
        </button>
      </div>
    </form>
  );
}

/**
 * Main Discussion Detail View component.
 */
export default function DiscussionDetailView({
  discussion: initialDiscussion,
  onBack,
  userId,
  onUpdate,
}) {
  const [discussion, setDiscussion] = useState(initialDiscussion);
  const [replies, setReplies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isPending, startTransition] = useTransition();

  // Fetch full discussion details
  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchDiscussionDetailAction({
      threadId: discussion.id,
    });
    if (result.thread) {
      setDiscussion(result.thread);
      setReplies(result.thread.replies || []);
    }
    setIsLoading(false);
  }, [discussion.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Real-time callbacks
  const handleReplyInsert = useCallback((newReply) => {
    setReplies((prev) => {
      // Avoid duplicates
      if (prev.some((r) => r.id === newReply.id)) return prev;
      return [...prev, newReply];
    });
  }, []);

  const handleReplyUpdate = useCallback((updatedReply) => {
    setReplies((prev) =>
      prev.map((r) =>
        r.id === updatedReply.id ? { ...r, ...updatedReply } : r
      )
    );
  }, []);

  const handleReplyDelete = useCallback((deletedReply) => {
    setReplies((prev) => prev.filter((r) => r.id !== deletedReply.id));
  }, []);

  const handleThreadUpdate = useCallback((updatedThread) => {
    setDiscussion((prev) => ({ ...prev, ...updatedThread }));
  }, []);

  // Subscribe to real-time updates for this thread
  const { isConnected } = useDiscussionRealtime({
    threadId: discussion.id,
    onThreadUpdate: handleThreadUpdate,
    onReplyInsert: handleReplyInsert,
    onReplyUpdate: handleReplyUpdate,
    onReplyDelete: handleReplyDelete,
    enabled: true,
  });

  // Use voting hooks
  const { voteOnThread, isPending: isVotingThread } = useThreadVoting({
    onSuccess: fetchDetail,
  });

  const { voteOnReply, isPending: isVotingReply } = useReplyVoting({
    onSuccess: fetchDetail,
  });

  // Handle voting on thread
  const handleThreadVote = useCallback(
    async (voteType) => {
      await voteOnThread(discussion.id, voteType, discussion.user_vote);
    },
    [discussion.id, discussion.user_vote, voteOnThread]
  );

  // Handle voting on reply
  const handleReplyVote = useCallback(
    async (replyId, voteType, currentVote) => {
      await voteOnReply(replyId, voteType, currentVote);
    },
    [voteOnReply]
  );

  // Handle marking accepted answer
  const handleAcceptAnswer = useCallback(
    async (replyId) => {
      startTransition(async () => {
        const result = await markAcceptedAnswerAction({
          replyId,
          threadId: discussion.id,
        });
        if (result.success) {
          fetchDetail();
          if (onUpdate) onUpdate();
        }
      });
    },
    [discussion.id, fetchDetail, onUpdate]
  );

  // Handle reply submission
  const handleReplySubmit = useCallback(
    async ({ threadId, content, parentId }) => {
      const result = await createReplyAction({
        threadId,
        content,
        parentId,
      });
      if (result.success) {
        fetchDetail();
        setReplyingTo(null);
        if (onUpdate) onUpdate();
      }
      return result;
    },
    [fetchDetail, onUpdate]
  );

  // Handle reply deletion
  const handleDeleteReply = useCallback(
    async (replyId) => {
      const result = await deleteReplyAction({ replyId });
      if (result.success) {
        fetchDetail();
        if (onUpdate) onUpdate();
      }
    },
    [fetchDetail, onUpdate]
  );

  const statusConfig = getStatusConfig(discussion.status);
  const typeConfig = getTypeConfig(discussion.type);
  const priorityConfig = getPriorityConfig(discussion.priority);
  const authorRole = discussion.author?.user_roles?.[0]?.role?.name || 'member';

  // Build reply tree
  const buildReplyTree = (flatReplies) => {
    const replyMap = new Map();
    const rootReplies = [];

    flatReplies.forEach((reply) => {
      replyMap.set(reply.id, { ...reply, children: [] });
    });

    flatReplies.forEach((reply) => {
      const replyWithChildren = replyMap.get(reply.id);
      if (reply.parent_id && replyMap.has(reply.parent_id)) {
        replyMap.get(reply.parent_id).children.push(replyWithChildren);
      } else {
        rootReplies.push(replyWithChildren);
      }
    });

    return rootReplies;
  };

  const replyTree = buildReplyTree(replies);

  return (
    <div className="space-y-6">
      {/* Back button and real-time indicator */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to discussions
        </button>
        {isConnected && (
          <span
            className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400"
            title="Real-time updates active"
          >
            <Wifi className="h-3 w-3" />
            Live
          </span>
        )}
      </div>

      {/* Main thread */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
      >
        {/* Status indicators */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {discussion.is_pinned && (
            <div className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
              <Pin className="h-3 w-3" />
              Pinned
            </div>
          )}
          {discussion.is_locked && (
            <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
              <Lock className="h-3 w-3" />
              Locked
            </div>
          )}
          <StatusBadge status={discussion.status} />
          <TypeBadge type={discussion.type} />
          {discussion.priority && discussion.priority !== 'normal' && (
            <PriorityBadge priority={discussion.priority} />
          )}
        </div>

        {/* Title */}
        <h1 className="mb-4 text-xl font-bold text-white">
          {discussion.title}
        </h1>

        {/* Author info */}
        <div className="mb-4">
          <AuthorInfo
            author={discussion.author}
            role={authorRole}
            createdAt={discussion.created_at}
            isEdited={discussion.updated_at !== discussion.created_at}
          />
        </div>

        {/* LMS Context */}
        {(discussion.bootcamp || discussion.course || discussion.lesson) && (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400">
            <span className="font-medium text-gray-300">Context: </span>
            {[
              discussion.bootcamp?.title,
              discussion.course?.title,
              discussion.module?.title,
              discussion.lesson?.title,
            ]
              .filter(Boolean)
              .join(' > ')}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-white/5" />
        ) : (
          <div
            className="prose prose-sm prose-invert max-w-none text-gray-300"
            dangerouslySetInnerHTML={{ __html: discussion.content }}
          />
        )}

        {/* Tags */}
        {discussion.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {discussion.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          {/* Votes */}
          <div className="flex items-center gap-4">
            <VoteButton
              type="upvote"
              count={discussion.upvotes || 0}
              isActive={discussion.user_vote === 'upvote'}
              onClick={() => handleThreadVote('upvote')}
              disabled={isPending}
            />
            <VoteButton
              type="downvote"
              count={discussion.downvotes || 0}
              isActive={discussion.user_vote === 'downvote'}
              onClick={() => handleThreadVote('downvote')}
              disabled={isPending}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {discussion.views || 0} views
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {replies.length} replies
            </div>
          </div>
        </div>
      </motion.div>

      {/* Replies section */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <MessageCircle className="h-5 w-5 text-gray-400" />
          Replies ({replies.length})
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]"
              />
            ))}
          </div>
        ) : replyTree.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] py-8 text-center">
            <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-600" />
            <p className="text-gray-400">
              No replies yet. Be the first to respond!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {replyTree.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                threadAuthorId={discussion.author_id}
                currentUserId={userId}
                isAccepted={discussion.accepted_reply_id === reply.id}
                onAccept={handleAcceptAnswer}
                onVote={handleReplyVote}
                onDelete={handleDeleteReply}
                onReply={(r) => setReplyingTo(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reply form */}
      {!discussion.is_locked && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="mb-4 text-sm font-medium text-gray-300">
            {replyingTo ? 'Reply to comment' : 'Post a reply'}
          </h3>
          <ReplyForm
            threadId={discussion.id}
            parentReply={replyingTo}
            onSubmit={handleReplySubmit}
            onCancel={() => setReplyingTo(null)}
          />
        </div>
      )}

      {/* Locked notice */}
      {discussion.is_locked && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <Lock className="h-4 w-4" />
          This discussion is locked. New replies are not allowed.
        </div>
      )}
    </div>
  );
}
