/**
 * @file Join Button
 * @module JoinButton
 */

'use client';

import Link from 'next/link';
import { useIsMember } from './UserRoleProvider';

/**
 * JoinButton — A join/membership link that hides itself for non-guest members.
 * Guest users and non-logged-in users see the button; members/admins/etc. don't.
 *
 * @param {string}  href       – Link destination (default: '/join')
 * @param {string}  label      – Button text (default: 'Join Now')
 * @param {string}  className  – Tailwind classes for styling
 * @param {React.ReactNode} children – Optional children (overrides label)
 */
export default function JoinButton({
  href = '/join',
  label = 'Join Now',
  className = '',
  children,
}) {
  const isLoggedIn = useIsMember();

  if (isLoggedIn) return null;

  return (
    <Link href={href} className={className}>
      {children || label}
    </Link>
  );
}
