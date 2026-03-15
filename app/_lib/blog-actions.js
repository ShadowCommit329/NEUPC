/**
 * @file blog actions
 * @module blog-actions
 */

'use server';

import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, createLogger, generateSlug } from '@/app/_lib/helpers';
import { auth } from '@/app/_lib/auth';
import {
  getUserByEmail,
  incrementBlogPostViews,
  toggleBlogPostLike,
} from '@/app/_lib/data-service';
import { uploadToDrive, deleteFromDrive } from '@/app/_lib/gdrive';
import { generateImage } from '@/app/_lib/image-gen';
import { generateText } from '@/app/_lib/text-gen';
import sanitizeHtml from 'sanitize-html';

const logActivity = createLogger('blog');

function revalidateBlogs() {
  revalidateTag('blogs');
  revalidateTag('homepage');
  revalidatePath('/account/admin/blogs');
  revalidatePath('/blogs', 'layout'); // covers /blogs AND /blogs/[blogId]
  revalidatePath('/account/executive/blogs/manage');
  revalidatePath('/');
}

// =============================================================================
// CONTENT + MEDIA
// =============================================================================

const ALLOWED_BLOG_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Extract all image src URLs from HTML content.
 */
function extractImageUrls(html) {
  if (!html) return [];
  const matches = html.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
  return matches
    .map((tag) => {
      const m = tag.match(/src=["']([^"']+)["']/i);
      return m?.[1] || null;
    })
    .filter(Boolean);
}

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
      pre: ['class'],
      span: ['style', 'class'],
      p: ['style'],
      mark: ['data-color'],
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
// UPLOAD BLOG IMAGE (Google Drive)
// =============================================================================

export async function uploadBlogImageAction(formData) {
  const admin = await requireAdmin();

  const file = formData.get('file');
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'No image provided.' };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bufferView = new Uint8Array(arrayBuffer);
  
  // Magic Number Validation
  let isValidType = false;
  let ext = 'jpg';
  
  // JPEG: FF D8 FF
  if (bufferView[0] === 0xFF && bufferView[1] === 0xD8 && bufferView[2] === 0xFF) {
    isValidType = true;
    ext = 'jpg';
  } 
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (bufferView[0] === 0x89 && bufferView[1] === 0x50 && bufferView[2] === 0x4E && bufferView[3] === 0x47) {
    isValidType = true;
    ext = 'png';
  }
  // GIF: GIF87a or GIF89a (47 49 46 38)
  else if (bufferView[0] === 0x47 && bufferView[1] === 0x49 && bufferView[2] === 0x46 && bufferView[3] === 0x38) {
    isValidType = true;
    ext = 'gif';
  }
  // WebP: RIFF ... WEBP (52 49 46 46 ... 57 45 42 50)
  else if (bufferView[0] === 0x52 && bufferView[1] === 0x49 && bufferView[2] === 0x46 && bufferView[3] === 0x46 &&
           bufferView[8] === 0x57 && bufferView[9] === 0x45 && bufferView[10] === 0x42 && bufferView[11] === 0x50) {
    isValidType = true;
    ext = 'webp';
  }

  if (!isValidType) {
    return { error: 'File signature is invalid or not a supported image format (JPEG, PNG, GIF, WebP).' };
  }

  const filename = `blog_${admin.id}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

  let url, fileId;
  try {
    const arrayBuffer = await file.arrayBuffer();
    ({ url, fileId } = await uploadToDrive(
      Buffer.from(arrayBuffer),
      filename,
      file.type,
      'blog-images'
    ));
  } catch (err) {
    console.error('Google Drive blog image upload error:', err);
    return { error: 'Failed to upload image. Please try again.' };
  }

  await logActivity(admin.id, 'blog_image_uploaded', fileId, {
    filename: file.name,
    fileId,
  });

  return { success: true, url };
}

// =============================================================================
// DELETE BLOG IMAGE FROM DRIVE
// =============================================================================

export async function deleteBlogImageAction(url) {
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
    console.error('Failed to delete Drive blog image:', err);
    return { error: 'Failed to delete image from Drive.' };
  }
}

// =============================================================================
// GENERATE BLOG IMAGE (AI)
// =============================================================================

export async function generateBlogImageAction(prompt, model) {
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
    const filename = `ai_blog_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { url, fileId } = await uploadToDrive(
      buffer,
      filename,
      mimeType,
      'blog-images'
    );

    await logActivity(admin.id, 'blog_image_ai_generated', fileId, {
      prompt: prompt.trim().slice(0, 200),
      filename,
      fileId,
    });

    return { success: true, url };
  } catch (err) {
    console.error('AI blog image generation error:', err);
    return {
      error: err.message || 'Failed to generate image. Please try again.',
    };
  }
}

// =============================================================================
// AI TEXT GENERATION
// =============================================================================

/**
 * Generate blog text (title, excerpt, or content) using AI.
 */
export async function generateBlogTextAction(
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
    console.error('AI blog text generation error:', err);
    return { error: err.message || 'Text generation failed. Try again.' };
  }
}

import { blogSchema } from '@/app/_lib/schemas';

// ... (in createBlogAction)

export async function createBlogAction(formData) {
  const admin = await requireAdmin();

  const title = formData.get('title')?.trim() || '';
  const rawContent = formData.get('content')?.trim() || '';
  const content = sanitizeBlogHtml(rawContent);

  const rawTags = formData.get('tags') || '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const status = formData.get('status') || 'draft';
  const read_timeValue = formData.get('read_time');

  // Prepare data for validation
  const inputData = {
    title,
    excerpt: formData.get('excerpt')?.trim() || null,
    content,
    thumbnail: formData.get('thumbnail')?.trim() || null,
    category: formData.get('category') || null,
    tags: tags.length ? tags : null,
    status,
    is_featured: formData.get('is_featured') === 'true',
    read_time: read_timeValue ? parseInt(read_timeValue, 10) : null
  };

  // Validate with Zod
  const result = blogSchema.safeParse(inputData);
  if (!result.success) {
    const errorMsg = result.error.errors.map(e => e.message).join(', ');
    return { error: `Validation failed: ${errorMsg}` };
  }

  const validData = result.data;
  const published_at = validData.status === 'published' ? new Date().toISOString() : null;

  const payload = {
    slug: generateSlug(validData.title),
    ...validData,
    published_at,
    author_id: admin.id,
  };

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .insert([payload])
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'blog_created', data.id, { title: validData.title });
  revalidateBlogs();
  return { success: true, id: data.id };
}

// =============================================================================
// UPDATE BLOG POST
// =============================================================================

export async function updateBlogAction(formData) {
  const admin = await requireAdmin();

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

  // If status changes to published and wasn't before, record timestamp
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

  // Fetch old data to find orphaned images
  const { data: oldPost } = await supabaseAdmin
    .from('blog_posts')
    .select('thumbnail, content')
    .eq('id', id)
    .single();

  const newThumbnail = formData.get('thumbnail')?.trim() || null;
  const newContent = content;

  const rawSlug = formData.get('slug')?.trim();
  const slug = rawSlug ? generateSlug(rawSlug) : generateSlug(title);

  const payload = {
    title,
    slug,
    excerpt: formData.get('excerpt')?.trim() || null,
    content,
    thumbnail: newThumbnail,
    category: formData.get('category') || null,
    tags: tags.length ? tags : null,
    status: newStatus,
    published_at,
    is_featured: formData.get('is_featured') === 'true',
    read_time: formData.get('read_time')
      ? parseInt(formData.get('read_time'), 10)
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('blog_posts')
    .update(payload)
    .eq('id', id);

  if (error) return { error: error.message };

  // ── Clean up orphaned Drive images (non-blocking) ──
  try {
    if (oldPost?.thumbnail && oldPost.thumbnail !== newThumbnail) {
      deleteFromDrive(oldPost.thumbnail).catch(() => {});
    }
    const oldContentImages = new Set(extractImageUrls(oldPost?.content));
    const newContentImages = new Set(extractImageUrls(newContent));
    for (const url of oldContentImages) {
      if (!newContentImages.has(url)) {
        deleteFromDrive(url).catch(() => {});
      }
    }
  } catch {
    // Image cleanup is best-effort, don't fail the update
  }

  await logActivity(admin.id, 'blog_updated', id, { title });
  revalidateBlogs();
  return { success: true };
}

// =============================================================================
// DELETE BLOG POST
// =============================================================================

export async function deleteBlogAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Blog ID is required.' };

  // Fetch post images before deletion
  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('thumbnail, content')
    .eq('id', id)
    .single();

  // Delete comments first (foreign key)
  await supabaseAdmin.from('blog_comments').delete().eq('blog_id', id);

  const { error } = await supabaseAdmin
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  // ── Clean up all Drive images (non-blocking) ──
  try {
    const imagesToDelete = [];
    if (post?.thumbnail) imagesToDelete.push(post.thumbnail);
    imagesToDelete.push(...extractImageUrls(post?.content));
    for (const url of imagesToDelete) {
      deleteFromDrive(url).catch(() => {});
    }
  } catch {
    // Image cleanup is best-effort, don't fail the delete
  }

  await logActivity(admin.id, 'blog_deleted', id, {});
  revalidateBlogs();
  return { success: true };
}

// =============================================================================
// UPDATE BLOG STATUS
// =============================================================================

export async function updateBlogStatusAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const status = formData.get('status');
  if (!id || !status) return { error: 'Missing id or status.' };

  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'published') {
    // Only set published_at if not already set
    const { data: existing } = await supabaseAdmin
      .from('blog_posts')
      .select('published_at')
      .eq('id', id)
      .single();
    if (!existing?.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { error } = await supabaseAdmin
    .from('blog_posts')
    .update(updates)
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'blog_status_updated', id, { status });
  revalidateBlogs();
  return { success: true };
}

// =============================================================================
// TOGGLE FEATURED
// =============================================================================

export async function toggleBlogFeaturedAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const featured = formData.get('featured') === 'true';
  if (!id) return { error: 'Blog ID is required.' };

  const { error } = await supabaseAdmin
    .from('blog_posts')
    .update({ is_featured: featured, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(
    admin.id,
    featured ? 'blog_featured' : 'blog_unfeatured',
    id,
    {}
  );
  revalidateBlogs();
  return { success: true };
}

// =============================================================================
// TOGGLE COMMENT APPROVAL
// =============================================================================

export async function toggleCommentApprovalAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const approved = formData.get('approved') === 'true';
  if (!id) return { error: 'Comment ID is required.' };

  const { error } = await supabaseAdmin
    .from('blog_comments')
    .update({ is_approved: approved, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(
    admin.id,
    approved ? 'comment_approved' : 'comment_hidden',
    id,
    {}
  );
  revalidateBlogs();
  return { success: true };
}

// =============================================================================
// DELETE COMMENT
// =============================================================================

export async function deleteCommentAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Comment ID is required.' };

  const { error } = await supabaseAdmin
    .from('blog_comments')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'comment_deleted', id, {});
  revalidateBlogs();
  return { success: true };
}

// =============================================================================
// PUBLIC COMMENT ACTIONS (authenticated users)
// =============================================================================

export async function addCommentAction(formData) {
  const session = await auth();
  if (!session?.user?.email)
    return { error: 'You must be signed in to comment.' };

  const blogId = formData.get('blogId');
  const content = formData.get('content')?.trim();
  const parentId = formData.get('parentId') || null;

  if (!blogId) return { error: 'Blog ID is required.' };
  if (!content || content.length < 2) return { error: 'Comment is too short.' };
  if (content.length > 2000)
    return { error: 'Comment must be under 2000 characters.' };

  const user = await getUserByEmail(session.user.email);
  if (!user?.id) return { error: 'User account not found.' };

  const { data, error } = await supabaseAdmin
    .from('blog_comments')
    .insert([
      {
        blog_id: blogId,
        user_id: user.id,
        parent_id: parentId,
        content,
        is_approved: true,
      },
    ])
    .select('*, users(id, full_name, avatar_url)')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/blogs', 'layout');
  return { comment: data };
}

export async function editCommentAction(formData) {
  const session = await auth();
  if (!session?.user?.email) return { error: 'You must be signed in.' };

  const id = formData.get('id');
  const content = formData.get('content')?.trim();

  if (!id) return { error: 'Comment ID is required.' };
  if (!content || content.length < 2) return { error: 'Comment is too short.' };
  if (content.length > 2000)
    return { error: 'Comment must be under 2000 characters.' };

  const user = await getUserByEmail(session.user.email);
  if (!user?.id) return { error: 'User account not found.' };

  const { data, error } = await supabaseAdmin
    .from('blog_comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, users(id, full_name, avatar_url)')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/blogs', 'layout');
  return { comment: data };
}

export async function deleteOwnCommentAction(formData) {
  const session = await auth();
  if (!session?.user?.email) return { error: 'You must be signed in.' };

  const id = formData.get('id');
  if (!id) return { error: 'Comment ID is required.' };

  const user = await getUserByEmail(session.user.email);
  if (!user?.id) return { error: 'User account not found.' };

  const { error } = await supabaseAdmin
    .from('blog_comments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/blogs', 'layout');
  return { success: true };
}

// =============================================================================
// VIEWS + LIKES
// =============================================================================

export async function incrementViewAction(formData) {
  const id = formData.get('id');
  if (!id) return;
  await incrementBlogPostViews(id);
}

export async function likePostAction(formData) {
  const id = formData.get('id');
  if (!id) return { error: 'Missing post ID.' };
  const result = await toggleBlogPostLike(id);
  revalidatePath('/blogs', 'layout');
  return result;
}
