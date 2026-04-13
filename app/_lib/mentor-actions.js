/**
 * @file mentor actions
 * @module mentor-actions
 */

'use server';

import { auth } from './auth';
import { getUserRoles, getUserByEmail } from './data-service';
import { supabase } from './supabase';
import { revalidatePath, revalidateTag } from 'next/cache';

// --- Auth Helper ---
async function requireMentor() {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');
  const roles = await getUserRoles(session.user.email);
  if (!roles.includes('mentor')) throw new Error('Not authorized as mentor');
  const user = await getUserByEmail(session.user.email);
  if (user?.account_status !== 'active' || !user?.is_online)
    throw new Error('Account not active');
  return user;
}

// --- Task Actions ---

export async function createWeeklyTaskAction(formData) {
  try {
    const mentor = await requireMentor();
    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const difficulty = formData.get('difficulty') || 'medium';
    const deadline = formData.get('deadline');
    const problem_links = formData.get('problem_links')
      ? formData
          .get('problem_links')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      : [];
    const target_audience = formData.get('target_audience')?.trim() || null;

    if (!title || !deadline)
      return { error: 'Title and deadline are required' };

    const { data, error } = await supabase
      .from('weekly_tasks')
      .insert([
        {
          title,
          description,
          difficulty,
          deadline: new Date(deadline).toISOString(),
          assigned_by: mentor.id,
          problem_links,
          target_audience,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/tasks');
    revalidatePath('/account/member/bootcamps');
    return { success: 'Task created successfully', data };
  } catch (err) {
    return { error: err.message };
  }
}

export async function updateWeeklyTaskAction(formData) {
  try {
    const mentor = await requireMentor();
    const id = formData.get('id');
    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const difficulty = formData.get('difficulty') || 'medium';
    const deadline = formData.get('deadline');
    const problem_links = formData.get('problem_links')
      ? formData
          .get('problem_links')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      : [];

    if (!id || !title || !deadline) return { error: 'Missing required fields' };

    // Only allow editing own tasks
    const { data: existing } = await supabase
      .from('weekly_tasks')
      .select('assigned_by')
      .eq('id', id)
      .single();
    if (existing?.assigned_by !== mentor.id)
      return { error: 'Not authorized to edit this task' };

    const { error } = await supabase
      .from('weekly_tasks')
      .update({
        title,
        description,
        difficulty,
        deadline: new Date(deadline).toISOString(),
        problem_links,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/tasks');
    revalidatePath('/account/member/bootcamps');
    return { success: 'Task updated successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

export async function deleteWeeklyTaskAction(formData) {
  try {
    const mentor = await requireMentor();
    const id = formData.get('id');

    const { data: existing } = await supabase
      .from('weekly_tasks')
      .select('assigned_by')
      .eq('id', id)
      .single();
    if (existing?.assigned_by !== mentor.id)
      return { error: 'Not authorized to delete this task' };

    const { error } = await supabase.from('weekly_tasks').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/tasks');
    revalidatePath('/account/member/bootcamps');
    return { success: 'Task deleted successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

export async function reviewTaskSubmissionAction(formData) {
  try {
    await requireMentor();
    const submissionId = formData.get('submissionId');
    const status = formData.get('status');
    const feedback = formData.get('feedback')?.trim();
    const reviewer = await requireMentor();

    if (!submissionId || !status) return { error: 'Missing required fields' };

    const { error } = await supabase
      .from('task_submissions')
      .update({ reviewed_by: reviewer.id, status, feedback })
      .eq('id', submissionId);

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/tasks');
    revalidatePath('/account/member/bootcamps');
    return { success: 'Submission reviewed successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

// --- Resource Actions ---

export async function createResourceAction(formData) {
  try {
    const mentor = await requireMentor();
    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const url = formData.get('url')?.trim();
    const resource_type = formData.get('resource_type') || 'article';
    const category = formData.get('category')?.trim();
    const difficulty = formData.get('difficulty') || null;
    const is_free = formData.get('is_free') !== 'false';
    const tags = formData.get('tags')
      ? formData
          .get('tags')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    if (!title || !url || !category)
      return { error: 'Title, URL and category are required' };

    const { error } = await supabase.from('resources').insert([
      {
        title,
        description,
        url,
        resource_type,
        category,
        difficulty,
        is_free,
        tags,
        created_by: mentor.id,
      },
    ]);

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/resources');
    revalidatePath('/account/member/resources');
    revalidateTag('roadmaps');
    revalidatePath('/roadmaps');
    return { success: 'Resource added successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

export async function deleteResourceAction(formData) {
  try {
    const mentor = await requireMentor();
    const id = formData.get('id');

    const { data: existing } = await supabase
      .from('resources')
      .select('created_by')
      .eq('id', id)
      .single();
    if (existing?.created_by !== mentor.id)
      return { error: 'Not authorized to delete this resource' };

    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/resources');
    revalidatePath('/account/member/resources');
    revalidateTag('roadmaps');
    revalidatePath('/roadmaps');
    return { success: 'Resource deleted successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

// --- Session Actions ---

export async function createMentorshipSessionAction(formData) {
  try {
    const mentor = await requireMentor();
    const mentorship_id = formData.get('mentorship_id');
    const topic = formData.get('topic')?.trim();
    const session_date = formData.get('session_date');
    const duration = parseInt(formData.get('duration')) || null;
    const notes = formData.get('notes')?.trim() || null;

    if (!mentorship_id || !session_date)
      return { error: 'Mentorship and session date are required' };

    // Verify this mentorship belongs to this mentor
    const { data: ms } = await supabase
      .from('mentorships')
      .select('mentor_id')
      .eq('id', mentorship_id)
      .single();
    if (ms?.mentor_id !== mentor.id)
      return { error: 'Not authorized for this mentorship' };

    const { error } = await supabase.from('mentorship_sessions').insert([
      {
        mentorship_id,
        topic,
        session_date: new Date(session_date).toISOString(),
        duration,
        notes,
        created_by: mentor.id,
      },
    ]);

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/sessions');
    return { success: 'Session scheduled successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

export async function updateSessionNotesAction(formData) {
  try {
    const mentor = await requireMentor();
    const sessionId = formData.get('sessionId');
    const notes = formData.get('notes')?.trim();
    const attended = formData.get('attended') === 'true';
    const feedback = formData.get('feedback')?.trim() || null;

    if (!sessionId) return { error: 'Session ID required' };

    // Verify mentor owns this session
    const { data: session } = await supabase
      .from('mentorship_sessions')
      .select('created_by')
      .eq('id', sessionId)
      .single();
    if (session?.created_by !== mentor.id)
      return { error: 'Not authorized to update this session' };

    const { error } = await supabase
      .from('mentorship_sessions')
      .update({ notes, attended, feedback })
      .eq('id', sessionId);

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/sessions');
    return { success: 'Session updated successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

export async function deleteSessionAction(formData) {
  try {
    const mentor = await requireMentor();
    const sessionId = formData.get('sessionId');

    const { data: session } = await supabase
      .from('mentorship_sessions')
      .select('created_by')
      .eq('id', sessionId)
      .single();
    if (session?.created_by !== mentor.id)
      return { error: 'Not authorized to delete this session' };

    const { error } = await supabase
      .from('mentorship_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/sessions');
    return { success: 'Session deleted successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

// --- Recommendations / Progress Notes ---

export async function saveMentorNotesAction(formData) {
  try {
    const mentor = await requireMentor();
    const menteeId = formData.get('menteeId');
    const period = formData.get('period')?.trim();
    const mentor_notes = formData.get('mentor_notes')?.trim();
    const start_date = formData.get('start_date');
    const end_date = formData.get('end_date');
    const problems_solved = parseInt(formData.get('problems_solved')) || 0;
    const contests_participated =
      parseInt(formData.get('contests_participated')) || 0;

    if (!menteeId || !period || !start_date || !end_date)
      return { error: 'Required fields missing' };

    // Upsert member_progress
    const { data: existing } = await supabase
      .from('member_progress')
      .select('id')
      .eq('user_id', menteeId)
      .eq('period', period)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('member_progress')
        .update({ mentor_notes, problems_solved, contests_participated })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('member_progress').insert([
        {
          user_id: menteeId,
          period,
          start_date,
          end_date,
          mentor_notes,
          problems_solved,
          contests_participated,
        },
      ]));
    }

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/recommendations');
    return { success: 'Notes saved successfully' };
  } catch (err) {
    return { error: err.message };
  }
}

// --- Mentorship Status Update ---

export async function updateMentorshipStatusAction(formData) {
  try {
    const mentor = await requireMentor();
    const mentorshipId = formData.get('mentorshipId');
    const status = formData.get('status');
    const notes = formData.get('notes')?.trim() || null;

    const { data: ms } = await supabase
      .from('mentorships')
      .select('mentor_id')
      .eq('id', mentorshipId)
      .single();
    if (ms?.mentor_id !== mentor.id)
      return { error: 'Not authorized for this mentorship' };

    const { error } = await supabase
      .from('mentorships')
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq('id', mentorshipId);

    if (error) throw new Error(error.message);
    revalidatePath('/account/mentor/assigned-members');
    return { success: 'Mentorship status updated' };
  } catch (err) {
    return { error: err.message };
  }
}
