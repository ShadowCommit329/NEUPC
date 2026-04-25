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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060B] px-4 py-24 sm:px-6">
      {/* Ambient background — matches login */}
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-overlay absolute inset-0 opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(124,92,255,0.07),transparent)]" />
        <div className="bg-neon-violet/10 absolute -top-40 -left-32 h-125 w-125 rounded-full blur-[140px]" />
        <div className="bg-neon-lime/8 absolute -bottom-40 -right-32 h-100 w-100 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <VerifyEmailClient
          token={token}
          initialValid={valid}
          user={user}
          verifyAction={verifyTokenAction}
        />
      </div>
    </main>
  );
}
