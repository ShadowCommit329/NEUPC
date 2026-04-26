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

  const frameClass =
    'h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-white/10 ring-2 ring-primary-500/30 overflow-hidden shadow-2xl shadow-primary-500/10 backdrop-blur-xl';

  return (
    <div className="mb-6 flex justify-center">
      <div className={`relative ${frameClass}`}>
        {isValidImage && !useFallback ? (
          avatarSrc.startsWith('/api/image/') ? (
            <img
              src={avatarSrc}
              alt={name}
              className="h-full w-full object-cover"
              onError={handleImageError}
            />
          ) : (
            <Image
              src={avatarSrc}
              alt={name}
              fill
              sizes="(max-width: 640px) 112px, 128px"
              className="object-cover"
              onError={handleImageError}
              priority
            />
          )
        ) : !imgError && useFallback ? (
          <img
            src={fallbackSrc}
            alt={name}
            className="h-full w-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="from-primary-500/30 to-secondary-500/30 flex h-full w-full items-center justify-center bg-linear-to-br">
            <span className="text-3xl font-bold text-white sm:text-4xl">
              {initials}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
