/**
 * @file Bootcamp server actions for admin and member operations.
 * @module bootcamp-actions
 *
 * Handles all CRUD operations for bootcamps, courses, modules, lessons,
 * enrollments, and user progress tracking.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { auth } from '@/app/_lib/auth';
import {
  extractDriveFileId,
  getFileMetadata,
  canAccessFile,
} from './bootcamp-video';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if current user is admin.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single();

  if (!user) throw new Error('User not found');

  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const isAdmin = roles?.some((r) => r.roles?.name === 'admin');
  if (!isAdmin) throw new Error('Admin access required');

  return user.id;
}

/**
 * Get current user ID.
 */
async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single();

  return user?.id || null;
}

/**
 * Generate a URL-friendly slug from a string.
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOTCAMP ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all bootcamps (admin view - includes drafts).
 */
export async function getAdminBootcamps() {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from('bootcamps')
    .select(
      `
      *,
      users:created_by (id, full_name, avatar_url)
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch bootcamps');
  }

  // Get enrollment counts separately
  const bootcampIds = data?.map((b) => b.id) || [];
  let enrollmentCounts = {};

  if (bootcampIds.length > 0) {
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('bootcamp_id')
      .in('bootcamp_id', bootcampIds);

    // Count enrollments per bootcamp
    enrollments?.forEach((e) => {
      enrollmentCounts[e.bootcamp_id] =
        (enrollmentCounts[e.bootcamp_id] || 0) + 1;
    });
  }

  // Add enrollment count to each bootcamp
  return (data || []).map((b) => ({
    ...b,
    enrollment_count: enrollmentCounts[b.id] || 0,
  }));
}

/**
 * Get published bootcamps for members to browse.
 * Returns all published bootcamps with course counts.
 */
export async function getMemberBootcamps() {
  const { data, error } = await supabaseAdmin
    .from('bootcamps')
    .select(
      `
      id, title, slug, description, thumbnail, price, batch_info,
      start_date, end_date, total_duration, total_lessons, is_featured,
      courses:courses (count)
    `
    )
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch bootcamps');
  }

  // Transform course count
  return (data || []).map((b) => ({
    ...b,
    course_count: b.courses?.[0]?.count || 0,
  }));
}

/**
 * Get a single bootcamp by ID or slug with full curriculum.
 */
export async function getBootcampWithCurriculum(idOrSlug) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug
    );

  const query = supabaseAdmin.from('bootcamps').select(`
      *,
      users:created_by (id, full_name, avatar_url),
      courses (
        id, title, description, order_index, is_published, total_lessons, total_duration,
        modules (
          id, title, description, order_index, is_published, total_lessons, total_duration,
          lessons (
            id, title, description, video_source, duration, order_index, 
            is_free_preview, is_published
          )
        )
      )
    `);

  const { data, error } = isUuid
    ? await query.eq('id', idOrSlug).single()
    : await query.eq('slug', idOrSlug).single();

  if (error) throw error;

  // Sort nested items by order_index
  if (data?.courses) {
    data.courses.sort((a, b) => a.order_index - b.order_index);
    data.courses.forEach((course) => {
      course.modules?.sort((a, b) => a.order_index - b.order_index);
      course.modules?.forEach((module) => {
        module.lessons?.sort((a, b) => a.order_index - b.order_index);
      });
    });
  }

  return data;
}

/**
 * Create a new bootcamp.
 */
export async function createBootcamp(formData) {
  const userId = await requireAdmin();

  const title = formData.get('title')?.trim();
  if (!title) throw new Error('Title is required');

  let slug = formData.get('slug')?.trim() || generateSlug(title);

  // Ensure slug is unique
  const { data: existing } = await supabaseAdmin
    .from('bootcamps')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const bootcampData = {
    title,
    slug,
    description: formData.get('description') || null,
    thumbnail: formData.get('thumbnail') || null,
    price: parseFloat(formData.get('price')) || 0,
    status: formData.get('status') || 'draft',
    batch_info: formData.get('batch_info') || null,
    start_date: formData.get('start_date') || null,
    end_date: formData.get('end_date') || null,
    max_students: parseInt(formData.get('max_students')) || null,
    is_featured: formData.get('is_featured') === 'true',
    created_by: userId,
  };

  const { data, error } = await supabaseAdmin
    .from('bootcamps')
    .insert(bootcampData)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/account/admin/bootcamps');

  return data;
}

/**
 * Update a bootcamp.
 */
export async function updateBootcamp(id, formData) {
  await requireAdmin();

  const updates = {};
  const fields = [
    'title',
    'slug',
    'description',
    'thumbnail',
    'price',
    'status',
    'batch_info',
    'start_date',
    'end_date',
    'max_students',
    'is_featured',
  ];

  for (const field of fields) {
    const value = formData.get(field);
    if (value !== null && value !== undefined) {
      if (field === 'price') {
        updates[field] = parseFloat(value) || 0;
      } else if (field === 'max_students') {
        updates[field] = value ? parseInt(value) : null;
      } else if (field === 'is_featured') {
        updates[field] = value === 'true';
      } else if (field === 'start_date' || field === 'end_date') {
        updates[field] = value || null;
      } else {
        updates[field] = value;
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('bootcamps')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/account/admin/bootcamps');
  revalidatePath(`/account/admin/bootcamps/${id}`);

  return data;
}

/**
 * Delete a bootcamp.
 */
export async function deleteBootcamp(id) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from('bootcamps').delete().eq('id', id);

  if (error) throw error;

  revalidatePath('/account/admin/bootcamps');

  return { success: true };
}

/**
 * Toggle bootcamp featured status.
 */
export async function toggleBootcampFeatured(id) {
  await requireAdmin();

  const { data: current } = await supabaseAdmin
    .from('bootcamps')
    .select('is_featured')
    .eq('id', id)
    .single();

  const { data, error } = await supabaseAdmin
    .from('bootcamps')
    .update({ is_featured: !current?.is_featured })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/account/admin/bootcamps');

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new course within a bootcamp.
 */
export async function createCourse(bootcampId, data) {
  await requireAdmin();

  // Get max order_index
  const { data: existing } = await supabaseAdmin
    .from('courses')
    .select('order_index')
    .eq('bootcamp_id', bootcampId)
    .order('order_index', { ascending: false })
    .limit(1);

  const orderIndex = (existing?.[0]?.order_index ?? -1) + 1;

  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .insert({
      bootcamp_id: bootcampId,
      title: data.title?.trim() || 'Untitled Course',
      description: data.description || null,
      order_index: orderIndex,
      is_published: data.is_published !== false,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/account/admin/bootcamps/${bootcampId}`);
  return course;
}

/**
 * Update a course.
 */
export async function updateCourse(courseId, data) {
  await requireAdmin();

  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .update({
      title: data.title?.trim(),
      description: data.description,
      is_published: data.is_published,
    })
    .eq('id', courseId)
    .select('*, bootcamp_id')
    .single();

  if (error) throw error;

  revalidatePath(`/account/admin/bootcamps/${course.bootcamp_id}`);
  return course;
}

/**
 * Delete a course.
 */
export async function deleteCourse(courseId) {
  await requireAdmin();

  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('bootcamp_id')
    .eq('id', courseId)
    .single();

  const { error } = await supabaseAdmin
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) throw error;

  if (course?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${course.bootcamp_id}`);
  }

  return { success: true };
}

/**
 * Reorder courses within a bootcamp.
 */
export async function reorderCourses(bootcampId, courseIds) {
  await requireAdmin();

  // Use Promise.all for parallel updates (much faster than sequential)
  const updates = courseIds.map(
    (id, index) =>
      supabaseAdmin
        .from('courses')
        .update({ order_index: index })
        .eq('id', id)
        .eq('bootcamp_id', bootcampId) // Security: ensure course belongs to bootcamp
  );

  await Promise.all(updates);

  revalidatePath(`/account/admin/bootcamps/${bootcampId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new module within a course.
 */
export async function createModule(courseId, data) {
  await requireAdmin();

  // Get course's bootcamp_id and max order_index
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('bootcamp_id')
    .eq('id', courseId)
    .single();

  const { data: existing } = await supabaseAdmin
    .from('modules')
    .select('order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: false })
    .limit(1);

  const orderIndex = (existing?.[0]?.order_index ?? -1) + 1;

  const { data: module, error } = await supabaseAdmin
    .from('modules')
    .insert({
      course_id: courseId,
      title: data.title?.trim() || 'Untitled Module',
      description: data.description || null,
      order_index: orderIndex,
      is_published: data.is_published !== false,
    })
    .select()
    .single();

  if (error) throw error;

  if (course?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${course.bootcamp_id}`);
  }

  return module;
}

/**
 * Update a module.
 */
export async function updateModule(moduleId, data) {
  await requireAdmin();

  const { data: module, error } = await supabaseAdmin
    .from('modules')
    .update({
      title: data.title?.trim(),
      description: data.description,
      is_published: data.is_published,
    })
    .eq('id', moduleId)
    .select('*, course_id')
    .single();

  if (error) throw error;

  // Get bootcamp_id for revalidation
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('bootcamp_id')
    .eq('id', module.course_id)
    .single();

  if (course?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${course.bootcamp_id}`);
  }

  return module;
}

/**
 * Delete a module.
 */
export async function deleteModule(moduleId) {
  await requireAdmin();

  // Get course and bootcamp for revalidation
  const { data: module } = await supabaseAdmin
    .from('modules')
    .select('course_id, courses(bootcamp_id)')
    .eq('id', moduleId)
    .single();

  const { error } = await supabaseAdmin
    .from('modules')
    .delete()
    .eq('id', moduleId);

  if (error) throw error;

  if (module?.courses?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${module.courses.bootcamp_id}`);
  }

  return { success: true };
}

/**
 * Reorder modules within a course.
 */
export async function reorderModules(courseId, moduleIds) {
  await requireAdmin();

  // Use Promise.all for parallel updates
  const updates = moduleIds.map(
    (id, index) =>
      supabaseAdmin
        .from('modules')
        .update({ order_index: index })
        .eq('id', id)
        .eq('course_id', courseId) // Security: ensure module belongs to course
  );

  await Promise.all(updates);

  // Get bootcamp_id for revalidation
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('bootcamp_id')
    .eq('id', courseId)
    .single();

  if (course?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${course.bootcamp_id}`);
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSON ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new lesson within a module.
 */
export async function createLesson(moduleId, data) {
  await requireAdmin();

  // Get max order_index
  const { data: existing } = await supabaseAdmin
    .from('lessons')
    .select('order_index')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: false })
    .limit(1);

  const orderIndex = (existing?.[0]?.order_index ?? -1) + 1;

  // Process video source
  let videoId = data.video_id || null;
  let duration = data.duration || 0;

  if (data.video_source === 'drive' && videoId) {
    videoId = extractDriveFileId(videoId);

    // Try to get duration from Drive metadata
    if (videoId && !duration) {
      try {
        const metadata = await getFileMetadata(videoId);
        if (metadata.duration) {
          duration = metadata.duration;
        }
      } catch {
        // Ignore errors - duration is optional
      }
    }
  }

  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .insert({
      module_id: moduleId,
      title: data.title?.trim() || 'Untitled Lesson',
      description: data.description || null,
      content: data.content || null,
      video_source: data.video_source || 'none',
      video_id: videoId,
      video_url: data.video_url || null,
      duration: parseInt(duration) || 0,
      order_index: orderIndex,
      is_free_preview: data.is_free_preview === true,
      is_published: data.is_published !== false,
      attachments: data.attachments || [],
    })
    .select()
    .single();

  if (error) throw error;

  // Get bootcamp_id for revalidation
  const { data: module } = await supabaseAdmin
    .from('modules')
    .select('course_id, courses(bootcamp_id)')
    .eq('id', moduleId)
    .single();

  if (module?.courses?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${module.courses.bootcamp_id}`);
  }

  return lesson;
}

/**
 * Update a lesson.
 */
export async function updateLesson(lessonId, data) {
  await requireAdmin();

  // Process video source
  let videoId = data.video_id || null;
  let duration = data.duration;

  if (data.video_source === 'drive' && videoId) {
    videoId = extractDriveFileId(videoId);

    // Try to get duration from Drive metadata if not provided
    if (videoId && (duration === undefined || duration === null)) {
      try {
        const metadata = await getFileMetadata(videoId);
        if (metadata.duration) {
          duration = metadata.duration;
        }
      } catch {
        // Ignore errors
      }
    }
  }

  const updates = {
    title: data.title?.trim(),
    description: data.description,
    content: data.content,
    video_source: data.video_source,
    video_id: videoId,
    video_url: data.video_url,
    duration: duration !== undefined ? parseInt(duration) || 0 : undefined,
    is_free_preview: data.is_free_preview,
    is_published: data.is_published,
    attachments: data.attachments,
  };

  // Remove undefined values
  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) delete updates[key];
  });

  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .update(updates)
    .eq('id', lessonId)
    .select('*, module_id')
    .single();

  if (error) throw error;

  // Get bootcamp_id for revalidation
  const { data: module } = await supabaseAdmin
    .from('modules')
    .select('course_id, courses(bootcamp_id)')
    .eq('id', lesson.module_id)
    .single();

  if (module?.courses?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${module.courses.bootcamp_id}`);
  }

  return lesson;
}

/**
 * Delete a lesson.
 */
export async function deleteLesson(lessonId) {
  await requireAdmin();

  // Get module and bootcamp for revalidation
  const { data: lesson } = await supabaseAdmin
    .from('lessons')
    .select('module_id, modules(course_id, courses(bootcamp_id))')
    .eq('id', lessonId)
    .single();

  const { error } = await supabaseAdmin
    .from('lessons')
    .delete()
    .eq('id', lessonId);

  if (error) throw error;

  if (lesson?.modules?.courses?.bootcamp_id) {
    revalidatePath(
      `/account/admin/bootcamps/${lesson.modules.courses.bootcamp_id}`
    );
  }

  return { success: true };
}

/**
 * Reorder lessons within a module.
 */
export async function reorderLessons(moduleId, lessonIds) {
  await requireAdmin();

  // Use Promise.all for parallel updates
  const updates = lessonIds.map(
    (id, index) =>
      supabaseAdmin
        .from('lessons')
        .update({ order_index: index })
        .eq('id', id)
        .eq('module_id', moduleId) // Security: ensure lesson belongs to module
  );

  await Promise.all(updates);

  // Get bootcamp_id for revalidation
  const { data: mod } = await supabaseAdmin
    .from('modules')
    .select('course_id, courses(bootcamp_id)')
    .eq('id', moduleId)
    .single();

  if (mod?.courses?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${mod.courses.bootcamp_id}`);
  }

  return { success: true };
}

/**
 * Get a single lesson with full details.
 */
export async function getLesson(lessonId) {
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .select(
      `
      *,
      modules (
        id, title,
        courses (
          id, title,
          bootcamps (id, title, slug)
        )
      )
    `
    )
    .eq('id', lessonId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Validate a Google Drive video ID and return metadata.
 */
export async function validateDriveVideo(videoId) {
  try {
    const fileId = extractDriveFileId(videoId);
    if (!fileId) {
      return { valid: false, error: 'Invalid Drive URL or ID' };
    }

    const hasAccess = await canAccessFile(fileId);
    if (!hasAccess) {
      return {
        valid: false,
        error:
          "Cannot access file. Make sure it's shared with the service account.",
      };
    }

    const metadata = await getFileMetadata(fileId);
    return {
      valid: true,
      fileId,
      name: metadata.name,
      duration: metadata.duration,
      mimeType: metadata.mimeType,
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all enrollments for a bootcamp (admin).
 */
export async function getBootcampEnrollments(bootcampId) {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(
      `
      *,
      users (id, full_name, email, avatar_url)
    `
    )
    .eq('bootcamp_id', bootcampId)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get user's enrolled bootcamps.
 */
export async function getMyEnrollments() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(
      `
      *,
      bootcamps (
        id, title, slug, thumbnail, total_lessons, total_duration
      )
    `
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('last_accessed_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data;
}

/**
 * Enroll a user in a bootcamp.
 */
export async function enrollUser(bootcampId, userId = null) {
  // If no userId, use current user
  if (!userId) {
    userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
  } else {
    // Only admins can enroll other users
    await requireAdmin();
  }

  // Check if already enrolled
  const { data: existing } = await supabaseAdmin
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('bootcamp_id', bootcampId)
    .single();

  if (existing) {
    if (existing.status === 'active') {
      return { success: false, error: 'Already enrolled' };
    }
    // Reactivate cancelled enrollment
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .update({ status: 'active', enrolled_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, enrollment: data };
  }

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .insert({
      user_id: userId,
      bootcamp_id: bootcampId,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/account/member/bootcamps');
  return { success: true, enrollment: data };
}

/**
 * Cancel an enrollment.
 */
export async function cancelEnrollment(enrollmentId) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Users can cancel their own, admins can cancel any
  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select('user_id')
    .eq('id', enrollmentId)
    .single();

  if (enrollment?.user_id !== userId) {
    await requireAdmin();
  }

  const { error } = await supabaseAdmin
    .from('enrollments')
    .update({ status: 'cancelled' })
    .eq('id', enrollmentId);

  if (error) throw error;

  revalidatePath('/account/member/bootcamps');
  return { success: true };
}

/**
 * Update enrollment access timestamp.
 */
export async function updateEnrollmentAccess(bootcampId) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  await supabaseAdmin
    .from('enrollments')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('bootcamp_id', bootcampId);
}

/**
 * Check if current user is enrolled in a bootcamp.
 */
export async function checkEnrollment(bootcampId) {
  const userId = await getCurrentUserId();
  if (!userId) return { enrolled: false };

  const { data } = await supabaseAdmin
    .from('enrollments')
    .select('id, status, progress_percent')
    .eq('user_id', userId)
    .eq('bootcamp_id', bootcampId)
    .single();

  return {
    enrolled: data?.status === 'active',
    enrollment: data,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get user's progress for a bootcamp.
 */
export async function getBootcampProgress(bootcampId) {
  const userId = await getCurrentUserId();
  if (!userId) return { progress: [], lessonProgress: {} };

  const { data, error } = await supabaseAdmin
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('bootcamp_id', bootcampId);

  if (error) throw error;

  // Convert to a map for easy lookup
  const lessonProgress = {};
  data?.forEach((p) => {
    lessonProgress[p.lesson_id] = p;
  });

  return { progress: data || [], lessonProgress };
}

/**
 * Update lesson progress.
 */
export async function updateLessonProgress(lessonId, progressData) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Get bootcamp_id from lesson
  const { data: lesson } = await supabaseAdmin
    .from('lessons')
    .select('module_id, modules(course_id, courses(bootcamp_id))')
    .eq('id', lessonId)
    .single();

  if (!lesson?.modules?.courses?.bootcamp_id) {
    throw new Error('Lesson not found');
  }

  const bootcampId = lesson.modules.courses.bootcamp_id;

  // Upsert progress
  const { data, error } = await supabaseAdmin
    .from('user_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        bootcamp_id: bootcampId,
        watch_time: progressData.watch_time,
        last_position: progressData.last_position,
        is_completed: progressData.is_completed,
        completed_at: progressData.is_completed
          ? new Date().toISOString()
          : null,
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark a lesson as completed.
 */
export async function markLessonComplete(lessonId) {
  return updateLessonProgress(lessonId, { is_completed: true });
}

/**
 * Mark a lesson as incomplete.
 */
export async function markLessonIncomplete(lessonId) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabaseAdmin
    .from('user_progress')
    .update({
      is_completed: false,
      completed_at: null,
    })
    .eq('user_id', userId)
    .eq('lesson_id', lessonId);

  if (error) throw error;
  return { success: true };
}

/**
 * Save lesson notes.
 */
export async function saveLessonNotes(lessonId, notes) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Get bootcamp_id
  const { data: lesson } = await supabaseAdmin
    .from('lessons')
    .select('module_id, modules(course_id, courses(bootcamp_id))')
    .eq('id', lessonId)
    .single();

  if (!lesson?.modules?.courses?.bootcamp_id) {
    throw new Error('Lesson not found');
  }

  const { data, error } = await supabaseAdmin
    .from('user_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        bootcamp_id: lesson.modules.courses.bootcamp_id,
        notes,
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENROLLMENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search users for enrollment (admin only).
 */
export async function searchUsersForEnrollment(bootcampId, query) {
  await requireAdmin();

  if (!query || query.length < 2) return [];

  // Search users by email or name
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, avatar_url')
    .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;

  // Get already enrolled user IDs
  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('user_id')
    .eq('bootcamp_id', bootcampId)
    .in('status', ['active', 'pending']);

  const enrolledIds = new Set(enrollments?.map((e) => e.user_id) || []);

  // Filter out already enrolled users
  return users.filter((u) => !enrolledIds.has(u.id));
}

/**
 * Admin add enrollment (can add multiple users at once).
 */
export async function adminAddEnrollment(bootcampId, userIds) {
  await requireAdmin();

  const ids = Array.isArray(userIds) ? userIds : [userIds];

  const enrollments = ids.map((userId) => ({
    user_id: userId,
    bootcamp_id: bootcampId,
    status: 'active',
    enrolled_at: new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .upsert(enrollments, { onConflict: 'user_id,bootcamp_id' }).select(`
      *,
      users (id, full_name, email, avatar_url)
    `);

  if (error) throw error;

  revalidatePath(`/account/admin/bootcamps/${bootcampId}`);
  revalidatePath('/account/member/bootcamps');

  return { success: true, enrollments: data };
}

/**
 * Admin update enrollment status.
 */
export async function adminUpdateEnrollmentStatus(enrollmentId, status) {
  await requireAdmin();

  const validStatuses = [
    'active',
    'pending',
    'cancelled',
    'expired',
    'completed',
  ];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .update({ status })
    .eq('id', enrollmentId)
    .select(
      `
      *,
      users (id, full_name, email, avatar_url)
    `
    )
    .single();

  if (error) throw error;

  revalidatePath(`/account/admin/bootcamps/${data.bootcamp_id}`);
  revalidatePath('/account/member/bootcamps');

  return { success: true, enrollment: data };
}

/**
 * Admin remove enrollment (hard delete).
 */
export async function adminRemoveEnrollment(enrollmentId) {
  await requireAdmin();

  // Get bootcamp_id before deletion for revalidation
  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select('bootcamp_id, user_id')
    .eq('id', enrollmentId)
    .single();

  // Delete user progress for this enrollment
  if (enrollment) {
    await supabaseAdmin
      .from('user_progress')
      .delete()
      .eq('user_id', enrollment.user_id)
      .eq('bootcamp_id', enrollment.bootcamp_id);
  }

  const { error } = await supabaseAdmin
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId);

  if (error) throw error;

  if (enrollment?.bootcamp_id) {
    revalidatePath(`/account/admin/bootcamps/${enrollment.bootcamp_id}`);
  }
  revalidatePath('/account/member/bootcamps');

  return { success: true };
}

/**
 * Get enrollments with detailed progress for admin.
 */
export async function getEnrollmentsWithProgress(bootcampId) {
  await requireAdmin();

  // Get bootcamp total lessons count
  const { data: bootcamp } = await supabaseAdmin
    .from('bootcamps')
    .select('total_lessons')
    .eq('id', bootcampId)
    .single();

  const totalLessons = bootcamp?.total_lessons || 0;

  // Get enrollments
  const { data: enrollments, error } = await supabaseAdmin
    .from('enrollments')
    .select(
      `
      *,
      users (id, full_name, email, avatar_url)
    `
    )
    .eq('bootcamp_id', bootcampId)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;

  // Get progress counts for each user
  const userIds = enrollments.map((e) => e.user_id);

  if (userIds.length === 0) {
    return { enrollments: [], totalLessons };
  }

  // Get completed lessons per user
  const { data: progressData } = await supabaseAdmin
    .from('user_progress')
    .select('user_id, is_completed')
    .eq('bootcamp_id', bootcampId)
    .eq('is_completed', true)
    .in('user_id', userIds);

  // Count completed lessons per user
  const completedMap = {};
  progressData?.forEach((p) => {
    completedMap[p.user_id] = (completedMap[p.user_id] || 0) + 1;
  });

  // Merge progress into enrollments
  const enrichedEnrollments = enrollments.map((enrollment) => ({
    ...enrollment,
    completed_lessons: completedMap[enrollment.user_id] || 0,
    progress_percent:
      totalLessons > 0
        ? Math.round(
            ((completedMap[enrollment.user_id] || 0) / totalLessons) * 100
          )
        : 0,
  }));

  return { enrollments: enrichedEnrollments, totalLessons };
}

/**
 * Export enrollments to CSV format.
 */
export async function exportEnrollmentsCSV(bootcampId) {
  await requireAdmin();

  const { enrollments, totalLessons } =
    await getEnrollmentsWithProgress(bootcampId);

  // Get bootcamp info
  const { data: bootcamp } = await supabaseAdmin
    .from('bootcamps')
    .select('title')
    .eq('id', bootcampId)
    .single();

  // Build CSV
  const headers = [
    'Name',
    'Email',
    'Status',
    'Enrolled Date',
    'Last Accessed',
    'Completed Lessons',
    'Total Lessons',
    'Progress %',
  ];

  const rows = enrollments.map((e) => [
    e.users?.full_name || 'N/A',
    e.users?.email || 'N/A',
    e.status,
    e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : 'N/A',
    e.last_accessed_at
      ? new Date(e.last_accessed_at).toLocaleDateString()
      : 'Never',
    e.completed_lessons,
    totalLessons,
    `${e.progress_percent}%`,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return {
    csv,
    filename: `${bootcamp?.title || 'bootcamp'}-enrollments-${new Date().toISOString().split('T')[0]}.csv`,
  };
}

/**
 * Get enrollment statistics for a bootcamp.
 */
export async function getEnrollmentStats(bootcampId) {
  await requireAdmin();

  const { data: enrollments, error } = await supabaseAdmin
    .from('enrollments')
    .select('status, enrolled_at')
    .eq('bootcamp_id', bootcampId);

  if (error) throw error;

  const stats = {
    total: enrollments.length,
    active: 0,
    pending: 0,
    cancelled: 0,
    completed: 0,
    thisWeek: 0,
    thisMonth: 0,
  };

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  enrollments.forEach((e) => {
    stats[e.status] = (stats[e.status] || 0) + 1;

    const enrolledAt = new Date(e.enrolled_at);
    if (enrolledAt >= oneWeekAgo) stats.thisWeek++;
    if (enrolledAt >= oneMonthAgo) stats.thisMonth++;
  });

  return stats;
}
