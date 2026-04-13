/**
 * @file executive actions
 * @module executive-actions
 */

'use server';

import { auth } from '@/app/_lib/auth';
import { redirect } from 'next/navigation';
import { getUserRoles, getUserByEmail } from '@/app/_lib/data-service';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { logActivity, generateSlug } from '@/app/_lib/helpers';
import sanitizeHtml from 'sanitize-html';
import {
  isV2SchemaAvailable,
  upsertUserHandleV2,
  deleteUserHandleV2,
} from '@/app/_lib/problem-solving-v2-helpers';

// =============================================================================
// BLOG CONTENT + MEDIA
// =============================================================================

const BLOG_ASSETS_BUCKET = 'blog-assets';
const ALLOWED_BLOG_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

function sanitizeBlogHtml(html) {
  return sanitizeHtml(html || '', {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'blockquote',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'a',
      'img',
      'hr',
      'mark',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
      h2: ['id'],
      h3: ['id'],
      code: ['class'],
      span: ['style'],
      p: ['style'],
      mark: ['data-color'],
      pre: ['class'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^(left|center|right|justify)$/],
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => {
        const href = (attribs.href || '').trim();
        return {
          tagName,
          attribs: {
            ...attribs,
            href,
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
          },
        };
      },
    },
  });
}

// =============================================================================
// HELPERS
// =============================================================================

async function requireExecutive() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');
  const roles = await getUserRoles(session.user.email);
  if (!roles.includes('executive') && !roles.includes('admin'))
    redirect('/account');
  const user = await getUserByEmail(session.user.email);
  if (user?.account_status !== 'active') redirect('/account');
  return user;
}

// =============================================================================
// EVENTS
// =============================================================================

export async function execCreateEventAction(formData) {
  const user = await requireExecutive();
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
  const status = formData.get('status') || 'draft';

  const payload = {
    slug: generateSlug(title),
    title,
    description: formData.get('description')?.trim() || null,
    content: formData.get('content')?.trim() || null,
    location,
    venue_type: formData.get('venue_type') || 'offline',
    category: formData.get('category') || null,
    status,
    start_date: new Date(start_date).toISOString(),
    end_date: formData.get('end_date')
      ? new Date(formData.get('end_date')).toISOString()
      : null,
    cover_image: formData.get('cover_image')?.trim() || null,
    registration_required: formData.get('registration_required') === 'true',
    registration_deadline: formData.get('registration_deadline')
      ? new Date(formData.get('registration_deadline')).toISOString()
      : null,
    max_participants: maxP ? parseInt(maxP, 10) : null,
    is_featured: formData.get('is_featured') === 'true',
    tags: tags.length ? tags : null,
    external_url: formData.get('external_url')?.trim() || null,
    registration_url: formData.get('registration_url')?.trim() || null,
    created_by: user.id,
    approved_by: status !== 'draft' ? user.id : null,
    approved_at: status !== 'draft' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert(payload)
    .select()
    .single();
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_create_event', 'event', data.id, { title });
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/account/executive/events/manage');
  revalidatePath('/events');
  revalidatePath('/');
  return { success: true, id: data.id };
}

export async function execUpdateEventAction(formData) {
  const user = await requireExecutive();
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
  const status = formData.get('status') || 'draft';

  const updates = {
    title,
    description: formData.get('description')?.trim() || null,
    content: formData.get('content')?.trim() || null,
    location,
    venue_type: formData.get('venue_type') || 'offline',
    category: formData.get('category') || null,
    status,
    start_date: new Date(start_date).toISOString(),
    end_date: formData.get('end_date')
      ? new Date(formData.get('end_date')).toISOString()
      : null,
    cover_image: formData.get('cover_image')?.trim() || null,
    registration_required: formData.get('registration_required') === 'true',
    registration_deadline: formData.get('registration_deadline')
      ? new Date(formData.get('registration_deadline')).toISOString()
      : null,
    max_participants: maxP ? parseInt(maxP, 10) : null,
    is_featured: formData.get('is_featured') === 'true',
    tags: tags.length ? tags : null,
    external_url: formData.get('external_url')?.trim() || null,
    registration_url: formData.get('registration_url')?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (status !== 'draft') {
    updates.approved_by = user.id;
    updates.approved_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('events')
    .update(updates)
    .eq('id', id);
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_update_event', 'event', id, { title });
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/account/executive/events/manage');
  revalidatePath('/events');
  revalidatePath('/');
  return { success: true };
}

export async function execDeleteEventAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Event ID is required.' };
  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_delete_event', 'event', id, {});
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/account/executive/events/manage');
  revalidatePath('/events');
  revalidatePath('/');
  return { success: true };
}

// =============================================================================
// REGISTRATIONS
// =============================================================================

export async function execUpdateRegistrationAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Registration ID is required.' };
  const status = formData.get('status');
  if (!status) return { error: 'Status is required.' };

  const { error } = await supabaseAdmin
    .from('event_registrations')
    .update({ status })
    .eq('id', id);
  if (error) return { error: error.message };
  await logActivity(
    user.id,
    'exec_update_registration',
    'event_registration',
    id,
    { status }
  );
  revalidatePath('/account/executive/registrations');
  revalidatePath('/account/member/events');
  revalidatePath('/account/member/participation');
  revalidatePath('/account/guest/events');
  revalidatePath('/account/guest/participation');
  return { success: true };
}

export async function execMarkAttendedAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Registration ID is required.' };
  const attended = formData.get('attended') === 'true';
  const { error } = await supabaseAdmin
    .from('event_registrations')
    .update({ attended, status: attended ? 'attended' : 'confirmed' })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/account/executive/registrations');
  revalidatePath('/account/member/events');
  revalidatePath('/account/member/participation');
  revalidatePath('/account/member/certificates');
  revalidatePath('/account/guest/events');
  revalidatePath('/account/guest/participation');
  return { success: true };
}

// =============================================================================
// CONTESTS
// =============================================================================

export async function execCreateContestAction(formData) {
  const user = await requireExecutive();
  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };
  const start_time = formData.get('start_time');
  if (!start_time) return { error: 'Start time is required.' };
  const duration = formData.get('duration');
  if (!duration) return { error: 'Duration is required.' };

  const payload = {
    slug: generateSlug(title),
    title,
    description: formData.get('description')?.trim() || null,
    platform: formData.get('platform')?.trim() || null,
    contest_url: formData.get('contest_url')?.trim() || null,
    start_time: new Date(start_time).toISOString(),
    duration: parseInt(duration, 10),
    type: formData.get('type') || 'individual',
    division: formData.get('division')?.trim() || null,
    status: formData.get('status') || 'upcoming',
    is_official: formData.get('is_official') === 'true',
    created_by: user.id,
  };

  const { data, error } = await supabaseAdmin
    .from('contests')
    .insert(payload)
    .select()
    .single();
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_create_contest', 'contest', data.id, {
    title,
  });
  revalidatePath('/account/executive/contests/manage');
  revalidatePath('/account/member/problem-solving');
  return { success: true, id: data.id };
}

export async function execUpdateContestAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Contest ID is required.' };
  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };

  const { error } = await supabaseAdmin
    .from('contests')
    .update({
      title,
      description: formData.get('description')?.trim() || null,
      platform: formData.get('platform')?.trim() || null,
      contest_url: formData.get('contest_url')?.trim() || null,
      start_time: formData.get('start_time')
        ? new Date(formData.get('start_time')).toISOString()
        : undefined,
      duration: formData.get('duration')
        ? parseInt(formData.get('duration'), 10)
        : undefined,
      type: formData.get('type') || 'individual',
      division: formData.get('division')?.trim() || null,
      status: formData.get('status') || 'upcoming',
      is_official: formData.get('is_official') === 'true',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_update_contest', 'contest', id, { title });
  revalidatePath('/account/executive/contests/manage');
  revalidatePath('/account/member/problem-solving');
  return { success: true };
}

export async function execDeleteContestAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Contest ID is required.' };
  const { error } = await supabaseAdmin.from('contests').delete().eq('id', id);
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_delete_contest', 'contest', id, {});
  revalidatePath('/account/executive/contests/manage');
  revalidatePath('/account/member/problem-solving');
  return { success: true };
}

// =============================================================================
// BLOGS
// =============================================================================

export async function execCreateBlogAction(formData) {
  const user = await requireExecutive();
  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };
  const rawContent = formData.get('content')?.trim();
  if (!rawContent) return { error: 'Content is required.' };
  const content = sanitizeBlogHtml(rawContent);
  if (!content.trim()) return { error: 'Content is required.' };

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const status = formData.get('status') || 'draft';

  const payload = {
    slug: generateSlug(title),
    title,
    excerpt: formData.get('excerpt')?.trim() || null,
    content,
    thumbnail: formData.get('thumbnail')?.trim() || null,
    category: formData.get('category') || null,
    tags: tags.length ? tags : null,
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
    is_featured: formData.get('is_featured') === 'true',
    read_time: formData.get('read_time')
      ? parseInt(formData.get('read_time'), 10)
      : null,
    author_id: user.id,
  };

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .insert(payload)
    .select()
    .single();
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_create_blog', 'blog', data.id, { title });
  revalidateTag('blogs');
  revalidateTag('homepage');
  revalidatePath('/account/executive/blogs/manage');
  revalidatePath('/blogs');
  revalidatePath('/');
  return { success: true, id: data.id };
}

export async function execUpdateBlogAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Blog ID is required.' };
  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };
  const rawContent = formData.get('content')?.trim();
  if (!rawContent) return { error: 'Content is required.' };
  const content = sanitizeBlogHtml(rawContent);
  if (!content.trim()) return { error: 'Content is required.' };

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const newStatus = formData.get('status') || 'draft';

  const { data: existing } = await supabaseAdmin
    .from('blog_posts')
    .select('status, published_at')
    .eq('id', id)
    .single();

  let published_at = existing?.published_at ?? null;
  if (newStatus === 'published' && existing?.status !== 'published') {
    published_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('blog_posts')
    .update({
      title,
      excerpt: formData.get('excerpt')?.trim() || null,
      content,
      thumbnail: formData.get('thumbnail')?.trim() || null,
      category: formData.get('category') || null,
      tags: tags.length ? tags : null,
      status: newStatus,
      published_at,
      is_featured: formData.get('is_featured') === 'true',
      read_time: formData.get('read_time')
        ? parseInt(formData.get('read_time'), 10)
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_update_blog', 'blog', id, { title });
  revalidateTag('blogs');
  revalidateTag('homepage');
  revalidatePath('/account/executive/blogs/manage');
  revalidatePath('/blogs');
  revalidatePath('/');
  return { success: true };
}

export async function execDeleteBlogAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Blog ID is required.' };
  const { error } = await supabaseAdmin
    .from('blog_posts')
    .delete()
    .eq('id', id);
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_delete_blog', 'blog', id, {});
  revalidateTag('blogs');
  revalidateTag('homepage');
  revalidatePath('/account/executive/blogs/manage');
  revalidatePath('/blogs');
  revalidatePath('/');
  return { success: true };
}

export async function execUploadBlogImageAction(formData) {
  const user = await requireExecutive();

  const file = formData.get('file');
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'No image provided.' };
  }
  if (!ALLOWED_BLOG_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Image type not supported.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${user.id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BLOG_ASSETS_BUCKET)
    .upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Exec blog image upload error:', uploadError);
    return { error: 'Failed to upload image. Please try again.' };
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BLOG_ASSETS_BUCKET).getPublicUrl(storagePath);

  await logActivity(user.id, 'exec_blog_image_uploaded', 'blog', storagePath, {
    filename: file.name,
    path: storagePath,
  });

  return { success: true, url: publicUrl };
}

// =============================================================================
// GALLERY
// =============================================================================

export async function execAddGalleryItemAction(formData) {
  const user = await requireExecutive();
  const url = formData.get('url')?.trim();
  if (!url) return { error: 'Image URL is required.' };

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const { data, error } = await supabaseAdmin
    .from('gallery_items')
    .insert({
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
      uploaded_by: user.id,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_add_gallery', 'gallery', data.id, { url });
  revalidateTag('gallery');
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/account/executive/gallery/manage');
  revalidatePath('/account/admin/gallery');
  revalidatePath('/gallery');
  revalidatePath('/events');
  revalidatePath('/');
  return { success: true, id: data.id };
}

export async function execBulkAddGalleryAction(formData) {
  const user = await requireExecutive();
  const rawUrls = formData.get('urls') || '';
  const urls = rawUrls
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length === 0) return { error: 'No URLs provided.' };
  if (urls.length > 50) return { error: 'Maximum 50 items at a time.' };

  const type = formData.get('type') || 'image';
  const category = formData.get('category')?.trim() || null;
  const event_id = formData.get('event_id') || null;

  const { data, error } = await supabaseAdmin
    .from('gallery_items')
    .insert(
      urls.map((url, i) => ({
        url,
        type,
        category,
        event_id,
        display_order: i,
        uploaded_by: user.id,
      }))
    )
    .select();
  if (error) return { error: error.message };
  revalidateTag('gallery');
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/account/executive/gallery/manage');
  revalidatePath('/account/admin/gallery');
  revalidatePath('/gallery');
  revalidatePath('/events');
  revalidatePath('/');
  return { success: true, count: data.length };
}

export async function execUpdateGalleryItemAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Item ID is required.' };
  const url = formData.get('url')?.trim();
  if (!url) return { error: 'URL is required.' };

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabaseAdmin
    .from('gallery_items')
    .update({
      url,
      type: formData.get('type') || 'image',
      caption: formData.get('caption')?.trim() || null,
      category: formData.get('category')?.trim() || null,
      event_id: formData.get('event_id') || null,
      tags: tags.length ? tags : null,
      is_featured: formData.get('is_featured') === 'true',
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidateTag('gallery');
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/account/executive/gallery/manage');
  revalidatePath('/account/admin/gallery');
  revalidatePath('/gallery');
  revalidatePath('/events');
  revalidatePath('/');
  return { success: true };
}

export async function execDeleteGalleryItemAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Item ID is required.' };
  const { error } = await supabaseAdmin
    .from('gallery_items')
    .delete()
    .eq('id', id);
  if (error) return { error: error.message };
  revalidateTag('gallery');
  revalidateTag('events');
  revalidateTag('homepage');
  revalidatePath('/account/executive/gallery/manage');
  revalidatePath('/account/admin/gallery');
  revalidatePath('/gallery');
  revalidatePath('/events');
  revalidatePath('/');
  return { success: true };
}

// =============================================================================
// NOTICES
// =============================================================================

export async function execCreateNoticeAction(formData) {
  const user = await requireExecutive();
  const title = formData.get('title')?.trim();
  const content = formData.get('content')?.trim();
  if (!title) return { error: 'Title is required.' };
  if (!content) return { error: 'Content is required.' };

  const rawAudience = formData.get('target_audience') || '';
  const target_audience = rawAudience
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);

  const { data, error } = await supabaseAdmin
    .from('notices')
    .insert({
      title,
      content,
      notice_type: formData.get('notice_type') || 'general',
      priority: formData.get('priority') || 'medium',
      target_audience: target_audience.length ? target_audience : null,
      is_pinned: formData.get('is_pinned') === 'true',
      expires_at: formData.get('expires_at') || null,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  await logActivity(user.id, 'exec_create_notice', 'notice', data.id, {
    title,
  });
  revalidateTag('notices');
  revalidateTag('homepage');
  revalidatePath('/account/executive/notices/create');
  revalidatePath('/account/admin/notices');
  revalidatePath('/notices');
  revalidatePath('/account');
  revalidatePath('/');
  return { success: true, id: data.id };
}

export async function execUpdateNoticeAction(formData) {
  const user = await requireExecutive();
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

  const { error } = await supabaseAdmin
    .from('notices')
    .update({
      title,
      content,
      notice_type: formData.get('notice_type') || 'general',
      priority: formData.get('priority') || 'medium',
      target_audience: target_audience.length ? target_audience : null,
      is_pinned: formData.get('is_pinned') === 'true',
      expires_at: formData.get('expires_at') || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidateTag('notices');
  revalidateTag('homepage');
  revalidatePath('/account/executive/notices/create');
  revalidatePath('/account/admin/notices');
  revalidatePath('/notices');
  revalidatePath('/account');
  revalidatePath('/');
  return { success: true };
}

export async function execDeleteNoticeAction(formData) {
  const user = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Notice ID is required.' };
  const { error } = await supabaseAdmin.from('notices').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidateTag('notices');
  revalidateTag('homepage');
  revalidatePath('/account/executive/notices/create');
  revalidatePath('/account/admin/notices');
  revalidatePath('/notices');
  revalidatePath('/account');
  revalidatePath('/');
  return { success: true };
}

// =============================================================================
// MEMBERS
// =============================================================================

export async function execApproveJoinRequestAction(formData) {
  const executive = await requireExecutive();
  const id = formData.get('id');
  if (!id) return { error: 'Request ID is required.' };

  const { error } = await supabaseAdmin
    .from('join_requests')
    .update({
      status: 'approved',
      reviewed_by: executive.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  await logActivity(executive.id, 'exec_approve_join', 'join_request', id, {});
  revalidatePath('/account/executive/members');
  revalidatePath('/account/admin/users');
  revalidatePath('/account/advisor/approvals');
  return { success: true };
}

export async function execRejectJoinRequestAction(formData) {
  const executive = await requireExecutive();
  const id = formData.get('id');
  const rejection_reason = formData.get('reason')?.trim() || null;
  if (!id) return { error: 'Request ID is required.' };

  const { error } = await supabaseAdmin
    .from('join_requests')
    .update({
      status: 'rejected',
      rejection_reason,
      reviewed_by: executive.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  await logActivity(executive.id, 'exec_reject_join', 'join_request', id, {
    rejection_reason,
  });
  revalidatePath('/account/executive/members');
  revalidatePath('/account/admin/users');
  revalidatePath('/account/advisor/approvals');
  return { success: true };
}

// =============================================================================
// CERTIFICATES
// =============================================================================

export async function execCreateCertificateAction(formData) {
  const user = await requireExecutive();
  const recipient_id = formData.get('recipient_id');
  if (!recipient_id) return { error: 'Recipient is required.' };
  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };
  const issue_date = formData.get('issue_date');
  if (!issue_date) return { error: 'Issue date is required.' };

  const certificate_number = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const payload = {
    certificate_number,
    recipient_id,
    event_id: formData.get('event_id') || null,
    contest_id: formData.get('contest_id') || null,
    title,
    description: formData.get('description')?.trim() || null,
    certificate_type: formData.get('certificate_type') || 'participation',
    certificate_url: formData.get('certificate_url')?.trim() || null,
    issue_date,
    issued_by: user.id,
    verified: true,
  };

  const { data, error } = await supabaseAdmin
    .from('certificates')
    .insert(payload)
    .select()
    .single();
  if (error) return { error: error.message };
  await logActivity(
    user.id,
    'exec_create_certificate',
    'certificate',
    data.id,
    { title }
  );
  revalidatePath('/account/executive/certificates/generate');
  revalidatePath('/account/member/certificates');
  return { success: true, id: data.id, certificate_number };
}

export async function execBulkCreateCertificatesAction(formData) {
  const user = await requireExecutive();
  const event_id = formData.get('event_id') || null;
  const contest_id = formData.get('contest_id') || null;
  const certificate_type = formData.get('certificate_type') || 'participation';
  const title = formData.get('title')?.trim();
  if (!title) return { error: 'Title is required.' };
  const issue_date = formData.get('issue_date');
  if (!issue_date) return { error: 'Issue date is required.' };

  let recipientIds = [];

  if (event_id) {
    const { data } = await supabaseAdmin
      .from('event_registrations')
      .select('user_id')
      .eq('event_id', event_id)
      .in('status', ['confirmed', 'attended']);
    recipientIds = (data || []).map((r) => r.user_id);
  } else if (contest_id) {
    const { data } = await supabaseAdmin
      .from('contest_participants')
      .select('user_id')
      .eq('contest_id', contest_id);
    recipientIds = (data || []).map((r) => r.user_id);
  }

  if (recipientIds.length === 0)
    return { error: 'No eligible recipients found.' };

  const payload = recipientIds.map((rid) => ({
    certificate_number: `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    recipient_id: rid,
    event_id,
    contest_id,
    title,
    certificate_type,
    issue_date,
    issued_by: user.id,
    verified: true,
  }));

  const { data, error } = await supabaseAdmin
    .from('certificates')
    .insert(payload)
    .select();
  if (error) return { error: error.message };
  revalidatePath('/account/executive/certificates/generate');
  revalidatePath('/account/member/certificates');
  return { success: true, count: data.length };
}

// =============================================================================
// PROFILE
// =============================================================================

export async function execUpdateProfileAction(formData) {
  const user = await requireExecutive();

  const userUpdates = {};
  const full_name = formData.get('full_name')?.trim();
  if (full_name) userUpdates.full_name = full_name;
  const phone = formData.get('phone')?.trim();
  if (phone !== undefined) userUpdates.phone = phone || null;

  if (Object.keys(userUpdates).length > 0) {
    userUpdates.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('users')
      .update(userUpdates)
      .eq('id', user.id);
    if (error) return { error: error.message };
  }

  const profileUpdates = {
    bio: formData.get('bio')?.trim() || null,
    linkedin: formData.get('linkedin')?.trim() || null,
    github: formData.get('github')?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingProfile } = await supabaseAdmin
    .from('member_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile) {
    const { error } = await supabaseAdmin
      .from('member_profiles')
      .update(profileUpdates)
      .eq('user_id', user.id);
    if (error) return { error: error.message };
  }

  // Save codeforces handle to user_handles (V2 schema)
  const cfHandle = formData.get('codeforces_handle')?.trim() || null;
  const useV2 = await isV2SchemaAvailable();

  if (cfHandle) {
    if (useV2) {
      await upsertUserHandleV2(user.id, 'codeforces', cfHandle);
    } else {
      await supabaseAdmin.from('user_handles').upsert(
        {
          user_id: user.id,
          platform: 'codeforces',
          handle: cfHandle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );
    }
  } else {
    if (useV2) {
      await deleteUserHandleV2(user.id, 'codeforces');
    } else {
      await supabaseAdmin
        .from('user_handles')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'codeforces');
    }
  }

  revalidatePath('/account/executive/profile');
  return { success: true };
}
