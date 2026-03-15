/**
 * @file User management constants — status options, role labels, filter
 *   presets, and colour mappings for admin user components.
 * @module adminUserConstants
 */

export const ROLES = [
  'guest',
  'member',
  'mentor',
  'executive',
  'advisor',
  'admin',
];

export const STATUS_CONFIG = {
  Active: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    ring: 'ring-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  Inactive: {
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    ring: 'ring-gray-400/30',
    dot: 'bg-gray-400',
  },
  Pending: {
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    ring: 'ring-amber-400/30',
    dot: 'bg-amber-400',
  },
  Suspended: {
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    ring: 'ring-orange-400/30',
    dot: 'bg-orange-400',
  },
  Banned: {
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    ring: 'ring-red-400/30',
    dot: 'bg-red-400',
  },
  Blocked: {
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    ring: 'ring-rose-400/30',
    dot: 'bg-rose-400',
  },
  Locked: {
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    ring: 'ring-purple-400/30',
    dot: 'bg-purple-400',
  },
  Rejected: {
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    ring: 'ring-rose-400/30',
    dot: 'bg-rose-400',
  },
};

export const ROLE_COLORS = {
  Admin: 'text-red-400 bg-red-400/10 ring-red-400/30',
  Executive: 'text-purple-400 bg-purple-400/10 ring-purple-400/30',
  Mentor: 'text-blue-400 bg-blue-400/10 ring-blue-400/30',
  Advisor: 'text-cyan-400 bg-cyan-400/10 ring-cyan-400/30',
  Member: 'text-green-400 bg-green-400/10 ring-green-400/30',
  Guest: 'text-gray-400 bg-gray-400/10 ring-gray-400/30',
};

export const MODAL_CONFIG = {
  activate: {
    title: 'Activate User',
    description: "This will restore the user's access to their account.",
    danger: false,
    showReason: true,
  },
  suspend: {
    title: 'Suspend User',
    description: 'This user will lose access until reactivated.',
    danger: true,
    showReason: true,
    showExpiry: true,
  },
  ban: {
    title: 'Ban User',
    description: 'This permanently blocks the user. This action is severe.',
    danger: true,
    showReason: true,
  },
  role: {
    title: 'Change Role',
    description: 'Select the new role for this user.',
    danger: false,
    showRole: true,
  },
  lock: {
    title: 'Lock Account',
    description:
      'Locks the account for security reasons. The user cannot sign in.',
    danger: true,
    showReason: true,
  },
  email: {
    title: 'Send Custom Email',
    description: 'Compose and send a direct email to this user via platform.',
    danger: false,
    showReason: false, // Disable the default reason field
    showEmailSubject: true,
    showEmailBody: true,
  },
  edit: {
    title: 'Edit User',
    description: 'Update user information.',
    danger: false,
    showEdit: true,
  },
};
