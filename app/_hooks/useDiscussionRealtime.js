/**
 * @file useDiscussionRealtime Hook
 * Real-time subscriptions for discussion threads and replies using Supabase Realtime.
 *
 * @module useDiscussionRealtime
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Create client-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Event types for realtime updates.
 */
export const REALTIME_EVENTS = {
  THREAD_CREATED: 'thread_created',
  THREAD_UPDATED: 'thread_updated',
  THREAD_DELETED: 'thread_deleted',
  REPLY_CREATED: 'reply_created',
  REPLY_UPDATED: 'reply_updated',
  REPLY_DELETED: 'reply_deleted',
  STATUS_CHANGED: 'status_changed',
  VOTE_CHANGED: 'vote_changed',
};

/**
 * Hook to subscribe to discussion thread changes.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onThreadInsert - Callback when a thread is inserted
 * @param {Function} options.onThreadUpdate - Callback when a thread is updated
 * @param {Function} options.onThreadDelete - Callback when a thread is deleted
 * @param {string} options.threadId - Optional specific thread ID to subscribe to
 * @param {boolean} options.enabled - Whether subscriptions are enabled
 * @returns {Object} Subscription status and controls
 */
export function useDiscussionRealtime({
  onThreadInsert,
  onThreadUpdate,
  onThreadDelete,
  onReplyInsert,
  onReplyUpdate,
  onReplyDelete,
  threadId = null,
  enabled = true,
}) {
  const channelRef = useRef(null);
  const replyChannelRef = useRef(null);

  // Subscribe to threads
  const subscribeToThreads = useCallback(() => {
    if (!supabase || !enabled) return;

    // Build filter for specific thread or all threads
    const filter = threadId ? `id=eq.${threadId}` : undefined;

    const channel = supabase
      .channel('discussion_threads_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discussion_threads',
          filter,
        },
        (payload) => {
          if (onThreadInsert) {
            onThreadInsert(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'discussion_threads',
          filter,
        },
        (payload) => {
          if (onThreadUpdate) {
            onThreadUpdate(payload.new, payload.old);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'discussion_threads',
          filter,
        },
        (payload) => {
          if (onThreadDelete) {
            onThreadDelete(payload.old);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return channel;
  }, [enabled, threadId, onThreadInsert, onThreadUpdate, onThreadDelete]);

  // Subscribe to replies
  const subscribeToReplies = useCallback(() => {
    if (!supabase || !enabled || !threadId) return;

    const channel = supabase
      .channel(`discussion_replies_${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discussion_replies',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          if (onReplyInsert) {
            onReplyInsert(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'discussion_replies',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          if (onReplyUpdate) {
            onReplyUpdate(payload.new, payload.old);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'discussion_replies',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          if (onReplyDelete) {
            onReplyDelete(payload.old);
          }
        }
      )
      .subscribe();

    replyChannelRef.current = channel;
    return channel;
  }, [enabled, threadId, onReplyInsert, onReplyUpdate, onReplyDelete]);

  // Setup subscriptions
  useEffect(() => {
    const threadChannel = subscribeToThreads();
    const replyChannel = subscribeToReplies();

    return () => {
      if (threadChannel) {
        supabase?.removeChannel(threadChannel);
      }
      if (replyChannel) {
        supabase?.removeChannel(replyChannel);
      }
    };
  }, [subscribeToThreads, subscribeToReplies]);

  // Manual unsubscribe
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase?.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (replyChannelRef.current) {
      supabase?.removeChannel(replyChannelRef.current);
      replyChannelRef.current = null;
    }
  }, []);

  return {
    isConnected: !!channelRef.current,
    unsubscribe,
  };
}

/**
 * Hook for subscribing to all help desk activity (staff use).
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onActivity - Callback for any activity
 * @param {boolean} options.enabled - Whether subscription is enabled
 */
export function useHelpDeskActivity({ onActivity, enabled = true }) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase || !enabled) return;

    const channel = supabase
      .channel('helpdesk_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discussion_activity',
        },
        (payload) => {
          if (onActivity) {
            onActivity({
              type: 'activity',
              event: 'INSERT',
              data: payload.new,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_threads',
        },
        (payload) => {
          if (onActivity) {
            onActivity({
              type: 'thread',
              event: payload.eventType,
              data: payload.new || payload.old,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
  }, [enabled, onActivity]);

  return {
    isConnected: !!channelRef.current,
  };
}

/**
 * Hook for presence - showing who's viewing a discussion.
 *
 * @param {string} threadId - The thread being viewed
 * @param {Object} userInfo - Current user info
 */
export function useDiscussionPresence(threadId, userInfo) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase || !threadId || !userInfo) return;

    const channel = supabase.channel(`discussion_presence_${threadId}`, {
      config: {
        presence: {
          key: userInfo.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Could update UI with who's currently viewing
        console.log('Presence sync:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: userInfo.id,
            name: userInfo.name || userInfo.email,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channel) {
        channel.untrack();
        supabase?.removeChannel(channel);
      }
    };
  }, [threadId, userInfo]);

  return {
    isConnected: !!channelRef.current,
  };
}

export default useDiscussionRealtime;
