/**
 * @file User avatar with image fallback.
 * Shows user profile image or initials-based fallback.
 *
 * @module UserAvatar
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  getInitials,
  getFallbackAvatarUrl,
  driveImageUrl,
} from '@/app/_lib/utils';

/** @param {{ session: Object }} props */
export default function UserAvatar({ session }) {
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const name = session?.name || session?.email || '?';
  const initials = getInitials(name);

  // Prefer DB avatar over provider image; normalize Drive/external URLs.
  const rawAvatarSrc = session?.avatar_url || session?.image;
  const avatarSrc = rawAvatarSrc ? driveImageUrl(rawAvatarSrc) : '';
  const fallbackSrc = getFallbackAvatarUrl(session?.email || name);
  const isValidImage =
    avatarSrc && !avatarSrc.match(/^[A-Z?]{1,3}$/) && !imgError;

  const handleImageError = () => {
    if (!useFallback) {
      // First error: try fallback image
      setUseFallback(true);
    } else {
      // Fallback also failed: show initials
      setImgError(true);
    }
  };

  return (
    <div className="mb-8 flex justify-center">
      <div className="relative h-24 w-24 sm:h-32 sm:w-32">
        {isValidImage && !useFallback ? (
          avatarSrc.startsWith('/api/image/') ? (
            /* Drive-hosted avatar: use plain <img> (no next/image domain config needed) */
            <img
              src={avatarSrc}
              alt={name}
              className="h-full w-full rounded-full border-4 border-white/20 object-cover shadow-xl"
              onError={handleImageError}
            />
          ) : (
            <Image
              src={avatarSrc}
              alt={name}
              fill
              sizes="(max-width: 640px) 96px, 128px"
              className="rounded-full border-4 border-white/20 object-cover shadow-xl"
              onError={handleImageError}
              priority
            />
          )
        ) : !imgError && useFallback ? (
          /* Fallback robohash avatar */
          <img
            src={fallbackSrc}
            alt={name}
            className="h-full w-full rounded-full border-4 border-white/20 object-cover shadow-xl"
            onError={handleImageError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-white/20 bg-linear-to-br from-gray-700 to-gray-800 shadow-xl">
            <span className="text-2xl font-bold text-white/80 sm:text-3xl">
              {initials}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
