import crypto from 'crypto';

/**
 * Generates a secure, user-specific token for browser extension authentication
 * Format: base64(userId:hash(userId))
 */
export function generateExtensionToken(userId) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.NEUPC_EXTENSION_TOKEN;
  if (!secret) throw new Error('NEXTAUTH_SECRET must be set to generate extension tokens');
  const hash = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  const tokenString = `${userId}:${hash}`;
  return Buffer.from(tokenString).toString('base64');
}

/**
 * Verifies an extension token and returns the userId if valid
 * Returns null if invalid
 */
export function verifyExtensionToken(token) {
  if (!token) return null;

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    if (!decoded.includes(':')) return null;

    const [userId, hash] = decoded.split(':');
    if (!userId || !hash) return null;

    const secret = process.env.NEXTAUTH_SECRET || process.env.NEUPC_EXTENSION_TOKEN;
    if (!secret) return null;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(userId)
      .digest('hex');

    if (hash === expectedHash) {
      return userId;
    }
  } catch (error) {
    console.error('Error verifying extension token:', error);
  }

  return null;
}
