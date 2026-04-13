/**
 * @file Discussion Badge Components
 * Reusable badge components for status, type, priority, and role badges.
 *
 * @module DiscussionBadges
 */

'use client';

import {
  Circle,
  Clock,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  Ban,
  BookOpen,
  ClipboardList,
  Bug,
  Layout,
  Lightbulb,
  HelpCircle,
  ArrowDown,
  Minus,
  ArrowUp,
  AlertTriangle,
  Shield,
  GraduationCap,
  Compass,
  Star,
  User,
} from 'lucide-react';
import {
  getStatusConfig,
  getTypeConfig,
  getPriorityConfig,
  getRoleBadgeConfig,
  isStaffRole,
} from '@/app/_lib/discussion-config';

// Icon mapping for dynamic icon rendering
const ICONS = {
  Circle,
  Clock,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  Ban,
  BookOpen,
  ClipboardList,
  Bug,
  Layout,
  Lightbulb,
  HelpCircle,
  ArrowDown,
  Minus,
  ArrowUp,
  AlertTriangle,
  Shield,
  GraduationCap,
  Compass,
  Star,
  User,
};

/**
 * Get Lucide icon component by name.
 */
function getIcon(iconName) {
  return ICONS[iconName] || Circle;
}

/**
 * Status badge component.
 */
export function StatusBadge({
  status,
  showIcon = true,
  size = 'sm',
  className = '',
}) {
  const config = getStatusConfig(status);
  const Icon = getIcon(config.icon);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.badge} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Status dot - minimal indicator.
 */
export function StatusDot({ status, size = 'sm', className = '' }) {
  const config = getStatusConfig(status);

  const sizeClasses = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
  };

  return (
    <span
      className={`inline-block rounded-full ${config.dotColor} ${sizeClasses[size]} ${className}`}
      title={config.label}
    />
  );
}

/**
 * Type badge component.
 */
export function TypeBadge({
  type,
  showIcon = true,
  size = 'sm',
  className = '',
}) {
  const config = getTypeConfig(type);
  const Icon = getIcon(config.icon);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.badge} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.short}</span>
    </span>
  );
}

/**
 * Priority badge component.
 */
export function PriorityBadge({
  priority,
  showIcon = true,
  size = 'sm',
  className = '',
}) {
  const config = getPriorityConfig(priority);
  const Icon = getIcon(config.icon);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.badge} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Role badge component for staff replies.
 */
export function RoleBadge({ role, size = 'sm', className = '' }) {
  const config = getRoleBadgeConfig(role);
  const Icon = getIcon(config.icon);
  const isStaff = isStaffRole(role);

  if (!isStaff) return null;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${config.badge} ${sizeClasses[size]} ${className}`}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.short}</span>
    </span>
  );
}

/**
 * Accepted answer badge.
 */
export function AcceptedBadge({ size = 'sm', className = '' }) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border border-green-500/40 bg-green-500/15 font-semibold text-green-300 ${sizeClasses[size]} ${className}`}
    >
      <CheckCircle className={iconSizes[size]} />
      <span>Accepted</span>
    </span>
  );
}

/**
 * Pinned badge.
 */
export function PinnedBadge({ size = 'sm', className = '' }) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 font-medium text-amber-300 ${sizeClasses[size]} ${className}`}
    >
      Pinned
    </span>
  );
}

/**
 * Locked badge.
 */
export function LockedBadge({ size = 'sm', className = '' }) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border border-red-500/40 bg-red-500/15 font-medium text-red-300 ${sizeClasses[size]} ${className}`}
    >
      Locked
    </span>
  );
}

/**
 * Staff reply indicator badge.
 */
export function StaffReplyBadge({ size = 'sm', className = '' }) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border border-blue-500/40 bg-blue-500/15 font-medium text-blue-300 ${sizeClasses[size]} ${className}`}
    >
      Staff Reply
    </span>
  );
}

/**
 * Combined badge row for a discussion thread.
 */
export function DiscussionBadges({
  type,
  status,
  priority,
  isPinned,
  isLocked,
  hasStaffReply,
  size = 'sm',
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {isPinned && <PinnedBadge size={size} />}
      {isLocked && <LockedBadge size={size} />}
      <TypeBadge type={type} size={size} />
      <StatusBadge status={status} size={size} />
      {priority && priority !== 'normal' && (
        <PriorityBadge priority={priority} size={size} />
      )}
      {hasStaffReply && <StaffReplyBadge size={size} />}
    </div>
  );
}
