/**
 * @file Avatar — user profile image with initials-based fallback
 *   for the admin users table.
 * @module AdminAvatar
 */

import { driveImageUrl } from '@/app/_lib/utils';

export default function Avatar({ user }) {
  const avatarSrc = driveImageUrl(user.avatar || '');
  const isImageUrl =
    avatarSrc &&
    (avatarSrc.startsWith('http') || avatarSrc.startsWith('/api/image/'));
  if (isImageUrl) {
    return (
      <img
        src={avatarSrc}
        alt={user.name}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10"
      />
    );
  }
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-emerald-500 to-emerald-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-cyan-500 to-cyan-600',
  ];
  const color = colors[(user.name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${color} text-sm font-bold text-white ring-2 ring-white/10`}
    >
      {user.avatar}
    </div>
  );
}
