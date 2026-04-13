/**
 * @file application actions
 * @module application-actions
 */

'use server';

import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath } from 'next/cache';
import { requireAdmin, createLogger } from '@/app/_lib/helpers';
import {
  isV2SchemaAvailable,
  upsertUserHandleV2,
} from '@/app/_lib/problem-solving-v2-helpers';

const logActivity = createLogger('join_request');

function revalidate() {
  revalidatePath('/account/admin/applications');
  revalidatePath('/account/admin/users');
  revalidatePath('/account/admin/roles');
  revalidatePath('/account');
  revalidatePath('/committee');
}

// =============================================================================
// APPROVE APPLICATION
// =============================================================================

export async function approveApplicationAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Application ID is required.' };

  // 1. Update the join_request
  const { data: joinRequest, error: jrError } = await supabaseAdmin
    .from('join_requests')
    .update({
      status: 'approved',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (jrError || !joinRequest)
    return { error: jrError?.message || 'Failed to update request.' };

  // 2. Find the associated user account by email to upgrade their role
  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id, account_status')
    .eq('email', joinRequest.email)
    .single();

  if (userErr || !user) {
    return { error: 'User account not found for this email.' };
  }

  const userId = user.id;

  // 3. Create or update the member_profile
  const interests = joinRequest.interests
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
        student_id: joinRequest.student_id,
        academic_session: joinRequest.batch,
        department: joinRequest.department,
        github: joinRequest.github || null,
        interests,
        join_reason: joinRequest.reason || null,
        approved: true,
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (profileError) return { error: profileError.message };

  // Save codeforces handle to user_handles (V2 schema)
  if (joinRequest.codeforces_handle) {
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

  // 4. Look up Member role ID
  const { data: memberRole, error: roleLookupErr } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', 'member')
    .single();

  if (roleLookupErr || !memberRole) return { error: 'Member role not found.' };

  // 5. Update roles (Remove guest, assign member)
  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  const { error: roleInsertErr } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: memberRole.id,
      assigned_by: admin.id,
    });

  if (roleInsertErr) return { error: roleInsertErr.message };

  // 6. Ensure user account is active with updated reason
  await supabaseAdmin
    .from('users')
    .update({
      account_status: 'active',
      status_reason: 'membership application accepted',
      status_changed_by: admin.id,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // 7. Send an account system message
  try {
    await supabaseAdmin.from('account_messages').insert({
      user_id: userId,
      sender_id: admin.id,
      is_admin: true,
      message:
        'Congratulations! Your membership application has been approved.',
    });
  } catch (e) {}

  await logActivity(admin.id, 'application_approved', id, {
    applicant_email: joinRequest.email,
    applicant_name: joinRequest.name,
  });

  revalidate();
  return { success: true };
}

// =============================================================================
// REJECT APPLICATION
// =============================================================================

export async function rejectApplicationAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  const rejection_reason = formData.get('rejection_reason')?.trim() || null;
  if (!id) return { error: 'Application ID is required.' };

  const { data, error } = await supabaseAdmin
    .from('join_requests')
    .update({
      status: 'rejected',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(admin.id, 'application_rejected', id, {
    applicant_email: data.email,
    reason: rejection_reason,
  });
  revalidate();
  return { success: true };
}

// =============================================================================
// RESET TO PENDING
// =============================================================================

export async function resetApplicationAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Application ID is required.' };

  const { error } = await supabaseAdmin
    .from('join_requests')
    .update({
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'application_reset', id);
  revalidate();
  return { success: true };
}

// =============================================================================
// DELETE APPLICATION
// =============================================================================

export async function deleteApplicationAction(formData) {
  const admin = await requireAdmin();

  const id = formData.get('id');
  if (!id) return { error: 'Application ID is required.' };

  const { error } = await supabaseAdmin
    .from('join_requests')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'application_deleted', id);
  revalidate();
  return { success: true };
}

// =============================================================================
// BULK ACTIONS
// =============================================================================

export async function bulkApproveApplicationsAction(formData) {
  const admin = await requireAdmin();

  const idsRaw = formData.get('ids');
  if (!idsRaw) return { error: 'No IDs provided.' };

  let ids;
  try {
    ids = JSON.parse(idsRaw);
  } catch {
    return { error: 'Invalid IDs format.' };
  }
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No IDs.' };

  let successCount = 0;

  for (const id of ids) {
    const fd = new FormData();
    fd.set('id', id);
    const res = await approveApplicationAction(fd);
    if (res.success) successCount++;
  }

  await logActivity(admin.id, 'applications_bulk_approved', null, {
    count: successCount,
  });

  revalidate();
  return { success: true, updated: successCount };
}

export async function bulkRejectApplicationsAction(formData) {
  const admin = await requireAdmin();

  const idsRaw = formData.get('ids');
  const rejection_reason = formData.get('rejection_reason')?.trim() || null;
  if (!idsRaw) return { error: 'No IDs provided.' };

  let ids;
  try {
    ids = JSON.parse(idsRaw);
  } catch {
    return { error: 'Invalid IDs format.' };
  }
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No IDs.' };

  const { error } = await supabaseAdmin
    .from('join_requests')
    .update({
      status: 'rejected',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason,
    })
    .in('id', ids);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'applications_bulk_rejected', null, {
    count: ids.length,
  });
  revalidate();
  return { success: true, updated: ids.length };
}

export async function bulkDeleteApplicationsAction(formData) {
  const admin = await requireAdmin();

  const idsRaw = formData.get('ids');
  if (!idsRaw) return { error: 'No IDs provided.' };

  let ids;
  try {
    ids = JSON.parse(idsRaw);
  } catch {
    return { error: 'Invalid IDs format.' };
  }
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No IDs.' };

  const { error } = await supabaseAdmin
    .from('join_requests')
    .delete()
    .in('id', ids);

  if (error) return { error: error.message };

  await logActivity(admin.id, 'applications_bulk_deleted', null, {
    count: ids.length,
  });
  revalidate();
  return { success: true, deleted: ids.length };
}
