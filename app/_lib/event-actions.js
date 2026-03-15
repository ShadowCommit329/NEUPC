/**
 * @file event actions
 * @module event-actions
 */

'use server';

import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, createLogger, generateSlug } from '@/app/_lib/helpers';
import { uploadToDrive, deleteFromDrive } from '@/app/_lib/gdrive';
import { generateImage } from '@/app/_lib/image-gen';
import { generateText } from '@/app/_lib/text-gen';

const logActivity = createLogger('event');

// ─── Image upload constants ──────────────────────────────────────────────────
const ALLOWED_EVENT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

function revalidateEvents() {
  // Public pages
  revalidatePath('/');
  revalidatePath('/events', 'layout'); // covers /events AND /events/[eventId]

  // Admin
  revalidatePath('/account/admin/events', 'layout');

  // Executive
  revalidatePath('/account/executive/events/manage');
  revalidatePath('/account/executive/registrations');
  revalidatePath('/account/executive/reports');

  // Advisor
  revalidatePath('/account/advisor/events');
  revalidatePath('/account/advisor/reports');
  revalidatePath('/account/advisor/analytics');
  revalidatePath('/account/advisor/club-overview');

  // Member
  revalidatePath('/account/member/events');
  revalidatePath('/account/member/participation');
  revalidatePath('/account/member/certificates');

  // Guest
  revalidatePath('/account/guest/events');
  revalidatePath('/account/guest/participation');

  // Cache tags
  revalidateTag('events');
  revalidateTag('homepage');
}

// =============================================================================
// UPLOAD EVENT IMAGE
// =============================================================================

export async function uploadEventImageAction(formData) {
  const admin = await requireAdmin();

  const file = formData.get('file');
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'No image provided.' };
  }
  if (!ALLOWED_EVENT_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Image type not supported. Use JPEG, PNG, WebP, or GIF.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `events_${admin.id}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

  let url, fileId;
  try {
    const arrayBuffer = await file.arrayBuffer();
    ({ url, fileId } = await uploadToDrive(
      Buffer.from(arrayBuffer),
      filename,
      file.type,
      'event-images'
    ));
  } catch (err) {
    console.error('Google Drive event image upload error:', err);
    return { error: 'Failed to upload image. Please try again.' };
  }

  await logActivity(admin.id, 'event_image_uploaded', fileId, {
    filename: file.name,
    fileId,
  });

  return { success: true, url };
}

// =============================================================================
// DELETE EVENT IMAGE FROM DRIVE
// =============================================================================

/**
 * Extract all image src URLs from an HTML string.
 * @param {string} html - HTML content
 * @returns {string[]} Array of image URLs
 */
function extractImageUrls(html) {
  if (!html) return [];
  const matches = html.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
  return matches
    .map((tag) => {
      const srcMatch = tag.match(/src=["']([^"']+)["']/i);
      return srcMatch?.[1] || null;
    })
    .filter(Boolean);
}

/**
 * Delete a single image from Google Drive by its URL.
 * Safe to call with any URL — only deletes if it matches a Drive/proxy URL pattern.
 */
export async function deleteEventImageAction(url) {
  await requireAdmin();

  if (!url) return { success: true };

  // Only delete if it's a Drive-managed image (proxy URL or lh3 URL)
  const isProxyUrl = url.startsWith('/api/image/');
  const isLh3Url = url.includes('lh3.googleusercontent.com');
  const isDriveUrl = url.includes('drive.google.com');

  if (!isProxyUrl && !isLh3Url && !isDriveUrl) {
    return { success: true }; // Not a Drive image, nothing to delete
  }

  try {
    await deleteFromDrive(url);
    return { success: true };
  } catch (err) {
    console.error('Failed to delete Drive image:', err);
    return { error: 'Failed to delete image from Drive.' };
  }
}

// =============================================================================
// GENERATE EVENT IMAGE (AI)
// =============================================================================

export async function generateEventImageAction(prompt, model) {
  const admin = await requireAdmin();

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return {
      error: 'Please provide a descriptive prompt (at least 3 characters).',
    };
  }

  try {
    // 1. Generate image via AI (model defaults to 'flux' in image-gen)
    const { buffer, mimeType } = await generateImage(prompt.trim(), model);

    // 2. Determine file extension from MIME type
    const extMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const ext = extMap[mimeType] || 'png';
    const filename = `ai_event_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    // 3. Upload to Google Drive
    const { url, fileId } = await uploadToDrive(
      buffer,
      filename,
      mimeType,
      'event-images'
    );

    await logActivity(admin.id, 'event_image_ai_generated', fileId, {
      prompt: prompt.trim().slice(0, 200),
      filename,
      fileId,
    });

    return { success: true, url };
  } catch (err) {
    console.error('AI image generation error:', err);
    return {
      error: err.message || 'Failed to generate image. Please try again.',
    };
  }
}

// =============================================================================
// CREATE EVENT
// =============================================================================

export async function createEventAction(formData) {
  const admin = await requireAdmin();

  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };

  const location = formData.get('location')?.trim();
  if (!location) return { error: 'Location is required.' };

  const start_date = formData.get('start_date');
  if (!start_date) return { error: 'Start date is required.' };

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const maxP = formData.get('max_participants');
  const max_participants = maxP ? parseInt(maxP, 10) : null;

  const participation_type =
    formData.get('participation_type')?.trim() || 'individual';
  const teamSizeRaw = formData.get('team_size');
  const team_size =
    participation_type === 'team' && teamSizeRaw
      ? parseInt(teamSizeRaw, 10)
      : null;

  const payload = {
    slug: generateSlug(title),
    title,
    description: formData.get('description')?.trim() || null,
    content: formData.get('content')?.trim() || null,
    location,
    venue_type: formData.get('venue_type') || 'offline',
    category: formData.get('category') || null,
    status: formData.get('status') || 'draft',
    start_date: new Date(start_date).toISOString(),
    end_date: formData.get('end_date')
      ? new Date(formData.get('end_date')).toISOString()
      : null,
    cover_image: formData.get('cover_image')?.trim() || null,
    registration_required: formData.get('registration_required') === 'true',
    registration_deadline: formData.get('registration_deadline')
      ? new Date(formData.get('registration_deadline')).toISOString()
      : null,
    max_participants,
    participation_type,
    team_size,
    is_featured: formData.get('is_featured') === 'true',
    tags: tags.length ? tags : null,
    external_url: formData.get('external_url')?.trim() || null,
    registration_url: formData.get('registration_url')?.trim() || null,
    prerequisites: formData.get('prerequisites')?.trim() || null,
    eligibility: formData.get('eligibility')?.trim() || 'all',
    created_by: admin.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert(payload)
    .select()
    .single();

  if (error) return { error: error.message };

  // Auto-approve if status is not draft
  if (payload.status !== 'draft') {
    await supabaseAdmin
      .from('events')
      .update({ approved_by: admin.id, approved_at: new Date().toISOString() })
      .eq('id', data.id);
  }

  await logActivity(admin.id, 'create_event', data.id, { title });
  revalidateEvents();

  return {
    success: true,
    event: {
      ...data,
      ...payload,
      creatorName: admin.full_name ?? 'Admin',
      creatorAvatar: admin.avatar ?? null,
      registrationCount: 0,
      attendedCount: 0,
      confirmedCount: 0,
    },
  };
}

// =============================================================================
// UPDATE EVENT
// =============================================================================

export async function updateEventAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Event ID is required.' };

  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };

  const location = formData.get('location')?.trim();
  if (!location) return { error: 'Location is required.' };

  const start_date = formData.get('start_date');
  if (!start_date) return { error: 'Start date is required.' };

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const maxP = formData.get('max_participants');
  const max_participants = maxP ? parseInt(maxP, 10) : null;

  const participation_type =
    formData.get('participation_type')?.trim() || 'individual';
  const teamSizeRaw = formData.get('team_size');
  const team_size =
    participation_type === 'team' && teamSizeRaw
      ? parseInt(teamSizeRaw, 10)
      : null;

  // Fetch old event data to compare cover image & content images
  const { data: oldEvent } = await supabaseAdmin
    .from('events')
    .select('cover_image, content')
    .eq('id', id)
    .single();

  const newCoverImage = formData.get('cover_image')?.trim() || null;
  const newContent = formData.get('content')?.trim() || null;

  const updates = {
    title,
    description: formData.get('description')?.trim() || null,
    content: newContent,
    location,
    venue_type: formData.get('venue_type') || 'offline',
    category: formData.get('category') || null,
    status: formData.get('status') || 'draft',
    start_date: new Date(start_date).toISOString(),
    end_date: formData.get('end_date')
      ? new Date(formData.get('end_date')).toISOString()
      : null,
    cover_image: newCoverImage,
    registration_required: formData.get('registration_required') === 'true',
    registration_deadline: formData.get('registration_deadline')
      ? new Date(formData.get('registration_deadline')).toISOString()
      : null,
    max_participants,
    participation_type,
    team_size,
    is_featured: formData.get('is_featured') === 'true',
    tags: tags.length ? tags : null,
    external_url: formData.get('external_url')?.trim() || null,
    registration_url: formData.get('registration_url')?.trim() || null,
    prerequisites: formData.get('prerequisites')?.trim() || null,
    eligibility: formData.get('eligibility')?.trim() || 'all',
    updated_at: new Date().toISOString(),
  };

  // Set approval fields when publishing
  if (updates.status !== 'draft') {
    updates.approved_by = admin.id;
    updates.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  // ── Clean up orphaned Drive images (non-blocking) ──
  try {
    // Delete old cover image if it changed or was removed
    if (oldEvent?.cover_image && oldEvent.cover_image !== newCoverImage) {
      deleteFromDrive(oldEvent.cover_image).catch(() => {});
    }

    // Delete content images that were removed
    const oldContentImages = new Set(extractImageUrls(oldEvent?.content));
    const newContentImages = new Set(extractImageUrls(newContent));
    for (const url of oldContentImages) {
      if (!newContentImages.has(url)) {
        deleteFromDrive(url).catch(() => {});
      }
    }
  } catch {
    // Image cleanup is best-effort, don't fail the update
  }

  await logActivity(admin.id, 'update_event', id, { title });
  revalidateEvents();

  return { success: true, event: data };
}

// =============================================================================
// DELETE EVENT
// =============================================================================

export async function deleteEventAction(formData) {
  const admin = await requireAdmin();
  const id = formData.get('id');
  if (!id) return { error: 'Event ID is required.' };

  // Fetch event to get images before deletion
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('cover_image, content')
    .eq('id', id)
    .single();

  // Fetch event gallery images before deletion
  const { data: galleryItems } = await supabaseAdmin
    .from('event_gallery')
    .select('url')
    .eq('event_id', id);

  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
  if (error) return { error: error.message };

  // ── Clean up all Drive images (non-blocking) ──
  try {
    const imagesToDelete = [];
    if (event?.cover_image) imagesToDelete.push(event.cover_image);
    imagesToDelete.push(...extractImageUrls(event?.content));
    // Include gallery images
    if (galleryItems?.length) {
      for (const item of galleryItems) {
        if (item.url) imagesToDelete.push(item.url);
      }
    }

    for (const url of imagesToDelete) {
      deleteFromDrive(url).catch(() => {});
    }
  } catch {
    // Image cleanup is best-effort, don't fail the delete
  }

  await logActivity(admin.id, 'delete_event', id, {});
  revalidateEvents();

  return { success: true };
}

// =============================================================================
// QUICK STATUS CHANGE
// =============================================================================

export async function updateEventStatusAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const status = formData.get('status');
  if (!id || !status) return { error: 'Missing id or status.' };

  const updates = { status, updated_at: new Date().toISOString() };
  if (status !== 'draft') {
    updates.approved_by = admin.id;
    updates.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'update_event_status', id, { status });
  revalidateEvents();

  return { success: true, event: data };
}

// =============================================================================
// TOGGLE FEATURED
// =============================================================================

export async function toggleEventFeaturedAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const featured = formData.get('featured') === 'true';

  const { data, error } = await supabaseAdmin
    .from('events')
    .update({ is_featured: featured, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'toggle_event_featured', id, { featured });
  revalidateEvents();

  return { success: true, event: data };
}

// =============================================================================
// AI TEXT GENERATION
// =============================================================================

/**
 * Generate event text (title, description, or content) using AI.
 * @param {string} prompt - User prompt / context
 * @param {string} mode - 'title' | 'description' | 'content' | 'improve'
 * @param {string} model - Gemini model ID
 * @param {string} [existingContent] - Existing content to improve (for 'improve' mode)
 */
export async function generateEventTextAction(
  prompt,
  mode,
  model,
  existingContent
) {
  await requireAdmin();

  if (!prompt && mode !== 'improve') {
    return { error: 'Please provide a prompt or context for generation.' };
  }
  if (mode === 'improve' && !existingContent) {
    return { error: 'No existing content to improve.' };
  }

  try {
    const text = await generateText(prompt, { model, mode, existingContent });
    return { success: true, text };
  } catch (err) {
    console.error('AI text generation error:', err);
    return { error: err.message || 'Text generation failed. Try again.' };
  }
}
