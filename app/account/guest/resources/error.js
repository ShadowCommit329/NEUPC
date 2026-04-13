/**
 * @file Resources error boundary — catches runtime errors on the
 *   resources page and presents recovery options.
 *
 * @module GuestResourcesError
 */

'use client';

import AccountError from '../../_components/AccountError';

export default function Error({ error, reset }) {
  return (
    <AccountError
      error={error}
      reset={reset}
      title="Resources"
      dashboardHref="/account/guest"
    />
  );
}
