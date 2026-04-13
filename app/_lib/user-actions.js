/**
 * @file user actions
 * @module user-actions
 */

'use server';

import { auth } from '@/app/_lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { uploadToDrive } from '@/app/_lib/gdrive';
import crypto from 'crypto';
import {
  isV2SchemaAvailable,
  upsertUserHandleV2,
  deleteUserHandleV2,
  getUserHandlesV2,
  V2_TABLES,
} from '@/app/_lib/problem-solving-v2-helpers';

// ─── helpers ────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('id, account_status, is_online')
    .eq('email', session.user.email)
    .single();

  if (!userData) throw new Error('User not found');

  // Ensure the admin account itself is active
  if (userData.account_status !== 'active') {
    throw new Error('Admin account is not active');
  }

  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userData.id);

  const roleNames = roles?.map((r) => r.roles?.name) || [];
  if (!roleNames.includes('admin')) throw new Error('Unauthorized');

  return { adminId: userData.id };
}

/** Prevent admins from performing destructive actions on themselves. */
function preventSelfAction(adminId, targetUserId, actionName = 'action') {
  if (adminId === targetUserId) {
    throw new Error(`You cannot ${actionName} your own account.`);
  }
}

async function logActivity(userId, action, entityType, entityId, details = {}) {
  try {
    await supabaseAdmin.from('activity_logs').insert([
      {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      },
    ]);
  } catch (_) {}
}

/**
 * Append an admin message to the bidirectional account_messages thread.
 * Fire-and-forget — never throws so it can't break the parent action.
 */
async function insertAccountMessage(userId, senderId, message) {
  try {
    await supabaseAdmin.from('account_messages').insert({
      user_id: userId,
      sender_id: senderId,
      is_admin: true,
      message,
    });
  } catch (_) {}
}

// ─── actions ────────────────────────────────────────────────

export async function suspendUserAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  preventSelfAction(adminId, userId, 'suspend');
  const reason = formData.get('reason') || 'Suspended by admin';
  const expiresAt = formData.get('expiresAt');

  if (!expiresAt) throw new Error('Suspension expiry date is required.');

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'suspended',
      status_reason: reason,
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      suspension_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  await logActivity(adminId, 'suspend_user', 'user', userId, {
    reason,
    expiresAt,
  });
  await insertAccountMessage(userId, adminId, reason);
  revalidatePath('/account/admin/users');
  revalidatePath('/account');
  return { success: true };
}

export async function activateUserAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  const reason = formData.get('reason') || 'Account activated by admin';

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'active',
      status_reason: reason,
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      suspension_expires_at: null,
      is_online: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  await logActivity(adminId, 'activate_user', 'user', userId, { reason });
  await insertAccountMessage(userId, adminId, reason);
  revalidatePath('/account/admin/users');
  revalidatePath('/account');
  return { success: true };
}

export async function banUserAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  preventSelfAction(adminId, userId, 'ban');
  const reason = formData.get('reason') || 'Banned by admin';

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'banned',
      status_reason: reason,
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      is_online: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  await logActivity(adminId, 'ban_user', 'user', userId, { reason });
  await insertAccountMessage(userId, adminId, reason);
  revalidatePath('/account/admin/users');
  revalidatePath('/account');
  return { success: true };
}

export async function deleteUserAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  preventSelfAction(adminId, userId, 'delete');
  const reason = formData.get('reason') || 'Account deleted by admin';

  // ── Step 1: Reassign NOT-NULL FK references to admin (content must survive) ──
  await Promise.allSettled([
    supabaseAdmin
      .from('events')
      .update({ created_by: adminId })
      .eq('created_by', userId),
    supabaseAdmin
      .from('notices')
      .update({ created_by: adminId })
      .eq('created_by', userId),
    supabaseAdmin
      .from('weekly_tasks')
      .update({ assigned_by: adminId })
      .eq('assigned_by', userId),
  ]);

  // ── Step 2: Nullify nullable FK references ──
  await Promise.allSettled([
    supabaseAdmin
      .from('achievements')
      .update({ created_by: null })
      .eq('created_by', userId),
    supabaseAdmin
      .from('activity_logs')
      .update({ user_id: null })
      .eq('user_id', userId),
    supabaseAdmin
      .from('budget_entries')
      .update({ created_by: null })
      .eq('created_by', userId),
    supabaseAdmin
      .from('budget_entries')
      .update({ approved_by: null })
      .eq('approved_by', userId),
    supabaseAdmin
      .from('contact_submissions')
      .update({ replied_by: null })
      .eq('replied_by', userId),
    supabaseAdmin
      .from('contests')
      .update({ created_by: null })
      .eq('created_by', userId),
    supabaseAdmin
      .from('events')
      .update({ approved_by: null })
      .eq('approved_by', userId),
    supabaseAdmin
      .from('gallery_items')
      .update({ uploaded_by: null })
      .eq('uploaded_by', userId),
    supabaseAdmin
      .from('event_gallery')
      .update({ uploaded_by: null })
      .eq('uploaded_by', userId),
    supabaseAdmin
      .from('journey_items')
      .update({ created_by: null })
      .eq('created_by', userId),
    supabaseAdmin
      .from('resources')
      .update({ created_by: null })
      .eq('created_by', userId),
    supabaseAdmin
      .from('roadmaps')
      .update({ created_by: null })
      .eq('created_by', userId),
    supabaseAdmin
      .from('task_submissions')
      .update({ reviewed_by: null })
      .eq('reviewed_by', userId),
    supabaseAdmin
      .from('user_roles')
      .update({ assigned_by: null })
      .eq('assigned_by', userId),
    supabaseAdmin
      .from('website_settings')
      .update({ updated_by: null })
      .eq('updated_by', userId),
    supabaseAdmin
      .from('certificates')
      .update({ issued_by: null })
      .eq('issued_by', userId),
    supabaseAdmin
      .from('chat_conversations')
      .update({ assigned_to: null })
      .eq('assigned_to', userId),
    supabaseAdmin
      .from('join_requests')
      .update({ reviewed_by: null })
      .eq('reviewed_by', userId),
    supabaseAdmin
      .from('mentorship_sessions')
      .update({ created_by: null })
      .eq('created_by', userId),
    supabaseAdmin
      .from('participation_records')
      .update({ created_by: null })
      .eq('created_by', userId),
    supabaseAdmin
      .from('participation_records')
      .update({ user_id: null })
      .eq('user_id', userId),
  ]);

  // ── Step 3: Delete user-owned leaf rows ──
  await Promise.allSettled([
    supabaseAdmin.from('notifications').delete().eq('user_id', userId),
    supabaseAdmin.from('account_messages').delete().eq('user_id', userId),
    supabaseAdmin.from('account_messages').delete().eq('sender_id', userId),
    supabaseAdmin.from('discussion_votes').delete().eq('user_id', userId),
    supabaseAdmin.from('contest_participants').delete().eq('user_id', userId),
    supabaseAdmin.from('event_registrations').delete().eq('user_id', userId),
    supabaseAdmin
      .from('event_registration_members')
      .delete()
      .eq('user_id', userId),
    supabaseAdmin.from('chat_participants').delete().eq('user_id', userId),
    supabaseAdmin.from('member_achievements').delete().eq('user_id', userId),
    supabaseAdmin.from('member_progress').delete().eq('user_id', userId),
    supabaseAdmin
      .from('mentorships')
      .delete()
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`),
    supabaseAdmin.from('task_submissions').delete().eq('user_id', userId),
    supabaseAdmin.from('committee_members').delete().eq('user_id', userId),
    supabaseAdmin.from('event_organizers').delete().eq('user_id', userId),
    supabaseAdmin.from('certificates').delete().eq('recipient_id', userId),
    supabaseAdmin.from('blog_comments').delete().eq('user_id', userId),
  ]);

  // ── Step 4: Delete authored content (NOT NULL FK — must go before user row) ──
  // Replies before threads (self-referencing parent_id)
  await supabaseAdmin
    .from('discussion_replies')
    .delete()
    .eq('author_id', userId);
  await supabaseAdmin
    .from('discussion_threads')
    .delete()
    .eq('author_id', userId);

  // Chat: delete messages & participants for conversations created by user, then the conversations
  const { data: userConvs } = await supabaseAdmin
    .from('chat_conversations')
    .select('id')
    .eq('created_by', userId);
  if (userConvs?.length) {
    const convIds = userConvs.map((c) => c.id);
    await supabaseAdmin
      .from('chat_messages')
      .delete()
      .in('conversation_id', convIds);
    await supabaseAdmin
      .from('chat_participants')
      .delete()
      .in('conversation_id', convIds);
    await supabaseAdmin
      .from('chat_conversations')
      .delete()
      .eq('created_by', userId);
  }
  // Remaining chat messages sent by the user in other conversations
  await supabaseAdmin.from('chat_messages').delete().eq('sender_id', userId);

  // Blog: delete all comments on user's posts, then the posts
  const { data: userPosts } = await supabaseAdmin
    .from('blog_posts')
    .select('id')
    .eq('author_id', userId);
  if (userPosts?.length) {
    const postIds = userPosts.map((p) => p.id);
    await supabaseAdmin.from('blog_comments').delete().in('blog_id', postIds);
    await supabaseAdmin.from('blog_posts').delete().eq('author_id', userId);
  }

  // ── Step 5: Delete user roles & all profile records ──
  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  await supabaseAdmin.from('member_profiles').delete().eq('user_id', userId);
  await supabaseAdmin.from('advisor_profiles').delete().eq('user_id', userId);
  await supabaseAdmin.from('admin_profiles').delete().eq('user_id', userId);
  await supabaseAdmin.from('mentor_profiles').delete().eq('user_id', userId);

  // ── Step 6: Delete from public.users ──
  const { error: userDeleteError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);
  if (userDeleteError)
    throw new Error(`Failed to delete user record: ${userDeleteError.message}`);

  // ── Step 7: Delete from Supabase Auth ──
  const { error: authDeleteError } =
    await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError)
    throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);

  await logActivity(adminId, 'delete_user', 'user', userId, { reason });
  revalidatePath('/account/admin/users');
  revalidatePath('/account');
  return { success: true };
}

export async function changeUserRoleAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  preventSelfAction(adminId, userId, 'change the role of');
  const newRole = formData.get('role');

  // Get role id
  const { data: roleData, error: roleErr } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', newRole)
    .single();

  if (roleErr || !roleData) throw new Error(`Invalid role: ${newRole}`);

  // Replace all existing roles with the new one
  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);

  // If the new role is not member, clean up any existing member_profiles
  if (newRole !== 'member') {
    await supabaseAdmin.from('member_profiles').delete().eq('user_id', userId);
  }

  const { error } = await supabaseAdmin
    .from('user_roles')
    .insert({ user_id: userId, role_id: roleData.id, assigned_by: adminId });

  if (error) throw new Error(error.message);
  await logActivity(adminId, 'change_role', 'user', userId, { newRole });
  revalidatePath('/account/admin/users');
  revalidatePath('/account/admin/roles');
  revalidatePath('/account/admin/applications');
  revalidatePath('/account');
  revalidatePath('/committee');
  revalidateTag('committee');
  return { success: true };
}

// Guest approval: activate account + assign guest role (no member_profiles touch)
export async function approveMemberAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');

  const { error: userError } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'active',
      is_online: true,
      status_reason: 'guest application accepted',
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (userError) throw new Error(userError.message);

  // Dynamically look up guest role ID
  const { data: guestRole, error: guestRoleErr } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', 'guest')
    .single();
  if (guestRoleErr || !guestRole)
    throw new Error('Guest role not found in roles table');

  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
    user_id: userId,
    role_id: guestRole.id,
    assigned_by: adminId,
  });
  if (roleError) throw new Error(roleError.message);

  await logActivity(adminId, 'approve_guest', 'user', userId, {});
  await insertAccountMessage(
    userId,
    adminId,
    'Your account access has been approved. Welcome!'
  );
  revalidatePath('/account/admin/users');
  revalidatePath('/account/admin/applications');
  revalidatePath('/account');
  return { success: true };
}

// Membership approval: fetch join_request data → build full member_profiles + activate account + assign member role
export async function approveMembershipAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');

  // Get user email to look up their join_request
  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (!userRecord) throw new Error('User not found');

  // Fetch latest pending join_request for this user
  const { data: joinRequest } = await supabaseAdmin
    .from('join_requests')
    .select('*')
    .eq('email', userRecord.email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Build full member_profiles from join_request data
  const interests = joinRequest?.interests
    ? joinRequest.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const { error: profileError } = await supabaseAdmin
    .from('member_profiles')
    .upsert(
      {
        user_id: userId,
        student_id: joinRequest?.student_id,
        academic_session: joinRequest?.batch,
        department: joinRequest?.department,
        github: joinRequest?.github || null,
        interests,
        join_reason: joinRequest?.reason || null,
        approved: true,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (profileError) throw new Error(profileError.message);

  // Save codeforces handle to user_handles (V2 schema)
  if (joinRequest?.codeforces_handle) {
    const useV2 = await isV2SchemaAvailable();
    if (useV2) {
      await upsertUserHandleV2(
        userId,
        'codeforces',
        joinRequest.codeforces_handle
      );
    } else {
      // Legacy fallback
      await supabaseAdmin.from('user_handles').upsert(
        {
          user_id: userId,
          platform: 'codeforces',
          handle: joinRequest.codeforces_handle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );
    }
  }

  // Mark join_request as approved
  if (joinRequest?.id) {
    await supabaseAdmin
      .from('join_requests')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', joinRequest.id);
  }

  // Ensure account is active and member status reason is explicit.
  await supabaseAdmin
    .from('users')
    .update({
      account_status: 'active',
      is_online: true,
      status_reason: 'membership application accepted',
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Dynamically look up member role ID
  const { data: memberRole, error: memberRoleErr } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', 'member')
    .single();
  if (memberRoleErr || !memberRole)
    throw new Error('Member role not found in roles table');

  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
    user_id: userId,
    role_id: memberRole.id,
    assigned_by: adminId,
  });
  if (roleError) throw new Error(roleError.message);

  await logActivity(
    adminId,
    'approve_membership',
    'member_profile',
    userId,
    {}
  );
  revalidatePath('/account/admin/users');
  revalidatePath('/account/admin/applications');
  revalidatePath('/account');
  revalidatePath('/account/advisor/approvals');
  revalidatePath('/account/executive/members');
  await insertAccountMessage(
    userId,
    adminId,
    'Congratulations! Your membership application has been approved.'
  );
  revalidatePath('/committee');
  revalidateTag('committee');
  return { success: true };
}

// Guest rejection: set account_status to rejected — no member_profiles touch
export async function rejectGuestAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  const reason = formData.get('reason') || 'Guest application rejected';

  const { error: userError } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'rejected',
      status_reason: reason,
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (userError) throw new Error(userError.message);

  await logActivity(adminId, 'reject_guest', 'user', userId, { reason });
  await insertAccountMessage(userId, adminId, reason);
  revalidatePath('/account/admin/users');
  revalidatePath('/account/admin/applications');
  revalidatePath('/account');
  return { success: true };
}

export async function rejectMemberAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  const reason = formData.get('reason') || 'Membership application rejected';

  // Fetch email first before any destructive operations
  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  // Remove the member_profiles record entirely
  const { error } = await supabaseAdmin
    .from('member_profiles')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  // Note: account_status is NOT changed here — the user remains an active guest.
  // Rejecting a membership application does not revoke their guest status.

  // Mark the latest pending join_request as rejected
  if (userRecord?.email) {
    await supabaseAdmin
      .from('join_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('email', userRecord.email)
      .eq('status', 'pending');
  }

  await logActivity(adminId, 'reject_member', 'member_profile', userId, {
    reason,
  });
  await insertAccountMessage(userId, adminId, reason);
  revalidatePath('/account/admin/users');
  revalidatePath('/account/admin/applications');
  revalidatePath('/account');
  revalidatePath('/account/advisor/approvals');
  return { success: true };
}
export async function lockUserAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  preventSelfAction(adminId, userId, 'lock');
  const reason = formData.get('reason');

  if (!reason) throw new Error('Reason is required to lock an account.');

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'locked',
      status_reason: reason,
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      is_online: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  await logActivity(adminId, 'lock_user', 'user', userId, { reason });
  await insertAccountMessage(userId, adminId, reason);
  revalidatePath('/account/admin/users');
  revalidatePath('/account');
  return { success: true };
}

export async function getUserProfileForAdminAction(userId) {
  const { adminId } = await requireAdmin();
  if (!userId) throw new Error('User ID is required');

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select(
      'id, full_name, email, avatar_url, phone, account_status, status_reason'
    )
    .eq('id', userId)
    .single();

  if (userError) throw new Error(userError.message);

  // Fetch all user roles
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId);
  const roles = userRoles?.map((r) => r.roles?.name).filter(Boolean) || [];

  // Fetch all role-specific profiles
  const { data: memberProfile } = await supabaseAdmin
    .from('member_profiles')
    .select('student_id, academic_session, department, bio, github, linkedin')
    .eq('user_id', userId)
    .maybeSingle();

  // Fetch handles from user_handles (V2 schema with fallback)
  let userHandles = [];
  const useV2 = await isV2SchemaAvailable();
  if (useV2) {
    try {
      userHandles = await getUserHandlesV2(userId);
    } catch (e) {
      console.error('[user-actions] V2 handles fetch failed:', e.message);
    }
  } else {
    const { data } = await supabaseAdmin
      .from('user_handles')
      .select('platform, handle')
      .eq('user_id', userId);
    userHandles = data || [];
  }

  // Merge handles into memberProfile for backward compatibility
  const handlesMap = {};
  (userHandles || []).forEach((h) => {
    handlesMap[`${h.platform}_handle`] = h.handle;
  });

  const { data: advisorProfile } = await supabaseAdmin
    .from('advisor_profiles')
    .select('position, profile_link, department')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: adminProfile } = await supabaseAdmin
    .from('admin_profiles')
    .select('bio')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: mentorProfile } = await supabaseAdmin
    .from('mentor_profiles')
    .select('bio')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: committeeProfile } = await supabaseAdmin
    .from('committee_members')
    .select('bio, position_id, term_start, term_end, is_current')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    ...user,
    roles,
    member_profile: memberProfile ? { ...memberProfile, ...handlesMap } : null,
    advisor_profile: advisorProfile || null,
    admin_profile: adminProfile || null,
    mentor_profile: mentorProfile || null,
    committee_profile: committeeProfile || null,
  };
}

export async function updateUserAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');

  // ── User fields ──
  const name = formData.get('name');
  const email = formData.get('email');
  const avatar_url = formData.get('avatar');
  const phone = formData.get('phone');

  const updates = { updated_at: new Date().toISOString() };
  if (name !== null) updates.full_name = name;
  if (email !== null) updates.email = email;
  if (avatar_url !== null) updates.avatar_url = avatar_url;
  if (phone !== null) updates.phone = phone;

  // ── Account status update ──
  let newStatus = formData.get('account_status');
  if (newStatus && newStatus.toLowerCase() === 'inactive')
    newStatus = 'inActive';
  const statusReason = formData.get('status_reason');
  if (newStatus) {
    if (!statusReason || !String(statusReason).trim()) {
      throw new Error(
        'Status reason is required when updating account status.'
      );
    }
    updates.account_status = newStatus;
    updates.status_reason = String(statusReason).trim();
    updates.status_changed_by = adminId;
    updates.status_changed_at = new Date().toISOString();
    if (newStatus === 'active') {
      updates.is_online = true;
      updates.suspension_expires_at = null;
    } else {
      updates.is_online = false;
    }
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) throw new Error(error.message);

  // ── member_profiles ──
  let memberProfileUpdated = false;
  if (
    formData.has('studentId') ||
    formData.has('academic_session') ||
    formData.has('session') ||
    formData.has('department')
  ) {
    const profileUpdates = { updated_at: new Date().toISOString() };
    const studentId = formData.get('studentId');
    const sessionValue =
      formData.get('academic_session') ?? formData.get('session');
    const department = formData.get('department');
    const bio = formData.get('bio');
    const github = formData.get('github');
    const linkedin = formData.get('linkedin');

    if (studentId !== null) profileUpdates.student_id = studentId;
    if (sessionValue !== null) profileUpdates.academic_session = sessionValue;
    if (department !== null) profileUpdates.department = department;
    if (bio !== null) profileUpdates.bio = bio;
    if (github !== null) profileUpdates.github = github;
    if (linkedin !== null) profileUpdates.linkedin = linkedin;

    const { error: profileError } = await supabaseAdmin
      .from('member_profiles')
      .upsert(
        { user_id: userId, ...profileUpdates },
        { onConflict: 'user_id' }
      );

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Member profile update error:', profileError);
    } else {
      memberProfileUpdated = true;
    }

    // Save handles to user_handles (V2 schema)
    const handleFields = {
      codeforces: formData.get('codeforces_handle'),
      vjudge: formData.get('vjudge_handle'),
      atcoder: formData.get('atcoder_handle'),
      leetcode: formData.get('leetcode_handle'),
    };

    const useV2Handles = await isV2SchemaAvailable();
    for (const [platform, handle] of Object.entries(handleFields)) {
      if (handle !== null) {
        const trimmed = handle.trim();
        if (trimmed) {
          if (useV2Handles) {
            await upsertUserHandleV2(userId, platform, trimmed);
          } else {
            await supabaseAdmin.from('user_handles').upsert(
              {
                user_id: userId,
                platform,
                handle: trimmed,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,platform' }
            );
          }
        } else {
          // Remove handle if cleared
          if (useV2Handles) {
            await deleteUserHandleV2(userId, platform);
          } else {
            await supabaseAdmin
              .from('user_handles')
              .delete()
              .eq('user_id', userId)
              .eq('platform', platform);
          }
        }
      }
    }
  }

  // ── advisor_profiles ──
  let advisorProfileUpdated = false;
  if (
    formData.has('advisor_position') ||
    formData.has('advisor_department') ||
    formData.has('advisor_profile_link')
  ) {
    const advisorUpdates = {
      user_id: userId,
      position: formData.get('advisor_position') || '',
      profile_link: formData.get('advisor_profile_link') || '',
      department: formData.get('advisor_department') || '',
    };

    const { error: advisorError } = await supabaseAdmin
      .from('advisor_profiles')
      .upsert(advisorUpdates, { onConflict: 'user_id' });

    if (advisorError) {
      console.error('Advisor profile upsert error:', advisorError);
    } else {
      advisorProfileUpdated = true;
    }
  }

  // ── admin_profiles ──
  let adminProfileUpdated = false;
  if (formData.has('admin_bio')) {
    const { error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .upsert(
        { user_id: userId, bio: formData.get('admin_bio') || '' },
        { onConflict: 'user_id' }
      );

    if (adminError) {
      console.error('Admin profile upsert error:', adminError);
    } else {
      adminProfileUpdated = true;
    }
  }

  // ── mentor_profiles ──
  let mentorProfileUpdated = false;
  if (formData.has('mentor_bio')) {
    const { error: mentorError } = await supabaseAdmin
      .from('mentor_profiles')
      .upsert(
        { user_id: userId, bio: formData.get('mentor_bio') || '' },
        { onConflict: 'user_id' }
      );

    if (mentorError) {
      console.error('Mentor profile upsert error:', mentorError);
    } else {
      mentorProfileUpdated = true;
    }
  }

  // ── committee_members (executive) ──
  let executiveProfileUpdated = false;
  if (
    formData.has('committee_position_id') ||
    formData.has('committee_term_start')
  ) {
    const committeeUpdates = {
      user_id: userId,
      position_id: formData.get('committee_position_id') || null,
      term_start: formData.get('committee_term_start') || null,
      term_end: formData.get('committee_term_end') || null,
      is_current: formData.get('committee_is_current') === 'true',
      bio: formData.get('committee_bio') || '',
    };

    const { error: committeeError } = await supabaseAdmin
      .from('committee_members')
      .upsert(committeeUpdates, { onConflict: 'user_id' });

    if (committeeError) {
      console.error('Committee member upsert error:', committeeError);
    } else {
      executiveProfileUpdated = true;
    }
  }

  await logActivity(adminId, 'update_user', 'user', userId, { updates });

  // Send account messages for profile updates
  if (memberProfileUpdated) {
    await insertAccountMessage(
      userId,
      adminId,
      'Your member profile information has been updated.'
    );
  }
  if (advisorProfileUpdated) {
    await insertAccountMessage(
      userId,
      adminId,
      'Your advisor profile information has been updated.'
    );
  }
  if (adminProfileUpdated) {
    await insertAccountMessage(
      userId,
      adminId,
      'Your admin profile information has been updated.'
    );
  }
  if (mentorProfileUpdated) {
    await insertAccountMessage(
      userId,
      adminId,
      'Your mentor profile information has been updated.'
    );
  }
  if (executiveProfileUpdated) {
    await insertAccountMessage(
      userId,
      adminId,
      'Your executive/committee profile information has been updated.'
    );
  }

  // Send account message if status was changed
  if (newStatus) {
    const statusDisplayName =
      newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    await insertAccountMessage(
      userId,
      adminId,
      `Your account status has been changed to "${statusDisplayName}". Reason: ${statusReason}`
    );
  }

  revalidatePath('/account/admin/users');
  revalidatePath('/account/admin/applications');
  revalidatePath('/account');
  revalidatePath('/committee');
  revalidateTag('committee');
  return { success: true };
}

export async function submitMembershipApplicationAction(formData) {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');

  // Resolve user id from email
  const { data: user, error: userLookupErr } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, account_status')
    .eq('email', session.user.email)
    .single();
  if (userLookupErr || !user) throw new Error('User not found');

  // Only active users who have the 'guest' role can submit membership applications
  if (user.account_status !== 'active') {
    throw new Error(
      'Your account must be active to submit a membership application.'
    );
  }

  const { data: userRoles, error: rolesErr } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  if (rolesErr) throw new Error('Could not verify user roles');
  const roleNames = userRoles.map((r) => r.roles?.name);
  if (!roleNames.includes('guest')) {
    throw new Error(
      'Only guests can submit a membership application. Active members do not need to apply.'
    );
  }

  const userId = user.id;

  // Form fields
  const studentId = formData.get('student_id')?.trim();
  const academicSession =
    formData.get('session')?.trim() || formData.get('batch')?.trim();
  const department = formData.get('department')?.trim();
  const phone = formData.get('phone')?.trim() || null;
  const semester = formData.get('semester')?.trim() || null;
  const cgpa = formData.get('cgpa') ? parseFloat(formData.get('cgpa')) : null;
  const github = formData.get('github')?.trim() || null;
  const linkedin = formData.get('linkedin')?.trim() || null;
  const codeforces = formData.get('codeforces_handle')?.trim() || null;
  const vjudge = formData.get('vjudge_handle')?.trim() || null;
  const atcoder = formData.get('atcoder_handle')?.trim() || null;
  const leetcode = formData.get('leetcode_handle')?.trim() || null;
  const reason = formData.get('reason')?.trim() || null;
  const interestsRaw = formData.get('interests')?.trim() || null;
  const interests = interestsRaw
    ? interestsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  if (!studentId || !academicSession || !department) {
    throw new Error('Student ID, session, and department are required.');
  }

  // 1. Insert or update join_request
  const joinRequestId = formData.get('joinRequestId')?.trim() || null;

  if (joinRequestId) {
    // Update the existing pending request
    const { error: jrError } = await supabaseAdmin
      .from('join_requests')
      .update({
        student_id: studentId,
        batch: academicSession,
        department,
        phone,
        interests: interestsRaw,
        codeforces_handle: codeforces,
        github,
        reason,
        status: 'pending',
      })
      .eq('id', joinRequestId);
    if (jrError) throw new Error(jrError.message);
  } else {
    // Insert a new request
    const { error: jrError } = await supabaseAdmin
      .from('join_requests')
      .insert({
        full_name: user.full_name || session.user.name,
        email: user.email,
        student_id: studentId,
        batch: academicSession,
        department,
        phone,
        interests: interestsRaw,
        codeforces_handle: codeforces,
        github,
        reason,
        status: 'pending',
      });
    if (jrError) throw new Error(jrError.message);
  }

  // 2. Insert minimal member_profiles stub so admin can see pending applications
  const { error: mpError } = await supabaseAdmin.from('member_profiles').upsert(
    {
      user_id: userId,
      student_id: studentId,
      academic_session: academicSession,
      department,
      approved: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (mpError) throw new Error(mpError.message);

  revalidatePath('/account/guest/membership-application');
  revalidatePath('/account/admin/users');
  revalidatePath('/account/admin/applications');
  revalidatePath('/account/advisor/approvals');
  revalidatePath('/account/executive/members');
  return { success: true };
}

// ═════════════════════════════════════════════════════════════════════════════
// UPLOAD USER AVATAR IMAGE
// ═════════════════════════════════════════════════════════════════════════════

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Upload a user avatar image to Google Drive and return the URL.
 * Requires admin permissions.
 *
 * @param {FormData} formData - Must contain 'file' (image) and 'userId' (for logging)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadUserImageAction(formData) {
  const { adminId } = await requireAdmin();

  const file = formData.get('file');
  const userId = formData.get('userId');

  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'No image provided.' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Image type not supported. Use JPEG, PNG, WebP, or GIF.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `avatar_${userId}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

  let url, fileId;
  try {
    const arrayBuffer = await file.arrayBuffer();
    ({ url, fileId } = await uploadToDrive(
      Buffer.from(arrayBuffer),
      filename,
      file.type,
      'user-avatars'
    ));
  } catch (err) {
    console.error('Google Drive user avatar upload error:', err);
    return { error: 'Failed to upload image. Please try again.' };
  }

  await logActivity(adminId, 'user_avatar_uploaded', 'user', userId, {
    filename: file.name,
    fileId,
  });

  return { success: true, url };
}

export async function verifyUserEmailAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  const emailTemplate = formData.get('emailTemplate') || '';

  const { data: user, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('email, full_name, account_status, email_verified')
    .eq('id', userId)
    .single();

  if (fetchErr || !user) throw new Error('User not found');
  if (user.account_status === 'active' && user.email_verified) {
    return { success: true, message: 'Already active and verified' };
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';
  const verificationLink = `${siteUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const { error: updateErr } = await supabaseAdmin
    .from('users')
    .update({
      verification_token: verificationToken,
      email_verified: false,
      status_reason: 'verification email sent',
      status_changed_by: adminId,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateErr) throw new Error(updateErr.message);

  const { sendActivationEmailForUser } =
    await import('@/app/_lib/email-service');
  const emailResult = await sendActivationEmailForUser(
    userId,
    verificationLink,
    String(emailTemplate)
  );

  await logActivity(adminId, 'send_verification_email', 'user', userId, {
    emailSent: !!emailResult?.success,
    hasCustomTemplate: !!String(emailTemplate).trim(),
  });
  revalidatePath('/account/admin/users');
  return {
    success: true,
    emailSent: !!emailResult?.success,
    verificationLink,
  };
}

export async function sendCustomEmailAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  const subject = formData.get('subject');
  const message = formData.get('message');

  if (!userId || !subject || !message) {
    throw new Error('Missing required fields (userId, subject, message).');
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (error || !user?.email) {
    throw new Error('Could not find user email.');
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">NEUPC Updates</h1>
        </div>
        <div style="padding: 24px; font-size: 16px; color: #374151; line-height: 1.6;">
          ${message.replace(/\n/g, '<br />')}
        </div>
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} NEUPC. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  const { sendCustomEmail } = await import('@/app/_lib/email-service');
  return sendCustomEmail(user.email, subject, htmlContent);
}
