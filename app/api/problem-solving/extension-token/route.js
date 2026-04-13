/**
 * Extension Token Management API
 * GET /api/problem-solving/extension-token - Get current token
 * POST /api/problem-solving/extension-token - Generate new token
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import crypto from 'crypto';

/**
 * GET - Retrieve current extension token
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getCachedUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('extension_token')
      .eq('id', dbUser.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        extensionToken: user?.extension_token || null,
        hasToken: !!user?.extension_token,
      },
    });
  } catch (error) {
    console.error('[EXTENSION-TOKEN] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate new extension token
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getCachedUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { regenerate = false } = body;

    // Check if user already has a token
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('extension_token')
      .eq('id', dbUser.id)
      .single();

    if (existingUser?.extension_token && !regenerate) {
      return NextResponse.json({
        success: true,
        data: {
          extensionToken: existingUser.extension_token,
          isNew: false,
          message:
            'Using existing token. Set regenerate:true to create new one.',
        },
      });
    }

    // Generate new token
    const newToken = `neupc_${crypto.randomBytes(32).toString('hex')}`;

    // Update user with new token
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        extension_token: newToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUser.id);

    if (updateError) {
      console.error('[EXTENSION-TOKEN] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      );
    }

    // Token generated successfully

    return NextResponse.json({
      success: true,
      data: {
        extensionToken: newToken,
        isNew: true,
        message: regenerate
          ? 'New token generated. Previous token is now invalid.'
          : 'Extension token generated successfully.',
      },
    });
  } catch (error) {
    console.error('[EXTENSION-TOKEN] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
