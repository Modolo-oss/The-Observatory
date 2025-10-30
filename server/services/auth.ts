import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from '../storage';
import type { User, InsertUser } from '@shared/schema';

const SALT_ROUNDS = 10;
const API_KEY_HASH_ROUNDS = 12;

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async registerUser(email: string, password: string, name: string): Promise<User> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const userData: InsertUser = {
      email,
      passwordHash,
      name,
      role: 'user',
      isActive: true,
    };

    return storage.createUser(userData);
  }

  async loginUser(email: string, password: string): Promise<User> {
    // Find user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is inactive. Please contact support.');
    }

    // Verify password
    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await storage.updateUserLastLogin(user.id);

    return user;
  }

  generateApiKey(): string {
    // Generate a secure random API key
    const prefix = 'obs'; // Observatory prefix
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${randomBytes}`;
  }

  async hashApiKey(key: string): Promise<string> {
    return bcrypt.hash(key, API_KEY_HASH_ROUNDS);
  }

  async verifyApiKey(key: string): Promise<{ valid: boolean; apiKey?: any }> {
    // Get all active API keys and verify against each one using bcrypt
    // This prevents prefix collision attacks
    const allActiveKeys = await storage.getAllActiveApiKeys();
    
    for (const apiKey of allActiveKeys) {
      // Verify the hashed key using bcrypt
      const isValid = await bcrypt.compare(key, apiKey.keyHash);
      
      if (isValid) {
        // Check if key is still active
        if (!apiKey.isActive) {
          return { valid: false };
        }

        // Check expiration
        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
          return { valid: false };
        }

        return { valid: true, apiKey };
      }
    }

    // No matching key found
    return { valid: false };
  }
}

export const authService = new AuthService();
