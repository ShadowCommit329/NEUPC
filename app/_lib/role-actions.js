/**
 * @file role actions
 * @module role-actions
 */

'use server';

import { auth } from '@/app/_lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { supabaseAdmin } from '@/app/_lib/supabase';

// ─── helpers ────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('id, account_status')
    .eq('email', session.user.email)
    .single();

  if (!userData) throw new Error('User not found');

  // Ensure the admin account itself is active
  if (userData.account_status !== 'active') {
    throw new Error('Admin account is not active');
  }

  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name, priority)')
    .eq('user_id', userData.id);

  const adminRole = roles?.find((r) => r.roles?.name === 'admin');
  if (!adminRole) throw new Error('Unauthorized: Admin access required');

  return {
    adminId: userData.id,
    adminPriority: adminRole.roles?.priority ?? 6,
  };
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
// ─── role description update ─────────────────────────────────

export async function updateRoleDescriptionAction(formData) {
  const { adminId } = await requireAdmin();
  const roleId = formData.get('roleId');
  const description = formData.get('description')?.trim();

  if (!roleId) throw new Error('Role ID is required');
  if (!description) throw new Error('Description cannot be empty');

  const { error } = await supabaseAdmin
    .from('roles')
    .update({ description })
    .eq('id', roleId);

  if (error) throw new Error(error.message);

  await logActivity(adminId, 'update_role_description', 'role', roleId, {
    description,
  });

  revalidatePath('/account/admin/roles');
  return { success: true };
}

// ─── permission toggle ────────────────────────────────────────

export async function toggleRolePermissionAction(formData) {
  const { adminId } = await requireAdmin();
  const roleId = formData.get('roleId');
  const permissionId = formData.get('permissionId');
  const action = formData.get('action'); // 'add' | 'remove'

  if (!roleId || !permissionId)
    throw new Error('Missing roleId or permissionId');
  if (!['add', 'remove'].includes(action)) throw new Error('Invalid action');

  if (action === 'add') {
    // Upsert-style: ignore duplicate
    const { error } = await supabaseAdmin
      .from('role_permissions')
      .insert({ role_id: roleId, permission_id: permissionId });

    if (error && !error.message?.toLowerCase().includes('duplicate')) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabaseAdmin
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);

    if (error) throw new Error(error.message);
  }

  await logActivity(adminId, `permission_${action}`, 'role', roleId, {
    permissionId,
  });

  revalidatePath('/account/admin/roles');
  return { success: true };
}

// ─── assign role to user ──────────────────────────────────────

export async function assignRoleToUserAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  const roleId = formData.get('roleId');
  const roleName = String(formData.get('roleName') || '').toLowerCase();
  const managedRoles = ['member', 'advisor', 'admin', 'mentor', 'executive'];
  const assignableRoles = [...managedRoles, 'guest'];

  async function updateOrInsertByUserId(table, payload) {
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from(table)
      .update(payload)
      .eq('user_id', userId)
      .select('id');

    if (updateError) throw new Error(updateError.message);

    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertError } = await supabaseAdmin
        .from(table)
        .insert({ user_id: userId, ...payload });
      if (insertError) throw new Error(insertError.message);
    }
  }

  if (!userId || !roleId) throw new Error('Missing userId or roleId');

  if (!assignableRoles.includes(roleName)) {
    throw new Error(
      'Invalid role. Allowed roles: guest, member, advisor, admin, mentor, executive.'
    );
  }

  const { data: roleRows, error: roleRowsError } = await supabaseAdmin
    .from('roles')
    .select('id, name')
    .in('name', [...managedRoles, 'guest']);
  if (roleRowsError) throw new Error(roleRowsError.message);

  // Multi-role support: do not remove existing roles when assigning a new one.

  // Ensure selected role is assigned.
  const { data: existing } = await supabaseAdmin
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .maybeSingle();

  if (!existing) {
    const { error: assignError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role_id: roleId, assigned_by: adminId });
    if (assignError) throw new Error(assignError.message);
  }

  // Role-specific profile upsert (mandatory fields validated per role)
  if (roleName === 'member') {
    const studentId =
      formData.get('student_id')?.toString().trim() ||
      formData.get('studentId')?.toString().trim() ||
      '';
    const academicSession =
      formData.get('academic_session')?.toString().trim() ||
      formData.get('session')?.toString().trim() ||
      '';
    const department = formData.get('department')?.toString().trim() || '';

    if (!studentId || !academicSession || !department) {
      throw new Error(
        'Member role requires student_id, academic_session, and department.'
      );
    }

    const { error: memberProfileError } = await supabaseAdmin
      .from('member_profiles')
      .upsert(
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

    if (memberProfileError) throw new Error(memberProfileError.message);
  }

  if (roleName === 'advisor') {
    const position = formData.get('position')?.toString().trim() || '';
    const profileLink = formData.get('profile_link')?.toString().trim() || '';
    const department = formData.get('department')?.toString().trim() || '';

    if (!position || !profileLink || !department) {
      throw new Error(
        'Advisor role requires position, profile_link, and department.'
      );
    }

    await updateOrInsertByUserId('advisor_profiles', {
      position,
      profile_link: profileLink,
      department,
    });
  }

  if (roleName === 'admin') {
    const bio = formData.get('bio')?.toString().trim() || '';
    await updateOrInsertByUserId('admin_profiles', { bio });
  }

  if (roleName === 'mentor') {
    const bio = formData.get('bio')?.toString().trim() || '';
    await updateOrInsertByUserId('mentor_profiles', { bio });
  }

  if (roleName === 'executive') {
    const positionId = formData.get('position_id')?.toString().trim() || '';
    const termStart = formData.get('term_start')?.toString().trim() || '';
    const termEnd = formData.get('term_end')?.toString().trim() || '';
    const isCurrentRaw =
      formData.get('is_current')?.toString().trim().toLowerCase() || 'true';
    const bio = formData.get('bio')?.toString().trim() || '';

    if (!positionId || !termStart || !termEnd) {
      throw new Error(
        'Executive role requires position_id, term_start, term_end, and is_current.'
      );
    }

    await updateOrInsertByUserId('committee_members', {
      position_id: positionId,
      term_start: termStart,
      term_end: termEnd,
      is_current: !['false', '0', 'no'].includes(isCurrentRaw),
      bio,
      updated_at: new Date().toISOString(),
    });
  }

  await logActivity(adminId, 'assign_role', 'user', userId, {
    roleId,
    roleName,
  });

  // Send account message to user about role assignment
  const roleDisplayName = roleName.charAt(0).toUpperCase() + roleName.slice(1);
  await insertAccountMessage(
    userId,
    adminId,
    `Your account has been assigned the "${roleDisplayName}" role.`
  );

  revalidatePath('/account/admin/roles');
  revalidatePath('/account/admin/users');
  revalidatePath('/account');
  revalidatePath('/committee');
  revalidateTag('committee');
  return { success: true };
}

// ─── remove role from user ────────────────────────────────────

export async function removeRoleFromUserAction(formData) {
  const { adminId } = await requireAdmin();
  const userId = formData.get('userId');
  const roleId = formData.get('roleId');
  const roleName = String(formData.get('roleName') || '').toLowerCase();

  if (!userId || !roleId) throw new Error('Missing userId or roleId');

  const { error } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);

  if (error) throw new Error(error.message);

  // Clean role-specific profile rows when role is removed.
  if (roleName === 'member') {
    await supabaseAdmin.from('member_profiles').delete().eq('user_id', userId);
  } else if (roleName === 'advisor') {
    await supabaseAdmin.from('advisor_profiles').delete().eq('user_id', userId);
  } else if (roleName === 'admin') {
    await supabaseAdmin.from('admin_profiles').delete().eq('user_id', userId);
  } else if (roleName === 'mentor') {
    await supabaseAdmin.from('mentor_profiles').delete().eq('user_id', userId);
  } else if (roleName === 'executive') {
    await supabaseAdmin
      .from('committee_members')
      .delete()
      .eq('user_id', userId);
  }

  await logActivity(adminId, 'remove_role', 'user', userId, {
    roleId,
    roleName,
  });

  // Send account message to user about role removal
  const roleDisplayName = roleName.charAt(0).toUpperCase() + roleName.slice(1);
  await insertAccountMessage(
    userId,
    adminId,
    `Your "${roleDisplayName}" role has been removed.`
  );

  revalidatePath('/account/admin/roles');
  revalidatePath('/account/admin/users');
  revalidatePath('/account');
  revalidatePath('/committee');
  revalidateTag('committee');
  return { success: true };
}
