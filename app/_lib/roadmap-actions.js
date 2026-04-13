/**
 * @file Roadmap server actions — CRUD, status, featured toggle, and revalidation.
 * @module roadmap-actions
 */

'use server';

import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath } from 'next/cache';
import { requireAdmin, createLogger, generateSlug } from '@/app/_lib/helpers';
import { uploadToDrive, deleteFromDrive } from '@/app/_lib/gdrive';
import { generateImage } from '@/app/_lib/image-gen';
import { generateText } from '@/app/_lib/text-gen';
import { incrementRoadmapViews } from '@/app/_lib/data-service';
const logActivity = createLogger('roadmap');

const ALLOWED_ROADMAP_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

function revalidateRoadmaps() {
  revalidatePath('/');
  revalidatePath('/roadmaps', 'layout');
  revalidatePath('/account/admin/roadmaps', 'layout');
}

// =============================================================================
// CREATE ROADMAP
// =============================================================================

export async function createRoadmapAction(formData) {
  const admin = await requireAdmin();

  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };

  const category = formData.get('category')?.trim();
  if (!category) return { error: 'Category is required.' };

  const rawPrereqs = formData.get('prerequisites') || '';
  const prerequisites = rawPrereqs
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  // Store content as HTML string
  const content = formData.get('content')?.trim() || null;

  const payload = {
    slug: generateSlug(title),
    title,
    description: formData.get('description')?.trim() || null,
    category,
    difficulty: formData.get('difficulty') || 'beginner',
    thumbnail: formData.get('thumbnail')?.trim() || null,
    estimated_duration: formData.get('estimated_duration')?.trim() || null,
    prerequisites: prerequisites.length ? prerequisites : null,
    status: formData.get('status') || 'draft',
    is_featured: formData.get('is_featured') === 'true',
    content,
    created_by: admin.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('roadmaps')
    .insert(payload)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'create_roadmap', data.id, { title });
  revalidateRoadmaps();

  return { success: true, roadmap: { ...data, ...payload } };
}

// =============================================================================
// UPDATE ROADMAP
// =============================================================================

export async function updateRoadmapAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Roadmap ID is required.' };

  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };

  const category = formData.get('category')?.trim();
  if (!category) return { error: 'Category is required.' };

  const rawPrereqs = formData.get('prerequisites') || '';
  const prerequisites = rawPrereqs
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  // Store content as HTML string
  const content = formData.get('content')?.trim() || null;

  const updates = {
    title,
    description: formData.get('description')?.trim() || null,
    category,
    difficulty: formData.get('difficulty') || 'beginner',
    thumbnail: formData.get('thumbnail')?.trim() || null,
    estimated_duration: formData.get('estimated_duration')?.trim() || null,
    prerequisites: prerequisites.length ? prerequisites : null,
    status: formData.get('status') || 'draft',
    is_featured: formData.get('is_featured') === 'true',
    content,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('roadmaps')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'update_roadmap', id, { title });
  revalidateRoadmaps();

  return { success: true, roadmap: data };
}

// =============================================================================
// DELETE ROADMAP
// =============================================================================

export async function deleteRoadmapAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Roadmap ID is required.' };

  const { error } = await supabaseAdmin.from('roadmaps').delete().eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'delete_roadmap', id, {});
  revalidateRoadmaps();

  return { success: true };
}

// =============================================================================
// QUICK STATUS CHANGE
// =============================================================================

export async function updateRoadmapStatusAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const status = formData.get('status');
  if (!id || !status) return { error: 'Missing id or status.' };

  const { data, error } = await supabaseAdmin
    .from('roadmaps')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'update_roadmap_status', id, { status });
  revalidateRoadmaps();

  return { success: true, roadmap: data };
}

// =============================================================================
// TOGGLE FEATURED
// =============================================================================

export async function toggleRoadmapFeaturedAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const featured = formData.get('featured') === 'true';

  const { data, error } = await supabaseAdmin
    .from('roadmaps')
    .update({ is_featured: featured, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'toggle_roadmap_featured', id, { featured });
  revalidateRoadmaps();

  return { success: true, roadmap: data };
}

// =============================================================================
// UPLOAD ROADMAP IMAGE (Google Drive)
// =============================================================================

export async function uploadRoadmapImageAction(formData) {
  const admin = await requireAdmin();

  const file = formData.get('file');
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'No image provided.' };
  }
  if (!ALLOWED_ROADMAP_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Image type not supported. Use JPEG, PNG, WebP, or GIF.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `roadmap_${admin.id}_${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;

  let url, fileId;
  try {
    const arrayBuffer = await file.arrayBuffer();
    ({ url, fileId } = await uploadToDrive(
      Buffer.from(arrayBuffer),
      filename,
      file.type,
      'roadmaps-images'
    ));
  } catch (err) {
    console.error('Google Drive roadmap image upload error:', err);
    return { error: 'Failed to upload image. Please try again.' };
  }

  await logActivity(admin.id, 'roadmap_image_uploaded', fileId, {
    filename: file.name,
    fileId,
  });

  return { success: true, url };
}

// =============================================================================
// DELETE ROADMAP IMAGE FROM DRIVE
// =============================================================================

export async function deleteRoadmapImageAction(url) {
  await requireAdmin();

  if (!url) return { success: true };

  // Only delete Drive-managed images
  const isProxyUrl = url.startsWith('/api/image/');
  const isLh3Url = url.includes('lh3.googleusercontent.com');
  const isDriveUrl = url.includes('drive.google.com');

  if (!isProxyUrl && !isLh3Url && !isDriveUrl) {
    return { success: true };
  }

  try {
    await deleteFromDrive(url);
    return { success: true };
  } catch (err) {
    console.error('Failed to delete Drive roadmap image:', err);
    return { error: 'Failed to delete image from Drive.' };
  }
}

// =============================================================================
// AI IMAGE GENERATION
// =============================================================================

export async function generateRoadmapImageAction(prompt, model) {
  const admin = await requireAdmin();

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return {
      error: 'Please provide a descriptive prompt (at least 3 characters).',
    };
  }

  try {
    const { buffer, mimeType } = await generateImage(prompt.trim(), model);

    const extMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const ext = extMap[mimeType] || 'png';
    const filename = `ai_roadmap_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { url, fileId } = await uploadToDrive(
      buffer,
      filename,
      mimeType,
      'roadmaps-images'
    );

    await logActivity(admin.id, 'roadmap_image_ai_generated', fileId, {
      prompt: prompt.trim().slice(0, 200),
      filename,
      fileId,
    });

    return { success: true, url };
  } catch (err) {
    console.error('AI roadmap image generation error:', err);
    return {
      error: err.message || 'Failed to generate image. Please try again.',
    };
  }
}

// =============================================================================
// AI TEXT GENERATION
// =============================================================================

export async function generateRoadmapTextAction(
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
    console.error('AI roadmap text generation error:', err);
    return { error: err.message || 'Text generation failed. Try again.' };
  }
}

// =============================================================================
// PUBLIC ENGAGEMENT
// =============================================================================

export async function incrementRoadmapViewAction(formData) {
  const id = formData.get('id');
  if (!id) return { success: false };
  return await incrementRoadmapViews(id);
}
