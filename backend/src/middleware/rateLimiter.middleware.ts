import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiter for database queries
 * Tracks requests per user with a sliding window
 * Limit: 20 queries per minute
 */
class RateLimiterStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly limit = 20; // requests per minute
  private readonly window = 60 * 1000; // 1 minute in ms

  check(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const key = `ratelimit:${userId}`;
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      // Create new window
      const newEntry = { count: 1, resetTime: now + this.window };
      this.store.set(key, newEntry);
      return { allowed: true, remaining: this.limit - 1, resetIn: this.window };
    }

    // Within existing window
    if (entry.count < this.limit) {
      entry.count++;
      const remaining = this.limit - entry.count;
      const resetIn = entry.resetTime - now;
      return { allowed: true, remaining, resetIn };
    }

    // Limit exceeded
    const resetIn = entry.resetTime - now;
    return { allowed: false, remaining: 0, resetIn };
  }

  cleanup() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now >= entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

const rateLimiterStore = new RateLimiterStore();
rateLimiterStore.cleanup();

/**
 * Express middleware for database query rate limiting
 * Apply to /api/databases/:id/query endpoint
 */
export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const check = rateLimiterStore.check(userId);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', '20');
    res.setHeader('X-RateLimit-Remaining', check.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + check.resetIn).toISOString());

    if (!check.allowed) {
      logger.warn(`Rate limit exceeded for user ${userId}. Reset in ${check.resetIn}ms`);
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Maximum 20 queries per minute.',
        retryAfter: Math.ceil(check.resetIn / 1000),
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Rate limiter error', { error: String(error) });
    next();
  }
}

export default rateLimiterMiddleware;
