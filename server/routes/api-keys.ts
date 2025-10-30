import express from 'express';
import { z } from 'zod';
import { authService } from '../services/auth';
import { storage } from '../storage';
import { requireAuth, attachUser } from '../middleware/auth';

export const apiKeysRouter = express.Router();

// Apply authentication to all routes
apiKeysRouter.use(attachUser, requireAuth);

// Create API Key Schema
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rateLimit: z.number().min(100).max(10000).optional(),
  expiresAt: z.string().optional(),
});

// Get all API keys for current user
apiKeysRouter.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const apiKeys = await storage.getUserApiKeys(userId);
    
    // Don't expose the hashed key, only show preview
    const safeApiKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPreview: `${key.keyPreview}...`,
      isActive: key.isActive,
      rateLimit: key.rateLimit,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));

    res.json({ apiKeys: safeApiKeys });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Create new API key
apiKeysRouter.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = createApiKeySchema.parse(req.body);
    
    // Generate API key
    const key = authService.generateApiKey();
    
    // Hash the API key
    const keyHash = await authService.hashApiKey(key);
    const keyPreview = key.substring(0, 12);

    const apiKeyData = {
      userId,
      name: validatedData.name,
      keyHash,
      keyPreview,
      isActive: true,
      rateLimit: validatedData.rateLimit || 1000,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
    };

    const newApiKey = await storage.createApiKey(apiKeyData);

    // Return the full key only once during creation
    res.status(201).json({ 
      apiKey: {
        ...newApiKey,
        key, // Include the full key only in this response
      },
      message: 'API key created successfully. Save it now - you won\'t see it again!' 
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Delete API key
apiKeysRouter.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.id;
    
    // Verify ownership
    const apiKeys = await storage.getUserApiKeys(userId);
    const apiKey = apiKeys.find(k => k.id === keyId);
    
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await storage.deleteApiKey(keyId);
    res.json({ message: 'API key deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Get API key usage stats
apiKeysRouter.get('/:id/usage', async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.id;
    
    // Verify ownership
    const apiKeys = await storage.getUserApiKeys(userId);
    const apiKey = apiKeys.find(k => k.id === keyId);
    
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const stats = await storage.getApiUsageStats(keyId, '24h');
    res.json({ usage: stats });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});
