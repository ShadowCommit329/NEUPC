/**
 * @file Member bootcamps page — displays all available bootcamps
 *   with enrollment status and progress tracking.
 * @module MemberBootcampsPage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getMyEnrollments,
  getBootcampProgress,
  getMemberBootcamps,
} from '@/app/_lib/bootcamp-actions';
import MemberBootcampsClient from './_components/MemberBootcampsClient';

export const metadata = { title: 'Bootcamps | Member | NEUPC' };

export default async function MemberBootcampsPage() {
  const { user } = await requireRole('member');

  // Fetch all published bootcamps (for members to browse)
  const allBootcamps = await getMemberBootcamps().catch(() => []);

  // Fetch user's enrollments
  const enrollments = await getMyEnrollments().catch(() => []);

  // Fetch progress for all enrolled bootcamps in parallel
  const valid = enrollments.filter((e) => e.bootcamps?.id);
  const progressList = await Promise.all(
    valid.map((e) =>
      getBootcampProgress(e.bootcamps.id).catch(() => ({ lessonProgress: {} }))
    )
  );
  const enrollmentMap = {};
  valid.forEach((enrollment, idx) => {
    const progress = progressList[idx];
    const completedCount = Object.values(progress.lessonProgress || {}).filter(
      (p) => p.is_completed
    ).length;
    enrollmentMap[enrollment.bootcamps.id] = {
      ...enrollment,
      completed_lessons: completedCount,
      progressData: progress,
    };
  });

  return (
    <div className="min-h-screen bg-[#080b11] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-8 xl:px-12 2xl:px-16">
      <div className="mx-auto max-w-7xl">
        <MemberBootcampsClient
          bootcamps={allBootcamps}
          enrollmentMap={enrollmentMap}
        />
      </div>
    </div>
  );
}
