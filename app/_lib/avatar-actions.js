/**
 * @file Avatar upload/delete actions (shared by all roles).
 * Uploads avatars to Google Drive "avatars" subfolder and
 * stores the proxy URL (/api/image/{fileId}) in the users table.
 *
 * @module avatar-actions
 */

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from './auth';
import { supabaseAdmin } from './supabase';
import { getUserByEmail } from './data-service';
import { uploadToDrive, deleteFromDrive } from './gdrive';

const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Upload a new avatar for the currently authenticated user.
 * Stores the file in Google Drive → "avatars" subfolder.
 * Deletes the previous avatar from Drive if it was a Drive file.
 * Updates `users.avatar_url` with the new proxy URL.
 *
 * @param {FormData} formData - must contain a "file" entry
 * @returns {{ success?: boolean, url?: string, error?: string }}
 */
export async function uploadAvatarAction(formData) {
  try {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Not authenticated.' };

    const dbUser = await getUserByEmail(session.user.email);
    if (!dbUser) return { error: 'User not found.' };

    const file = formData.get('file');
    if (!file || !(file instanceof File) || file.size === 0) {
      return { error: 'No image provided.' };
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return { error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.' };
    }
    if (file.size > MAX_AVATAR_SIZE) {
      return { error: 'Image too large. Maximum size is 5 MB.' };
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `avatar_${dbUser.id}_${Date.now()}.${ext}`;

    // Upload to Google Drive "avatars" subfolder
    const arrayBuffer = await file.arrayBuffer();
    const { url } = await uploadToDrive(
      Buffer.from(arrayBuffer),
      filename,
      file.type,
      'avatars'
    );

    // Delete old avatar from Drive (if it was a Drive-hosted file)
    const oldUrl = dbUser.avatar_url;
    if (oldUrl && oldUrl.startsWith('/api/image/')) {
      deleteFromDrive(oldUrl).catch((err) =>
        console.error('Failed to delete old avatar from Drive:', err)
      );
    }

    // Update the user record
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', dbUser.id);

    if (updateErr) {
      console.error('Avatar DB update error:', updateErr);
      return { error: 'Failed to save avatar.' };
    }

    // Revalidate all pages that display the avatar
    revalidatePath('/account');
    revalidatePath('/account/member/profile');
    revalidatePath('/account/guest/profile');
    revalidatePath('/committee');
    revalidateTag('committee');

    return { success: true, url };
  } catch (err) {
    console.error('uploadAvatarAction error:', err);
    return { error: 'Failed to upload avatar. Please try again.' };
  }
}

/**
 * Remove the current avatar (revert to initials fallback).
 * Deletes the file from Google Drive if applicable.
 */
export async function removeAvatarAction() {
  try {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Not authenticated.' };

    const dbUser = await getUserByEmail(session.user.email);
    if (!dbUser) return { error: 'User not found.' };

    // Delete from Drive if it's a Drive file
    const oldUrl = dbUser.avatar_url;
    if (oldUrl && oldUrl.startsWith('/api/image/')) {
      deleteFromDrive(oldUrl).catch((err) =>
        console.error('Failed to delete avatar from Drive:', err)
      );
    }

    // Generate initials fallback
    const initials =
      dbUser.full_name
        ?.split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase() || '?';

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({
        avatar_url: initials,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUser.id);

    if (updateErr) {
      console.error('Avatar removal DB error:', updateErr);
      return { error: 'Failed to remove avatar.' };
    }

    revalidatePath('/account');
    revalidatePath('/account/member/profile');
    revalidatePath('/account/guest/profile');
    revalidatePath('/committee');
    revalidateTag('committee');

    return { success: true };
  } catch (err) {
    console.error('removeAvatarAction error:', err);
    return { error: 'Failed to remove avatar.' };
  }
}

/**
 * Upload an avatar from a URL (used internally during sign-in).
 * NOT a server action — called directly from auth.js signIn callback.
 *
 * @param {string} imageUrl – external image URL (e.g. Google profile pic)
 * @param {string} userId   – database user ID
 * @returns {Promise<string|null>} proxy URL or null on failure
 */
export async function uploadAvatarFromUrl(imageUrl, userId) {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        Accept: 'image/*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;

    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpg';
    const filename = `avatar_${userId}_${Date.now()}.${ext}`;

    const { url } = await uploadToDrive(
      buffer,
      filename,
      contentType,
      'avatars'
    );
    return url;
  } catch (err) {
    console.error('uploadAvatarFromUrl error:', err);
    return null;
  }
}
