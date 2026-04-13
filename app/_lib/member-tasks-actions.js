/**
 * @file member tasks actions
 * @module member-tasks-actions
 */

'use server';

import { supabaseAdmin } from './supabase';
import { revalidatePath } from 'next/cache';
import { requireActionSession } from './action-guard';
import { sanitizeText, isValidUrl } from './validation';

/** Submit (or re-submit) a solution for a weekly task. */
export async function submitTaskAction({ taskId, submissionUrl, code, notes }) {
  const authResult = await requireActionSession();
  if (authResult.error) return { error: authResult.error };
  const userId = authResult.user.id;

  if (!taskId) return { error: 'Missing task ID.' };
  if (!submissionUrl && !code)
    return { error: 'Provide a submission URL or paste your code.' };

  // Validate submission URL if provided
  if (submissionUrl && !isValidUrl(submissionUrl)) {
    return { error: 'Invalid submission URL.' };
  }

  // Sanitize text inputs
  const sanitizedNotes = sanitizeText(notes, 2000);

  // Check if task exists and determine if submission is late
  const { data: task, error: taskErr } = await supabaseAdmin
    .from('weekly_tasks')
    .select('id, title, deadline')
    .eq('id', taskId)
    .single();

  if (taskErr || !task) return { error: 'Task not found.' };

  const isLate = task.deadline && new Date(task.deadline) < new Date();

  // Check for existing submission
  const { data: existing } = await supabaseAdmin
    .from('task_submissions')
    .select('id, status')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Update existing – only allow if not already reviewed as completed
    if (existing.status === 'completed') {
      return { error: 'Your submission has already been marked as completed.' };
    }
    const { error: updErr } = await supabaseAdmin
      .from('task_submissions')
      .update({
        submission_url: submissionUrl || null,
        code: code || null,
        notes: sanitizedNotes || null,
        status: isLate ? 'late' : 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_by: null,
        feedback: null,
      })
      .eq('id', existing.id);

    if (updErr) {
      console.error('Task submission update error:', updErr);
      return { error: 'Failed to update submission.' };
    }
    revalidatePath('/account/member/bootcamps');
    revalidatePath('/account/mentor/tasks');
    return { success: true, updated: true };
  }

  // New submission
  const { error: insErr } = await supabaseAdmin
    .from('task_submissions')
    .insert({
      task_id: taskId,
      user_id: userId,
      submission_url: submissionUrl || null,
      code: code || null,
      notes: sanitizedNotes || null,
      status: isLate ? 'late' : 'pending',
      submitted_at: new Date().toISOString(),
    });

  if (insErr) {
    console.error('Task submission error:', insErr);
    return { error: 'Failed to submit task.' };
  }
  revalidatePath('/account/member/bootcamps');
  revalidatePath('/account/mentor/tasks');
  return { success: true, updated: false };
}
