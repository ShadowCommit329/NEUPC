/**
 * @file Admin contact submissions page (server component).
 * Fetches all contact form submissions alongside the live public contact
 * page data (contactInfo, socialLinks, FAQs) for admin review.
 *
 * @module AdminContactSubmissionsPage
 * @access admin
 */

import { getAllContactSubmissions } from '@/app/_lib/data-service';
import {
  getContactInfo,
  getSocialLinks,
  getFaqsData,
} from '@/app/_lib/public-actions';
import ContactSubmissionsClient from './_components/ContactSubmissionsClient';

export const metadata = { title: 'Contact Submissions | Admin | NEUPC' };

export default async function AdminContactSubmissionsPage() {
  const [submissions, contactInfo, socialLinks, faqs] = await Promise.all([
    getAllContactSubmissions().catch(() => []),
    getContactInfo().catch(() => null),
    getSocialLinks().catch(() => null),
    getFaqsData().catch(() => []),
  ]);

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      <ContactSubmissionsClient
        initialSubmissions={submissions}
        contactInfo={contactInfo}
        socialLinks={socialLinks}
        faqs={faqs}
      />
    </div>
  );
}
