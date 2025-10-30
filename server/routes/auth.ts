import express from 'express';
import { z } from 'zod';
import { authService } from '../services/auth';
import { storage } from '../storage';
import { authRateLimiter } from '../middleware/rate-limit';
import { requireAuth, attachUser } from '../middleware/auth';

export const authRouter = express.Router();

// Apply rate limiting to auth routes
authRouter.use(authRateLimiter);

// Register Schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

// Login Schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register endpoint
authRouter.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    const user = await authService.registerUser(
      validatedData.email,
      validatedData.password,
      validatedData.name
    );

    // Create session
    req.session.userId = user.id;

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Login endpoint
authRouter.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    const user = await authService.loginUser(
      validatedData.email,
      validatedData.password
    );

    // Create session
    req.session.userId = user.id;

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    // Log error for debugging
    console.error('[Auth] Login error:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 200),
    });
    
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
});

// Logout endpoint
authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
authRouter.get('/me', attachUser, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { passwordHash, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

// Check auth status
authRouter.get('/status', (req, res) => {
  res.json({ 
    authenticated: !!req.session?.userId,
    userId: req.session?.userId || null
  });
});
