import { INestApplication } from '@nestjs/common';
import express, { Request, Response, NextFunction } from 'express';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://tesor-app-nine.vercel.app',
  'https://backend-zeta-rouge-39.vercel.app',
];

/**
 * Checks whether an incoming Origin header is permitted by our allowlist.
 * Allows configured production origins, project Vercel preview/deploy subdomains,
 * and localhost in non-production environments.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // Same-origin / server-to-server / native mobile

  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowlist = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);
  if (allowlist.has(origin)) return true;

  // Allow project-specific Vercel deployment URLs (e.g. tesor-*-camivelasco93-5981s-projects.vercel.app)
  if (/^https:\/\/(tesor|backend)-[a-z0-9-]+-camivelasco93-5981s-projects\.vercel\.app$/i.test(origin)) {
    return true;
  }

  // Allow localhost only in non-production environments
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return true;
    }
  }

  return false;
}

/**
 * Applies defensive security headers, body size limits, X-Powered-By removal,
 * and strict CORS configuration to a NestJS application.
 */
export function applySecurityMiddleware(app: INestApplication, expressInstance?: express.Express): void {
  const httpAdapter = expressInstance || app.getHttpAdapter().getInstance();

  if (typeof httpAdapter?.disable === 'function') {
    httpAdapter.disable('x-powered-by');
  }

  // Body size limits to mitigate oversized payload DoS
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Standard defensive HTTP headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    next();
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origen no permitido por política CORS'), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    maxAge: 86400,
  });
}
