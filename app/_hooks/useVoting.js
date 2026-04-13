/**
 * @file useVoting Hook
 * Reusable voting hook with optimistic updates for discussions.
 *
 * @module useVoting
 */

'use client';

import { useCallback, useTransition, useState } from 'react';
import {
  voteThreadAction,
  voteReplyAction,
} from '@/app/_lib/discussion-actions';

/**
 * Calculate updated vote counts after a vote change.
 *
 * @param {Object} current - Current vote state { upvotes, downvotes, user_vote }
 * @param {string} voteType - 'upvote' or 'downvote'
 * @returns {Object} Updated vote state
 */
function calculateVoteChange(current, voteType) {
  const { upvotes = 0, downvotes = 0, user_vote: currentVote } = current;

  const wasUpvote = currentVote === 'upvote';
  const wasDownvote = currentVote === 'downvote';
  const isUpvote = voteType === 'upvote';
  const isDownvote = voteType === 'downvote';

  let newUpvotes = upvotes;
  let newDownvotes = downvotes;
  let newVote = voteType;

  // Toggle off if same vote
  if (currentVote === voteType) {
    if (isUpvote) newUpvotes--;
    if (isDownvote) newDownvotes--;
    newVote = null;
  } else {
    // Remove previous vote
    if (wasUpvote) newUpvotes--;
    if (wasDownvote) newDownvotes--;
    // Add new vote
    if (isUpvote) newUpvotes++;
    if (isDownvote) newDownvotes++;
  }

  return {
    upvotes: Math.max(0, newUpvotes),
    downvotes: Math.max(0, newDownvotes),
    user_vote: newVote,
  };
}

/**
 * Hook for managing thread voting with optimistic updates.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback on successful vote
 * @param {Function} options.onError - Callback on vote error
 * @returns {Object} Vote controls and state
 *
 * @example
 * const { voteOnThread, isPending, error } = useThreadVoting({
 *   onSuccess: () => refetch(),
 *   onError: (err) => toast.error(err),
 * });
 *
 * <VoteButton onClick={() => voteOnThread(threadId, 'upvote', currentVote)} />
 */
export function useThreadVoting({ onSuccess, onError } = {}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const voteOnThread = useCallback(
    async (threadId, voteType, currentVote) => {
      setError(null);

      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            const result = await voteThreadAction({
              threadId,
              voteType,
              currentVote,
            });

            if (result.error) {
              setError(result.error);
              onError?.(result.error);
              resolve({ error: result.error });
            } else {
              onSuccess?.();
              resolve({ success: true });
            }
          } catch (err) {
            const errorMsg = 'Failed to vote. Please try again.';
            setError(errorMsg);
            onError?.(errorMsg);
            resolve({ error: errorMsg });
          }
        });
      });
    },
    [onSuccess, onError]
  );

  return {
    voteOnThread,
    isPending,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for managing reply voting with optimistic updates.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback on successful vote
 * @param {Function} options.onError - Callback on vote error
 * @returns {Object} Vote controls and state
 */
export function useReplyVoting({ onSuccess, onError } = {}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const voteOnReply = useCallback(
    async (replyId, voteType, currentVote) => {
      setError(null);

      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            const result = await voteReplyAction({
              replyId,
              voteType,
              currentVote,
            });

            if (result.error) {
              setError(result.error);
              onError?.(result.error);
              resolve({ error: result.error });
            } else {
              onSuccess?.();
              resolve({ success: true });
            }
          } catch (err) {
            const errorMsg = 'Failed to vote. Please try again.';
            setError(errorMsg);
            onError?.(errorMsg);
            resolve({ error: errorMsg });
          }
        });
      });
    },
    [onSuccess, onError]
  );

  return {
    voteOnReply,
    isPending,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for managing items with voting and optimistic updates.
 * Handles local state updates for a list of votable items.
 *
 * @param {Array} initialItems - Initial items array
 * @param {Object} options - Configuration options
 * @param {Function} options.onVoteSuccess - Callback on successful vote
 * @param {Function} options.onVoteError - Callback on vote error
 * @returns {Object} Items, vote handler, and state
 *
 * @example
 * const { items, handleVote, isPending } = useVotableItems(discussions, {
 *   onVoteError: (err) => toast.error(err),
 * });
 */
export function useVotableItems(
  initialItems,
  { onVoteSuccess, onVoteError } = {}
) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  // Sync items when initialItems changes
  const syncItems = useCallback((newItems) => {
    setItems(newItems);
  }, []);

  // Optimistically update an item's vote state
  const optimisticVoteUpdate = useCallback((itemId, voteType) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = calculateVoteChange(item, voteType);
        return { ...item, ...updated };
      })
    );
  }, []);

  // Revert an item's vote state on error
  const revertVoteUpdate = useCallback((itemId, originalState) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, ...originalState };
      })
    );
  }, []);

  // Handle voting with optimistic update
  const handleVote = useCallback(
    async (itemId, voteType, currentVote) => {
      setError(null);

      // Store original state for rollback
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const originalState = {
        upvotes: item.upvotes,
        downvotes: item.downvotes,
        user_vote: item.user_vote,
      };

      // Optimistically update
      optimisticVoteUpdate(itemId, voteType);

      startTransition(async () => {
        try {
          const result = await voteThreadAction({
            threadId: itemId,
            voteType,
            currentVote,
          });

          if (result.error) {
            // Revert on error
            revertVoteUpdate(itemId, originalState);
            setError(result.error);
            onVoteError?.(result.error);
          } else {
            onVoteSuccess?.();
          }
        } catch (err) {
          // Revert on exception
          revertVoteUpdate(itemId, originalState);
          const errorMsg = 'Failed to vote. Please try again.';
          setError(errorMsg);
          onVoteError?.(errorMsg);
        }
      });
    },
    [items, optimisticVoteUpdate, revertVoteUpdate, onVoteSuccess, onVoteError]
  );

  return {
    items,
    setItems,
    syncItems,
    handleVote,
    isPending,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Utility to get vote score from an item.
 *
 * @param {Object} item - Item with upvotes/downvotes
 * @returns {number} Vote score
 */
export function getVoteScore(item) {
  return (item?.upvotes || 0) - (item?.downvotes || 0);
}

/**
 * Utility to get vote score color class.
 *
 * @param {number} score - Vote score
 * @returns {string} Tailwind color class
 */
export function getVoteScoreColor(score) {
  if (score > 0) return 'text-green-400';
  if (score < 0) return 'text-red-400';
  return 'text-gray-400';
}

export { calculateVoteChange };
