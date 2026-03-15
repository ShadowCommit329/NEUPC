/**
 * @file security service
 * @module security-service
 */

import { supabaseAdmin } from './supabase';

/**
 * Extract data from a settled promise result, returning fallback on rejection.
 * @param {PromiseSettledResult} result
 * @param {*} fallback
 */
function settled(result, fallback = { data: [], count: 0 }) {
  if (result.status === 'fulfilled') return result.value;
  console.error('[security-service] Query failed:', result.reason);
  return fallback;
}

/**
 * Fetches all security-relevant data in parallel.
 * Uses Promise.allSettled so a single query failure doesn't crash the dashboard.
 */
export async function getSecurityData() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const results = await Promise.allSettled([
    // Users currently marked online (is_online = true)
    supabaseAdmin
      .from('users')
      .select(
        'id, full_name, email, avatar_url, account_status, last_login, created_at'
      )
      .eq('is_online', true)
      .order('last_login', { ascending: false })
      .limit(50),

    // Suspended users
    supabaseAdmin
      .from('users')
      .select(
        'id, full_name, email, account_status, status_reason, status_changed_at, last_login'
      )
      .eq('account_status', 'suspended')
      .order('status_changed_at', { ascending: false })
      .limit(30),

    // Banned users
    supabaseAdmin
      .from('users')
      .select(
        'id, full_name, email, account_status, status_reason, status_changed_at, last_login'
      )
      .eq('account_status', 'banned')
      .order('status_changed_at', { ascending: false })
      .limit(30),

    // Locked users
    supabaseAdmin
      .from('users')
      .select(
        'id, full_name, email, account_status, status_reason, status_changed_at, last_login'
      )
      .eq('account_status', 'locked')
      .order('status_changed_at', { ascending: false })
      .limit(30),

    // Pending users count
    supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'pending'),

    // Recent audit logs (all, last 200)
    supabaseAdmin
      .from('activity_logs')
      .select(
        'id, action, entity_type, entity_id, details, ip_address, user_agent, created_at, user_id, users(id, full_name, email)'
      )
      .order('created_at', { ascending: false })
      .limit(200),

    // Role-related activity logs
    supabaseAdmin
      .from('activity_logs')
      .select(
        'id, action, entity_type, details, ip_address, created_at, user_id, users(id, full_name, email)'
      )
      .or('entity_type.eq.role,action.ilike.%role%,action.ilike.%assign%')
      .order('created_at', { ascending: false })
      .limit(50),

    // Login-related activity logs (last 24h)
    supabaseAdmin
      .from('activity_logs')
      .select(
        'id, action, details, ip_address, user_agent, created_at, user_id, users(id, full_name, email)'
      )
      .gte('created_at', since24h)
      .or('action.ilike.%login%,action.ilike.%logout%,action.ilike.%sign%')
      .order('created_at', { ascending: false })
      .limit(100),

    // Recent user_roles assignments (last 7 days)
    supabaseAdmin
      .from('user_roles')
      .select(
        'id, user_id, assigned_at, assigned_by, roles(name), users!user_roles_user_id_fkey(full_name, email)'
      )
      .gte('assigned_at', since7d)
      .order('assigned_at', { ascending: false })
      .limit(30),
  ]);

  // Safely extract results from settled promises
  const activeSessions = settled(results[0]);
  const suspendedUsers = settled(results[1]);
  const bannedUsers = settled(results[2]);
  const lockedUsers = settled(results[3]);
  const pendingUsers = settled(results[4]);
  const recentLogs = settled(results[5]);
  const roleChangeLogs = settled(results[6]);
  const loginLogs = settled(results[7]);
  const recentRoleAssignments = settled(results[8]);

  // Derive threat indicators
  const failedLogins = (loginLogs.data || []).filter(
    (l) =>
      l.action?.toLowerCase().includes('fail') ||
      l.action?.toLowerCase().includes('invalid')
  );

  const uniqueFailedIPs = [
    ...new Set(failedLogins.map((l) => l.ip_address).filter(Boolean)),
  ];

  // Group logs by action type for stats
  const logsByAction = {};
  for (const log of recentLogs.data || []) {
    const key = log.action || 'unknown';
    logsByAction[key] = (logsByAction[key] || 0) + 1;
  }

  return {
    overview: {
      activeSessions: activeSessions.data?.length || 0,
      suspendedCount: suspendedUsers.data?.length || 0,
      bannedCount: bannedUsers.data?.length || 0,
      lockedCount: lockedUsers.data?.length || 0,
      pendingCount: pendingUsers.count || 0,
      failedLogins24h: failedLogins.length,
      suspiciousIPs: uniqueFailedIPs.length,
      recentRoleChanges: roleChangeLogs.data?.length || 0,
    },
    activeSessions: activeSessions.data || [],
    threats: [
      ...(suspendedUsers.data || []).map((u) => ({
        ...u,
        threatType: 'suspended',
      })),
      ...(bannedUsers.data || []).map((u) => ({ ...u, threatType: 'banned' })),
      ...(lockedUsers.data || []).map((u) => ({ ...u, threatType: 'locked' })),
    ].sort(
      (a, b) => new Date(b.status_changed_at) - new Date(a.status_changed_at)
    ),
    auditLogs: recentLogs.data || [],
    roleChangeLogs: roleChangeLogs.data || [],
    loginLogs: loginLogs.data || [],
    recentRoleAssignments: recentRoleAssignments.data || [],
    logsByAction,
    generatedAt: new Date().toISOString(),
  };
}
