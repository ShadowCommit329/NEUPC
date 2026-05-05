import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/app/_lib/auth-guard';
import {
  getBootcampCurriculumLight,
  checkEnrollment,
  updateEnrollmentAccess,
  getBootcampProgress,
} from '@/app/_lib/bootcamp-actions';
import BootcampLearningClient from './_components/BootcampLearningClient';

export async function generateMetadata({ params }) {
  const { bootcampSlug } = await params;
  try {
    const bootcamp = await getBootcampCurriculumLight(bootcampSlug);
    return { title: `${bootcamp?.title || 'Bootcamp'} | NEUPC` };
  } catch {
    return { title: 'Bootcamp | NEUPC' };
  }
}

export default async function BootcampLearningPage({ params }) {
  const { bootcampSlug } = await params;
  await requireRole('member');

  let bootcamp;
  try {
    bootcamp = await getBootcampCurriculumLight(bootcampSlug);
  } catch {
    notFound();
  }

  if (!bootcamp) notFound();

  const enrollmentCheck = await checkEnrollment(bootcamp.id);
  if (!enrollmentCheck.enrolled) {
    redirect(`/account/member/bootcamps`);
  }

  await updateEnrollmentAccess(bootcamp.id).catch(() => {});

  const { lessonProgress } = await getBootcampProgress(bootcamp.id).catch(() => ({ lessonProgress: {} }));

  return <BootcampLearningClient bootcamp={bootcamp} lessonProgress={lessonProgress} />;
}
