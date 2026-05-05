/**
 * @file Bootcamp not-found page.
 * @module MemberBootcampNotFound
 */

'use client';

import AccountNotFoundState from '../../../_components/AccountNotFoundState';

export default function NotFound() {
  return (
    <AccountNotFoundState
      title="Bootcamp Not Found"
      description="The bootcamp you're looking for doesn't exist or you may not have access to it."
      dashboardHref="/account/member"
      suggestions={[
        { label: 'All Bootcamps', href: '/account/member/bootcamps' },
        { label: 'Dashboard', href: '/account/member' },
      ]}
    />
  );
}
