/**
 * @file export actions
 * @module export-actions
 */

'use server';

import { supabaseAdmin } from './supabase';
import { requireActionAuth } from './action-guard';

// ─── Shared date filter helper ─────────────────────────────────────────────

function applyDateFilter(query, col, dateFrom, dateTo) {
  if (dateFrom) query = query.gte(col, new Date(dateFrom).toISOString());
  if (dateTo) {
    const end = new Date(dateTo);
    end.setDate(end.getDate() + 1);
    query = query.lt(col, end.toISOString());
  }
  return query;
}

// ─── Users ─────────────────────────────────────────────────────────────────

export async function exportUsersAction({
  dateFrom,
  dateTo,
  status,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('users')
    .select(
      'id, full_name, email, phone, account_status, is_online, email_verified, last_login, created_at, provider'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') q = q.eq('account_status', status);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// ─── Join Requests ─────────────────────────────────────────────────────────

export async function exportJoinRequestsAction({
  dateFrom,
  dateTo,
  status,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('join_requests')
    .select(
      'id, full_name, email, student_id, batch, department, phone, interests, codeforces_handle, github, reason, status, rejection_reason, reviewed_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') q = q.eq('status', status);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// ─── Blog Posts ─────────────────────────────────────────────────────────────

export async function exportBlogsAction({
  dateFrom,
  dateTo,
  status,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('blog_posts')
    .select(
      'id, title, slug, category, status, views, likes, read_time, is_featured, published_at, created_at, users(full_name, email)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') q = q.eq('status', status);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };

  const flat = (data || []).map(({ users, ...row }) => ({
    ...row,
    author_name: users?.full_name || '',
    author_email: users?.email || '',
  }));
  return { data: flat, error: null };
}

// ─── Events ─────────────────────────────────────────────────────────────────

export async function exportEventsAction({
  dateFrom,
  dateTo,
  status,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('events')
    .select(
      'id, title, slug, category, status, location, venue_type, start_date, end_date, max_participants, registration_required, registration_deadline, is_featured, created_at, users!events_created_by_fkey(full_name, email)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') q = q.eq('status', status);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };

  const flat = (data || []).map(({ users, ...row }) => ({
    ...row,
    created_by_name: users?.full_name || '',
    created_by_email: users?.email || '',
  }));
  return { data: flat, error: null };
}

// ─── Achievements ──────────────────────────────────────────────────────────

export async function exportAchievementsAction({
  dateFrom,
  dateTo,
  category,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('achievements')
    .select(
      'id, title, contest_name, contest_url, result, year, category, description, achievement_date, is_team, team_name, participants, created_at'
    )
    .order('year', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') q = q.eq('category', category);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };

  const flat = (data || []).map(({ participants, ...row }) => ({
    ...row,
    participants: Array.isArray(participants) ? participants.join(', ') : '',
  }));
  return { data: flat, error: null };
}

// ─── Gallery ───────────────────────────────────────────────────────────────

export async function exportGalleryAction({
  dateFrom,
  dateTo,
  category,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('gallery_items')
    .select(
      'id, url, type, caption, category, is_featured, display_order, created_at, users(full_name, email)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') q = q.eq('category', category);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };

  const flat = (data || []).map(({ users, ...row }) => ({
    ...row,
    uploaded_by_name: users?.full_name || '',
    uploaded_by_email: users?.email || '',
  }));
  return { data: flat, error: null };
}

// ─── Contact Submissions ───────────────────────────────────────────────────

export async function exportContactsAction({
  dateFrom,
  dateTo,
  status,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('contact_submissions')
    .select(
      'id, name, email, subject, message, status, ip_address, replied_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') q = q.eq('status', status);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// ─── Notices ───────────────────────────────────────────────────────────────

export async function exportNoticesAction({
  dateFrom,
  dateTo,
  notice_type,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('notices')
    .select(
      'id, title, notice_type, priority, is_pinned, views, expires_at, created_at, users(full_name, email)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (notice_type && notice_type !== 'all')
    q = q.eq('notice_type', notice_type);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };

  const flat = (data || []).map(({ users, ...row }) => ({
    ...row,
    created_by_name: users?.full_name || '',
    created_by_email: users?.email || '',
  }));
  return { data: flat, error: null };
}

// ─── Activity Logs ─────────────────────────────────────────────────────────

export async function exportActivityLogsAction({
  dateFrom,
  dateTo,
  action,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('activity_logs')
    .select(
      'id, action, entity_type, entity_id, ip_address, user_agent, created_at, users(full_name, email)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (action && action !== 'all') q = q.eq('action', action);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };

  const flat = (data || []).map(({ users, ...row }) => ({
    ...row,
    user_name: users?.full_name || 'System',
    user_email: users?.email || '',
  }));
  return { data: flat, error: null };
}

// ─── Resources ─────────────────────────────────────────────────────────────

export async function exportResourcesAction({
  dateFrom,
  dateTo,
  category,
  limit = 1000,
}) {
  const auth = await requireActionAuth('admin');
  if (auth.error) return { data: null, error: auth.error };

  let q = supabaseAdmin
    .from('resources')
    .select(
      'id, title, description, url, resource_type, category, difficulty, is_free, is_featured, upvotes, created_at, users(full_name, email)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') q = q.eq('category', category);
  q = applyDateFilter(q, 'created_at', dateFrom, dateTo);

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };

  const flat = (data || []).map(({ users, ...row }) => ({
    ...row,
    added_by_name: users?.full_name || '',
    added_by_email: users?.email || '',
  }));
  return { data: flat, error: null };
}
