/**
 * @file Problem Set not-found page — shown when a resource within the
 *   problem set section cannot be located.
 *
 * @module MemberProblemSetNotFound
 */

'use client';

import AccountNotFoundState from '../../_components/AccountNotFoundState';

export default function NotFound() {
  return (
    <AccountNotFoundState
      title="Bootcamps Not Found"
      description="The Bootcamps page or resource you're looking for doesn't exist."
      dashboardHref="/account/member"
    />
  );
}
