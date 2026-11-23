import * as crypto from 'crypto';

let ephemeralDevSecret: string | null = null;

/**
 * Resolves the JWT signing secret.
 * Fails closed in production if JWT_SECRET is not configured, avoiding any
 * hardcoded fallback secrets in source code.
 */
export function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  if (isProd) {
    throw new Error('CRITICAL SECURITY CONFIG: JWT_SECRET must be configured in production.');
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralDevSecret;
}
