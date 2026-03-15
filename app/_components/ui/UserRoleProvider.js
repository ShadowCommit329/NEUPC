/**
 * @file User Role Provider
 * @module UserRoleProvider
 */

'use client';

import { createContext, useContext } from 'react';

const UserRoleContext = createContext({ role: null, isLoggedIn: false });

/**
 * Provides user role info to all client components.
 * Wrap in root layout with the session's user role.
 *
 * @param {string|null} role – User role from session (null if not logged in or no role)
 * @param {boolean} isLoggedIn - Whether the user is currently authenticated
 */
export function UserRoleProvider({ role = null, isLoggedIn = false, children }) {
  return (
    <UserRoleContext.Provider value={{ role, isLoggedIn }}>{children}</UserRoleContext.Provider>
  );
}

/**
 * Returns the current user's role, or null if not logged in.
 * Roles: 'member' | 'admin' | 'executive' | 'advisor' | 'mentor'
 */
export function useUserRole() {
  const { role } = useContext(UserRoleContext);
  return role;
}

/**
 * Returns true if the user is authenticated (logged in).
 * When true, "Join" CTAs should be hidden throughout the application.
 */
export function useIsMember() {
  const { isLoggedIn } = useContext(UserRoleContext);
  return isLoggedIn;
}
