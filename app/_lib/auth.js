/**
 * @file auth
 * @module auth
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { NextResponse } from 'next/server';
import {
  createUser,
  getUserByEmail,
  getUserRoles,
  updateUser,
} from './data-service';
import { uploadAvatarFromUrl } from './avatar-actions';

async function withTimeout(
  promise,
  { timeoutMs = 7000, fallbackValue = null, operation = 'operation' } = {}
) {
  const TIMEOUT = Symbol('timeout');
  let timeoutId;

  try {
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve(TIMEOUT), timeoutMs);
    });

    const result = await Promise.race([promise, timeoutPromise]);
    if (result === TIMEOUT) {
      console.warn(`Auth ${operation} timed out after ${timeoutMs}ms`);
      return fallbackValue;
    }

    return result;
  } catch (error) {
    console.error(`Auth ${operation} failed:`, error);
    return fallbackValue;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

import { authConfig } from './auth.config';

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      try {
        const existingUser = await getUserByEmail(user.email);

        if (!existingUser) {
          // Generate initials as avatar fallback if no image provided
          const initials =
            user.name
              ?.split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase() || '?';

          // Use initials as default; we'll try to upload the Google
          // avatar to Drive after the user record exists.
          const avatarValue = initials;

          await createUser({
            email: user.email,
            full_name: user.name,
            avatar_url: avatarValue,
            email_verified: true,
            account_status: 'pending',
            status_reason: 'initial sign up',
            status_changed_by: null, // Self-signup via OAuth, no admin involved
            status_changed_at: new Date().toISOString(),
            is_online: false,
            provider: account?.provider || 'google',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // Now that the user record exists, try uploading the Google
          // profile image to Google Drive "avatars" folder.
          if (user.image) {
            try {
              const newUser = await getUserByEmail(user.email);
              if (newUser) {
                const driveUrl = await uploadAvatarFromUrl(
                  user.image,
                  newUser.id
                );
                if (driveUrl) {
                  await updateUser(newUser.id, {
                    avatar_url: driveUrl,
                    updated_at: new Date().toISOString(),
                  });
                }
              }
            } catch (avatarErr) {
              // Non-critical: avatar will show initials until user uploads one
              console.error(
                'Failed to upload Google avatar to Drive:',
                avatarErr
              );
            }
          }
        } else {
          // Only set is_online for users with non-blocked account status.
          // Suspended/banned/locked/rejected users must NOT be reactivated on login.
          const blockedStatuses = [
            'inActive',
            'inactive',
            'pending',
            'suspended',
            'banned',
            'blocked',
            'locked',
            'rejected',
          ];
          const isBlocked = blockedStatuses.includes(
            existingUser.account_status
          );

          await updateUser(existingUser.id, {
            ...(isBlocked ? {} : { is_online: true }),
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        // Allow sign-in even if DB operations fail to prevent lockout,
        // but the user may not have full account data until next login.
        // This is intentional: blocking login on transient DB errors
        // would lock all users out during maintenance.
        return true;
      }
    },

    async signOut({ token }) {
      try {
        if (token?.email) {
          const dbUser = await getUserByEmail(token.email);
          if (dbUser) {
            await updateUser(dbUser.id, {
              is_online: false,
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('Error during sign out:', error);
      }
      return true;
    },

    async session({ session, token }) {
      if (token?.sub) {
        session.user = session.user || {};

        // Try to use the token.sub as ID (for newly created users with Google ID)
        // But also fetch actual user from DB to get their real ID in case they were created before this fix
        if (session.user.email) {
          try {
            const dbUser = await withTimeout(
              getUserByEmail(session.user.email),
              {
                timeoutMs: 7000,
                fallbackValue: null,
                operation: 'getUserByEmail',
              }
            );
            if (dbUser) {
              session.user.id = dbUser.id; // Use database ID
              session.user.avatar_url = dbUser.avatar_url || null;
              // Keep image aligned with DB source of truth for legacy consumers.
              session.user.image =
                dbUser.avatar_url || session.user.image || null;
            } else {
              session.user.id = token.sub; // Fallback to token.sub for new users
            }

            const userRoles = await withTimeout(
              getUserRoles(session.user.email),
              {
                timeoutMs: 7000,
                fallbackValue: [],
                operation: 'getUserRoles',
              }
            );
            // Store the full roles array for multi-role support
            session.user.roles = userRoles?.length > 0 ? userRoles : [];
            // Keep .role as the primary role for backward compatibility
            session.user.role = userRoles?.[0] || null;
          } catch (error) {
            console.error(
              'Error fetching user info in session callback:',
              error
            );
            session.user.id = token.sub;
            session.user.role = null;
            session.user.roles = [];
          }
        } else {
          session.user.id = token.sub;
          session.user.role = null;
          session.user.roles = [];
        }
      }
      return session;
    },
  },
});
