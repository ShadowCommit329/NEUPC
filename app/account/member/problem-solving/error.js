/**
 * @file Contests error boundary — catches runtime errors on the
 *   contests page and presents recovery options.
 *
 * @module MemberContestsError
 */

'use client';

import AccountError from '../../_components/AccountError';

export default function Error({ error, reset }) {
  return (
    <AccountError
      error={error}
      reset={reset}
      title="Problem Solving"
      dashboardHref="/account/member"
    />
  );
}
