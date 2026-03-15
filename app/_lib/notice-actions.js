/**
 * @file notice actions
 * @module notice-actions
 */

'use server';

import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, createLogger } from '@/app/_lib/helpers';

const logActivity = createLogger('notice');

function revalidate() {
  revalidateTag('notices');
  revalidateTag('homepage');
  revalidatePath('/account/admin/notices');
  revalidatePath('/notices');
  revalidatePath('/account');
  revalidatePath('/');
}

// =============================================================================
// CREATE NOTICE
// =============================================================================

export async function createNoticeAction(formData) {
  const admin = await requireAdmin();

  const title = formData.get('title')?.trim();
  const content = formData.get('content')?.trim();
  if (!title) return { error: 'Title is required.' };
  if (!content) return { error: 'Content is required.' };

  const rawAudience = formData.get('target_audience') || '';
  const target_audience = rawAudience
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);

  const rawAttachments = formData.get('attachments') || '';
  const attachments = rawAttachments
    .split('\n')
    .map((a) => a.trim())
    .filter(Boolean);

  const payload = {
    title,
    content,
    notice_type: formData.get('notice_type') || 'general',
    priority: formData.get('priority') || 'medium',
    target_audience: target_audience.length ? target_audience : null,
    is_pinned: formData.get('is_pinned') === 'true',
    expires_at: formData.get('expires_at') || null,
    attachments: attachments.length ? attachments : null,
    created_by: admin.id,
  };

  const { data, error } = await supabaseAdmin
    .from('notices')
    .insert([payload])
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'notice_created', data.id, { title });
  revalidate();
  return { success: true, id: data.id };
}

// =============================================================================
// UPDATE NOTICE
// =============================================================================

export async function updateNoticeAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Notice ID is required.' };

  const title = formData.get('title')?.trim();
  const content = formData.get('content')?.trim();
  if (!title) return { error: 'Title is required.' };
  if (!content) return { error: 'Content is required.' };

  const rawAudience = formData.get('target_audience') || '';
  const target_audience = rawAudience
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);

  const rawAttachments = formData.get('attachments') || '';
  const attachments = rawAttachments
    .split('\n')
    .map((a) => a.trim())
    .filter(Boolean);

  const payload = {
    title,
    content,
    notice_type: formData.get('notice_type') || 'general',
    priority: formData.get('priority') || 'medium',
    target_audience: target_audience.length ? target_audience : null,
    is_pinned: formData.get('is_pinned') === 'true',
    expires_at: formData.get('expires_at') || null,
    attachments: attachments.length ? attachments : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('notices')
    .update(payload)
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'notice_updated', id, { title });
  revalidate();
  return { success: true };
}

// =============================================================================
// DELETE NOTICE
// =============================================================================

export async function deleteNoticeAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Notice ID is required.' };

  const { error } = await supabaseAdmin.from('notices').delete().eq('id', id);
  if (error) return { error: error.message };

  await logActivity(admin.id, 'notice_deleted', id, {});
  revalidate();
  return { success: true };
}

// =============================================================================
// TOGGLE PIN
// =============================================================================

export async function toggleNoticePinAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const pinned = formData.get('pinned') === 'true';
  if (!id) return { error: 'Notice ID is required.' };

  const { error } = await supabaseAdmin
    .from('notices')
    .update({ is_pinned: pinned, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(
    admin.id,
    pinned ? 'notice_pinned' : 'notice_unpinned',
    id,
    {}
  );
  revalidate();
  return { success: true };
}
