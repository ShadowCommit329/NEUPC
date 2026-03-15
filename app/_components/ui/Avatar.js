/**
 * @file Avatar
 * @module Avatar
 */

import Link from 'next/link';
import { auth } from '@/app/_lib/auth';
import { driveImageUrl, getFallbackAvatarUrl } from '@/app/_lib/utils';

async function Avatar() {
  const session = await auth();

  if (!session?.user) return null;

  // Prefer DB avatar (Drive proxy URL) over Google session image
  const avatarSrc = driveImageUrl(
    session.user.avatar_url || session.user.image || ''
  );
  const fallbackSrc = getFallbackAvatarUrl(
    session.user.email || session.user.name
  );
  const name = session.user.name || 'Account';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Link
      href="/account"
      className="hover:text-accent-400 flex items-center gap-2 transition-colors"
    >
      {avatarSrc && !avatarSrc.match(/^[A-Z?]{1,3}$/) ? (
        <img
          src={avatarSrc}
          alt={name}
          referrerPolicy="no-referrer"
          className="h-8 w-8 rounded-full object-cover"
          onError={(e) => {
            // Fallback to robohash if primary image fails
            e.target.src = fallbackSrc;
          }}
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-xs font-bold text-white">
          {initials}
        </div>
      )}
      <span className="hidden text-sm font-medium sm:inline">{name}</span>
    </Link>
  );
}

export default Avatar;
