/**
 * @file Roadmaps error boundary — catches runtime errors on the
 *   roadmaps page and presents recovery options.
 *
 * @module AdminRoadmapsError
 */

'use client';

import AccountError from '../../_components/AccountError';

export default function Error({ error, reset }) {
  return (
    <AccountError
      error={error}
      reset={reset}
      title="Roadmaps"
      dashboardHref="/account/admin"
    />
  );
}
