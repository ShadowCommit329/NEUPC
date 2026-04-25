/**
 * @file Account hub page client wrapper.
 * Resets active role context when user visits the account selection page.
 *
 * @module AccountPageClient
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from './RoleContext';

export default function AccountPageClient({ children, redirectPath }) {
  const { setActiveRole } = useRole();
  const router = useRouter();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (redirectPath) {
      if (didRedirect.current) return;
      didRedirect.current = true;
      router.replace(redirectPath);
      return;
    }
    setActiveRole(null);
  }, [setActiveRole, redirectPath, router]);

  if (redirectPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05060B]">
        <div className="border-neon-lime h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
