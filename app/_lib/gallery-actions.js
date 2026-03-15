/**
 * @file gallery actions
 * @module gallery-actions
 */

'use server';

import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, createLogger } from '@/app/_lib/helpers';
import { uploadToDrive, deleteFromDrive } from '@/app/_lib/gdrive';

const logActivity = createLogger('gallery');

function revalidate() {
  revalidateTag('gallery');
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/account/admin/gallery');
  revalidatePath('/gallery');
  revalidatePath('/events');
  revalidatePath('/');
}

// =============================================================================
// ADD GALLERY ITEM
// =============================================================================

export async function addGalleryItemAction(formData) {
  const admin = await requireAdmin();

  const url = formData.get('url')?.trim();
  if (!url) return { error: 'URL is required.' };

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const payload = {
    url,
    type: formData.get('type') || 'image',
    caption: formData.get('caption')?.trim() || null,
    category: formData.get('category')?.trim() || null,
    event_id: formData.get('event_id') || null,
    tags: tags.length ? tags : null,
    display_order: formData.get('display_order')
      ? parseInt(formData.get('display_order'), 10)
      : 0,
    is_featured: formData.get('is_featured') === 'true',
    uploaded_by: admin.id,
  };

  const { data, error } = await supabaseAdmin
    .from('gallery_items')
    .insert([payload])
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'gallery_item_added', data.id, { url });
  revalidate();
  return { success: true, id: data.id };
}

// =============================================================================
// BULK ADD GALLERY ITEMS
// =============================================================================

export async function bulkAddGalleryItemsAction(formData) {
  const admin = await requireAdmin();

  const rawUrls = formData.get('urls') || '';
  const urls = rawUrls
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  if (urls.length === 0) return { error: 'No URLs provided.' };
  if (urls.length > 50) return { error: 'Maximum 50 items at a time.' };

  const type = formData.get('type') || 'image';
  const category = formData.get('category')?.trim() || null;
  const event_id = formData.get('event_id') || null;

  const payload = urls.map((url, i) => ({
    url,
    type,
    category,
    event_id,
    display_order: i,
    uploaded_by: admin.id,
  }));

  const { data, error } = await supabaseAdmin
    .from('gallery_items')
    .insert(payload)
    .select();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'gallery_bulk_added', null, {
    count: urls.length,
  });
  revalidate();
  return { success: true, count: data.length };
}

// =============================================================================
// UPDATE GALLERY ITEM
// =============================================================================

export async function updateGalleryItemAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Item ID is required.' };

  const url = formData.get('url')?.trim();
  if (!url) return { error: 'URL is required.' };

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const payload = {
    url,
    type: formData.get('type') || 'image',
    caption: formData.get('caption')?.trim() || null,
    category: formData.get('category')?.trim() || null,
    event_id: formData.get('event_id') || null,
    tags: tags.length ? tags : null,
    display_order: formData.get('display_order')
      ? parseInt(formData.get('display_order'), 10)
      : 0,
    is_featured: formData.get('is_featured') === 'true',
  };

  const { error } = await supabaseAdmin
    .from('gallery_items')
    .update(payload)
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'gallery_item_updated', id, {});
  revalidate();
  return { success: true };
}

// =============================================================================
// DELETE GALLERY ITEM
// =============================================================================

export async function deleteGalleryItemAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Item ID is required.' };

  // Fetch the item URL before deletion so we can clean up from Drive
  const { data: item } = await supabaseAdmin
    .from('gallery_items')
    .select('url')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin
    .from('gallery_items')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  // Delete from Google Drive (best-effort)
  if (item?.url) {
    deleteFromDrive(item.url).catch(() => {});
  }

  await logActivity(admin.id, 'gallery_item_deleted', id, {});
  revalidate();
  return { success: true };
}

// =============================================================================
// REORDER EVENT_GALLERY ITEMS
// =============================================================================

export async function reorderEventGalleryAction(orderedIds) {
  const admin = await requireAdmin();

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { error: 'No items provided.' };
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabaseAdmin
        .from('event_gallery')
        .update({ display_order: index })
        .eq('id', id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed) return { error: failed.error.message };

  await logActivity(admin.id, 'event_gallery_reordered', null, {
    count: orderedIds.length,
  });

  revalidateTag('gallery');
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/gallery');
  revalidatePath('/events');
  revalidatePath('/account/admin/gallery');
  revalidatePath('/');
  return { success: true };
}

// =============================================================================
// REORDER GALLERY ITEMS (bulk display_order update)
// =============================================================================

/**
 * Accepts an ordered array of item IDs and writes display_order 0, 1, 2 … to DB.
 * @param {string[]} orderedIds
 */
export async function reorderGalleryItemsAction(orderedIds) {
  const admin = await requireAdmin();

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { error: 'No items provided.' };
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabaseAdmin
        .from('gallery_items')
        .update({ display_order: index })
        .eq('id', id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed) return { error: failed.error.message };

  await logActivity(admin.id, 'gallery_items_reordered', null, {
    count: orderedIds.length,
  });

  revalidate();
  return { success: true };
}

// =============================================================================
// TOGGLE FEATURED
// =============================================================================

export async function toggleGalleryFeaturedAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const featured = formData.get('featured') === 'true';
  if (!id) return { error: 'Item ID is required.' };

  const { error } = await supabaseAdmin
    .from('gallery_items')
    .update({ is_featured: featured })
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(
    admin.id,
    featured ? 'gallery_item_featured' : 'gallery_item_unfeatured',
    id,
    {}
  );
  revalidate();
  return { success: true };
}

// =============================================================================
// UPLOAD EVENT GALLERY FILES (Drive → event_gallery)
// =============================================================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadEventGalleryFilesAction(formData) {
  const admin = await requireAdmin();

  const event_id = formData.get('event_id') || null;
  const files = formData.getAll('files');

  if (!files.length || !(files[0] instanceof File)) {
    return { error: 'No files provided.' };
  }
  if (files.length > 30) {
    return { error: 'Maximum 30 files per upload.' };
  }

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!(file instanceof File) || file.size === 0) {
      results.push({ name: file?.name ?? `file_${i}`, error: 'Empty file.' });
      continue;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      results.push({ name: file.name, error: 'Unsupported type.' });
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      results.push({ name: file.name, error: 'File exceeds 10 MB limit.' });
      continue;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `gallery_${admin.id}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const caption = formData.get(`caption_${i}`)?.trim() || null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { url } = await uploadToDrive(
        Buffer.from(arrayBuffer),
        filename,
        file.type,
        'event-images'
      );

      const { error: dbError } = await supabaseAdmin
        .from('event_gallery')
        .insert({
          url,
          type: 'image',
          caption,
          event_id,
          display_order: i,
          uploaded_by: admin.id,
        });

      if (dbError) {
        results.push({ name: file.name, error: dbError.message });
      } else {
        results.push({ name: file.name, url, success: true });
      }
    } catch (err) {
      console.error('Gallery drive upload error:', err);
      results.push({ name: file.name, error: err.message || 'Upload failed.' });
    }
  }

  await logActivity(admin.id, 'gallery_files_uploaded', null, {
    event_id,
    total: files.length,
    succeeded: results.filter((r) => r.success).length,
  });

  revalidate();
  revalidateTag('events');
  return {
    results,
    count: results.filter((r) => r.success).length,
    failed: results.filter((r) => r.error).length,
  };
}

// =============================================================================
// UPDATE EVENT_GALLERY ITEM
// =============================================================================

export async function updateEventGalleryItemAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Item ID is required.' };

  const url = formData.get('url')?.trim();
  if (!url) return { error: 'URL is required.' };

  const { error } = await supabaseAdmin
    .from('event_gallery')
    .update({
      url,
      type: formData.get('type') || 'image',
      caption: formData.get('caption')?.trim() || null,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'event_gallery_item_updated', id, {});
  revalidate();
  revalidateTag('events');
  return { success: true };
}

// =============================================================================
// DELETE EVENT_GALLERY ITEM
// =============================================================================

export async function deleteEventGalleryItemAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Item ID is required.' };

  // Fetch the item URL before deletion so we can clean up from Drive
  const { data: item } = await supabaseAdmin
    .from('event_gallery')
    .select('url')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin
    .from('event_gallery')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  // Delete from Google Drive (best-effort)
  if (item?.url) {
    deleteFromDrive(item.url).catch(() => {});
  }

  await logActivity(admin.id, 'event_gallery_item_deleted', id, {});
  revalidate();
  revalidateTag('events');
  return { success: true };
}
