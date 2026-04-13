/**
 * @file Bootcamp learning page — displays curriculum with video player
 *   and progress tracking for enrolled members.
 * @module BootcampLearningPage
 * @access member (enrolled)
 */

import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/app/_lib/auth-guard';
import {
  getBootcampWithCurriculum,
  checkEnrollment,
  getBootcampProgress,
  updateEnrollmentAccess,
} from '@/app/_lib/bootcamp-actions';
import BootcampLearningClient from './_components/BootcampLearningClient';

export async function generateMetadata({ params }) {
  const { bootcampId } = await params;
  try {
    const bootcamp = await getBootcampWithCurriculum(bootcampId);
    return {
      title: `${bootcamp?.title || 'Bootcamp'} | Learning | NEUPC`,
    };
  } catch {
    return { title: 'Bootcamp | NEUPC' };
  }
}

export default async function BootcampLearningPage({ params }) {
  const { bootcampId } = await params;
  const { user } = await requireRole('member');

  // Fetch bootcamp data
  let bootcamp;
  try {
    bootcamp = await getBootcampWithCurriculum(bootcampId);
  } catch {
    notFound();
  }

  if (!bootcamp) {
    notFound();
  }

  // Check enrollment
  const enrollmentCheck = await checkEnrollment(bootcampId);

  if (!enrollmentCheck.enrolled) {
    // Redirect to public bootcamp page if not enrolled
    redirect(`/bootcamps/${bootcamp.slug || bootcampId}`);
  }

  // Update last accessed timestamp
  await updateEnrollmentAccess(bootcampId).catch(() => {});

  // Get user's progress
  const progressData = await getBootcampProgress(bootcampId).catch(() => ({
    progress: [],
    lessonProgress: {},
  }));

  return (
    <BootcampLearningClient
      bootcamp={bootcamp}
      enrollment={enrollmentCheck.enrollment}
      lessonProgress={progressData.lessonProgress}
      initialLessonId={null}
    />
  );
}
