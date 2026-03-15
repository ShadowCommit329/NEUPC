/**
 * @file Committee actions
 * @module committee-actions
 */

'use server';

import { auth } from '@/app/_lib/auth';
import {
  addCommitteeMember,
  createCommitteePosition,
  deleteCommitteePosition,
  removeCommitteeMember,
  updateCommitteeMember,
  updateCommitteePosition,
} from '@/app/_lib/data-service';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) throw new Error('Not authenticated');

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, account_status')
    .eq('email', session.user.email)
    .single();

  if (userError || !userData) throw new Error('User not found');
  if (userData.account_status !== 'active') {
    throw new Error('Account is not active');
  }

  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userData.id);

  if (roleError) throw new Error(roleError.message);
  const isAdmin = roleRows?.some((row) => row.roles?.name === 'admin');
  if (!isAdmin) throw new Error('Unauthorized');

  return userData.id;
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
  } catch {
    // Ignore logging errors to avoid blocking admin operations.
  }
}

function revalidateCommitteeViews() {
  revalidatePath('/account/advisor');
  revalidatePath('/account/advisor/committee');
  revalidatePath('/account/admin/committee');
  revalidatePath('/committee');
  revalidateTag('committee');
}

export async function createCommitteePositionAction(formData) {
  const adminId = await requireAdmin();

  const title = formData.get('title')?.toString().trim();
  const category = formData.get('category')?.toString().trim();
  if (!title) throw new Error('Position title is required');
  if (!category) throw new Error('Position category is required');

  const displayOrderRaw = formData.get('display_order')?.toString().trim();
  const rankRaw = formData.get('rank')?.toString().trim();

  const position = await createCommitteePosition({
    title,
    category,
    display_order: displayOrderRaw ? Number(displayOrderRaw) : 0,
    rank: rankRaw ? Number(rankRaw) : null,
    responsibilities:
      formData.get('responsibilities')?.toString().trim() || null,
  });

  await logActivity(
    adminId,
    'create_committee_position',
    'committee_position',
    position.id,
    {
      title,
      category,
    }
  );

  revalidateCommitteeViews();
}

export async function updateCommitteePositionAction(formData) {
  const adminId = await requireAdmin();

  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Position id is required');

  const title = formData.get('title')?.toString().trim();
  const category = formData.get('category')?.toString().trim();
  if (!title) throw new Error('Position title is required');
  if (!category) throw new Error('Position category is required');

  const displayOrderRaw = formData.get('display_order')?.toString().trim();
  const rankRaw = formData.get('rank')?.toString().trim();

  await updateCommitteePosition(id, {
    title,
    category,
    display_order: displayOrderRaw ? Number(displayOrderRaw) : 0,
    rank: rankRaw ? Number(rankRaw) : null,
    responsibilities:
      formData.get('responsibilities')?.toString().trim() || null,
  });

  await logActivity(
    adminId,
    'update_committee_position',
    'committee_position',
    id,
    {
      title,
      category,
    }
  );

  revalidateCommitteeViews();
}

export async function deleteCommitteePositionAction(formData) {
  const adminId = await requireAdmin();

  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Position id is required');

  await deleteCommitteePosition(id);
  await logActivity(
    adminId,
    'delete_committee_position',
    'committee_position',
    id,
    {}
  );

  revalidateCommitteeViews();
}

export async function createCommitteeMemberAction(formData) {
  const adminId = await requireAdmin();

  const userId = formData.get('user_id')?.toString();
  const positionId = formData.get('position_id')?.toString();
  const termStart = formData.get('term_start')?.toString();

  if (!userId) throw new Error('User is required');
  if (!positionId) throw new Error('Position is required');
  if (!termStart) throw new Error('Term start date is required');

  const created = await addCommitteeMember({
    user_id: userId,
    position_id: positionId,
    term_start: termStart,
    term_end: formData.get('term_end')?.toString() || null,
    is_current: formData.get('is_current')?.toString() === 'true',
    bio: formData.get('bio')?.toString().trim() || null,
  });

  await logActivity(
    adminId,
    'create_committee_member',
    'committee_member',
    created.id,
    {
      userId,
      positionId,
    }
  );

  revalidateCommitteeViews();
}

export async function updateCommitteeMemberAction(formData) {
  const adminId = await requireAdmin();

  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Committee member id is required');

  const termStart = formData.get('term_start')?.toString();
  if (!termStart) throw new Error('Term start date is required');

  const positionId = formData.get('position_id')?.toString();
  if (!positionId) throw new Error('Position is required');

  await updateCommitteeMember(id, {
    position_id: positionId,
    term_start: termStart,
    term_end: formData.get('term_end')?.toString() || null,
    is_current: formData.get('is_current')?.toString() === 'true',
    bio: formData.get('bio')?.toString().trim() || null,
  });

  await logActivity(
    adminId,
    'update_committee_member',
    'committee_member',
    id,
    {
      positionId,
    }
  );

  revalidateCommitteeViews();
}

export async function deleteCommitteeMemberAction(formData) {
  const adminId = await requireAdmin();

  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Committee member id is required');

  await removeCommitteeMember(id);
  await logActivity(
    adminId,
    'delete_committee_member',
    'committee_member',
    id,
    {}
  );

  revalidateCommitteeViews();
}
