import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Lightweight, zero-dependency sliding-window rate limiter guard for NestJS.
 * Protects authentication and sensitive endpoints against brute-force and scraping.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, RateLimitBucket>();
  private static lastCleanup = Date.now();

  constructor(
    private readonly maxRequests: number = 10,
    private readonly windowMs: number = 15 * 60 * 1000,
    private readonly keyPrefix: string = 'rl',
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const now = Date.now();
    // Periodic cleanup to prevent unbounded memory growth
    if (now - RateLimitGuard.lastCleanup > 60_000) {
      for (const [k, v] of RateLimitGuard.buckets.entries()) {
        if (v.resetAt <= now) RateLimitGuard.buckets.delete(k);
      }
      RateLimitGuard.lastCleanup = now;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() ||
      req.ip ||
      'unknown';

    const emailKey =
      typeof (req.body as any)?.correo === 'string'
        ? (req.body as any).correo.trim().toLowerCase()
        : '';

    const key = emailKey ? `${this.keyPrefix}:${ip}:${emailKey}` : `${this.keyPrefix}:${ip}`;
    const existing = RateLimitGuard.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      RateLimitGuard.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (existing.count >= this.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        `Demasiados intentos. Por favor intente nuevamente en ${retryAfterSec} segundos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
    return true;
  }
}
