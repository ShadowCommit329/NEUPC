/**
 * @file Contests not-found page — shown when a resource within the
 *   contests section cannot be located.
 *
 * @module MemberContestsNotFound
 */

'use client';

import AccountNotFoundState from '../../_components/AccountNotFoundState';

export default function NotFound() {
  return (
    <AccountNotFoundState
      title="Problem Solving Not Found"
      description="The problem solving page or resource you're looking for doesn't exist."
      dashboardHref="/account/member"
    />
  );
}
