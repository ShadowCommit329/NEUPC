/**
 * @file guest actions
 * @module guest-actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { auth } from './auth';
import { supabaseAdmin } from './supabase';
import { getUserRoles, getUserByEmail } from './data-service';
import { sanitizeText } from './validation';

async function requireActiveGuest() {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');

  const userRoles = await getUserRoles(session.user.email);
  if (!userRoles.includes('guest')) throw new Error('Not a guest user');

  const user = await getUserByEmail(session.user.email);
  if (!user) throw new Error('User not found');
  if (user.account_status !== 'active') throw new Error('Account not active');

  return user;
}

// ── Update basic info (full_name, phone, avatar_url) ─────────────────────────
export async function updateGuestInfoAction(formData) {
  try {
    const user = await requireActiveGuest();

    const full_name = sanitizeText(formData.get('full_name'), 100);
    const phone = sanitizeText(formData.get('phone'), 20) || null;

    const updates = { updated_at: new Date().toISOString() };
    if (full_name) updates.full_name = full_name;
    updates.phone = phone;

    const { error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Guest info update error:', error);
      return { error: 'Failed to update profile.' };
    }

    revalidatePath('/account/guest/profile');
    revalidatePath('/account/guest/settings');
    revalidatePath('/account');
    return { success: true };
  } catch (err) {
    console.error('updateGuestInfoAction error:', err);
    return { error: 'An unexpected error occurred.' };
  }
}
