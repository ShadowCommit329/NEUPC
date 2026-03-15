/**
 * @file Upgrade banner for guest-only users.
 * Prompts guests to apply for membership.
 *
 * @module UpgradeBanner
 */

'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function UpgradeBanner({ accountStatus, userRoles }) {
  if (accountStatus !== 'active') {
    return null;
  }

  // Show for users with no roles or only guest role
  const hasNoRoles = userRoles.length === 0;
  const isGuestOnly =
    userRoles.includes('guest') && !userRoles.some((role) => role !== 'guest');

  if (!hasNoRoles && !isGuestOnly) {
    return null;
  }

  return null;
}
