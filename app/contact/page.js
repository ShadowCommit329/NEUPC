/**
 * @file Contact page
 * @module ContactPage
 */

import { Suspense } from 'react';
import {
  getContactInfo,
  getSocialLinks,
  getFaqsData,
  getAllPublicSettings,
  getPublicCommittee,
} from '@/app/_lib/public-actions';
import {
  FAQJsonLd,
  ContactPageJsonLd,
  BreadcrumbJsonLd,
} from '@/app/_components/ui/JsonLd';
import ContactClient from './ContactClient';
import { buildMetadata } from '@/app/_lib/seo';

export const metadata = buildMetadata({
  title: 'Contact',
  description:
    'Get in touch with NEUPC — reach out with questions, feedback, partnership requests, or collaboration ideas.',
  pathname: '/contact',
  keywords: [
    'contact',
    'get in touch',
    'feedback',
    'support',
    'FAQ',
    'frequently asked questions',
  ],
});

export default async function Page() {
  const [contactInfo, socialLinks, faqs, settings, committeeData] =
    await Promise.all([
      getContactInfo(),
      getSocialLinks(),
      getFaqsData(),
      getAllPublicSettings(),
      getPublicCommittee(),
    ]);

  // Transform committee data to top key contacts (e.g. top 3 ranked members)
  const keyContacts = [];
  if (committeeData?.members?.length) {
    const sortedMembers = [...committeeData.members].sort(
      (a, b) =>
        (a.committee_positions?.rank || 99) -
        (b.committee_positions?.rank || 99)
    );
    const topMembers = sortedMembers.slice(0, 3);

    keyContacts.push(
      ...topMembers.map((m, idx) => ({
        id: m.id || idx,
        role: m.committee_positions?.title || 'Committee Member',
        name: m.users?.full_name || 'TBD',
        email: m.users?.email || contactInfo.email,
        linkedin:
          m.users?.member_profiles?.[0]?.linkedin ||
          m.users?.advisor_profiles?.[0]?.profile_link ||
          '#',
      }))
    );
  }

  return (
    <>
      <ContactPageJsonLd />
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Contact' }]}
      />
      <FAQJsonLd faqs={faqs} />
      <Suspense>
        <ContactClient
          contactInfo={contactInfo}
          keyContacts={keyContacts}
          socialLinks={socialLinks}
          faqs={faqs}
          settings={settings}
        />
      </Suspense>
    </>
  );
}
