import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/app/_lib/auth-guard';
import {
  getBootcampWithCurriculum,
  checkEnrollment,
  updateEnrollmentAccess,
  getBootcampProgress,
} from '@/app/_lib/bootcamp-actions';
import BootcampLearningClient from './_components/BootcampLearningClient';

export async function generateMetadata({ params }) {
  const { bootcampId } = await params;
  try {
    const bootcamp = await getBootcampWithCurriculum(bootcampId);
    return { title: `${bootcamp?.title || 'Bootcamp'} | NEUPC` };
  } catch {
    return { title: 'Bootcamp | NEUPC' };
  }
}

export default async function BootcampLearningPage({ params }) {
  const { bootcampId } = await params;
  await requireRole('member');

  let bootcamp;
  try {
    bootcamp = await getBootcampWithCurriculum(bootcampId);
  } catch {
    notFound();
  }

  if (!bootcamp) notFound();

  const enrollmentCheck = await checkEnrollment(bootcampId);
  if (!enrollmentCheck.enrolled) {
    redirect(`/account/member/bootcamps`);
  }

  await updateEnrollmentAccess(bootcampId).catch(() => {});

  const { lessonProgress } = await getBootcampProgress(bootcampId).catch(() => ({ lessonProgress: {} }));

  return <BootcampLearningClient bootcamp={bootcamp} lessonProgress={lessonProgress} />;
}
