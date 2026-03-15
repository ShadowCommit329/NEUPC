/**
 * @file Roadmaps not-found page — shown when a resource within the
 *   roadmaps section cannot be located.
 *
 * @module AdminRoadmapsNotFound
 */

'use client';

import AccountNotFoundState from '../../_components/AccountNotFoundState';

export default function NotFound() {
  return (
    <AccountNotFoundState
      title="Roadmaps Not Found"
      description="The roadmaps page or resource you're looking for doesn't exist."
      dashboardHref="/account/admin"
    />
  );
}
