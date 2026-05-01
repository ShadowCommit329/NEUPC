/**
 * @file Member certificates page — displays all certificates earned by
 *   the member through event participation, contest achievements, or
 *   other club recognitions.
 * @module MemberCertificatesPage
 * @access member
 */

import { requireRole } from '@/app/_lib/auth-guard';
import { getUserCertificates } from '@/app/_lib/data-service';
import MemberCertificatesClient from './_components/MemberCertificatesClient';

export const metadata = { title: 'Certificates | Member | NEUPC' };

export default async function MemberCertificatesPage() {
  const { user } = await requireRole('member');
  const certificates = await getUserCertificates(user.id).catch(() => []);
  const tempCertificates = [
    {
      id: 'temp-cert-1',
      title: 'NEUPC Spring Bootcamp Participation',
      description: 'Participated in the Spring Bootcamp 2025 workshops.',
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
      title: 'Problem Solving Sprint Completion',
      description: 'Completed the 30-day problem solving sprint.',
      certificate_type: 'completion',
      issue_date: '2025-02-02T00:00:00.000Z',
      certificate_number: 'NEUPC-PS-2025-118',
      verified: false,
      certificate_url: '',
      contests: {
        title: 'Problem Solving Sprint',
        slug: 'problem-solving-sprint',
      },
    },
    {
      id: 'temp-cert-3',
      title: 'ICPC Regional Achievement',
      description: 'Top 10 finish in the regional contest.',
      certificate_type: 'achievement',
      issue_date: '2024-12-06T00:00:00.000Z',
      certificate_number: 'NEUPC-ICPC-2024-009',
      verified: true,
      certificate_url:
        'https://example.com/certificates/NEUPC-ICPC-2024-009.pdf',
      contests: { title: 'ICPC Dhaka Regional 2024', slug: 'icpc-dhaka-2024' },
    },
    {
      id: 'temp-cert-4',
      title: 'Volunteer Appreciation',
      description: 'Recognized for outstanding volunteer support.',
      certificate_type: 'appreciation',
      issue_date: '2024-10-20T00:00:00.000Z',
      certificate_number: 'NEUPC-APP-2024-302',
      verified: false,
      certificate_url: '',
    },
  ];
  const displayCertificates = certificates.length
    ? certificates
    : tempCertificates;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8">
      <MemberCertificatesClient
        certificates={displayCertificates}
        userName={user.full_name}
      />
    </div>
  );
}
