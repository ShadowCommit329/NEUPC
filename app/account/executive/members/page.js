/**
 * @file Executive member management — displays pending join requests and
 *   all current members so executives can approve, reject, or review
 *   member profiles and account statuses.
 * @module ExecutiveMembersPage
 * @access executive | admin
 */

import { requireRole } from '@/app/_lib/auth-guard';
import { supabaseAdmin } from '@/app/_lib/supabase';
import MembersClient from './_components/MembersClient';

export const metadata = { title: 'Member Approval | Executive | NEUPC' };

export default async function MembersPage() {
  await requireRole(['executive', 'admin']);

  const [{ data: pendingRequests }, { data: allMembers }] = await Promise.all([
    supabaseAdmin
      .from('join_requests')
      .select(
        'id, name, email, student_id, batch, department, phone, interests, codeforces_handle, github, reason, status, created_at'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('users')
      .select(
        `id, email, full_name, avatar_url, account_status, created_at,
        member_profiles(student_id, academic_session, department, github, codeforces_handle)`
      )
      .in('account_status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  return (
    <MembersClient
      pendingRequests={pendingRequests || []}
      allMembers={allMembers || []}
    />
  );
}
