/**
 * @file Role context provider and hook.
 * Manages active role state with localStorage persistence.
 * Properly seeds from the server-provided initialRole and guards
 * against stale localStorage from a different user/session.
 *
 * @module RoleContext
 */

'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext();

export function RoleProvider({
  children,
  initialRole = null,
  userRoles: initialUserRoles = [],
}) {
  // Seed the active role from the server prop (first real DB role).
  // We'll override from localStorage only if the saved role is still valid
  // for this user (prevents stale-session bugs where a previous user's
  // role bleeds into the next user's session).
  const [activeRole, setActiveRole] = useState(initialRole);
  const [userRoles, setUserRoles] = useState(initialUserRoles);
  const [hydrated, setHydrated] = useState(false);

  // After client hydration, check localStorage — but only accept it if the
  // role is still in this user's valid roles list.
  useEffect(() => {
    setHydrated(true);
    if (initialUserRoles.length === 0) return;

    const savedRole = localStorage.getItem('activeRole');
    if (savedRole && initialUserRoles.includes(savedRole)) {
      // Saved role is valid for this user — restore it.
      setActiveRole(savedRole);
    } else {
      // Saved role is invalid/stale — reset to the server-provided default.
      setActiveRole(initialRole);
      if (savedRole) {
        // Clean up the stale value.
        localStorage.setItem('activeRole', initialRole);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount — initialUserRoles and initialRole are stable server values

  // Keep userRoles in sync if the server sends an updated list
  useEffect(() => {
    if (initialUserRoles.length > 0) {
      setUserRoles(initialUserRoles);

      // If the current activeRole is no longer in the updated list, reset.
      if (hydrated && !initialUserRoles.includes(activeRole)) {
        const fallback = initialRole || initialUserRoles[0] || null;
        setActiveRole(fallback);
        if (fallback) localStorage.setItem('activeRole', fallback);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserRoles]);

  // Persist role changes to localStorage
  const updateRole = (role) => {
    setActiveRole(role);
    localStorage.setItem('activeRole', role);
  };

  return (
    <RoleContext.Provider
      value={{ activeRole, setActiveRole: updateRole, userRoles }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
