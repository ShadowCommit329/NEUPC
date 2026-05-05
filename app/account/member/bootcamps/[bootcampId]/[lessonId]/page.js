/**
 * @file Lesson page — displays video player, content, and progress tracking
 *   for enrolled members.
 * @module LessonPage
 * @access member (enrolled)
 */

import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/app/_lib/auth-guard';
import {
  getBootcampCurriculumLight,
  getLesson,
  checkEnrollment,
  getBootcampProgress,
  updateEnrollmentAccess,
} from '@/app/_lib/bootcamp-actions';
import LessonViewClient from './_components/LessonViewClient';

export async function generateMetadata({ params }) {
  const { lessonId } = await params;
  try {
    const lesson = await getLesson(lessonId);
    return {
      title: `${lesson?.title || 'Lesson'} | NEUPC`,
    };
  } catch {
    return { title: 'Lesson | NEUPC' };
  }
}

export default async function LessonPage({ params }) {
  const { bootcampId, lessonId } = await params;
  const { user } = await requireRole('member');

  // Fetch lesson data
  let lesson;
  try {
    lesson = await getLesson(lessonId);
  } catch {
    notFound();
  }

  if (!lesson) {
    notFound();
  }

  // Verify lesson belongs to the bootcamp; reject mismatched URL outright
  // rather than redirecting (avoids leaking other-bootcamp lesson IDs).
  const lessonBootcampId = lesson.modules?.courses?.bootcamps?.id;
  if (lessonBootcampId && lessonBootcampId !== bootcampId) {
    notFound();
  }

  // Check enrollment (unless it's a free preview)
  if (!lesson.is_free_preview) {
    const enrollmentCheck = await checkEnrollment(bootcampId);
    if (!enrollmentCheck.enrolled) {
      redirect(`/bootcamps/${bootcampId}`);
    }
  }

  // Fetch bootcamp for curriculum sidebar (light: no lesson content)
  let bootcamp;
  try {
    bootcamp = await getBootcampCurriculumLight(bootcampId);
  } catch {
    notFound();
  }

  // Update last accessed
  await updateEnrollmentAccess(bootcampId).catch(() => {});

  // Get user's progress
  const progressData = await getBootcampProgress(bootcampId).catch(() => ({
    progress: [],
    lessonProgress: {},
  }));

  return (
    <LessonViewClient
      bootcamp={bootcamp}
      lesson={lesson}
      lessonProgress={progressData.lessonProgress}
      userProgress={progressData.lessonProgress[lessonId] || null}
    />
  );
}
