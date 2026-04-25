'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const STATES = {
  invalid: {
    Icon: AlertCircle,
    iconClass: 'text-amber-400',
    title: 'Link Expired or Invalid',
    accent: 'amber',
  },
  success: {
    Icon: CheckCircle2,
    iconClass: 'text-neon-lime',
    title: 'Email Verified',
    accent: 'lime',
  },
  error: {
    Icon: XCircle,
    iconClass: 'text-rose-400',
    title: 'Verification Failed',
    accent: 'rose',
  },
  idle: {
    Icon: CheckCircle2,
    iconClass: 'text-neon-violet',
    title: 'Ready to Verify',
    accent: 'violet',
  },
  loading: {
    Icon: Loader2,
    iconClass: 'text-neon-violet animate-spin',
    title: 'Verifying Account',
    accent: 'violet',
  },
};

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="group bg-neon-lime font-heading inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)] disabled:opacity-60"
    >
      {children}
      <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
    </button>
  );
}

function PrimaryLink({ href, children }) {
  return (
    <Link
      href={href}
      className="group bg-neon-lime font-heading inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)]"
    >
      {children}
      <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

function SecondaryLink({ href, children }) {
  return (
    <Link
      href={href}
      className="font-heading hover:border-neon-lime/50 hover:text-neon-lime inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/15 px-8 py-3.5 text-[11px] font-bold tracking-widest text-zinc-300 uppercase backdrop-blur-sm transition-all"
    >
      {children}
    </Link>
  );
}

export default function VerifyEmailClient({ token, initialValid, user, verifyAction }) {
  const [status, setStatus] = useState(initialValid ? 'idle' : 'invalid');
  const [message, setMessage] = useState('');

  const handleVerify = async () => {
    setStatus('loading');
    const result = await verifyAction(token);
    if (result.ok) {
      setStatus('success');
      setMessage(result.message);
    } else {
      setStatus('error');
      setMessage(result.message);
    }
  };

  const meta = STATES[status];
  const Icon = meta.Icon;

  let body;
  if (status === 'invalid') {
    body = 'This link may have already been used to verify an account, or the token is incorrect.';
  } else if (status === 'success') {
    body = message || 'Your account is now fully verified.';
  } else if (status === 'error') {
    body = message;
  } else if (status === 'idle') {
    body = `Welcome, ${user?.full_name || 'User'}. Click below to verify your email and activate your account.`;
  } else {
    body = 'Please wait while we verify your email address.';
  }

  return (
    <div className="void-glow-violet relative w-full overflow-hidden rounded-2xl border border-white/5 bg-[rgba(12,14,22,0.75)] p-8 backdrop-blur-2xl sm:p-10 text-center">
      {/* Corner accents */}
      <span className="absolute top-0 left-0 h-6 w-px bg-neon-violet/70" />
      <span className="absolute top-0 left-0 h-px w-6 bg-neon-violet/70" />
      <span className="absolute right-0 bottom-0 h-6 w-px bg-neon-lime/50" />
      <span className="absolute right-0 bottom-0 h-px w-6 bg-neon-lime/50" />

      {/* Eyebrow */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-neon-lime" />
        <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase sm:text-[11px]">
          Account · Email Verification
        </span>
      </div>

      {/* Icon */}
      <Icon className={`mx-auto mb-5 h-12 w-12 ${meta.iconClass}`} />

      {/* Title */}
      <h1 className="kinetic-headline font-heading text-3xl font-black uppercase text-white sm:text-4xl">
        {meta.title}
      </h1>

      {/* Body */}
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed font-light text-zinc-400 sm:text-base">
        {body}
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {status === 'idle' && (
          <PrimaryButton onClick={handleVerify}>Verify My Email</PrimaryButton>
        )}
        {status === 'success' && <PrimaryLink href="/login">Go to Login</PrimaryLink>}
        {status === 'invalid' && <PrimaryLink href="/login">Go to Login</PrimaryLink>}
        {status === 'error' && <SecondaryLink href="/">Go Home</SecondaryLink>}
      </div>
    </div>
  );
}
