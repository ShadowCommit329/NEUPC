/**
 * @file Account status message thread API — bidirectional messaging between
 *   users and admins around account status changes.
 *
 * GET  /api/account/messages?userId=X  — fetch thread for user X
 * POST /api/account/messages           — send a message in the thread
 *
 * Table: account_messages
 *   id          uuid PK
 *   user_id     uuid FK → users  (the account being discussed)
 *   sender_id   uuid FK → users  (who sent the message)
 *   is_admin    boolean
 *   message     text
 *   created_at  timestamptz
 *
 * @module AccountMessagesRoute
 */

import { supabaseAdmin } from '@/app/_lib/supabase';
import { auth } from '@/app/_lib/auth';
import { getUserByEmail, getUserRoles } from '@/app/_lib/data-service';
import { sanitizeText } from '@/app/_lib/validation';
import { NextResponse } from 'next/server';

// ── helpers ──────────────────────────────────────────────────────────────────

async function getCallerInfo() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const [user, roles] = await Promise.all([
    getUserByEmail(session.user.email),
    getUserRoles(session.user.email),
  ]);
  if (!user) return null;
  return { user, isAdmin: roles.includes('admin') };
}

// ── GET — fetch thread ────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const caller = await getCallerInfo();
    if (!caller) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Users may only fetch their own thread; admins can fetch any
    if (!caller.isAdmin && caller.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('account_messages')
      .select('id, sender_id, is_admin, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[account/messages] GET db error:', error.message);
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }

    return NextResponse.json({ messages: data ?? [] });
  } catch (err) {
    console.error('[account/messages] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST — send a message ─────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const caller = await getCallerInfo();
    if (!caller) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const userId = body.userId;
    const rawMessage = body.message;

    if (!userId || !rawMessage?.trim()) {
      return NextResponse.json({ error: 'userId and message are required' }, { status: 400 });
    }

    const message = sanitizeText(rawMessage, 1000);

    // Users may only post to their own thread; admins can post to any
    if (!caller.isAdmin && caller.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('account_messages')
      .insert({
        user_id: userId,
        sender_id: caller.user.id,
        is_admin: caller.isAdmin,
        message,
      })
      .select('id, sender_id, is_admin, message, created_at')
      .single();

    if (error) {
      console.error('[account/messages] POST db error:', error.message);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err) {
    console.error('[account/messages] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
