/**
 * @file Lesson error boundary — uses shared AccountError for visual
 *   consistency with member panel design system.
 */

'use client';

import { useParams } from 'next/navigation';
import AccountError from '../../../../_components/AccountError';

export default function LessonError({ error, reset }) {
  const params = useParams();
  const bootcampId = params?.bootcampId;
  const dashboardHref = bootcampId
    ? `/account/member/bootcamps/${bootcampId}`
    : '/account/member/bootcamps';

  return (
    <AccountError
      error={error}
      reset={reset}
      title="Lesson"
      dashboardHref={dashboardHref}
    />
  );
}
