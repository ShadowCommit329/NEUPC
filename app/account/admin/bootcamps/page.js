/**
 * @file Admin bootcamps listing page.
 * @module AdminBootcampsPage
 */

import { getAdminBootcamps } from '@/app/_lib/bootcamp-actions';
import BootcampManagementClient from './_components/BootcampManagementClient';

export const metadata = {
  title: 'Bootcamp Management | Admin',
  description: 'Manage bootcamp programs, courses, and enrollments',
};

export default async function AdminBootcampsPage() {
  let bootcamps = [];
  let error = null;

  try {
    bootcamps = await getAdminBootcamps();
  } catch (err) {
    // Handle different error types
    error =
      err?.message ||
      (typeof err === 'string' ? err : 'An unexpected error occurred');
    console.error('Failed to fetch bootcamps:', err);
  }

  if (error) {
    return (
      <div className="mx-4 my-6 flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 sm:mx-6 lg:mx-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-red-400">
            Failed to load bootcamps
          </p>
          <p className="mt-2 text-xs text-red-300/80">{error}</p>
        </div>
      </div>
    );
  }

  return <BootcampManagementClient initialBootcamps={bootcamps} />;
}
