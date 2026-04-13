/**
 * Admin Page: Problem Solving Data Extraction
 *
 * Allows admins to extract all-time problem solving statistics
 * from all supported platforms in various formats
 */

import { Suspense } from 'react';
import { requireRole } from '@/app/_lib/auth-guard';
import ExtractionClient from './_components/ExtractionClient';

export const metadata = {
  title: 'Data Extraction | Admin',
  description: 'Extract problem solving data from all platforms',
};

export default async function ExtractionPage() {
  await requireRole('admin');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          Problem Solving Data Extraction
        </h1>
        <p className="text-gray-600">
          Extract all-time statistics from 17 supported platforms including
          Codeforces, LeetCode, AtCoder, and more.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ExtractionClient />
      </Suspense>
    </div>
  );
}
