/**
 * @file member profile actions
 * @module member-profile-actions
 */

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from './auth';
import { supabaseAdmin } from './supabase';
import { getUserRoles, getUserByEmail } from './data-service';
import { sanitizeText, isValidUrl } from './validation';
import {
  isV2SchemaAvailable,
  upsertUserHandleV2,
  deleteUserHandleV2,
} from './problem-solving-v2-helpers';

async function requireActiveMember() {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');

  const userRoles = await getUserRoles(session.user.email);
  if (!userRoles.includes('member')) throw new Error('Not a member');

  const user = await getUserByEmail(session.user.email);
  if (!user) throw new Error('User not found');
  if (user.account_status !== 'active' || user.is_online === false)
    throw new Error('Account not active');

  return user;
}

// ── Update basic user info (full_name, phone) ────────────────────────────────
export async function updateMemberInfoAction(formData) {
  try {
    const user = await requireActiveMember();

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
      console.error('Member info update error:', error);
      return { error: 'Failed to update profile.' };
    }

    revalidatePath('/account/member/profile');
    revalidatePath('/account/member/settings');
    revalidatePath('/account');
    revalidatePath('/committee');
    revalidateTag('committee');
    return { success: true };
  } catch (err) {
    console.error('updateMemberInfoAction error:', err);
    return { error: 'An unexpected error occurred.' };
  }
}

// ── Update member profile (handles, bio, skills, etc.) ───────────────────────
export async function updateMemberProfileAction(formData) {
  try {
    const user = await requireActiveMember();

    const rawSkills = formData.get('skills') || '';
    const rawInterests = formData.get('interests') || '';
    const skills = rawSkills
      .split(',')
      .map((s) => sanitizeText(s, 50))
      .filter(Boolean);
    const interests = rawInterests
      .split(',')
      .map((s) => sanitizeText(s, 50))
      .filter(Boolean);

    const linkedinUrl = formData.get('linkedin')?.trim() || null;
    const githubUrl = formData.get('github')?.trim() || null;

    // Validate URLs if provided
    if (linkedinUrl && !isValidUrl(linkedinUrl)) {
      return { error: 'Invalid LinkedIn URL.' };
    }
    if (githubUrl && !isValidUrl(githubUrl)) {
      return { error: 'Invalid GitHub URL.' };
    }

    // member_profiles update — no handle columns
    const updates = {
      bio: sanitizeText(formData.get('bio'), 1000) || null,
      linkedin: linkedinUrl,
      github: githubUrl,
      skills: skills.length > 0 ? skills : null,
      interests: interests.length > 0 ? interests : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('member_profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Member profile update error:', error);
      return { error: 'Failed to update profile.' };
    }

    // Save handles to user_handles table (V2 schema)
    const handleMap = {
      codeforces: sanitizeText(formData.get('codeforces_handle'), 50) || null,
      vjudge: sanitizeText(formData.get('vjudge_handle'), 50) || null,
      atcoder: sanitizeText(formData.get('atcoder_handle'), 50) || null,
      leetcode: sanitizeText(formData.get('leetcode_handle'), 50) || null,
    };

    const useV2 = await isV2SchemaAvailable();
    for (const [platform, handle] of Object.entries(handleMap)) {
      if (handle) {
        if (useV2) {
          await upsertUserHandleV2(user.id, platform, handle);
        } else {
          await supabaseAdmin.from('user_handles').upsert(
            {
              user_id: user.id,
              platform,
              handle,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,platform' }
          );
        }
      } else {
        // Remove handle if cleared
        if (useV2) {
          await deleteUserHandleV2(user.id, platform);
        } else {
          await supabaseAdmin
            .from('user_handles')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', platform);
        }
      }
    }

    revalidatePath('/account/member/profile');
    revalidatePath('/account/member/problem-solving');
    revalidatePath('/account');
    revalidatePath('/committee');
    revalidateTag('committee');
    return { success: true };
  } catch (err) {
    console.error('updateMemberProfileAction error:', err);
    return { error: 'An unexpected error occurred.' };
  }
}
