/**
 * @file resource actions
 * @module resource-actions
 */

'use server';

import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, createLogger } from '@/app/_lib/helpers';
import { uploadToDrive, deleteFromDrive } from '@/app/_lib/gdrive';
import { generateText } from '@/app/_lib/text-gen';
import {
  MAX_UPLOAD_BYTES,
  MEDIA_ALLOWED_MIME,
  slugify,
} from '@/app/_lib/resources/constants';
import { parseResourceFormData, parseTags } from '@/app/_lib/resources/schemas';
import {
  normalizeEmbed,
  sanitizeRichHtml,
} from '@/app/_lib/resources/embed-utils';

const logActivity = createLogger('resource');

const DRIVE_RESOURCE_SUBFOLDERS = {
  media: 'resource-media',
  thumbnail: 'resource-thumbnails',
};

const MAX_UPLOAD_MB = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));

function inferMimeTypeFromName(filename = '') {
  const ext = String(filename).split('.').pop()?.toLowerCase();
  if (!ext) return '';

  const MIME_BY_EXT = {
    pdf: 'application/pdf',
    zip: 'application/zip',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
  };

  return MIME_BY_EXT[ext] || '';
}

function revalidateResources() {
  revalidateTag('resources');
  revalidatePath('/account/admin/resources');
  revalidatePath('/account/member/resources');
  revalidatePath('/account/guest/resources');
}

function shouldPublishNow(status, scheduledFor) {
  if (status === 'published') return true;
  if (status === 'scheduled' && scheduledFor) {
    return new Date(scheduledFor).getTime() <= Date.now();
  }
  return false;
}

async function uploadFile(file, folder = 'files') {
  if (!file || typeof file.arrayBuffer !== 'function') return null;
  const reportedMimeType = String(file.type || '').trim();
  const inferredMimeType = inferMimeTypeFromName(file.name);
  const uploadMimeType = [reportedMimeType, inferredMimeType].find((m) =>
    MEDIA_ALLOWED_MIME.includes(m)
  );

  if (!uploadMimeType) {
    throw new Error('Unsupported file type.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File size exceeds ${MAX_UPLOAD_MB}MB limit.`);
  }

  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase();
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from('resources')
    .upload(path, body, {
      contentType: uploadMimeType,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabaseAdmin.storage.from('resources').getPublicUrl(path);
  return data?.publicUrl || null;
}

async function upsertTags(resourceId, rawTags = []) {
  const tags = parseTags(rawTags);

  await supabaseAdmin
    .from('resource_tag_map')
    .delete()
    .eq('resource_id', resourceId);

  if (!tags.length) return;

  const prepared = tags.map((name) => ({
    name,
    slug: slugify(name) || name.toLowerCase(),
  }));

  const { error: tagInsertError } = await supabaseAdmin
    .from('resource_tags')
    .upsert(prepared, { onConflict: 'slug' });

  if (tagInsertError) throw new Error(tagInsertError.message);

  const { data: dbTags, error: tagsFetchError } = await supabaseAdmin
    .from('resource_tags')
    .select('id,slug')
    .in(
      'slug',
      prepared.map((t) => t.slug)
    );

  if (tagsFetchError) throw new Error(tagsFetchError.message);

  if (!dbTags?.length) return;

  const maps = dbTags.map((t) => ({ resource_id: resourceId, tag_id: t.id }));
  const { error: mapError } = await supabaseAdmin
    .from('resource_tag_map')
    .upsert(maps, { onConflict: 'resource_id,tag_id' });

  if (mapError) throw new Error(mapError.message);
}

async function resolveCategoryName(categoryId) {
  if (!categoryId) return 'Other';
  const { data } = await supabaseAdmin
    .from('resource_categories')
    .select('name')
    .eq('id', categoryId)
    .maybeSingle();
  return data?.name || 'Other';
}

async function buildPayload(formData) {
  const parsed = parseResourceFormData(formData);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues?.[0]?.message ||
        'Invalid resource payload. Please check your fields.',
    };
  }

  const data = parsed.data;
  const mediaFile = formData.get('media_file');
  const thumbFile = formData.get('thumbnail_file');
  const mediaMimeType = String(formData.get('media_mime_type') || '').trim();

  const uploadedMediaUrl =
    mediaFile && mediaFile.size ? await uploadFile(mediaFile, 'media') : null;
  const uploadedThumbUrl =
    thumbFile && thumbFile.size ? await uploadFile(thumbFile, 'thumb') : null;

  const categoryName = await resolveCategoryName(data.category_id);

  const payload = {
    title: data.title,
    description: data.description || null,
    // Legacy non-null fields retained in current schema
    url:
      data.embed_url ||
      data.file_url ||
      uploadedMediaUrl ||
      uploadedThumbUrl ||
      data.thumbnail ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://neupc.vercel.app'}/account`,
    resource_type: data.resource_type,
    category: categoryName,
    tags: data.tags.length ? data.tags : null,
    content: null,
    embed_url: null,
    file_url: data.file_url || null,
    thumbnail: uploadedThumbUrl || data.thumbnail || null,
    category_id: data.category_id || null,
    visibility: data.visibility,
    status: data.status,
    is_pinned: data.is_pinned,
    scheduled_for: data.scheduled_for || null,
    published_at: shouldPublishNow(data.status, data.scheduled_for)
      ? new Date().toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  if (data.resource_type === 'rich_text') {
    payload.content = {
      html: sanitizeRichHtml(data.content || ''),
    };
  }

  if (
    ['youtube', 'facebook_post', 'linkedin_post', 'external_link'].includes(
      data.resource_type
    ) &&
    data.embed_url
  ) {
    const normalized = normalizeEmbed(data.resource_type, data.embed_url);
    if (!normalized.ok) {
      return { error: normalized.error || 'Invalid embed URL.' };
    }
    payload.embed_url = normalized.url;
    payload.content = {
      ...(payload.content || {}),
      provider: normalized.provider,
      embedUrl: normalized.embedUrl,
      videoId: normalized.videoId || null,
    };
  }

  if (uploadedMediaUrl) {
    payload.file_url = uploadedMediaUrl;
    payload.content = {
      ...(payload.content || {}),
      uploadedMediaUrl,
      uploadedMediaMimeType: mediaFile?.type || mediaMimeType || null,
    };
  }

  if (!uploadedMediaUrl && mediaMimeType) {
    payload.content = {
      ...(payload.content || {}),
      uploadedMediaMimeType: mediaMimeType,
    };
  }

  return { payload, tags: data.tags };
}

// =============================================================================
// UPLOAD RESOURCE MEDIA TO GOOGLE DRIVE
// =============================================================================

export async function uploadResourceMediaAction(formData) {
  const admin = await requireAdmin();

  const file = formData.get('file');
  const kind = String(formData.get('kind') || 'media');

  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'No file provided.' };
  }
  const reportedMimeType = String(file.type || '').trim();
  const inferredMimeType = inferMimeTypeFromName(file.name);
  const detectedMimeType = [reportedMimeType, inferredMimeType].find((m) =>
    MEDIA_ALLOWED_MIME.includes(m)
  );

  if (!detectedMimeType) {
    return { error: 'File type is not supported.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `File size exceeds ${MAX_UPLOAD_MB}MB limit.` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const filename = `resources_${admin.id}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

  let url, fileId;
  try {
    const arrayBuffer = await file.arrayBuffer();
    ({ url, fileId } = await uploadToDrive(
      Buffer.from(arrayBuffer),
      filename,
      detectedMimeType,
      DRIVE_RESOURCE_SUBFOLDERS[kind] || DRIVE_RESOURCE_SUBFOLDERS.media
    ));
  } catch (err) {
    console.error('Google Drive resource media upload error:', err);
    return { error: 'Failed to upload file. Please try again.' };
  }

  await logActivity(admin.id, 'resource_media_uploaded', fileId, {
    filename: file.name,
    fileId,
    kind,
  });

  return { success: true, url, mimeType: detectedMimeType };
}

// =============================================================================
// DELETE RESOURCE MEDIA FROM GOOGLE DRIVE
// =============================================================================

export async function deleteResourceMediaAction(url) {
  await requireAdmin();

  if (!url) return { success: true };

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
    console.error('Failed to delete resource media from Drive:', err);
    return { error: 'Failed to delete file from Drive.' };
  }
}

// =============================================================================
// GENERATE RESOURCE TEXT (AI)
// =============================================================================

export async function generateResourceTextAction(
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
    console.error('AI resource text generation error:', err);
    return { error: err.message || 'Text generation failed. Try again.' };
  }
}

// =============================================================================
// CREATE RESOURCE
// =============================================================================

export async function createResourceAction(formData) {
  const admin = await requireAdmin();

  let built;
  try {
    built = await buildPayload(formData);
  } catch (error) {
    return { error: error.message || 'Failed to upload media.' };
  }

  if (built.error) return { error: built.error };

  const payload = {
    ...built.payload,
    created_by: admin.id,
  };

  const { data, error } = await supabaseAdmin
    .from('resources')
    .insert([payload])
    .select()
    .single();

  if (error) return { error: error.message };

  try {
    await upsertTags(data.id, built.tags);
  } catch (tagError) {
    return { error: tagError.message };
  }

  await logActivity(admin.id, 'resource_created', data.id, {
    title: payload.title,
    resource_type: payload.resource_type,
  });
  revalidateResources();
  return { success: true, id: data.id };
}

// =============================================================================
// UPDATE RESOURCE
// =============================================================================

export async function updateResourceAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Resource ID is required.' };

  let built;
  try {
    built = await buildPayload(formData);
  } catch (error) {
    return { error: error.message || 'Failed to upload media.' };
  }

  if (built.error) return { error: built.error };

  const payload = built.payload;

  const { error } = await supabaseAdmin
    .from('resources')
    .update(payload)
    .eq('id', id);

  if (error) return { error: error.message };

  try {
    await upsertTags(id, built.tags);
  } catch (tagError) {
    return { error: tagError.message };
  }

  await logActivity(admin.id, 'resource_updated', id, {
    title: payload.title,
    resource_type: payload.resource_type,
  });
  revalidateResources();
  return { success: true };
}

// =============================================================================
// DELETE RESOURCE
// =============================================================================

export async function deleteResourceAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Resource ID is required.' };

  const { error } = await supabaseAdmin.from('resources').delete().eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'resource_deleted', id, {});
  revalidateResources();
  return { success: true };
}

// =============================================================================
// TOGGLE PINNED (Backward-compatible export)
// =============================================================================

export async function toggleResourceFeaturedAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const featured = formData.get('featured') === 'true';
  if (!id) return { error: 'Resource ID is required.' };

  const { error } = await supabaseAdmin
    .from('resources')
    .update({ is_pinned: featured, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(
    admin.id,
    featured ? 'resource_pinned' : 'resource_unpinned',
    id,
    {}
  );
  revalidateResources();
  return { success: true };
}

// =============================================================================
// TOGGLE VISIBILITY (Backward-compatible export name)
// =============================================================================

export async function toggleResourceFreeAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const isPublic = formData.get('is_free') === 'true';
  if (!id) return { error: 'Resource ID is required.' };

  const { error } = await supabaseAdmin
    .from('resources')
    .update({
      visibility: isPublic ? 'public' : 'members',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'resource_visibility_toggled', id, {
    visibility: isPublic ? 'public' : 'members',
  });
  revalidateResources();
  return { success: true };
}

export async function createResourceCategoryAction(formData) {
  const admin = await requireAdmin();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  if (!name) return { error: 'Category name is required.' };

  const slug = slugify(name);
  const { data, error } = await supabaseAdmin
    .from('resource_categories')
    .upsert(
      { name, slug, description: description || null },
      { onConflict: 'slug' }
    )
    .select('id,name,slug,description')
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'resource_category_upserted', data.id, {
    name,
    description,
  });
  revalidateResources();
  return { success: true, category: data };
}
