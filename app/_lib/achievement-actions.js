/**
 * @file achievement actions
 * @module achievement-actions
 */

'use server';

import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, createLogger } from '@/app/_lib/helpers';
import { uploadToDrive, deleteFromDrive } from '@/app/_lib/gdrive';

const logActivity = createLogger('achievement');

function revalidate() {
  revalidateTag('achievements');
  revalidateTag('participations');
  revalidateTag('homepage');
  revalidatePath('/account/admin/achievements');
  revalidatePath('/achievements');
  revalidatePath('/');
}

// =============================================================================
// CREATE ACHIEVEMENT
// =============================================================================

export async function createAchievementAction(formData) {
  const admin = await requireAdmin();

  const title = formData.get('title')?.trim();
  const contest_name = formData.get('contest_name')?.trim();
  const result = formData.get('result')?.trim();
  const year = formData.get('year');

  if (!title) return { error: 'Title is required.' };
  if (!contest_name) return { error: 'Contest / event name is required.' };
  if (!result) return { error: 'Result is required.' };
  if (!year) return { error: 'Year is required.' };

  const rawParticipants = formData.get('participants') || '';
  const participants = rawParticipants
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const payload = {
    title,
    contest_name,
    contest_url: formData.get('contest_url')?.trim() || null,
    result,
    year: parseInt(year, 10),
    category: formData.get('category')?.trim() || null,
    description: formData.get('description')?.trim() || null,
    achievement_date: formData.get('achievement_date') || null,
    participants: participants.length ? participants : null,
    is_team: formData.get('is_team') === 'true',
    team_name: formData.get('team_name')?.trim() || null,
    platform: formData.get('platform')?.trim() || null,
    profile_url: formData.get('profile_url')?.trim() || null,
    is_featured: formData.get('is_featured') === 'true',
    created_by: admin.id,
  };

  const { data, error } = await supabaseAdmin
    .from('achievements')
    .insert([payload])
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'achievement_created', data.id, { title });
  revalidate();
  return { success: true, id: data.id };
}

// =============================================================================
// UPDATE ACHIEVEMENT
// =============================================================================

export async function updateAchievementAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Achievement ID is required.' };

  const title = formData.get('title')?.trim();
  const contest_name = formData.get('contest_name')?.trim();
  const result = formData.get('result')?.trim();
  const year = formData.get('year');

  if (!title) return { error: 'Title is required.' };
  if (!contest_name) return { error: 'Contest / event name is required.' };
  if (!result) return { error: 'Result is required.' };
  if (!year) return { error: 'Year is required.' };

  const rawParticipants = formData.get('participants') || '';
  const participants = rawParticipants
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const payload = {
    title,
    contest_name,
    contest_url: formData.get('contest_url')?.trim() || null,
    result,
    year: parseInt(year, 10),
    category: formData.get('category')?.trim() || null,
    description: formData.get('description')?.trim() || null,
    achievement_date: formData.get('achievement_date') || null,
    participants: participants.length ? participants : null,
    is_team: formData.get('is_team') === 'true',
    team_name: formData.get('team_name')?.trim() || null,
    platform: formData.get('platform')?.trim() || null,
    profile_url: formData.get('profile_url')?.trim() || null,
    is_featured: formData.get('is_featured') === 'true',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('achievements')
    .update(payload)
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'achievement_updated', id, { title });
  revalidate();
  return { success: true };
}

// =============================================================================
// DELETE ACHIEVEMENT
// =============================================================================

export async function deleteAchievementAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Achievement ID is required.' };

  // Fetch Drive files before deleting the row
  const { data: row } = await supabaseAdmin
    .from('achievements')
    .select('featured_photo, gallery_images')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin
    .from('achievements')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  // Delete Drive files (non-fatal)
  const driveDeletes = [];
  if (row?.featured_photo?.id) driveDeletes.push(row.featured_photo.id);
  for (const img of row?.gallery_images ?? []) {
    if (img?.id) driveDeletes.push(img.id);
  }
  await Promise.allSettled(driveDeletes.map((fid) => deleteFromDrive(fid)));

  await logActivity(admin.id, 'achievement_deleted', id, {});
  revalidate();
  return { success: true };
}

// =============================================================================
// TOGGLE FEATURED
// =============================================================================

export async function toggleAchievementFeaturedAction(formData) {
  await requireAdmin();

  const id = formData.get('id');
  const featured = formData.get('featured') === 'true';
  if (!id) return { error: 'Achievement ID is required.' };

  const { error } = await supabaseAdmin
    .from('achievements')
    .update({ is_featured: featured, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidate();
  return { success: true };
}

// =============================================================================
// ADD MEMBER TO ACHIEVEMENT
// =============================================================================

export async function addAchievementMemberAction(formData) {
  const admin = await requireAdmin();

  const achievement_id = formData.get('achievement_id');
  const user_id = formData.get('user_id');
  if (!achievement_id || !user_id) return { error: 'Missing IDs.' };

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from('member_achievements')
    .select('id')
    .eq('achievement_id', achievement_id)
    .eq('user_id', user_id)
    .maybeSingle();

  if (existing) return { error: 'Member already linked to this achievement.' };

  const { error } = await supabaseAdmin.from('member_achievements').insert([
    {
      achievement_id,
      user_id,
      position: formData.get('position')?.trim() || null,
    },
  ]);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'achievement_member_added', achievement_id, {
    user_id,
  });
  revalidate();
  return { success: true };
}

// =============================================================================
// REMOVE MEMBER FROM ACHIEVEMENT
// =============================================================================

export async function removeAchievementMemberAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id'); // member_achievements.id
  if (!id) return { error: 'Record ID is required.' };

  const { error } = await supabaseAdmin
    .from('member_achievements')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'achievement_member_removed', id, {});
  revalidate();
  return { success: true };
}

// =============================================================================
// GALLERY – LIST
// =============================================================================

export async function getAchievementGalleryAction(achievementId) {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from('achievements')
    .select('gallery_images')
    .eq('id', achievementId)
    .single();

  if (error) return { error: error.message };
  return { files: data?.gallery_images ?? [] };
}

// =============================================================================
// GALLERY – UPLOAD
// =============================================================================

export async function uploadAchievementGalleryImageAction(formData) {
  const admin = await requireAdmin();

  const achievementId = formData.get('achievement_id');
  const file = formData.get('file');

  if (!achievementId) return { error: 'Achievement ID is required.' };
  if (!file || typeof file === 'string') return { error: 'No file provided.' };

  if (!file.type?.startsWith('image/')) {
    return { error: 'Only image files are allowed.' };
  }

  // Read current gallery_images array
  const { data: achievement, error: fetchErr } = await supabaseAdmin
    .from('achievements')
    .select('gallery_images')
    .eq('id', achievementId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name?.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `achievement_${achievementId.slice(0, 8)}_${Date.now()}.${ext}`;

    // All achievement gallery images go into the shared 'achievements' subfolder
    const { url, fileId } = await uploadToDrive(
      buffer,
      filename,
      file.type,
      'achievements'
    );

    // Append to the achievement's gallery_images array in DB
    const current = achievement?.gallery_images ?? [];
    const updated = [
      ...current,
      {
        id: fileId,
        name: file.name,
        url,
        uploadedAt: new Date().toISOString(),
      },
    ];

    const { error: updateErr } = await supabaseAdmin
      .from('achievements')
      .update({ gallery_images: updated })
      .eq('id', achievementId);

    if (updateErr) return { error: updateErr.message };

    await logActivity(admin.id, 'achievement_gallery_upload', achievementId, {
      fileId,
    });
    revalidate();
    return {
      success: true,
      url,
      fileId,
      name: file.name,
      uploadedAt: updated.at(-1).uploadedAt,
    };
  } catch (err) {
    return { error: err.message };
  }
}

// =============================================================================
// GALLERY – DELETE
// =============================================================================

export async function deleteAchievementGalleryImageAction(formData) {
  const admin = await requireAdmin();

  const achievementId = formData.get('achievement_id');
  const fileId = formData.get('file_id');

  if (!achievementId || !fileId) return { error: 'Missing IDs.' };

  // Read current list and remove the entry
  const { data: achievement, error: fetchErr } = await supabaseAdmin
    .from('achievements')
    .select('gallery_images')
    .eq('id', achievementId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  const updated = (achievement?.gallery_images ?? []).filter(
    (f) => f.id !== fileId
  );

  const { error: updateErr } = await supabaseAdmin
    .from('achievements')
    .update({ gallery_images: updated })
    .eq('id', achievementId);

  if (updateErr) return { error: updateErr.message };

  try {
    await deleteFromDrive(fileId);
  } catch (err) {
    // Non-fatal: file may already be removed from Drive
    console.warn('Drive delete warning:', err.message);
  }

  await logActivity(admin.id, 'achievement_gallery_delete', achievementId, {
    fileId,
  });
  revalidate();
  return { success: true };
}

// =============================================================================
// PARTICIPATION RECORDS – LIST ALL
// =============================================================================

export async function getParticipationRecordsAction() {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from('participation_records')
    .select(
      `id, contest_name, contest_url, category, year, participation_date,
       result, is_team, team_name, team_members, photos, featured_photo, notes, created_at,
       user_id, users!participation_records_user_id_fkey(id, full_name, avatar_url),
       achievement_id, achievements(id, title, result)`
    )
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { records: data ?? [] };
}

// =============================================================================
// PARTICIPATION RECORDS – CREATE
// =============================================================================

export async function createParticipationRecordAction(formData) {
  const admin = await requireAdmin();

  const user_id = formData.get('user_id')?.trim() || null;
  const contest_name = formData.get('contest_name')?.trim();
  const year = formData.get('year');

  if (!contest_name) return { error: 'Contest / event name is required.' };
  if (!year) return { error: 'Year is required.' };

  const rawAchievementId = formData.get('achievement_id') || '';

  const payload = {
    user_id,
    contest_name,
    contest_url: formData.get('contest_url')?.trim() || null,
    category: formData.get('category')?.trim() || null,
    year: parseInt(year, 10),
    participation_date: formData.get('participation_date') || null,
    result: formData.get('result')?.trim() || null,
    is_team: formData.get('is_team') === 'true',
    team_name: formData.get('team_name')?.trim() || null,
    team_members: JSON.parse(formData.get('team_members') || '[]'),
    achievement_id: rawAchievementId || null,
    notes: formData.get('notes')?.trim() || null,
    created_by: admin.id,
  };

  const { data, error } = await supabaseAdmin
    .from('participation_records')
    .insert([payload])
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'participation_created', data.id, {
    user_id,
    contest_name,
  });
  revalidate();
  return { success: true, id: data.id };
}

// =============================================================================
// PARTICIPATION RECORDS – UPDATE
// =============================================================================

export async function updateParticipationRecordAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Record ID is required.' };

  const user_id = formData.get('user_id')?.trim() || null;
  const contest_name = formData.get('contest_name')?.trim();
  const year = formData.get('year');

  if (!contest_name) return { error: 'Contest / event name is required.' };
  if (!year) return { error: 'Year is required.' };

  const rawAchievementId = formData.get('achievement_id') || '';

  const payload = {
    user_id,
    contest_name,
    contest_url: formData.get('contest_url')?.trim() || null,
    category: formData.get('category')?.trim() || null,
    year: parseInt(year, 10),
    participation_date: formData.get('participation_date') || null,
    result: formData.get('result')?.trim() || null,
    is_team: formData.get('is_team') === 'true',
    team_name: formData.get('team_name')?.trim() || null,
    team_members: JSON.parse(formData.get('team_members') || '[]'),
    achievement_id: rawAchievementId || null,
    notes: formData.get('notes')?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('participation_records')
    .update(payload)
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'participation_updated', id, { contest_name });
  revalidate();
  return { success: true };
}

// =============================================================================
// PARTICIPATION RECORDS – DELETE
// =============================================================================

export async function deleteParticipationRecordAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Record ID is required.' };

  // Fetch Drive files before deleting the row
  const { data: row } = await supabaseAdmin
    .from('participation_records')
    .select('featured_photo, photos')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin
    .from('participation_records')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  // Delete Drive files (non-fatal)
  const driveDeletes = [];
  if (row?.featured_photo?.id) driveDeletes.push(row.featured_photo.id);
  for (const photo of row?.photos ?? []) {
    if (photo?.id) driveDeletes.push(photo.id);
  }
  await Promise.allSettled(driveDeletes.map((fid) => deleteFromDrive(fid)));

  await logActivity(admin.id, 'participation_deleted', id, {});
  revalidate();
  return { success: true };
}

// =============================================================================
// PARTICIPATION PHOTOS – LIST
// =============================================================================

export async function getParticipationPhotosAction(recordId) {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from('participation_records')
    .select('photos')
    .eq('id', recordId)
    .single();

  if (error) return { error: error.message };
  return { files: data?.photos ?? [] };
}

// =============================================================================
// PARTICIPATION PHOTOS – UPLOAD
// =============================================================================

export async function uploadParticipationPhotoAction(formData) {
  const admin = await requireAdmin();

  const recordId = formData.get('record_id');
  const file = formData.get('file');

  if (!recordId) return { error: 'Participation record ID is required.' };
  if (!file || typeof file === 'string') return { error: 'No file provided.' };

  if (!file.type?.startsWith('image/')) {
    return { error: 'Only image files are allowed.' };
  }

  const { data: rec, error: fetchErr } = await supabaseAdmin
    .from('participation_records')
    .select('photos')
    .eq('id', recordId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name?.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `participation_${recordId.slice(0, 8)}_${Date.now()}.${ext}`;

    const { url, fileId } = await uploadToDrive(
      buffer,
      filename,
      file.type,
      'participations'
    );

    const current = rec?.photos ?? [];
    const updated = [
      ...current,
      {
        id: fileId,
        name: file.name,
        url,
        uploadedAt: new Date().toISOString(),
      },
    ];

    const { error: updateErr } = await supabaseAdmin
      .from('participation_records')
      .update({ photos: updated })
      .eq('id', recordId);

    if (updateErr) return { error: updateErr.message };

    await logActivity(admin.id, 'participation_photo_upload', recordId, {
      fileId,
    });
    revalidate();
    return {
      success: true,
      url,
      fileId,
      name: file.name,
      uploadedAt: updated.at(-1).uploadedAt,
    };
  } catch (err) {
    return { error: err.message };
  }
}

// =============================================================================
// PARTICIPATION PHOTOS – DELETE
// =============================================================================

export async function deleteParticipationPhotoAction(formData) {
  const admin = await requireAdmin();

  const recordId = formData.get('record_id');
  const fileId = formData.get('file_id');

  if (!recordId || !fileId) return { error: 'Missing IDs.' };

  const { data: rec, error: fetchErr } = await supabaseAdmin
    .from('participation_records')
    .select('photos')
    .eq('id', recordId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  const updated = (rec?.photos ?? []).filter((f) => f.id !== fileId);

  const { error: updateErr } = await supabaseAdmin
    .from('participation_records')
    .update({ photos: updated })
    .eq('id', recordId);

  if (updateErr) return { error: updateErr.message };

  try {
    await deleteFromDrive(fileId);
  } catch (err) {
    console.warn('Drive delete warning:', err.message);
  }

  await logActivity(admin.id, 'participation_photo_delete', recordId, {
    fileId,
  });
  revalidate();
  return { success: true };
}

// =============================================================================
// ACHIEVEMENT FEATURED PHOTO – UPLOAD
// =============================================================================

export async function uploadAchievementFeaturedPhotoAction(formData) {
  const admin = await requireAdmin();

  const achievementId = formData.get('achievement_id');
  const file = formData.get('file');

  if (!achievementId) return { error: 'Achievement ID is required.' };
  if (!file || typeof file === 'string') return { error: 'No file provided.' };
  if (!file.type?.startsWith('image/'))
    return { error: 'Only image files are allowed.' };

  const { data: existing } = await supabaseAdmin
    .from('achievements')
    .select('featured_photo')
    .eq('id', achievementId)
    .single();

  if (existing?.featured_photo?.id) {
    try {
      await deleteFromDrive(existing.featured_photo.id);
    } catch (_) {}
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name?.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `achievement_featured_${achievementId.slice(0, 8)}_${Date.now()}.${ext}`;

    const { url, fileId } = await uploadToDrive(
      buffer,
      filename,
      file.type,
      'achievements'
    );
    const featured_photo = { id: fileId, name: file.name, url };

    const { error: updateErr } = await supabaseAdmin
      .from('achievements')
      .update({ featured_photo })
      .eq('id', achievementId);

    if (updateErr) return { error: updateErr.message };

    await logActivity(
      admin.id,
      'achievement_featured_photo_upload',
      achievementId,
      { fileId }
    );
    revalidate();
    return { success: true, ...featured_photo };
  } catch (err) {
    return { error: err.message };
  }
}

// =============================================================================
// ACHIEVEMENT FEATURED PHOTO – DELETE
// =============================================================================

export async function deleteAchievementFeaturedPhotoAction(formData) {
  const admin = await requireAdmin();

  const achievementId = formData.get('achievement_id');
  if (!achievementId) return { error: 'Achievement ID is required.' };

  const { data, error: fetchErr } = await supabaseAdmin
    .from('achievements')
    .select('featured_photo')
    .eq('id', achievementId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  if (data?.featured_photo?.id) {
    try {
      await deleteFromDrive(data.featured_photo.id);
    } catch (err) {
      console.warn('Drive delete warning:', err.message);
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from('achievements')
    .update({ featured_photo: null })
    .eq('id', achievementId);

  if (updateErr) return { error: updateErr.message };

  await logActivity(
    admin.id,
    'achievement_featured_photo_delete',
    achievementId,
    {}
  );
  revalidate();
  return { success: true };
}

// =============================================================================
// PARTICIPATION FEATURED PHOTO – UPLOAD
// =============================================================================

export async function uploadParticipationFeaturedPhotoAction(formData) {
  const admin = await requireAdmin();

  const recordId = formData.get('record_id');
  const file = formData.get('file');

  if (!recordId) return { error: 'Record ID is required.' };
  if (!file || typeof file === 'string') return { error: 'No file provided.' };
  if (!file.type?.startsWith('image/'))
    return { error: 'Only image files are allowed.' };

  const { data: existing } = await supabaseAdmin
    .from('participation_records')
    .select('featured_photo')
    .eq('id', recordId)
    .single();

  if (existing?.featured_photo?.id) {
    try {
      await deleteFromDrive(existing.featured_photo.id);
    } catch (_) {}
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name?.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `participation_featured_${recordId.slice(0, 8)}_${Date.now()}.${ext}`;

    const { url, fileId } = await uploadToDrive(
      buffer,
      filename,
      file.type,
      'participations'
    );
    const featured_photo = { id: fileId, name: file.name, url };

    const { error: updateErr } = await supabaseAdmin
      .from('participation_records')
      .update({ featured_photo })
      .eq('id', recordId);

    if (updateErr) return { error: updateErr.message };

    await logActivity(
      admin.id,
      'participation_featured_photo_upload',
      recordId,
      { fileId }
    );
    revalidate();
    return { success: true, ...featured_photo };
  } catch (err) {
    return { error: err.message };
  }
}

// =============================================================================
// PARTICIPATION FEATURED PHOTO – DELETE
// =============================================================================

export async function deleteParticipationFeaturedPhotoAction(formData) {
  const admin = await requireAdmin();

  const recordId = formData.get('record_id');
  if (!recordId) return { error: 'Record ID is required.' };

  const { data, error: fetchErr } = await supabaseAdmin
    .from('participation_records')
    .select('featured_photo')
    .eq('id', recordId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  if (data?.featured_photo?.id) {
    try {
      await deleteFromDrive(data.featured_photo.id);
    } catch (err) {
      console.warn('Drive delete warning:', err.message);
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from('participation_records')
    .update({ featured_photo: null })
    .eq('id', recordId);

  if (updateErr) return { error: updateErr.message };

  await logActivity(
    admin.id,
    'participation_featured_photo_delete',
    recordId,
    {}
  );
  revalidate();
  return { success: true };
}

// =============================================================================
// JOURNEY ITEMS – CRUD
// =============================================================================

function revalidateContent() {
  revalidateTag('site-content');
  revalidatePath('/account/admin/achievements');
  revalidatePath('/achievements');
  revalidatePath('/');
}

export async function createJourneyItemAction(formData) {
  const admin = await requireAdmin();

  const year = formData.get('year')?.trim();
  const event = formData.get('event')?.trim();
  const icon = formData.get('icon')?.trim() || '🎯';
  const description = formData.get('description')?.trim() || null;
  const display_order = parseInt(formData.get('display_order') || '0', 10);

  if (!year) return { error: 'Year is required.' };
  if (!event) return { error: 'Event description is required.' };

  const { data, error } = await supabaseAdmin
    .from('journey_items')
    .insert([
      { year, event, icon, description, display_order, created_by: admin.id },
    ])
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'journey_item_create', data.id, { year, event });
  revalidateContent();
  return { success: true, item: data };
}

export async function updateJourneyItemAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Item ID is required.' };

  const year = formData.get('year')?.trim();
  const event = formData.get('event')?.trim();
  const icon = formData.get('icon')?.trim() || '🎯';
  const description = formData.get('description')?.trim() || null;
  const display_order = parseInt(formData.get('display_order') || '0', 10);

  if (!year) return { error: 'Year is required.' };
  if (!event) return { error: 'Event description is required.' };

  const { data, error } = await supabaseAdmin
    .from('journey_items')
    .update({
      year,
      event,
      icon,
      description,
      display_order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'journey_item_update', id, { year, event });
  revalidateContent();
  return { success: true, item: data };
}

export async function deleteJourneyItemAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Item ID is required.' };

  const { error } = await supabaseAdmin
    .from('journey_items')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'journey_item_delete', id, {});
  revalidateContent();
  return { success: true };
}
