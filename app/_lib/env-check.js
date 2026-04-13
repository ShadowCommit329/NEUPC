/**
 * @file Environment variable validation
 * @module env-check
 *
 * Validates that all required environment variables are set before
 * the application starts. Import this in layout.js or a top-level
 * server component to catch misconfigurations early.
 */

const REQUIRED_ENV_GROUPS = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_KEY'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'],
  ['AUTH_SECRET'],
  ['AUTH_GOOGLE_ID'],
  ['AUTH_GOOGLE_SECRET'],
];

const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_SITE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
];

/**
 * Validates environment variables at startup.
 * In production, throws on missing required vars.
 * In development, logs warnings.
 */
export function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  for (const group of REQUIRED_ENV_GROUPS) {
    const hasAny = group.some((key) => !!process.env[key]);
    if (!hasAny) {
      missing.push(group.join(' | '));
    }
  }

  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  if (warnings.length > 0 && !isProduction) {
    console.warn(`⚠️  Optional env vars not set: ${warnings.join(', ')}`);
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProduction) {
      throw new Error(`FATAL: ${message}. Check your deployment environment.`);
    } else {
      console.error(
        `❌ ${message}. Copy .env.example to .env.local and fill in values.`
      );
    }
  }
}
