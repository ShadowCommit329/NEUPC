/**
 * @file Supabase client configuration
 * @module supabase
 *
 * Creates two Supabase clients:
 * - `supabase`      — anon key, respects Row-Level Security (RLS)
 * - `supabaseAdmin` — service role key, bypasses RLS (server-only!)
 *
 * Supports both local Supabase (via `supabase start`) and remote Supabase projects.
 *
 * ## Local Development Setup
 *
 * 1. Install Supabase CLI: https://supabase.com/docs/guides/cli
 * 2. Start local Supabase: `npx supabase start`
 * 3. Copy the output credentials to `.env.local`:
 *    - API URL → NEXT_PUBLIC_SUPABASE_URL (default: http://127.0.0.1:54321)
 *    - anon key → NEXT_PUBLIC_SUPABASE_ANON_KEY
 *    - service_role key → SUPABASE_SERVICE_ROLE_KEY
 *
 * In production the service-role key MUST be set; the module throws
 * at import time when critical environment variables are missing so
 * errors surface during deployment rather than at request time.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ── Environment validation ──────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const isLocalDev = process.env.SUPABASE_LOCAL === 'true';

// Local dev: use local Supabase when SUPABASE_LOCAL=true
// Otherwise (production / Vercel): use cloud credentials
const supabaseUrl = isLocalDev
  ? (process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321')
  : (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);

const supabaseAnonKey = isLocalDev
  ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY)
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY);

const supabaseServiceKey = isLocalDev
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Helper to check if using local Supabase
export const isLocalSupabase =
  isLocalDev ||
  (supabaseUrl && supabaseUrl.includes('127.0.0.1')) ||
  (supabaseUrl && supabaseUrl.includes('localhost'));

// ── Production validation ───────────────────────────────────────────────────
if (isProduction && !isSupabaseConfigured) {
  throw new Error(
    'FATAL: Missing Supabase env vars in production. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      '(or legacy SUPABASE_URL/SUPABASE_KEY).'
  );
}

if (
  isProduction &&
  (!supabaseServiceKey || supabaseServiceKey === 'placeholder-key')
) {
  throw new Error(
    'FATAL: SUPABASE_SERVICE_KEY is missing or invalid in production. ' +
      'Set SUPABASE_SERVICE_ROLE_KEY (or legacy SUPABASE_SERVICE_KEY).'
  );
}

// ── Development warnings ────────────────────────────────────────────────────
if (!isProduction && !supabaseAnonKey) {
  console.warn(
    '⚠️  Supabase anon key not configured.\n' +
      '   Run `npx supabase start` and copy the anon key to .env.local\n' +
      '   Or set NEXT_PUBLIC_SUPABASE_ANON_KEY for remote Supabase.'
  );
}

if (
  !isProduction &&
  (!supabaseServiceKey || supabaseServiceKey === 'placeholder-key')
) {
  console.warn(
    '⚠️  SUPABASE_SERVICE_ROLE_KEY is missing or not set in .env.local.\n' +
      '   Run `npx supabase start` and copy the service_role key.\n' +
      '   Server-side writes will fail without this key!'
  );
}

if (!isProduction && isLocalSupabase) {
  console.info(
    `ℹ️  Using local Supabase at ${supabaseUrl}\n` +
      '   Studio: http://127.0.0.1:54323\n' +
      '   Inbucket (emails): http://127.0.0.1:54324'
  );
}

// ── Client instances ────────────────────────────────────────────────────────

/** Public Supabase client — uses anon key, respects RLS policies. */
export const supabase = createSupabaseClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

/**
 * Admin Supabase client — uses service role key, bypasses RLS.
 * ONLY use in API routes and server actions. Never expose to the client.
 */
export const supabaseAdmin = createSupabaseClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);

/**
 * Compatibility helper for API routes expecting `createClient()`.
 * Returns the preconfigured anon client.
 */
export function createClient() {
  return supabase;
}

/**
 * Get Supabase connection info for debugging.
 * @returns {Object} Connection details (safe to log, no secrets)
 */
export function getSupabaseInfo() {
  return {
    url: supabaseUrl,
    isConfigured: isSupabaseConfigured,
    isLocal: isLocalSupabase,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey:
      !!supabaseServiceKey && supabaseServiceKey !== 'placeholder-key',
  };
}
