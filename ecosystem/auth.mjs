import { betterAuth } from 'better-auth';
import { randomBytes } from 'node:crypto';
export function createAuth(database, origin) {
  if (process.env.NODE_ENV === 'production' && (!process.env.BETTER_AUTH_SECRET || !origin.startsWith('https://'))) {
    throw new Error('Production requires BETTER_AUTH_SECRET and an HTTPS APP_URL.');
  }
  return betterAuth({
    appName: 'E-VIVLIO', baseURL: origin,
    secret: process.env.BETTER_AUTH_SECRET || randomBytes(48).toString('hex'),
    database: database.authDatabase,
    trustedOrigins: [origin],
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
    advanced: { cookiePrefix: 'evivlio', ipAddress: { ipAddressHeaders: ['x-evivlio-client-ip'] } },
    session: { expiresIn: 60 * 60 * 24 * 14, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, window: 60, max: 30 },
  });
}
