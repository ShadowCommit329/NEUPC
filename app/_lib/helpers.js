/**
 * @file helpers
 * @module helpers
 */

import { auth } from '@/app/_lib/auth';
import { redirect } from 'next/navigation';
import { getUserRoles, getUserByEmail } from '@/app/_lib/data-service';
import { supabaseAdmin } from '@/app/_lib/supabase';

// =============================================================================
// AUTH HELPERS
// =============================================================================

/**
 * Verify the current user is an active admin. Redirects otherwise.
 * @returns {Promise<object>} The authenticated admin user record
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const roles = await getUserRoles(session.user.email);
  if (!roles.includes('admin')) redirect('/account');

  const user = await getUserByEmail(session.user.email);
  if (user?.account_status !== 'active') redirect('/account');
  return user;
}

// =============================================================================
// ACTIVITY LOGGING
// =============================================================================

/**
 * Log an activity directly with explicit entity type.
 * Errors are logged but never block the calling action.
 */
export async function logActivity(
  userId,
  action,
  entityType,
  entityId,
  details = {}
) {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (error) {
    // Non-critical — log for debugging but don't break the primary action
    console.error('[logActivity] Failed to write activity log:', {
      action,
      entityType,
      entityId,
      error: error?.message || error,
    });
  }
}

/**
 * Create a scoped logger for a specific entity type.
 * Usage: const log = createLogger('blog');
 *        await log(userId, 'create_blog', blogId, { title });
 */
export function createLogger(entityType) {
  return (userId, action, entityId, details = {}) =>
    logActivity(userId, action, entityType, entityId, details);
}

// =============================================================================
// SLUG GENERATION
// =============================================================================

/**
 * Generate a URL-friendly slug from a title, appended with a timestamp.
 */
export function generateSlug(title) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .slice(0, 60) +
    '-' +
    Date.now().toString(36)
  );
}
