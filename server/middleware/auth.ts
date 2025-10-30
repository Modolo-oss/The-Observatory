import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import { storage } from '../storage';
import 'express-session';

// Extend Express Request and Session types
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
      apiKey?: any;
    }
  }
}

// Middleware to check if user is authenticated via session
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// Middleware to attach user to request if authenticated
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      console.error('Error attaching user:', error);
    }
  }
  next();
}

// Middleware for API key authentication
export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required. Include X-API-Key header.' });
  }

  try {
    const result = await authService.verifyApiKey(apiKey);
    
    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid or expired API key' });
    }

    // Attach API key to request
    req.apiKey = result.apiKey;

    // Update last used timestamp
    await storage.updateApiKeyLastUsed(result.apiKey.id);

    next();
  } catch (error) {
    console.error('API key verification error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Middleware for admin-only routes
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
