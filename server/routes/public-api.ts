import express from 'express';
import { z } from 'zod';
import { requireApiKey } from '../middleware/auth';
import { apiKeyRateLimiter } from '../middleware/rate-limit';
import { storage } from '../storage';
import type { SanctumGatewayService } from '../services/sanctum-gateway';

export const publicApiRouter = express.Router();

// Store gateway service reference (will be set by routes.ts)
let gatewayService: SanctumGatewayService;

// Health check endpoint (no authentication required)
publicApiRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Observatory Public API',
    version: '1.0.0',
  });
});

// Apply API key authentication and rate limiting to protected API routes
publicApiRouter.use(requireApiKey, apiKeyRateLimiter);

// Log API usage middleware
publicApiRouter.use(async (req, res, next) => {
  const startTime = Date.now();

  // Capture the original res.json to log after response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;
    
    // Log API usage asynchronously
    storage.createApiUsageLog({
      apiKeyId: req.apiKey.id,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    }).catch(err => console.error('Failed to log API usage:', err));

    return originalJson(body);
  };

  next();
});

// ============================================================================
// BENCHMARK ENDPOINTS
// ============================================================================

// GET /api/public/benchmarks/summary - Get aggregated benchmark metrics
publicApiRouter.get('/benchmarks/summary', async (req, res) => {
  try {
    const timeWindow = (req.query.timeWindow as string) || '24h';
    const metrics = await storage.getBenchmarkAggregatedMetrics(timeWindow);
    
    res.json({
      success: true,
      data: metrics,
      timeWindow,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PublicAPI] Benchmark summary error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch benchmark summary',
      message: error.message,
    });
  }
});

// GET /api/public/benchmarks - List all benchmark runs
publicApiRouter.get('/benchmarks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    
    const allRuns = await storage.getBenchmarkRuns();
    
    // Filter by status if provided
    let filteredRuns = allRuns;
    if (status && ['pending', 'running', 'completed', 'failed'].includes(status)) {
      filteredRuns = allRuns.filter(run => run.status === status);
    }
    
    // Apply limit
    const limitedRuns = filteredRuns.slice(0, Math.min(limit, 100));
    
    res.json({
      success: true,
      data: limitedRuns,
      count: limitedRuns.length,
      total: filteredRuns.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PublicAPI] List benchmarks error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch benchmark runs',
      message: error.message,
    });
  }
});

// GET /api/public/benchmarks/:id - Get specific benchmark run details
publicApiRouter.get('/benchmarks/:id', async (req, res) => {
  try {
    const runId = req.params.id;
    const run = await storage.getBenchmarkRun(runId);
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Benchmark run not found',
      });
    }

    res.json({
      success: true,
      data: run,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PublicAPI] Get benchmark error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch benchmark run',
      message: error.message,
    });
  }
});

// GET /api/public/benchmarks/:id/transactions - Get transactions for a benchmark run
publicApiRouter.get('/benchmarks/:id/transactions', async (req, res) => {
  try {
    const runId = req.params.id;
    
    // Verify run exists
    const run = await storage.getBenchmarkRun(runId);
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Benchmark run not found',
      });
    }

    const transactions = await storage.getBenchmarkTransactions(runId);
    
    res.json({
      success: true,
      data: {
        runId,
        transactions,
        count: transactions.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PublicAPI] Get benchmark transactions error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch benchmark transactions',
      message: error.message,
    });
  }
});

// GET /api/public/benchmarks/timeseries - Get time series data
publicApiRouter.get('/benchmarks/timeseries', async (req, res) => {
  try {
    const timeWindow = (req.query.timeWindow as string) || '24h';
    const data = await storage.getBenchmarkTimeSeriesData(timeWindow);
    
    res.json({
      success: true,
      data,
      timeWindow,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PublicAPI] Benchmark timeseries error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch benchmark timeseries',
      message: error.message,
    });
  }
});

// ============================================================================
// GATEWAY PROXY ENDPOINTS
// ============================================================================

// POST /api/public/gateway/tip-instructions - Get tip instructions from Gateway
const getTipInstructionsSchema = z.object({
  feePayer: z.string().min(1, 'Fee payer address required'),
  jitoTipRange: z.enum(['low', 'medium', 'high', 'max']).optional(),
});

publicApiRouter.post('/gateway/tip-instructions', async (req, res) => {
  try {
    const { feePayer } = getTipInstructionsSchema.parse(req.body);

    if (!gatewayService) {
      return res.status(503).json({
        success: false,
        error: 'Gateway service not initialized',
      });
    }

    console.log('[PublicAPI] Getting tip instructions from Gateway');

    const instructions = await gatewayService.getTipInstructions({
      feePayer,
    });

    res.json({
      success: true,
      data: {
        instructions,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PublicAPI] Get tip instructions error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get tip instructions',
      message: error.message,
    });
  }
});

// POST /api/public/gateway/send-transaction - Submit a transaction via Gateway
const submitTransactionSchema = z.object({
  transaction: z.string().min(1, 'Transaction data is required'),
  encoding: z.enum(['base64']).optional().default('base64'),
  metadata: z.object({
    description: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
});

publicApiRouter.post('/gateway/send-transaction', async (req, res) => {
  try {
    const { transaction, encoding, metadata } = submitTransactionSchema.parse(req.body);

    if (!gatewayService) {
      return res.status(503).json({
        success: false,
        error: 'Gateway service not initialized',
      });
    }

    console.log(`[PublicAPI] Submitting transaction via Gateway`);

    const result = await gatewayService.sendTransaction({
      signedTransaction: transaction,
    });

    const actualStatus = result.status === 'success' ? 'success' : (result.status === 'pending' ? 'pending' : 'failed');
    const isSuccess = actualStatus === 'success' || actualStatus === 'pending';

    res.status(isSuccess ? 200 : 400).json({
      success: isSuccess,
      data: {
        signature: result.signature,
        status: actualStatus,
        route: result.route,
        confirmationTime: result.confirmationTime,
        cost: result.cost,
        jitoTipRefunded: result.jitoTipRefunded,
        metadata: metadata || null,
      },
      timestamp: new Date().toISOString(),
      ...(actualStatus === 'failed' && { error: 'Transaction failed to process' }),
    });
  } catch (error: any) {
    console.error('[PublicAPI] Transaction submission error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit transaction',
      message: error.message,
    });
  }
});

// Export function to set gateway service
export function setGatewayService(service: SanctumGatewayService) {
  gatewayService = service;
}
