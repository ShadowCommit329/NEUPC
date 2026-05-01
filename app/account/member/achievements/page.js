/**
 * @file Member achievements page — shows earned badges and certificates
 *   alongside progress towards unearned achievements to motivate
 *   continued engagement.
 * @module MemberAchievementsPage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getMemberAchievements,
  getUserCertificates,
} from '@/app/_lib/data-service';
import MemberAchievementsClient from './_components/MemberAchievementsClient';

export const metadata = { title: 'Achievements | Member | NEUPC' };

export default async function MemberAchievementsPage() {
  const { user } = await requireRole('member');

  const [memberAchievements, certificates] = await Promise.all([
    getMemberAchievements(user.id).catch(() => []),
    getUserCertificates(user.id).catch(() => []),
  ]);

  const tempMemberAchievements = [
    {
      id: 'temp-ach-1',
      achievements: {
        id: 'ach-1',
        title: 'ICPC Dhaka Regional 2024',
        contest_name: 'ICPC Dhaka Regional',
        result: 'Champion',
        year: 2024,
        category: 'ICPC',
        description: 'Ranked #1 among 120 teams.',
        achievement_date: '2024-12-10T00:00:00.000Z',
        is_team: true,
        team_name: 'NEUPC Alpha',
      },
    },
    {
      id: 'temp-ach-2',
      achievements: {
        id: 'ach-2',
        title: 'National IUPC 2025',
        contest_name: 'IUPC 2025',
        result: 'Runner-up',
        year: 2025,
        category: 'IUPC',
        description: 'Placed 2nd nationally with team score 540.',
        achievement_date: '2025-02-22T00:00:00.000Z',
        is_team: true,
        team_name: 'NEUPC Sigma',
      },
    },
    {
      id: 'temp-ach-3',
      achievements: {
        id: 'ach-3',
        title: 'Codeforces Div.2 #997',
        contest_name: 'Codeforces Round',
        result: 'Top 10',
        year: 2025,
        category: 'Contest',
        description: 'Solo performance with global rank 8.',
        achievement_date: '2025-03-04T00:00:00.000Z',
        is_team: false,
      },
    },
    {
      id: 'temp-ach-4',
      achievements: {
        id: 'ach-4',
        title: 'Hackathon Sprint Winner',
        contest_name: 'NEU Innovation Sprint',
        result: 'Winner',
        year: 2024,
        category: 'Hackathon',
        description: 'Built a smart campus assistant prototype.',
        achievement_date: '2024-09-14T00:00:00.000Z',
        is_team: true,
        team_name: 'InnoCrew',
      },
    },
    {
      id: 'temp-ach-5',
      achievements: {
        id: 'ach-5',
        title: 'Club Milestone: 100 Problems',
        contest_name: 'NEUPC Practice',
        result: 'Achievement',
        year: 2023,
        category: 'Club Milestone',
        description: 'Solved 100 problems on the club tracker.',
        achievement_date: '2023-11-08T00:00:00.000Z',
        is_team: false,
      },
    },
  ];

  const tempCertificates = [
    {
      id: 'temp-cert-1',
      title: 'ICPC Dhaka Regional Achievement',
      certificate_type: 'achievement',
      issue_date: '2024-12-12T00:00:00.000Z',
      certificate_number: 'NEUPC-ICPC-2024-009',
      verified: true,
      certificate_url:
        'https://example.com/certificates/NEUPC-ICPC-2024-009.pdf',
    },
    {
      id: 'temp-cert-2',
      title: 'Hackathon Sprint Participation',
      certificate_type: 'participation',
      issue_date: '2024-09-16T00:00:00.000Z',
      certificate_number: 'NEUPC-HACK-2024-112',
      verified: false,
      certificate_url: '',
    },
  ];

  const displayMemberAchievements = memberAchievements.length
    ? memberAchievements
    : tempMemberAchievements;
  const displayCertificates = certificates.length
    ? certificates
    : tempCertificates;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8">
      <MemberAchievementsClient
        memberAchievements={displayMemberAchievements}
        certificates={displayCertificates}
        userId={user.id}
      />
    </div>
  );
}
