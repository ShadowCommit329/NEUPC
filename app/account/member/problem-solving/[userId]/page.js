/**
 * @file Member Problem Solving Profile Page
 * @module MemberProfilePage
 * @access member
 *
 * View another member's problem solving statistics and activity.
 */

import { requireRole } from '@/app/_lib/auth-guard';
import { getMemberProblemSolvingData } from '@/app/_lib/problem-solving-actions';
import { notFound } from 'next/navigation';
import MemberProfileClient from './_components/MemberProfileClient';

export async function generateMetadata({ params }) {
  const { userId } = await params;
  const result = await getMemberProblemSolvingData(userId);

  if (!result.success) {
    return { title: 'Member Not Found | NEUPC' };
  }

  return {
    title: `${result.data.profile.name}'s Problem Solving | NEUPC`,
  };
}

export default async function MemberProfilePage({ params }) {
  await requireRole('member');
  const { userId } = await params;

  const result = await getMemberProblemSolvingData(userId);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <MemberProfileClient data={result.data} />
    </div>
  );
}
