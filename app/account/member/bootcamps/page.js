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

  // Create a map of bootcamp enrollment data
  const enrollmentMap = {};
  for (const enrollment of enrollments) {
    if (enrollment.bootcamps?.id) {
      enrollmentMap[enrollment.bootcamps.id] = enrollment;

      // Fetch progress data for enrolled bootcamps
      try {
        const progress = await getBootcampProgress(enrollment.bootcamps.id);
        const completedCount = Object.values(
          progress.lessonProgress || {}
        ).filter((p) => p.is_completed).length;
        enrollmentMap[enrollment.bootcamps.id].completed_lessons =
          completedCount;
        enrollmentMap[enrollment.bootcamps.id].progressData = progress;
      } catch {
        // Ignore errors for individual progress fetches
      }
    }
  }

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <MemberBootcampsClient
        bootcamps={allBootcamps}
        enrollmentMap={enrollmentMap}
      />
    </div>
  );
}
