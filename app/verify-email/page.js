/**
 * @file Email verification page
 * @module VerifyEmailPage
 */

import { supabaseAdmin } from '@/app/_lib/supabase';
import VerifyEmailClient from './VerifyEmailClient';

export const metadata = {
  title: 'Verify Email | NEUPC',
};

async function checkTokenValidity(token) {
  if (!token || typeof token !== 'string') return { valid: false };
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email_verified, account_status')
    .eq('verification_token', token)
    .single();
    
  return { valid: !!user, user };
}

export default async function VerifyEmailPage({ searchParams }) {
  const params = await searchParams;
  const token = params?.token || '';

  const { valid, user } = await checkTokenValidity(token);

  async function verifyTokenAction(tokenToVerify) {
    'use server';

    if (!tokenToVerify || typeof tokenToVerify !== 'string') {
      return { ok: false, message: 'Verification link is missing or invalid.' };
    }

    const { data: userData, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email_verified, account_status')
      .eq('verification_token', tokenToVerify)
      .single();

    if (findError || !userData) {
      return {
        ok: false,
        message: 'This verification link is invalid or has already been used.',
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        email_verified: true,
        verification_token: null,
        account_status: 'active',
        status_reason: 'email verified successfully',
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.id);

    if (updateError) {
      return {
        ok: false,
        message: 'Could not verify your account right now. Please try again.',
      };
    }

    return {
      ok: true,
      message: `${userData.full_name || 'Your account'} is now verified and active. You can now log in.`,
    };
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <VerifyEmailClient 
        token={token}
        initialValid={valid}
        user={user}
        verifyAction={verifyTokenAction}
      />
    </div>
  );
}
