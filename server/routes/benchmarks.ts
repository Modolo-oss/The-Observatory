import { Router } from 'express';
import { z } from 'zod';
import type { IStorage } from '../storage';
import type { SanctumGatewayService } from '../services/sanctum-gateway';
import { Connection, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  BENCHMARK_PRESETS,
  buildPresetTransaction,
  getPresetDescription,
  type BenchmarkPreset,
} from '../services/benchmark-presets';

export function createBenchmarkRouter(
  storage: IStorage,
  gatewayService: SanctumGatewayService | null,
  broadcast: (type: string, data: any) => void
) {
  const router = Router();

  // GET /api/benchmarks/presets - Get available benchmark presets
  router.get('/presets', async (req, res) => {
    try {
      res.json({
        success: true,
        data: BENCHMARK_PRESETS,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch presets',
      });
    }
  });

  // POST /api/benchmarks/run - Run a new benchmark test
  const runBenchmarkSchema = z.object({
    name: z.string().optional(),
    preset: z.enum(['custom', 'airdrop', 'dex-swap', 'nft-mint', 'payment-processor']).default('custom'),
    transactionCount: z.number().min(1).max(100).default(10),
    amountSol: z.number().min(0.0001).max(0.01).default(0.001),
    fromPrivateKey: z.string().min(1, 'Private key is required'),
    toAddress: z.string().min(1, 'Recipient address is required'),
  });

  router.post('/run', async (req, res) => {
    try {
      const config = runBenchmarkSchema.parse(req.body);
      
      if (!gatewayService) {
        return res.status(503).json({
          success: false,
          error: 'Gateway service not initialized',
        });
      }

      console.log(`[Benchmark] Starting ${config.preset} benchmark: ${config.transactionCount} transactions`);

      // Get preset description
      const presetDesc = getPresetDescription(config.preset as BenchmarkPreset);
      const runName = config.name || `${presetDesc} - ${new Date().toLocaleString()}`;

      // Create benchmark run record
      const run = await storage.createBenchmarkRun({
        name: runName,
        totalTransactions: config.transactionCount,
        successfulTransactions: 0,
        failedTransactions: 0,
        status: 'running',
      });

      // Broadcast start event
      broadcast('benchmark_start', {
        runId: run.id,
        totalTransactions: config.transactionCount,
      });

      // Start benchmark execution in background
      executeBenchmark(run.id, config, storage, gatewayService, broadcast).catch(err => {
        console.error('[Benchmark] Execution error:', err);
      });

      // Return run ID immediately
      res.json({
        success: true,
        data: {
          runId: run.id,
          status: 'running',
        },
      });

    } catch (error: any) {
      console.error('[Benchmark] Error starting benchmark:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to start benchmark',
      });
    }
  });

  // GET /api/benchmarks/history - Get historical benchmark runs
  router.get('/history', async (req, res) => {
    try {
      const runs = await storage.getBenchmarkRuns();
      
      // Format for frontend - include all fields needed by Dashboard and Analytics
      const formattedRuns = runs.map((run: any) => ({
        id: run.id,
        name: run.name,
        createdAt: run.createdAt,
        timestamp: run.createdAt, // Alias for compatibility
        totalTransactions: run.totalTransactions,
        successfulTransactions: run.successfulTransactions,
        failedTransactions: run.failedTransactions,
        successRate: run.successRate || '0',
        avgLatency: run.avgLatency || '0',
        avgCost: run.avgCost || '0',
        totalCost: run.totalCost || '0',
        jitoTipRefunded: run.jitoTipRefunded || '0', // Real Jito tip refunds from Gateway
        status: run.status,
        completedAt: run.completedAt,
      }));

      res.json({
        success: true,
        data: formattedRuns,
      });
    } catch (error: any) {
      console.error('[Benchmark] Error fetching history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch benchmark history',
      });
    }
  });

  // GET /api/benchmarks/:id - Get specific benchmark run details
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const run = await storage.getBenchmarkRun(id);
      
      if (!run) {
        return res.status(404).json({
          success: false,
          error: 'Benchmark run not found',
        });
      }

      const transactions = await storage.getBenchmarkTransactions(id);

      res.json({
        success: true,
        data: {
          run,
          transactions,
        },
      });
    } catch (error: any) {
      console.error('[Benchmark] Error fetching benchmark:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch benchmark details',
        });
    }
  });

  // NEW SECURE ENDPOINTS - Client-side signing only
  
  // Build unsigned transaction for client-side signing
  router.post("/build-unsigned-tx", async (req, res) => {
    try {
      const { fromAddress, toAddress, amountSol } = req.body;

      if (!fromAddress || !toAddress || !amountSol) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      if (!gatewayService) {
        return res.status(503).json({ success: false, error: "Gateway service not initialized" });
      }

      // Build transaction without private key
      if (!process.env.SANCTUM_GATEWAY_API_KEY) {
        return res.status(503).json({ success: false, error: "SANCTUM_GATEWAY_API_KEY not configured" });
      }
      const connection = new Connection(`https://tpg.sanctum.so/v1/mainnet?apiKey=${process.env.SANCTUM_GATEWAY_API_KEY}`);
      const fromPubkey = new PublicKey(fromAddress);
      const toPubkey = new PublicKey(toAddress);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      // Create transfer instruction
      const transferIx = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
      });

      // Build transaction with preset instructions ONLY (no manual tip instructions)
      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      transaction.add(transferIx);

      // Serialize unsigned transaction (partial signatures allowed for Gateway optimization)
      const serializedTx = transaction.serializeMessage().toString('base64');

      // Build Gateway transaction (Gateway will add tip instructions, priority fees)
      const gatewayBuildResult = await gatewayService.buildGatewayTransaction({
        transaction: serializedTx,
        options: {
          encoding: 'base64',
          skipSimulation: true,
          cuPriceRange: 'medium',
          jitoTipRange: 'medium',
        },
      });

      res.json({
        success: true,
        unsignedTransaction: gatewayBuildResult.transaction,
        blockhash: gatewayBuildResult.latestBlockhash?.blockhash || blockhash,
        lastValidBlockHeight: gatewayBuildResult.latestBlockhash?.lastValidBlockHeight || lastValidBlockHeight,
      });
    } catch (error: any) {
      console.error("[Benchmark] Build unsigned tx error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Submit client-signed transaction via Gateway
  router.post("/submit-signed-tx", async (req, res) => {
    try {
      const { signedTransaction, runId, txIndex } = req.body;

      if (!signedTransaction) {
        return res.status(400).json({ success: false, error: "Missing signed transaction" });
      }

      if (!gatewayService) {
        return res.status(503).json({ success: false, error: "Gateway service not initialized" });
      }

      const startTime = Date.now();

      // Send via Gateway
      const result = await gatewayService.sendTransaction({
        signedTransaction,
      });

      const latency = Date.now() - startTime;

      // Store transaction record if runId provided
      if (runId) {
        await storage.createBenchmarkTransaction({
          runId,
          txHash: result.signature,
          status: "success",
          latencyMs: latency,
          feeSol: "0.000005",
          metadata: { method: "gateway", index: txIndex },
        });
      }

      res.json({
        success: true,
        signature: result.signature,
        latency,
      });
    } catch (error: any) {
      console.error("[Benchmark] Submit signed tx error:", error);
      
      // Store failed transaction if runId provided
      if (req.body.runId) {
        try {
          await storage.createBenchmarkTransaction({
            runId: req.body.runId,
            txHash: "",
            status: "failed",
            latencyMs: 0,
            feeSol: "0",
            errorMessage: error.message,
            metadata: { method: "gateway", index: req.body.txIndex },
          });
        } catch (dbErr) {
          console.error("[Benchmark] Failed to store failed tx:", dbErr);
        }
      }

      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Initialize benchmark run (client handles execution)
  router.post("/init-run", async (req, res) => {
    try {
      const { name, transactionCount } = req.body;

      if (transactionCount < 1 || transactionCount > 100) {
        return res.status(400).json({ success: false, error: "Transaction count must be between 1 and 100" });
      }

      // Create benchmark run record
      const run = await storage.createBenchmarkRun({
        name: name || `Benchmark ${new Date().toISOString()}`,
        totalTransactions: transactionCount,
        successfulTransactions: 0,
        failedTransactions: 0,
        status: 'running',
      });

      // Broadcast start event
      broadcast('benchmark_start', {
        runId: run.id,
        totalTransactions: transactionCount,
      });

      res.json({
        success: true,
        runId: run.id,
      });
    } catch (error: any) {
      console.error("[Benchmark] Init run error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Complete benchmark run (update final stats)
  router.post("/complete-run/:runId", async (req, res) => {
    try {
      const { runId } = req.params;
      
      // Get all transactions for this run
      const transactions = await storage.getBenchmarkTransactions(runId);
      
      const successful = transactions.filter(t => t.status === "success").length;
      const failed = transactions.filter(t => t.status === "failed").length;
      const successRate = transactions.length > 0 ? (successful / transactions.length) * 100 : 0;
      
      const latencies = transactions.filter(t => t.latencyMs).map(t => t.latencyMs!);
      const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
      const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
      const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
      
      const costs = transactions.map(t => Number(t.feeSol) || 0);
      const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
      const totalCost = costs.reduce((a, b) => a + b, 0);

      // Update run with final stats
      await storage.updateBenchmarkRun(runId, {
        successfulTransactions: successful,
        failedTransactions: failed,
        successRate: successRate.toFixed(2),
        avgLatency: avgLatency.toFixed(2),
        minLatency: minLatency.toFixed(2),
        maxLatency: maxLatency.toFixed(2),
        avgCost: avgCost.toFixed(6),
        totalCost: totalCost.toFixed(6),
        status: 'completed',
        completedAt: new Date() as any,
      });

      // Broadcast completion
      broadcast('benchmark_complete', {
        runId,
        successful,
        failed,
        successRate: successRate.toFixed(2),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Benchmark] Complete run error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

// Background benchmark execution
async function executeBenchmark(
  runId: string,
  config: {
    preset?: BenchmarkPreset;
    transactionCount: number;
    amountSol: number;
    fromPrivateKey: string;
    toAddress: string;
  },
  storage: IStorage,
  gatewayService: SanctumGatewayService,
  broadcast: (type: string, data: any) => void
) {
  const RPC_ENDPOINTS = [
    'https://rpc.gsnode.io',
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ];

  let successCount = 0;
  let failedCount = 0;
  const latencies: number[] = [];
  const costs: number[] = [];
  const jitoTipRefunds: number[] = []; // Track Jito tip refunds from Gateway

  try {
    // Parse private key
    let keypair: Keypair;
    try {
      // Try base58 format first (standard format)
      const trimmedKey = config.fromPrivateKey.trim();
      const privateKeyBytes = bs58.decode(trimmedKey);
      keypair = Keypair.fromSecretKey(privateKeyBytes);
      console.log('[Benchmark] Private key decoded from base58');
    } catch (base58Error) {
      // Try JSON array format [1,2,3,...]
      try {
        const trimmedKey = config.fromPrivateKey.trim();
        const privateKeyArray = JSON.parse(trimmedKey);
        if (!Array.isArray(privateKeyArray)) {
          throw new Error('Private key JSON is not an array');
        }
        keypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
        console.log('[Benchmark] Private key decoded from JSON array');
      } catch (jsonError) {
        throw new Error(
          `Invalid private key format. Expected base58 string or JSON array [1,2,3,...]. ` +
          `Base58 error: ${base58Error instanceof Error ? base58Error.message : 'unknown'}. ` +
          `JSON error: ${jsonError instanceof Error ? jsonError.message : 'unknown'}`
        );
      }
    }

    const toPublicKey = new PublicKey(config.toAddress);
    const amountLamports = Math.floor(config.amountSol * LAMPORTS_PER_SOL);

    // Find working RPC endpoint once (cache it for all transactions)
    let workingConnection: Connection | null = null;
    let workingEndpoint = '';
    
    console.log('[Benchmark] Finding working RPC endpoint...');
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const testConnection = new Connection(endpoint, 'confirmed');
        await testConnection.getLatestBlockhash();
        workingConnection = testConnection;
        workingEndpoint = endpoint;
        console.log(`[Benchmark] ✅ Using RPC endpoint: ${endpoint}`);
        break;
      } catch (err) {
        // Silently try next endpoint
        continue;
      }
    }

    if (!workingConnection) {
      throw new Error('All RPC endpoints are unavailable. Please try again later.');
    }

    // Execute transactions sequentially
    for (let i = 0; i < config.transactionCount; i++) {
      console.log(`[Benchmark] Transaction ${i + 1}/${config.transactionCount}`);
      
      const startTime = Date.now();
      const connection = workingConnection;

      try {
        // Build transaction using preset (if specified)
        const preset = (config.preset || 'custom') as BenchmarkPreset;
        const instructions = buildPresetTransaction(
          preset,
          keypair,
          config.toAddress,
          config.amountSol
        );

        const transaction = new Transaction();
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keypair.publicKey;
        
        // Add preset instructions
        for (const ix of instructions) {
          transaction.add(ix);
        }

        // Step 1: Build Gateway-optimized transaction (HACKATHON REQUIREMENT!)
        // Gateway will add tip instructions, priority fees, and optimize the transaction
        const unsignedTxSerialized = transaction.serializeMessage().toString('base64');
        
        console.log('[Benchmark] ⚡ Building Gateway-optimized transaction...');
        const gatewayBuildResult = await gatewayService.buildGatewayTransaction({
          transaction: unsignedTxSerialized,
          options: {
            encoding: 'base64',
            skipSimulation: true,
            cuPriceRange: 'medium',
            jitoTipRange: 'medium',
          },
        });
        console.log('[Benchmark] ✅ Gateway optimization complete');

        // Step 2: Decode optimized transaction from Gateway
        const optimizedTxBuffer = Buffer.from(gatewayBuildResult.transaction, 'base64');
        const optimizedTransaction = Transaction.from(optimizedTxBuffer);
        
        // Gateway may have updated the blockhash, use it if provided
        if (gatewayBuildResult.latestBlockhash?.blockhash) {
          optimizedTransaction.recentBlockhash = gatewayBuildResult.latestBlockhash.blockhash;
        }

        // Step 3: Sign the optimized transaction
        console.log('[Benchmark] 🔐 Signing optimized transaction...');
        optimizedTransaction.sign(keypair);

        // Step 4: Send signed transaction via Gateway (HACKATHON REQUIREMENT!)
        const serializedTx = optimizedTransaction.serialize().toString('base64');
        
        console.log('[Benchmark] 📤 Sending transaction via Gateway...');
        const result = await gatewayService.sendTransaction({
          signedTransaction: serializedTx,
        });

        const latency = Date.now() - startTime;
        latencies.push(latency);

        if (result.status === 'success' && result.signature) {
          successCount++;
          if (result.cost) costs.push(result.cost);
          
          // Capture Jito tip refund from Gateway response
          const jitoTipRefunded = result.jitoTipRefunded || 0;
          if (jitoTipRefunded > 0) {
            jitoTipRefunds.push(jitoTipRefunded);
            console.log(`[Benchmark] 💰 Jito tip refunded: ${jitoTipRefunded.toFixed(6)} SOL`);
          }

          // Store successful transaction
          await storage.createBenchmarkTransaction({
            runId,
            txHash: result.signature,
            status: 'success',
            latencyMs: latency,
            feeSol: result.cost?.toString() || '0',
            jitoTipRefunded: jitoTipRefunded.toString(),
            metadata: JSON.stringify({ route: result.route }),
          });

          console.log(`[Benchmark] ✅ Transaction ${i + 1} succeeded: ${result.signature}`);
        } else {
          failedCount++;
          const errorMsg = `Unexpected status: ${result.status}, signature: ${result.signature}`;
          console.error(`[Benchmark] ❌ Transaction ${i + 1} failed:`, errorMsg);
          
          // Store failed transaction
          await storage.createBenchmarkTransaction({
            runId,
            txHash: result.signature || null,
            status: 'failed',
            latencyMs: latency,
            errorMessage: errorMsg,
          });
        }

        // Broadcast progress
        broadcast('benchmark_progress', {
          runId,
          completed: i + 1,
          total: config.transactionCount,
          successCount,
          failedCount,
        });

        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (txError: any) {
        failedCount++;
        console.error(`[Benchmark] Transaction ${i + 1} error:`, txError.message);

        // Store failed transaction
        await storage.createBenchmarkTransaction({
          runId,
          txHash: null,
          status: 'failed',
          latencyMs: Date.now() - startTime,
          errorMessage: txError.message,
        });

        // Broadcast progress
        broadcast('benchmark_progress', {
          runId,
          completed: i + 1,
          total: config.transactionCount,
          successCount,
          failedCount,
        });
      }
    }

    // Calculate final metrics
    const successRate = (successCount / config.transactionCount) * 100;
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const avgCost = costs.length > 0 
      ? costs.reduce((a, b) => a + b, 0) / costs.length 
      : 0;
    const totalCost = costs.reduce((a, b) => a + b, 0);
    const totalJitoTipRefunded = jitoTipRefunds.reduce((a, b) => a + b, 0);

    console.log(`[Benchmark] 💰 Total Jito tip refunded: ${totalJitoTipRefunded.toFixed(6)} SOL`);

    // Update benchmark run with final metrics
    await storage.updateBenchmarkRun(runId, {
      successfulTransactions: successCount,
      failedTransactions: failedCount,
      successRate: successRate.toFixed(2),
      avgLatency: avgLatency.toFixed(2),
      minLatency: minLatency.toFixed(2),
      maxLatency: maxLatency.toFixed(2),
      avgCost: avgCost.toFixed(9),
      totalCost: totalCost.toFixed(9),
      jitoTipRefunded: totalJitoTipRefunded.toFixed(9),
      status: 'completed',
      completedAt: new Date(),
    } as any);

    console.log(`[Benchmark] ✅ Benchmark completed: ${successCount}/${config.transactionCount} successful`);

    // Broadcast completion
    broadcast('benchmark_complete', {
      runId,
      successCount,
      failedCount,
      successRate,
      avgLatency,
      avgCost,
    });

  } catch (error: any) {
    console.error('[Benchmark] Fatal error:', error);

    // Mark run as failed
    await storage.updateBenchmarkRun(runId, {
      status: 'failed',
      completedAt: new Date(),
    } as any);

    broadcast('benchmark_error', {
      runId,
      error: error.message,
    });
  }
}
