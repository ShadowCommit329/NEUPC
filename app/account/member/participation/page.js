/**
 * @file Member participation overview — consolidates event registrations,
 *   contest results, certificates, and discussion threads authored by
 *   the member into a single activity timeline.
 * @module MemberParticipationPage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import {
  getUserEventRegistrations,
  getUserContestParticipations,
  getUserCertificates,
  getAllDiscussionThreads,
} from '@/app/_lib/data-service';
import MemberParticipationClient from './_components/MemberParticipationClient';

export const metadata = { title: 'Participation | Member | NEUPC' };

export default async function MemberParticipationPage() {
  const { user } = await requireRole('member');

  const [registrations, contestParticipations, certificates, allThreads] =
    await Promise.all([
      getUserEventRegistrations(user.id).catch(() => []),
      getUserContestParticipations(user.id).catch(() => []),
      getUserCertificates(user.id).catch(() => []),
      getAllDiscussionThreads(200, 0).catch(() => []),
    ]);

  const tempRegistrations = [
    {
      id: 'temp-reg-1',
      status: 'attended',
      attended: true,
      registered_at: '2025-03-12T10:30:00.000Z',
      team_name: 'NEUPC Alpha',
      events: {
        title: 'Spring Bootcamp 2025',
        category: 'Bootcamp',
        start_date: '2025-03-15T09:00:00.000Z',
        slug: 'spring-bootcamp-2025',
      },
    },
    {
      id: 'temp-reg-2',
      status: 'registered',
      attended: false,
      registered_at: '2025-04-05T16:10:00.000Z',
      events: {
        title: 'Algorithmic Thinking Workshop',
        category: 'Workshop',
        start_date: '2025-04-20T14:00:00.000Z',
        slug: 'algorithmic-thinking-workshop',
      },
    },
    {
      id: 'temp-reg-3',
      status: 'confirmed',
      attended: false,
      registered_at: '2025-01-18T11:45:00.000Z',
      events: {
        title: 'Tech Meetup: Competitive Programming',
        category: 'Meetup',
        start_date: '2025-01-25T17:00:00.000Z',
        slug: 'cp-meetup-2025',
      },
    },
  ];

  const tempContestParticipations = [
    {
      id: 'temp-contest-1',
      rank: 8,
      score: 420,
      problems_solved: 5,
      registered_at: '2025-02-12T08:20:00.000Z',
      contests: {
        title: 'NEUPC Monthly Contest #24',
        status: 'finished',
        platform: 'Codeforces',
        start_time: '2025-02-14T14:00:00.000Z',
        slug: 'neupc-monthly-24',
      },
    },
    {
      id: 'temp-contest-2',
      rank: null,
      score: 310,
      problems_solved: 3,
      registered_at: '2025-04-02T07:15:00.000Z',
      contests: {
        title: 'ICPC Regional Warmup',
        status: 'running',
        platform: 'VJudge',
        start_time: '2025-04-02T08:00:00.000Z',
        slug: 'icpc-warmup-2025',
      },
    },
  ];

  const tempCertificates = [
    {
      id: 'temp-cert-1',
      title: 'NEUPC Spring Bootcamp Participation',
      certificate_type: 'participation',
      issue_date: '2025-03-18T00:00:00.000Z',
      certificate_number: 'NEUPC-BOOT-2025-041',
      verified: true,
      certificate_url:
        'https://example.com/certificates/NEUPC-BOOT-2025-041.pdf',
      events: { title: 'Spring Bootcamp 2025', slug: 'spring-bootcamp-2025' },
    },
    {
      id: 'temp-cert-2',
      title: 'ICPC Regional Achievement',
      certificate_type: 'achievement',
      issue_date: '2024-12-06T00:00:00.000Z',
      certificate_number: 'NEUPC-ICPC-2024-009',
      verified: true,
      certificate_url:
        'https://example.com/certificates/NEUPC-ICPC-2024-009.pdf',
      contests: { title: 'ICPC Dhaka Regional 2024', slug: 'icpc-dhaka-2024' },
    },
  ];

  const tempThreads = [
    {
      id: 'temp-thread-1',
      author_id: user.id,
      title: 'DP Tricks for Beginner Coders',
      created_at: '2025-03-22T12:40:00.000Z',
      is_solved: true,
      tags: ['dp', 'practice'],
      views: 183,
    },
    {
      id: 'temp-thread-2',
      author_id: user.id,
      title: 'Need hints for segment tree problem',
      created_at: '2025-04-07T09:10:00.000Z',
      is_solved: false,
      tags: ['segment-tree', 'help'],
      views: 76,
    },
  ];

  const displayRegistrations = registrations.length
    ? registrations
    : tempRegistrations;
  const displayContestParticipations = contestParticipations.length
    ? contestParticipations
    : tempContestParticipations;
  const displayCertificates = certificates.length
    ? certificates
    : tempCertificates;
  const displayThreads = allThreads.length ? allThreads : tempThreads;

  const myThreads = displayThreads.filter((t) => t.author_id === user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8">
      <MemberParticipationClient
        registrations={displayRegistrations}
        contestParticipations={displayContestParticipations}
        certificates={displayCertificates}
        myThreads={myThreads}
        userId={user.id}
      />
    </div>
  );
}
