'use client';

import { useState, useEffect, useCallback } from 'react';

// Counts how many async slots (header + footer) have resolved
let resolvedCount = 0;
let listeners = [];
const TOTAL = 2; // header + footer

export function notifyReady() {
  resolvedCount = Math.min(resolvedCount + 1, TOTAL);
  listeners.forEach((fn) => fn(resolvedCount));
}

function useReadyCount() {
  const [count, setCount] = useState(resolvedCount);
  useEffect(() => {
    const fn = (n) => setCount(n);
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);
  return count;
}

// Sentinel rendered inside each Suspense boundary after it resolves
export function ReadySignal() {
  const notify = useCallback(() => { notifyReady(); }, []);
  useEffect(() => { notify(); }, [notify]);
  return null;
}

// Wraps the whole page — hides content until all slots are ready, then fades in
export default function AppShell({ children }) {
  const count = useReadyCount();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (count >= TOTAL && !shown) {
      // One extra rAF so the revealed content has painted before we show it
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
  }, [count, shown]);

  return (
    <>
      {/* Loading overlay */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-[#05060B] transition-opacity duration-500"
        style={{ opacity: shown ? 0 : 1, pointerEvents: shown ? 'none' : 'all' }}
      >
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-neon-lime" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-neon-lime/40 [animation-direction:reverse] [animation-duration:1.4s]" />
          <div className="absolute inset-0 m-auto h-2 w-2 animate-pulse rounded-full bg-neon-lime/60" />
        </div>
        <span className="animate-pulse font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-neon-lime/60">
          Loading...
        </span>
      </div>

      {/* Page content — invisible until ready, then fades in */}
      <div
        className="contents transition-opacity duration-500"
        style={{ opacity: shown ? 1 : 0 }}
      >
        {children}
      </div>
    </>
  );
}
