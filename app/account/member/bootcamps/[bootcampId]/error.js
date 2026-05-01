/**
 * @file Bootcamp learning error boundary — uses shared AccountError
 *   for visual consistency with member panel design system.
 */

'use client';

import AccountError from '../../../_components/AccountError';

export default function BootcampLearningError({ error, reset }) {
  return (
    <AccountError
      error={error}
      reset={reset}
      title="Bootcamp"
      dashboardHref="/account/member/bootcamps"
    />
  );
}
