/**
 * @file Help Desk Discussion Actions
 * Server actions for the Help Desk / Discussion system.
 * Supports both member and staff operations with role-based permissions.
 *
 * @module discussion-actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from './supabase';
import { requireActionSession } from './action-guard';
import { sanitizeText, sanitizeRichText } from './validation';
import {
  getDiscussions,
  getDiscussionWithReplies,
  getUserDiscussionStats,
  getStaffDiscussionStats,
  getDiscussionsForKanban,
  getFeatureRequests,
  updateDiscussionStatus,
  assignDiscussion,
  updateDiscussionPriority,
  createStaffReply,
  markReplyAsAccepted,
  logDiscussionActivity,
  getFAQs,
  searchFAQs,
  getAssignableStaff,
  createHelpDeskThread,
  getUserBootcampEnrollments,
  getResolvedDiscussions,
  createDiscussionReply,
  voteOnThread,
  voteOnReply,
  removeVote,
} from './data-service';
import {
  CHARACTER_LIMITS,
  DISCUSSION_TYPE_KEYS,
  DISCUSSION_STATUS_KEYS,
  DISCUSSION_PRIORITY_KEYS,
  STAFF_ROLES,
} from './discussion-config';

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get user's highest role from the database.
 */
async function getUserRole(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role:roles(name)')
    .eq('user_id', userId);

  if (error || !data?.length) return 'member';

  // Role priority: admin > mentor > advisor > executive > member
  const rolePriority = ['admin', 'mentor', 'advisor', 'executive', 'member'];
  const userRoles = data.map((r) => r.role?.name).filter(Boolean);

  for (const role of rolePriority) {
    if (userRoles.includes(role)) return role;
  }

  return 'member';
}

/**
 * Check if user is staff member.
 */
async function isStaffUser(userId) {
  const role = await getUserRole(userId);
  return STAFF_ROLES.includes(role);
}

/**
 * Revalidate discussion paths.
 */
function revalidateDiscussionPaths() {
  revalidatePath('/account/member/discussions');
  revalidatePath('/account/admin/discussions');
  revalidatePath('/account/mentor/discussions');
  revalidatePath('/account/advisor/discussions');
  revalidatePath('/account/executive/discussions');
}

// ─── Member Actions ───────────────────────────────────────────────────────────

/**
 * Create a new help desk discussion thread.
 */
export async function createDiscussionAction({
  title,
  content,
  type,
  bootcampId = null,
  courseId = null,
  moduleId = null,
  lessonId = null,
  platform = 'web',
  tags = [],
  categoryId = null,
}) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  // Validation
  if (!title?.trim()) {
    return { error: 'Title is required.' };
  }
  if (!content?.trim()) {
    return { error: 'Content is required.' };
  }
  if (title.trim().length < CHARACTER_LIMITS.TITLE_MIN) {
    return {
      error: `Title must be at least ${CHARACTER_LIMITS.TITLE_MIN} characters.`,
    };
  }
  if (content.trim().length < CHARACTER_LIMITS.CONTENT_MIN) {
    return {
      error: `Content must be at least ${CHARACTER_LIMITS.CONTENT_MIN} characters.`,
    };
  }
  if (!DISCUSSION_TYPE_KEYS.includes(type)) {
    return { error: 'Invalid discussion type.' };
  }

  const sanitizedTitle = sanitizeText(title, CHARACTER_LIMITS.TITLE_MAX);
  const sanitizedContent = sanitizeRichText(
    content,
    CHARACTER_LIMITS.CONTENT_MAX
  );

  const parsedTags = Array.isArray(tags)
    ? tags
        .map((t) => sanitizeText(t, 50))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  try {
    const thread = await createHelpDeskThread({
      title: sanitizedTitle,
      content: sanitizedContent,
      author_id: userId,
      type,
      bootcamp_id: bootcampId,
      course_id: courseId,
      module_id: moduleId,
      lesson_id: lessonId,
      platform,
      tags: parsedTags,
      category_id: categoryId,
    });

    revalidateDiscussionPaths();
    return { success: true, thread };
  } catch (err) {
    console.error('Error creating discussion:', err);
    return { error: 'Failed to create discussion. Please try again.' };
  }
}

/**
 * Update own discussion thread (for members).
 */
export async function updateDiscussionAction({
  threadId,
  title,
  content,
  type,
  tags,
}) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId) return { error: 'Missing thread ID.' };

  // Verify ownership
  const { data: thread, error: fetchError } = await supabaseAdmin
    .from('discussion_threads')
    .select('author_id, status')
    .eq('id', threadId)
    .single();

  if (fetchError || !thread) {
    return { error: 'Discussion not found.' };
  }

  if (thread.author_id !== userId) {
    return { error: 'You can only edit your own discussions.' };
  }

  // Cannot edit resolved/closed discussions
  if (['resolved', 'closed'].includes(thread.status)) {
    return { error: 'Cannot edit a resolved or closed discussion.' };
  }

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (title?.trim()) {
    updates.title = sanitizeText(title, CHARACTER_LIMITS.TITLE_MAX);
  }
  if (content?.trim()) {
    updates.content = sanitizeRichText(content, CHARACTER_LIMITS.CONTENT_MAX);
  }
  if (type && DISCUSSION_TYPE_KEYS.includes(type)) {
    updates.type = type;
  }
  if (Array.isArray(tags)) {
    updates.tags = tags
      .map((t) => sanitizeText(t, 50))
      .filter(Boolean)
      .slice(0, 10);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('discussion_threads')
      .update(updates)
      .eq('id', threadId)
      .select()
      .single();

    if (error) throw error;

    await logDiscussionActivity(threadId, userId, 'edited', {});
    revalidateDiscussionPaths();
    return { success: true, thread: data };
  } catch (err) {
    console.error('Error updating discussion:', err);
    return { error: 'Failed to update discussion.' };
  }
}

/**
 * Delete own discussion thread (for members).
 */
export async function deleteDiscussionAction({ threadId }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId) return { error: 'Missing thread ID.' };

  // Check if user is staff (can delete any) or owner
  const role = await getUserRole(userId);
  const isStaff = STAFF_ROLES.includes(role);

  const { data: thread, error: fetchError } = await supabaseAdmin
    .from('discussion_threads')
    .select('author_id')
    .eq('id', threadId)
    .single();

  if (fetchError || !thread) {
    return { error: 'Discussion not found.' };
  }

  if (!isStaff && thread.author_id !== userId) {
    return { error: 'You can only delete your own discussions.' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('discussion_threads')
      .delete()
      .eq('id', threadId);

    if (error) throw error;

    revalidateDiscussionPaths();
    return { success: true };
  } catch (err) {
    console.error('Error deleting discussion:', err);
    return { error: 'Failed to delete discussion.' };
  }
}

/**
 * Create a reply to a discussion.
 */
export async function createReplyAction({
  threadId,
  content,
  parentId = null,
}) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId) return { error: 'Missing thread ID.' };
  if (!content?.trim()) return { error: 'Reply content is required.' };

  if (content.trim().length < CHARACTER_LIMITS.REPLY_MIN) {
    return {
      error: `Reply must be at least ${CHARACTER_LIMITS.REPLY_MIN} characters.`,
    };
  }

  const sanitizedContent = sanitizeRichText(
    content,
    CHARACTER_LIMITS.REPLY_MAX
  );

  // Check if thread is locked
  const { data: thread, error: threadError } = await supabaseAdmin
    .from('discussion_threads')
    .select('is_locked, status')
    .eq('id', threadId)
    .single();

  if (threadError || !thread) {
    return { error: 'Discussion not found.' };
  }

  if (thread.is_locked) {
    return {
      error: 'This discussion is locked and cannot receive new replies.',
    };
  }

  // Check user role for staff badge
  const role = await getUserRole(userId);
  const isStaff = STAFF_ROLES.includes(role);

  try {
    let reply;
    if (isStaff) {
      reply = await createStaffReply(
        {
          thread_id: threadId,
          author_id: userId,
          content: sanitizedContent,
          parent_id: parentId,
        },
        role
      );
    } else {
      reply = await createDiscussionReply({
        thread_id: threadId,
        author_id: userId,
        content: sanitizedContent,
        parent_id: parentId,
      });

      // Log activity for member replies
      await logDiscussionActivity(threadId, userId, 'replied', {
        reply_id: reply.id,
        is_staff: false,
      });
    }

    revalidateDiscussionPaths();
    return { success: true, reply };
  } catch (err) {
    console.error('Error creating reply:', err);
    return { error: 'Failed to post reply.' };
  }
}

/**
 * Delete a reply.
 */
export async function deleteReplyAction({ replyId }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!replyId) return { error: 'Missing reply ID.' };

  const role = await getUserRole(userId);
  const isStaff = STAFF_ROLES.includes(role);

  const { data: reply, error: fetchError } = await supabaseAdmin
    .from('discussion_replies')
    .select('author_id, thread_id')
    .eq('id', replyId)
    .single();

  if (fetchError || !reply) {
    return { error: 'Reply not found.' };
  }

  if (!isStaff && reply.author_id !== userId) {
    return { error: 'You can only delete your own replies.' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('discussion_replies')
      .delete()
      .eq('id', replyId);

    if (error) throw error;

    revalidateDiscussionPaths();
    return { success: true };
  } catch (err) {
    console.error('Error deleting reply:', err);
    return { error: 'Failed to delete reply.' };
  }
}

/**
 * Vote on a thread.
 */
export async function voteThreadAction({ threadId, voteType, currentVote }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId) return { error: 'Missing thread ID.' };

  try {
    if (currentVote === voteType) {
      await removeVote(userId, threadId, null);
    } else {
      await voteOnThread(userId, threadId, voteType);
    }
    revalidateDiscussionPaths();
    return { success: true };
  } catch {
    return { error: 'Failed to vote.' };
  }
}

/**
 * Vote on a reply.
 */
export async function voteReplyAction({ replyId, voteType, currentVote }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!replyId) return { error: 'Missing reply ID.' };

  try {
    if (currentVote === voteType) {
      await removeVote(userId, null, replyId);
    } else {
      await voteOnReply(userId, replyId, voteType);
    }
    revalidateDiscussionPaths();
    return { success: true };
  } catch {
    return { error: 'Failed to vote.' };
  }
}

/**
 * Mark a reply as accepted answer (thread author only).
 */
export async function markAcceptedAnswerAction({ replyId, threadId }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!replyId || !threadId) {
    return { error: 'Missing reply or thread ID.' };
  }

  // Verify thread ownership
  const { data: thread, error: threadError } = await supabaseAdmin
    .from('discussion_threads')
    .select('author_id')
    .eq('id', threadId)
    .single();

  if (threadError || !thread) {
    return { error: 'Discussion not found.' };
  }

  if (thread.author_id !== userId) {
    return { error: 'Only the discussion author can mark an accepted answer.' };
  }

  try {
    await markReplyAsAccepted(replyId, threadId, userId);
    revalidateDiscussionPaths();
    return { success: true };
  } catch (err) {
    console.error('Error marking accepted answer:', err);
    return { error: 'Failed to mark accepted answer.' };
  }
}

// ─── Staff Actions ────────────────────────────────────────────────────────────

/**
 * Update discussion status (staff only).
 */
export async function updateStatusAction({ threadId, status }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId || !status) {
    return { error: 'Missing thread ID or status.' };
  }

  if (!DISCUSSION_STATUS_KEYS.includes(status)) {
    return { error: 'Invalid status.' };
  }

  // Verify staff role
  const isStaff = await isStaffUser(userId);
  if (!isStaff) {
    return { error: 'Staff access required.' };
  }

  try {
    const thread = await updateDiscussionStatus(threadId, status, userId);
    revalidateDiscussionPaths();
    return { success: true, thread };
  } catch (err) {
    console.error('Error updating status:', err);
    return { error: 'Failed to update status.' };
  }
}

/**
 * Assign discussion to a staff member (staff only).
 */
export async function assignDiscussionAction({ threadId, assigneeId }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId) return { error: 'Missing thread ID.' };

  // Verify staff role
  const isStaff = await isStaffUser(userId);
  if (!isStaff) {
    return { error: 'Staff access required.' };
  }

  try {
    const thread = await assignDiscussion(threadId, assigneeId, userId);
    revalidateDiscussionPaths();
    return { success: true, thread };
  } catch (err) {
    console.error('Error assigning discussion:', err);
    return { error: 'Failed to assign discussion.' };
  }
}

/**
 * Update discussion priority (staff only).
 */
export async function updatePriorityAction({ threadId, priority }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId || !priority) {
    return { error: 'Missing thread ID or priority.' };
  }

  if (!DISCUSSION_PRIORITY_KEYS.includes(priority)) {
    return { error: 'Invalid priority.' };
  }

  // Verify staff role
  const isStaff = await isStaffUser(userId);
  if (!isStaff) {
    return { error: 'Staff access required.' };
  }

  try {
    const thread = await updateDiscussionPriority(threadId, priority, userId);
    revalidateDiscussionPaths();
    return { success: true, thread };
  } catch (err) {
    console.error('Error updating priority:', err);
    return { error: 'Failed to update priority.' };
  }
}

/**
 * Pin or unpin a discussion (staff only).
 */
export async function togglePinAction({ threadId, isPinned }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId) return { error: 'Missing thread ID.' };

  // Verify staff role
  const isStaff = await isStaffUser(userId);
  if (!isStaff) {
    return { error: 'Staff access required.' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('discussion_threads')
      .update({
        is_pinned: isPinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId)
      .select()
      .single();

    if (error) throw error;

    revalidateDiscussionPaths();
    return { success: true, thread: data };
  } catch (err) {
    console.error('Error toggling pin:', err);
    return { error: 'Failed to update pin status.' };
  }
}

/**
 * Lock or unlock a discussion (staff only).
 */
export async function toggleLockAction({ threadId, isLocked }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!threadId) return { error: 'Missing thread ID.' };

  // Verify staff role
  const isStaff = await isStaffUser(userId);
  if (!isStaff) {
    return { error: 'Staff access required.' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('discussion_threads')
      .update({
        is_locked: isLocked,
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId)
      .select()
      .single();

    if (error) throw error;

    revalidateDiscussionPaths();
    return { success: true, thread: data };
  } catch (err) {
    console.error('Error toggling lock:', err);
    return { error: 'Failed to update lock status.' };
  }
}

// ─── Data Fetch Actions ───────────────────────────────────────────────────────

/**
 * Fetch discussions with filters.
 */
export async function fetchDiscussionsAction(filters = {}) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  try {
    const result = await getDiscussions({
      ...filters,
      userId,
    });
    return { success: true, ...result };
  } catch (err) {
    console.error('Error fetching discussions:', err.message || err);
    return {
      error: `Failed to fetch discussions: ${err.message || 'Please try again'}`,
    };
  }
}

/**
 * Fetch a single discussion with replies and activity.
 */
export async function fetchDiscussionDetailAction({ threadId }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };

  if (!threadId) return { error: 'Missing thread ID.' };

  try {
    const thread = await getDiscussionWithReplies(threadId);

    // Increment view count
    await supabaseAdmin
      .from('discussion_threads')
      .update({ views: (thread.views || 0) + 1 })
      .eq('id', threadId);

    return { success: true, thread };
  } catch (err) {
    console.error('Error fetching discussion detail:', err);
    return {
      error: err.message || 'Failed to fetch discussion. Please try again.',
    };
  }
}

/**
 * Fetch user's discussion statistics.
 */
export async function fetchUserStatsAction() {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  try {
    const stats = await getUserDiscussionStats(userId);
    return { success: true, stats };
  } catch (err) {
    console.error('Error fetching user stats:', err);
    return {
      error: err.message || 'Failed to fetch statistics. Please try again.',
    };
  }
}

/**
 * Fetch staff discussion statistics (staff only).
 */
export async function fetchStaffStatsAction() {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  // Verify staff role
  const isStaff = await isStaffUser(userId);
  if (!isStaff) {
    return { error: 'Staff access required.' };
  }

  try {
    const stats = await getStaffDiscussionStats();
    return { success: true, stats };
  } catch (err) {
    console.error('Error fetching staff stats:', err);
    return {
      error: err.message || 'Failed to fetch statistics. Please try again.',
    };
  }
}

/**
 * Fetch discussions for Kanban view (staff only).
 */
export async function fetchKanbanAction(filters = {}) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  // Verify staff role
  const isStaff = await isStaffUser(userId);
  if (!isStaff) {
    return { error: 'Staff access required.' };
  }

  try {
    const grouped = await getDiscussionsForKanban(filters);
    return { success: true, grouped };
  } catch (err) {
    console.error('Error fetching kanban data:', err);
    return {
      error: err.message || 'Failed to fetch kanban data. Please try again.',
    };
  }
}

/**
 * Fetch feature requests.
 */
export async function fetchFeatureRequestsAction(filters = {}) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };

  try {
    const result = await getFeatureRequests(filters);
    return { success: true, ...result };
  } catch (err) {
    console.error('Error fetching feature requests:', err);
    return {
      error:
        err.message || 'Failed to fetch feature requests. Please try again.',
    };
  }
}

/**
 * Fetch resolved discussions for release log.
 */
export async function fetchReleaseLogAction(filters = {}) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };

  try {
    const result = await getResolvedDiscussions(filters);
    return { success: true, ...result };
  } catch (err) {
    console.error('Error fetching release log:', err);
    return {
      error: err.message || 'Failed to fetch release log. Please try again.',
    };
  }
}

/**
 * Fetch FAQs for self-troubleshoot tab.
 */
export async function fetchFAQsAction() {
  try {
    const faqs = await getFAQs();
    return { success: true, faqs };
  } catch (err) {
    console.error('Error fetching FAQs:', err);
    return { error: err.message || 'Failed to fetch FAQs. Please try again.' };
  }
}

/**
 * Search FAQs.
 */
export async function searchFAQsAction({ query }) {
  if (!query?.trim()) {
    return { error: 'Search query is required.' };
  }

  try {
    const results = await searchFAQs(query.trim());
    return { success: true, results };
  } catch (err) {
    console.error('Error searching FAQs:', err);
    return { error: err.message || 'Failed to search FAQs. Please try again.' };
  }
}

/**
 * Fetch assignable staff members (staff only).
 */
export async function fetchAssignableStaffAction() {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  // Verify staff role
  const isStaff = await isStaffUser(userId);
  if (!isStaff) {
    return { error: 'Staff access required.' };
  }

  try {
    const staff = await getAssignableStaff();
    return { success: true, staff };
  } catch (err) {
    console.error('Error fetching staff:', err);
    return {
      error: err.message || 'Failed to fetch staff members. Please try again.',
    };
  }
}

/**
 * Fetch user's bootcamp enrollments for LMS context.
 */
export async function fetchUserBootcampsAction() {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  try {
    const bootcamps = await getUserBootcampEnrollments(userId);
    return { success: true, bootcamps };
  } catch (err) {
    console.error('Error fetching bootcamps:', err);
    return {
      error: err.message || 'Failed to fetch bootcamps. Please try again.',
    };
  }
}
