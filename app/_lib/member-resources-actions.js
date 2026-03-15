/**
 * @file member resources actions
 * @module member-resources-actions
 */

'use server';

import { supabaseAdmin } from './supabase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireActionSession } from './action-guard';

/** Increment the upvote count for a resource (authenticated users only). */
export async function upvoteResourceAction(resourceId) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!resourceId) return { error: 'Missing resource ID.' };

  // Check if user already upvoted (prevent duplicate upvotes)
  const { data: existingVote } = await supabaseAdmin
    .from('resource_upvotes')
    .select('id')
    .eq('resource_id', resourceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingVote) return { error: 'You have already upvoted this resource.' };

  const { data: resource, error: fetchErr } = await supabaseAdmin
    .from('resources')
    .select('id, upvotes')
    .eq('id', resourceId)
    .single();

  if (fetchErr || !resource) return { error: 'Resource not found.' };

  // Increment upvote count
  const { error } = await supabaseAdmin
    .from('resources')
    .update({ upvotes: (resource.upvotes ?? 0) + 1 })
    .eq('id', resourceId);

  if (error) {
    console.error('Resource upvote error:', error);
    return { error: 'Failed to upvote resource.' };
  }
  revalidatePath('/account/member/resources');
  revalidateTag('roadmaps');
  revalidatePath('/roadmaps');
  return { success: true, newCount: (resource.upvotes ?? 0) + 1 };
}
