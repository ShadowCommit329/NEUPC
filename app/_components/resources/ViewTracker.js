'use client';

import { useEffect, useRef } from 'react';
import { trackResourceViewAction } from '@/app/_lib/member-resources-actions';

/**
 * Fire-and-forget view tracker.  Renders nothing visible — just calls the
 * server action once on mount to record a resource view.
 *
 * @param {{ resourceId: string, source?: string }} props
 */
export default function ViewTracker({ resourceId, source = 'detail' }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!resourceId || tracked.current) return;
    tracked.current = true;
    trackResourceViewAction(resourceId, source).catch(() => {
      /* analytics — swallow errors silently */
    });
  }, [resourceId, source]);

  return null;
}
