/**
 * @file Supabase client configuration
 * @module supabase
 *
 * Creates two Supabase clients:
 * - `supabase`      — anon key, respects Row-Level Security (RLS)
 * - `supabaseAdmin` — service role key, bypasses RLS (server-only!)
 *
 * In production the service-role key MUST be set; the module throws
 * at import time when critical environment variables are missing so
 * errors surface during deployment rather than at request time.
 */

import { createClient } from '@supabase/supabase-js';

// ── Environment validation ──────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const isProduction = process.env.NODE_ENV === 'production';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (isProduction && !isSupabaseConfigured) {
  throw new Error(
    'FATAL: SUPABASE_URL and SUPABASE_KEY must be set in production. ' +
      'Check your environment variables.'
  );
}

if (
  isProduction &&
  (!supabaseServiceKey || supabaseServiceKey === 'placeholder-key')
) {
  throw new Error(
    'FATAL: SUPABASE_SERVICE_KEY is missing or invalid in production. ' +
      'Get it from: Supabase Dashboard → Settings → API → Service role secret.'
  );
}

if (!isProduction && !isSupabaseConfigured) {
  console.warn(
    '⚠️  Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in .env.local'
  );
}

if (
  !isProduction &&
  (!supabaseServiceKey || supabaseServiceKey === 'placeholder-key')
) {
  console.error(
    '❌ SUPABASE_SERVICE_KEY is missing or not set in .env.local. Server-side writes will fail!'
  );
}

// ── Client instances ────────────────────────────────────────────────────────

/** Public Supabase client — uses anon key, respects RLS policies. */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

/**
 * Admin Supabase client — uses service role key, bypasses RLS.
 * ONLY use in API routes and server actions. Never expose to the client.
 */
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);
