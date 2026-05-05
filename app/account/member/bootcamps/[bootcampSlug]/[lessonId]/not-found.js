/**
 * @file Lesson not-found page.
 * @module MemberLessonNotFound
 */

'use client';

import AccountNotFoundState from '../../../../_components/AccountNotFoundState';

export default function NotFound() {
  return (
    <AccountNotFoundState
      title="Lesson Not Found"
      description="The lesson you're looking for doesn't exist or has been removed."
      dashboardHref="/account/member"
      suggestions={[
        { label: 'All Bootcamps', href: '/account/member/bootcamps' },
        { label: 'Dashboard', href: '/account/member' },
      ]}
    />
  );
}
