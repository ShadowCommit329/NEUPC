/**
 * @file Discussion Card Component
 * Card component for displaying discussion thread in list views.
 *
 * @module DiscussionCard
 */

'use client';

import { memo } from 'react';
import Link from 'next/link';
import { MessageSquare, Eye, ThumbsUp, User, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatRelativeTime } from '@/app/_lib/utils';
import { DiscussionBadges, StatusDot, RoleBadge } from './DiscussionBadges';

/**
 * Discussion card for list views.
 */
function DiscussionCardComponent({
  discussion,
  href,
  onClick,
  showAuthor = true,
  showStats = true,
  showBadges = true,
  compact = false,
  selected = false,
  className = '',
}) {
  const {
    id,
    title,
    content,
    type,
    status,
    priority,
    is_pinned,
    is_locked,
    reply_count = 0,
    views = 0,
    vote_count = 0,
    created_at,
    updated_at,
    author,
    assigned,
    bootcamp,
    course,
  } = discussion;

  const hasStaffReply = discussion.has_staff_reply || false;
  const contentPreview = content
    ? content.replace(/<[^>]*>/g, '').slice(0, 150) +
      (content.length > 150 ? '...' : '')
    : '';

  const CardWrapper = href ? Link : 'div';
  const cardProps = href
    ? { href }
    : onClick
      ? { onClick, role: 'button', tabIndex: 0 }
      : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <CardWrapper
        {...cardProps}
        className={`group block rounded-xl border transition-all duration-200 ${
          selected
            ? 'border-blue-500/50 bg-blue-500/5'
            : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
        } ${compact ? 'p-3' : 'p-4'} ${className}`}
      >
        {/* Header with badges */}
        {showBadges && (
          <div className="mb-2 flex items-start justify-between gap-2">
            <DiscussionBadges
              type={type}
              status={status}
              priority={priority}
              isPinned={is_pinned}
              isLocked={is_locked}
              hasStaffReply={hasStaffReply}
              size="xs"
            />
            {!compact && (
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-400" />
            )}
          </div>
        )}

        {/* Title */}
        <h3
          className={`font-semibold text-white group-hover:text-blue-300 ${
            compact ? 'text-sm' : 'text-base'
          } ${is_pinned ? 'flex items-center gap-1.5' : ''}`}
        >
          {is_pinned && <StatusDot status="open" size="sm" />}
          <span className="line-clamp-2">{title}</span>
        </h3>

        {/* Content preview (non-compact only) */}
        {!compact && contentPreview && (
          <p className="mt-1.5 line-clamp-2 text-sm text-gray-400">
            {contentPreview}
          </p>
        )}

        {/* LMS Context */}
        {(bootcamp || course) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            {bootcamp && (
              <span className="rounded bg-white/5 px-1.5 py-0.5">
                {bootcamp.title}
              </span>
            )}
            {course && (
              <span className="rounded bg-white/5 px-1.5 py-0.5">
                {course.title}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          className={`flex items-center justify-between ${compact ? 'mt-2' : 'mt-3'}`}
        >
          {/* Author info */}
          {showAuthor && author && (
            <div className="flex items-center gap-2">
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt={author.full_name || 'User'}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-700">
                  <User className="h-3 w-3 text-gray-400" />
                </div>
              )}
              <span className="text-xs text-gray-400">
                {author.full_name || 'Anonymous'}
              </span>
              <span className="text-xs text-gray-600">
                {formatRelativeTime(created_at)}
              </span>
            </div>
          )}

          {/* Stats */}
          {showStats && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1" title="Replies">
                <MessageSquare className="h-3.5 w-3.5" />
                {reply_count}
              </span>
              <span className="flex items-center gap-1" title="Views">
                <Eye className="h-3.5 w-3.5" />
                {views}
              </span>
              {vote_count > 0 && (
                <span className="flex items-center gap-1" title="Votes">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {vote_count}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Assigned to (for staff view) */}
        {assigned && (
          <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2 text-xs text-gray-500">
            <span>Assigned to:</span>
            <div className="flex items-center gap-1">
              {assigned.avatar_url ? (
                <img
                  src={assigned.avatar_url}
                  alt={assigned.full_name}
                  className="h-4 w-4 rounded-full"
                />
              ) : (
                <User className="h-3 w-3" />
              )}
              <span className="text-gray-400">{assigned.full_name}</span>
            </div>
          </div>
        )}
      </CardWrapper>
    </motion.div>
  );
}

export const DiscussionCard = memo(DiscussionCardComponent);

/**
 * Compact discussion row for tables/lists.
 */
export function DiscussionRow({
  discussion,
  href,
  onClick,
  showAssigned = false,
  className = '',
}) {
  const {
    title,
    type,
    status,
    priority,
    reply_count = 0,
    created_at,
    author,
    assigned,
  } = discussion;

  const CardWrapper = href ? Link : 'div';
  const cardProps = href
    ? { href }
    : onClick
      ? { onClick, role: 'button', tabIndex: 0 }
      : {};

  return (
    <CardWrapper
      {...cardProps}
      className={`group flex items-center gap-4 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.02] ${className}`}
    >
      <StatusDot status={status} size="sm" />

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-white group-hover:text-blue-300">
          {title}
        </h4>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
          <span>{author?.full_name || 'Anonymous'}</span>
          <span>·</span>
          <span>{formatRelativeTime(created_at)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DiscussionBadges
          type={type}
          status={status}
          priority={priority}
          size="xs"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>{reply_count}</span>
      </div>

      {showAssigned && assigned && (
        <div className="flex shrink-0 items-center gap-1">
          {assigned.avatar_url ? (
            <img
              src={assigned.avatar_url}
              alt={assigned.full_name}
              className="h-5 w-5 rounded-full"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-700">
              <User className="h-3 w-3 text-gray-400" />
            </div>
          )}
        </div>
      )}

      <ChevronRight className="h-4 w-4 shrink-0 text-gray-600 group-hover:text-gray-400" />
    </CardWrapper>
  );
}
