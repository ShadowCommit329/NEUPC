/**
 * @file advisor actions
 * @module advisor-actions
 */

'use server';

import { auth } from '@/app/_lib/auth';
import { redirect } from 'next/navigation';
import {
  getUserRoles,
  getUserByEmail,
  approveJoinRequest,
  rejectJoinRequest,
  approveMemberProfile,
  approveBudgetEntry,
} from '@/app/_lib/data-service';
import { revalidatePath, revalidateTag } from 'next/cache';

// =============================================================================
// HELPERS
// =============================================================================

async function requireAdvisor() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');
  const roles = await getUserRoles(session.user.email);
  if (!roles.includes('advisor')) redirect('/account');
  const user = await getUserByEmail(session.user.email);
  if (user?.account_status !== 'active' || !user?.is_online)
    redirect('/account');
  return user;
}

function revalidateApprovals() {
  revalidatePath('/account/advisor/approvals');
  revalidatePath('/account/advisor/analytics');
  revalidatePath('/account/advisor/club-overview');
  revalidatePath('/account/advisor');
  revalidatePath('/account/admin/users');
  revalidatePath('/account/executive/members');
  revalidatePath('/committee');
  revalidateTag('committee');
}

// =============================================================================
// JOIN REQUEST ACTIONS
// =============================================================================

export async function approveJoinRequestAction(formData) {
  const advisor = await requireAdvisor();
  const requestId = formData.get('requestId');

  if (!requestId) return { error: 'Request ID is required.' };

  try {
    await approveJoinRequest(requestId, advisor.id);
    revalidateApprovals();
    return { success: 'Join request approved successfully.' };
  } catch (error) {
    console.error('Approve join request error:', error);
    return { error: 'Failed to approve join request.' };
  }
}

export async function rejectJoinRequestAction(formData) {
  const advisor = await requireAdvisor();
  const requestId = formData.get('requestId');
  const reason = formData.get('reason')?.trim();

  if (!requestId) return { error: 'Request ID is required.' };
  if (!reason) return { error: 'Rejection reason is required.' };

  try {
    await rejectJoinRequest(requestId, advisor.id, reason);
    revalidateApprovals();
    return { success: 'Join request rejected.' };
  } catch (error) {
    console.error('Reject join request error:', error);
    return { error: 'Failed to reject join request.' };
  }
}

// =============================================================================
// MEMBER PROFILE ACTIONS
// =============================================================================

export async function approveMemberProfileAction(formData) {
  const advisor = await requireAdvisor();
  const userId = formData.get('userId');

  if (!userId) return { error: 'User ID is required.' };

  try {
    await approveMemberProfile(userId, advisor.id);
    revalidateApprovals();
    return { success: 'Member profile approved successfully.' };
  } catch (error) {
    console.error('Approve member profile error:', error);
    return { error: 'Failed to approve member profile.' };
  }
}

// =============================================================================
// BUDGET ENTRY ACTIONS
// =============================================================================

export async function approveBudgetEntryAction(formData) {
  const advisor = await requireAdvisor();
  const entryId = formData.get('entryId');

  if (!entryId) return { error: 'Entry ID is required.' };

  try {
    await approveBudgetEntry(entryId, advisor.id);
    revalidateApprovals();
    revalidatePath('/account/advisor/budget');
    return { success: 'Budget entry approved successfully.' };
  } catch (error) {
    console.error('Approve budget entry error:', error);
    return { error: 'Failed to approve budget entry.' };
  }
}
