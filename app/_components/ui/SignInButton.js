/**
 * @file Sign In Button with loading state
 * @module SignInButton
 */

'use client';

import { useRef, useCallback, useState } from 'react';
import { signInAction } from '@/app/_lib/actions';
import { cn } from '@/app/_lib/utils';

function SignInButton() {
  const [isPending, setIsPending] = useState(false);
  const btnRef = useRef(null);

  // ── Ripple effect on click ──────────────────────────────────────────────
  const handleRipple = useCallback((e) => {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = `
      position:absolute; left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      transform:translate(-50%,-50%) scale(0);
      background: radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%);
    `;
    btn.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%,-50%) scale(1)';
      ripple.style.opacity = '0';
    });
    setTimeout(() => ripple.remove(), 600);
  }, []);

  async function handleSubmit(e) {
    handleRipple(e.nativeEvent);
    setIsPending(true);
    // The form action will handle sign-in; we keep loading until navigation
  }

  return (
    <form action={signInAction} className="w-full" onSubmit={handleSubmit}>
      <button
        ref={btnRef}
        type="submit"
        disabled={isPending}
        className={cn(
          'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full',
          'border border-white/10 bg-[#0C0E16] px-5 py-4',
          'font-heading text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-200',
          'transition-all duration-300 ease-out',
          'hover:border-neon-violet/40 hover:bg-neon-violet/5 hover:text-white hover:shadow-[0_0_30px_-8px_rgba(124,92,255,0.4)]',
          'focus-visible:ring-neon-violet/50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0C0E16] focus-visible:outline-none',
          'active:scale-[0.98]',
          isPending && 'pointer-events-none opacity-50'
        )}
      >
        {/* Sweep shine on hover */}
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-neon-violet/8 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          aria-hidden="true"
        />

        <span className="relative z-10 inline-flex items-center gap-3">
          {isPending ? (
            <>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neon-violet border-r-transparent"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] tracking-widest text-zinc-400">
                Authenticating…
              </span>
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4 shrink-0 opacity-90"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
              <span
                aria-hidden="true"
                className="ml-1 font-mono text-[10px] text-zinc-600 transition-colors group-hover:text-neon-violet/60"
              >
                →
              </span>
            </>
          )}
        </span>
      </button>
    </form>
  );
}

export default SignInButton;
