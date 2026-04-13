/**
 * @file Problem Set error boundary — catches runtime errors on the
 *   problem set page and presents recovery options.
 *
 * @module MemberProblemSetError
 */

'use client';

import AccountError from '../../_components/AccountError';

export default function Error({ error, reset }) {
  return (
    <AccountError
      error={error}
      reset={reset}
      title="Bootcamps"
      dashboardHref="/account/member"
    />
  );
}
