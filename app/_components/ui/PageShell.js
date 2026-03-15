/**
 * @file Consistent page background wrapper for all public listing pages.
 * Standardizes background color, min-height, and optional decorative blobs.
 *
 * @module PageShell
 */

import { cn } from '@/app/_lib/utils';

/**
 * PageShell — Wrapper providing a unified page background.
 *
 * @param {{ children: React.ReactNode, className?: string, showBlobs?: boolean }} props
 */
export default function PageShell({ children, className, showBlobs = false }) {
  return (
    <main className={cn('relative min-h-screen bg-[#060810]', className)}>
      {showBlobs && (
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="from-primary-500/10 absolute -top-20 right-10 h-72 w-72 rounded-full bg-linear-to-br to-transparent opacity-70 blur-3xl" />
          <div className="from-secondary-500/10 absolute bottom-20 left-10 h-72 w-72 rounded-full bg-linear-to-br to-transparent opacity-70 blur-3xl" />
        </div>
      )}
      {children}
    </main>
  );
}
