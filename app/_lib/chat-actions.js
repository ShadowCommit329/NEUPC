/**
 * @file chat actions
 * @module chat-actions
 */

'use server';

import { supabaseAdmin } from '@/app/_lib/supabase';
import { auth } from '@/app/_lib/auth';
import { getUserRoles, getUserByEmail } from '@/app/_lib/data-service';
import { createLogger } from '@/app/_lib/helpers';
import { revalidatePath } from 'next/cache';

const logActivity = createLogger('chat');

// =============================================================================
// PERMISSION MATRIX
// =============================================================================

const ALL_CHAT_ROLES = ['member', 'executive', 'admin', 'mentor', 'advisor'];

const CHAT_MATRIX = {
  member: ['member', 'executive'],
  executive: ['member', 'executive', 'admin'],
  admin: ALL_CHAT_ROLES,
  mentor: ALL_CHAT_ROLES,
  advisor: ALL_CHAT_ROLES,
};

function canChat(initiatorRole, targetRole) {
  return CHAT_MATRIX[initiatorRole]?.includes(targetRole) ?? false;
}

// =============================================================================
// SYSTEM GROUPS
// =============================================================================

const SYSTEM_GROUPS = [
  {
    slug: 'group_members',
    name: 'Members Group',
    allowedRoles: ['member', 'executive', 'admin', 'mentor', 'advisor'],
  },
  {
    slug: 'group_executives',
    name: 'Executives Group',
    allowedRoles: ['executive', 'admin'],
  },
];

const GROUP_SLUG_TO_NAME = Object.fromEntries(
  SYSTEM_GROUPS.map((g) => [g.slug, g.name])
);

// =============================================================================
// RATE LIMITS
// =============================================================================

const RATE_LIMITS = {
  member: { maxPerMinute: 15 },
  executive: { maxPerMinute: 30 },
  admin: { maxPerMinute: 30 },
  mentor: { maxPerMinute: 20 },
  advisor: { maxPerMinute: 20 },
};

// =============================================================================
// CONTENT VALIDATION
// =============================================================================

const MAX_MESSAGE_LENGTH = 2000;
const MAX_SUBJECT_LENGTH = 200;
const BLOCKED_PATTERNS = [/(.)\1{20,}/, /(https?:\/\/\S+\s*){5,}/];

function sanitizeContent(content) {
  const trimmed = content?.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw new Error('Message too long.');
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed))
      throw new Error('Message blocked by content filter.');
  }
  return trimmed;
}

// =============================================================================
// AUTH HELPER
// =============================================================================

async function requireChatUser() {
  const session = await auth();
  if (!session?.user?.email) return { error: 'Unauthorized' };

  const user = await getUserByEmail(session.user.email);
  if (!user || user.account_status !== 'active')
    return { error: 'Account not active' };

  const roles = await getUserRoles(session.user.email);
  const role = roles[0] || null;

  if (!role) return { error: 'Users must have a role to access chat.' };

  return { user, role };
}

// =============================================================================
// SYNC GROUP MEMBERSHIPS
// =============================================================================

export async function syncGroupMembershipsAction() {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user, role } = authResult;

  for (const group of SYSTEM_GROUPS) {
    // Find or create the group conversation
    let { data: conv } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('type', 'group')
      .eq('subject', group.slug)
      .maybeSingle();

    if (group.allowedRoles.includes(role)) {
      // Create group if it doesn't exist
      if (!conv) {
        const { data: newConv } = await supabaseAdmin
          .from('chat_conversations')
          .insert({
            type: 'group',
            status: 'open',
            subject: group.slug,
            created_by: user.id,
          })
          .select()
          .single();
        conv = newConv;
      }
      if (!conv) continue;

      // Add user as participant if not already
      const { data: existing } = await supabaseAdmin
        .from('chat_participants')
        .select('id')
        .eq('conversation_id', conv.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from('chat_participants').insert({
          conversation_id: conv.id,
          user_id: user.id,
        });
      }
    } else if (conv) {
      // Remove user from groups they no longer have access to
      await supabaseAdmin
        .from('chat_participants')
        .delete()
        .eq('conversation_id', conv.id)
        .eq('user_id', user.id);
    }
  }

  return { success: true };
}

// =============================================================================
// GET CONVERSATIONS
// =============================================================================

export async function getConversationsAction() {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user } = authResult;

  // Get all conversations the user participates in
  const { data: participations, error: pError } = await supabaseAdmin
    .from('chat_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id);

  if (pError) return { error: pError.message };
  if (!participations?.length) return { conversations: [], totalUnread: 0 };

  const conversationIds = participations.map((p) => p.conversation_id);

  // Get conversations with details
  const { data: conversations, error: cError } = await supabaseAdmin
    .from('chat_conversations')
    .select('*')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (cError) return { error: cError.message };

  // Get latest message per conversation
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const participation = participations.find(
        (p) => p.conversation_id === conv.id
      );

      // Fetch last message + unread count in parallel
      const [{ data: lastMessages }, unreadCount] = await Promise.all([
        supabaseAdmin
          .from('chat_messages')
          .select('id, content, sender_id, created_at, message_type, metadata')
          .eq('conversation_id', conv.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1),
        (async () => {
          let q = supabaseAdmin
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('deleted_at', null);
          if (participation?.last_read_at) {
            q = q.gt('created_at', participation.last_read_at);
          }
          const { count } = await q;
          return count || 0;
        })(),
      ]);

      const lastMessage = lastMessages?.[0] || null;

      // ── Group conversations ──────────────────────────
      if (conv.type === 'group') {
        const [{ count: memberCount }, senderData] = await Promise.all([
          supabaseAdmin
            .from('chat_participants')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id),
          lastMessage
            ? supabaseAdmin
                .from('users')
                .select('full_name')
                .eq('id', lastMessage.sender_id)
                .single()
                .then((r) => r.data)
            : Promise.resolve(null),
        ]);

        if (lastMessage && senderData) {
          lastMessage.sender_name = senderData.full_name || 'Unknown';
        }

        return {
          ...conv,
          lastMessage,
          unreadCount,
          groupInfo: {
            name: GROUP_SLUG_TO_NAME[conv.subject] || conv.subject,
            slug: conv.subject,
            memberCount: memberCount || 0,
          },
        };
      }

      // ── Direct conversations ─────────────────────────
      const { data: otherParticipants } = await supabaseAdmin
        .from('chat_participants')
        .select('user_id')
        .eq('conversation_id', conv.id)
        .neq('user_id', user.id);

      let otherUser = null;
      if (otherParticipants?.length) {
        const otherUserId = otherParticipants[0].user_id;
        const [{ data: otherUserData }, { data: userRoleData }] =
          await Promise.all([
            supabaseAdmin
              .from('users')
              .select('id, full_name, avatar_url, email')
              .eq('id', otherUserId)
              .single(),
            supabaseAdmin
              .from('user_roles')
              .select('roles(name)')
              .eq('user_id', otherUserId)
              .limit(1),
          ]);

        if (otherUserData) {
          otherUser = {
            ...otherUserData,
            role: userRoleData?.[0]?.roles?.name || null,
          };
        }
      }

      return {
        ...conv,
        lastMessage,
        unreadCount,
        otherUser,
      };
    })
  );

  const totalUnread = enriched.reduce((sum, c) => sum + c.unreadCount, 0);

  return { conversations: enriched, totalUnread };
}

// =============================================================================
// GET UNREAD COUNT (lightweight – for badge polling)
// =============================================================================

export async function getUnreadCountAction() {
  const authResult = await requireChatUser();
  if (authResult.error) return 0;
  const { user } = authResult;

  const { data: participations } = await supabaseAdmin
    .from('chat_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id);

  if (!participations?.length) return 0;

  const counts = await Promise.all(
    participations.map(async (p) => {
      let q = supabaseAdmin
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', p.conversation_id)
        .neq('sender_id', user.id)
        .is('deleted_at', null);
      if (p.last_read_at) {
        q = q.gt('created_at', p.last_read_at);
      }
      const { count } = await q;
      return count || 0;
    })
  );

  return counts.reduce((sum, c) => sum + c, 0);
}

// =============================================================================
// CREATE DIRECT CONVERSATION
// =============================================================================

export async function createDirectConversationAction(targetUserId) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user, role } = authResult;

  if (targetUserId === user.id) return { error: 'Cannot chat with yourself.' };

  // Get target user + role
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, full_name, avatar_url, account_status')
    .eq('id', targetUserId)
    .single();

  if (!targetUser) return { error: 'User not found.' };
  if (targetUser.account_status !== 'active')
    return { error: 'User is not active.' };

  const { data: targetRoleData } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', targetUserId)
    .limit(1);

  const targetRole = targetRoleData?.[0]?.roles?.name || null;

  // Permission check
  if (!canChat(role, targetRole))
    return { error: 'You are not allowed to chat with this user.' };

  // Check for existing direct conversation
  const { data: existing } = (await supabaseAdmin
    .rpc('find_direct_conversation', {
      user_a: user.id,
      user_b: targetUserId,
    })
    .maybeSingle?.()) || { data: null };

  // Manual deduplication if RPC is not set up
  if (!existing) {
    const { data: myConvos } = await supabaseAdmin
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myConvos?.length) {
      const myConvoIds = myConvos.map((c) => c.conversation_id);
      const { data: shared } = await supabaseAdmin
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConvoIds);

      if (shared?.length) {
        for (const s of shared) {
          const { data: conv } = await supabaseAdmin
            .from('chat_conversations')
            .select('id')
            .eq('id', s.conversation_id)
            .eq('type', 'direct')
            .single();
          if (conv) return { conversation: conv };
        }
      }
    }
  }

  // Create new conversation
  const { data: newConv, error: convError } = await supabaseAdmin
    .from('chat_conversations')
    .insert({
      type: 'direct',
      status: 'open',
      created_by: user.id,
    })
    .select()
    .single();

  if (convError) return { error: convError.message };

  // Add both participants
  await supabaseAdmin.from('chat_participants').insert([
    { conversation_id: newConv.id, user_id: user.id },
    { conversation_id: newConv.id, user_id: targetUserId },
  ]);

  await logActivity(user.id, 'create_conversation', newConv.id, {
    type: 'direct',
    targetUserId,
    targetRole,
  });

  return { conversation: newConv };
}

// =============================================================================
// CREATE SUPPORT CONVERSATION (Disabled – guests cannot access chat)
// =============================================================================

export async function createSupportConversationAction() {
  return { error: 'Guests cannot access chat.' };
}

// =============================================================================
// CLAIM SUPPORT CONVERSATION (Executive only)
// =============================================================================

export async function claimSupportConversationAction(conversationId) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user, role } = authResult;

  if (role !== 'executive' && role !== 'admin')
    return { error: 'Only executives can claim support conversations.' };

  const { data: conv } = await supabaseAdmin
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('type', 'support')
    .single();

  if (!conv) return { error: 'Conversation not found.' };
  if (conv.assigned_to && conv.assigned_to !== user.id)
    return { error: 'Already claimed by another executive.' };

  // Update assignment
  await supabaseAdmin
    .from('chat_conversations')
    .update({ assigned_to: user.id, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Add executive as participant if not already
  const { data: existingPart } = await supabaseAdmin
    .from('chat_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingPart) {
    await supabaseAdmin.from('chat_participants').insert({
      conversation_id: conversationId,
      user_id: user.id,
    });
  }

  await logActivity(user.id, 'claim_support', conversationId, {});

  return { success: true };
}

// =============================================================================
// GET SUPPORT INBOX (Executives)
// =============================================================================

export async function getSupportInboxAction() {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user, role } = authResult;

  if (role !== 'executive' && role !== 'admin')
    return { error: 'Unauthorized' };

  // Get all open support conversations (unassigned or assigned to this exec)
  const { data: conversations, error } = await supabaseAdmin
    .from('chat_conversations')
    .select('*')
    .eq('type', 'support')
    .eq('status', 'open')
    .or(`assigned_to.is.null,assigned_to.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  // Enrich with guest info and last message
  const enriched = await Promise.all(
    (conversations || []).map(async (conv) => {
      const { data: creator } = await supabaseAdmin
        .from('users')
        .select('id, full_name, avatar_url, email')
        .eq('id', conv.created_by)
        .single();

      const { data: lastMessages } = await supabaseAdmin
        .from('chat_messages')
        .select('id, content, sender_id, created_at, message_type, metadata')
        .eq('conversation_id', conv.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        ...conv,
        guestUser: creator,
        lastMessage: lastMessages?.[0] || null,
      };
    })
  );

  return { conversations: enriched };
}

// =============================================================================
// GET MESSAGES
// =============================================================================

export async function getMessagesAction(conversationId, cursor, limit = 30) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user } = authResult;

  // Verify participation
  const { data: participant } = await supabaseAdmin
    .from('chat_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!participant) return { error: 'Not a participant.' };

  // Fetch messages
  let query = supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: messages, error } = await query;
  if (error) return { error: error.message };

  const hasMore = messages?.length > limit;
  const result = (messages || []).slice(0, limit).reverse();

  // Enrich with sender info
  const senderIds = [...new Set(result.map((m) => m.sender_id))];
  const { data: senders } = await supabaseAdmin
    .from('users')
    .select('id, full_name, avatar_url')
    .in('id', senderIds);

  const senderMap = {};
  senders?.forEach((s) => {
    senderMap[s.id] = s;
  });

  const enrichedMessages = result.map((m) => ({
    ...m,
    sender: senderMap[m.sender_id] || {
      full_name: 'Unknown',
      avatar_url: null,
    },
  }));

  // Update last_read_at
  await supabaseAdmin
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  return { messages: enrichedMessages, hasMore };
}

// =============================================================================
// SEND MESSAGE
// =============================================================================

export async function sendMessageAction(conversationId, content) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user, role } = authResult;

  // Verify participation
  const { data: participant } = await supabaseAdmin
    .from('chat_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!participant) return { error: 'Not a participant.' };

  // Verify conversation is open
  const { data: conv } = await supabaseAdmin
    .from('chat_conversations')
    .select('status')
    .eq('id', conversationId)
    .single();

  if (!conv || conv.status !== 'open')
    return { error: 'Conversation is closed.' };

  // Rate limit
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await supabaseAdmin
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', user.id)
    .gte('created_at', oneMinuteAgo);

  const limit = RATE_LIMITS[role]?.maxPerMinute || 5;
  if ((recentCount || 0) >= limit)
    return { error: 'Rate limit exceeded. Please wait a moment.' };

  // Sanitize
  let cleanContent;
  try {
    cleanContent = sanitizeContent(content);
  } catch (e) {
    return { error: e.message };
  }

  // Insert message
  const { data: message, error: msgError } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: cleanContent,
      message_type: 'text',
    })
    .select()
    .single();

  if (msgError) return { error: msgError.message };

  // Update conversation metadata
  await supabaseAdmin
    .from('chat_conversations')
    .update({
      last_message_at: message.created_at,
      message_count: (conv.message_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  // Update sender's last_read_at
  await supabaseAdmin
    .from('chat_participants')
    .update({ last_read_at: message.created_at })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  // Create notification for other participants
  const { data: otherParts } = await supabaseAdmin
    .from('chat_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id);

  if (otherParts?.length) {
    await Promise.all(
      otherParts.map(async (op) => {
        const { data: recentNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', op.user_id)
          .ilike('link', `%chat=${conversationId}%`)
          .gte('created_at', new Date(Date.now() - 60_000).toISOString())
          .limit(1);

        if (!recentNotif?.length) {
          await supabaseAdmin.from('notifications').insert({
            user_id: op.user_id,
            title: 'New message',
            message: `${user.full_name}: ${cleanContent.slice(0, 100)}`,
            notification_type: 'info',
            link: `?chat=${conversationId}`,
            is_read: false,
          });
        }
      })
    );
  }

  return {
    message: {
      ...message,
      sender: {
        id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
    },
  };
}

// =============================================================================
// SEND FILE/IMAGE MESSAGE
// =============================================================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function sendFileMessageAction(conversationId, formData) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user, role } = authResult;

  const file = formData.get('file');
  const caption = formData.get('caption')?.trim() || '';

  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'No file provided.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File too large. Maximum size is 10 MB.' };
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { error: 'File type not supported.' };
  }

  // Verify participation
  const { data: participant } = await supabaseAdmin
    .from('chat_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!participant) return { error: 'Not a participant.' };

  // Verify conversation is open
  const { data: conv } = await supabaseAdmin
    .from('chat_conversations')
    .select('status, message_count')
    .eq('id', conversationId)
    .single();

  if (!conv || conv.status !== 'open')
    return { error: 'Conversation is closed.' };

  // Rate limit
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await supabaseAdmin
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', user.id)
    .gte('created_at', oneMinuteAgo);

  const limit = RATE_LIMITS[role]?.maxPerMinute || 5;
  if ((recentCount || 0) >= limit)
    return { error: 'Rate limit exceeded. Please wait a moment.' };

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const storagePath = `${conversationId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from('chat-attachments')
    .upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return { error: 'Failed to upload file. Please try again.' };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('chat-attachments').getPublicUrl(storagePath);

  const messageType = isImage ? 'image' : 'file';
  const metadata = {
    url: publicUrl,
    filename: file.name,
    size: file.size,
    mime_type: file.type,
  };

  // Insert message
  const { data: message, error: msgError } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: caption || (isImage ? '📷 Photo' : `📎 ${file.name}`),
      message_type: messageType,
      metadata,
    })
    .select()
    .single();

  if (msgError) return { error: msgError.message };

  // Update conversation metadata
  await supabaseAdmin
    .from('chat_conversations')
    .update({
      last_message_at: message.created_at,
      message_count: (conv.message_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  // Update sender's last_read_at
  await supabaseAdmin
    .from('chat_participants')
    .update({ last_read_at: message.created_at })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  // Notifications for other participants
  const { data: otherParts } = await supabaseAdmin
    .from('chat_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id);

  if (otherParts?.length) {
    const previewText = isImage ? '📷 Photo' : `📎 ${file.name}`;
    await Promise.all(
      otherParts.map(async (op) => {
        const { data: recentNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', op.user_id)
          .ilike('link', `%chat=${conversationId}%`)
          .gte('created_at', new Date(Date.now() - 60_000).toISOString())
          .limit(1);

        if (!recentNotif?.length) {
          await supabaseAdmin.from('notifications').insert({
            user_id: op.user_id,
            title: 'New message',
            message: `${user.full_name}: ${previewText}`,
            notification_type: 'info',
            link: `?chat=${conversationId}`,
            is_read: false,
          });
        }
      })
    );
  }

  return {
    message: {
      ...message,
      sender: {
        id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
    },
  };
}

// =============================================================================
// EDIT MESSAGE
// =============================================================================

export async function editMessageAction(messageId, newContent) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user } = authResult;

  const { data: msg } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (!msg) return { error: 'Message not found.' };
  if (msg.sender_id !== user.id)
    return { error: 'Cannot edit others messages.' };
  if (msg.message_type !== 'text')
    return { error: 'Only text messages can be edited.' };

  // 5-minute edit window
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
  if (new Date(msg.created_at) < fiveMinAgo)
    return { error: 'Edit window has expired (5 minutes).' };

  let cleanContent;
  try {
    cleanContent = sanitizeContent(newContent);
  } catch (e) {
    return { error: e.message };
  }

  const { error } = await supabaseAdmin
    .from('chat_messages')
    .update({
      content: cleanContent,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  if (error) return { error: error.message };

  return { success: true };
}

// =============================================================================
// DELETE MESSAGE (soft)
// =============================================================================

export async function deleteMessageAction(messageId) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user } = authResult;

  const { data: msg } = await supabaseAdmin
    .from('chat_messages')
    .select('sender_id')
    .eq('id', messageId)
    .single();

  if (!msg) return { error: 'Message not found.' };
  if (msg.sender_id !== user.id)
    return { error: 'Cannot delete others messages.' };

  const { error } = await supabaseAdmin
    .from('chat_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) return { error: error.message };

  return { success: true };
}

// =============================================================================
// CLOSE CONVERSATION
// =============================================================================

export async function closeConversationAction(conversationId) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user, role } = authResult;

  // Verify participation
  const { data: participant } = await supabaseAdmin
    .from('chat_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!participant && role !== 'admin') return { error: 'Not a participant.' };

  await supabaseAdmin
    .from('chat_conversations')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  await logActivity(user.id, 'close_conversation', conversationId, {});

  return { success: true };
}

// =============================================================================
// MARK AS READ
// =============================================================================

export async function markConversationReadAction(conversationId) {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user } = authResult;

  await supabaseAdmin
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  return { success: true };
}

// =============================================================================
// GET CHATABLE USERS
// =============================================================================

export async function getChatableUsersAction(search = '') {
  const authResult = await requireChatUser();
  if (authResult.error) return { error: authResult.error };
  const { user, role } = authResult;

  const allowedTargetRoles = CHAT_MATRIX[role] || [];
  if (!allowedTargetRoles.length) return { users: [] };

  // Get role IDs for allowed target roles
  const { data: roleRows } = await supabaseAdmin
    .from('roles')
    .select('id, name')
    .in('name', allowedTargetRoles);

  if (!roleRows?.length) return { users: [] };

  const roleIdToName = {};
  roleRows.forEach((r) => {
    roleIdToName[r.id] = r.name;
  });
  const roleIds = roleRows.map((r) => r.id);

  // Get users who have one of the allowed roles
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role_id')
    .in('role_id', roleIds);

  if (!userRoles?.length) return { users: [] };

  const userIds = [...new Set(userRoles.map((ur) => ur.user_id))].filter(
    (id) => id !== user.id
  );

  if (!userIds.length) return { users: [] };

  // Fetch user details
  let query = supabaseAdmin
    .from('users')
    .select('id, full_name, avatar_url, email, account_status')
    .in('id', userIds)
    .eq('account_status', 'active')
    .order('full_name');

  if (search?.trim()) {
    query = query.ilike('full_name', `%${search.trim()}%`);
  }

  const { data: users } = await query;

  // Attach role to each user
  const userIdToRole = {};
  userRoles.forEach((ur) => {
    if (!userIdToRole[ur.user_id]) {
      userIdToRole[ur.user_id] = roleIdToName[ur.role_id] || null;
    }
  });

  const result = (users || []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    email: u.email,
    role: userIdToRole[u.id] || null,
  }));

  return { users: result };
}
