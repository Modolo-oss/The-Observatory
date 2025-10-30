import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// General API rate limiter (100 requests per 15 minutes)
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter (stricter for login/register)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-API-key rate limiter
export const createApiKeyRateLimiter = () => {
  const limiters = new Map<string, { count: number; resetAt: number }>();

  return async (req: Request, res: any, next: any) => {
    if (!req.apiKey) {
      return next();
    }

    const apiKeyId = req.apiKey.id;
    const rateLimit = req.apiKey.rateLimit || 1000; // Default 1000 per hour
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour

    let limiter = limiters.get(apiKeyId);

    if (!limiter || limiter.resetAt < now) {
      limiter = {
        count: 0,
        resetAt: now + windowMs,
      };
      limiters.set(apiKeyId, limiter);
    }

    limiter.count++;

    if (limiter.count > rateLimit) {
      const resetInSeconds = Math.ceil((limiter.resetAt - now) / 1000);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: rateLimit,
        resetIn: resetInSeconds,
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimit - limiter.count));
    res.setHeader('X-RateLimit-Reset', Math.floor(limiter.resetAt / 1000));

    next();
  };
};

export const apiKeyRateLimiter = createApiKeyRateLimiter();
