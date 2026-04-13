/**
 * @file Admin bootcamp detail/edit page with curriculum builder.
 * @module AdminBootcampDetailPage
 */

import { notFound } from 'next/navigation';
import { getBootcampWithCurriculum } from '@/app/_lib/bootcamp-actions';
import BootcampDetailClient from './_components/BootcampDetailClient';

export async function generateMetadata({ params }) {
  const { bootcampId } = await params;

  try {
    const bootcamp = await getBootcampWithCurriculum(bootcampId);
    return {
      title: `${bootcamp?.title || 'Edit Bootcamp'} | Admin`,
      description: 'Edit bootcamp details and curriculum',
    };
  } catch {
    return {
      title: 'Edit Bootcamp | Admin',
    };
  }
}

export default async function AdminBootcampDetailPage({ params }) {
  const { bootcampId } = await params;

  let bootcamp = null;
  let error = null;

  try {
    bootcamp = await getBootcampWithCurriculum(bootcampId);
  } catch (err) {
    error = err.message;
    console.error('Failed to fetch bootcamp:', err);
  }

  if (!bootcamp && !error) {
    notFound();
  }

  if (error) {
    return (
      <div className="mx-4 my-6 flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 sm:mx-6 lg:mx-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-red-400">
            Failed to load bootcamp
          </p>
          <p className="mt-2 text-xs text-red-300/80">{error}</p>
        </div>
      </div>
    );
  }

  return <BootcampDetailClient bootcamp={bootcamp} />;
}
