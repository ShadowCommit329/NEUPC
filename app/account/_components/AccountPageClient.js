/**
 * @file Account hub page client wrapper.
 * Resets active role context when user visits the account selection page.
 *
 * @module AccountPageClient
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from './RoleContext';

export default function AccountPageClient({ children, redirectPath }) {
  const { setActiveRole } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (redirectPath) {
      // Smooth client-side transition to the dashboard
      router.replace(redirectPath);
      return;
    }

    // Reset active role when on the account hub/selection page
    setActiveRole(null);
  }, [setActiveRole, redirectPath, router]);

  if (redirectPath) {
    // Show a minimal loading state or nothing while transitioning
    // You could also return an AccountLoading variant here
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="border-primary-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
