import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenRouterService } from "./services/openrouter";
import { SanctumGatewayService } from "./services/sanctum-gateway";
import { setupWebSocket } from "./websocket";
import { insertRouteConfigurationSchema, insertAiInsightSchema, insertChatMessageSchema, insertTransactionLogSchema } from "@shared/schema";
import { authRouter } from "./routes/auth";
import { apiKeysRouter } from "./routes/api-keys";
import { publicApiRouter, setGatewayService } from "./routes/public-api";
import { createBenchmarkRouter } from "./routes/benchmarks";
import { attachUser } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  const openRouter = new OpenRouterService(process.env.OPENROUTER_API_KEY || "");
  // Use mainnet cluster since API key is for mainnet
  const sanctumGateway = new SanctumGatewayService(
    process.env.SANCTUM_GATEWAY_API_KEY || "",
    "mainnet" // API key 01K8HMCYMFBA3FT0RSWW0C68KV is for mainnet
  );

  const httpServer = createServer(app);

  // Setup WebSocket for real-time updates
  const { wss, broadcast } = setupWebSocket(httpServer);

  // Set gateway service for public API
  setGatewayService(sanctumGateway);

  // Mount benchmark routes (needs WebSocket for progress broadcasting)
  const benchmarkRouter = createBenchmarkRouter(storage, sanctumGateway, broadcast);
  app.use('/api/benchmarks', benchmarkRouter);

  // Mount authentication routes
  app.use('/api/auth', authRouter);
  
  // Mount API key management routes (requires authentication)
  app.use('/api/api-keys', apiKeysRouter);
  
  // Mount public API routes (health endpoint + authenticated routes)
  app.use('/api/public', publicApiRouter);

  // Attach user to all other routes (optional, for session-aware routes)
  app.use(attachUser);

  // Wallet balance check
  app.post("/api/wallet/balance", async (req, res) => {
    try {
      const { address } = req.body;
      if (!address) {
        return res.status(400).json({ success: false, error: "Address required" });
      }

      console.log('[Balance Check] Checking balance for address:', address);

      // Use Solana mainnet RPC (not Gateway - Gateway is for transactions only)
      // Using public mainnet-beta endpoint
      const rpcUrl = "https://api.mainnet-beta.solana.com";
      const rpcBody = {
        id: 1,
        jsonrpc: "2.0",
        method: "getBalance",
        params: [address],
      };

      console.log('[Balance Check] Using mainnet RPC:', rpcUrl);

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rpcBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Balance Check] HTTP Error:', response.status, errorText);
        throw new Error(`RPC request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Balance Check] RPC Response:', JSON.stringify(data));
      
      if (data.error) {
        console.error('[Balance Check] RPC Error:', data.error);
        throw new Error(data.error.message || 'Failed to fetch balance');
      }

      const balanceLamports = data.result?.value || 0;
      const balanceSol = balanceLamports / 1000000000; // Convert lamports to SOL

      console.log('[Balance Check] Balance:', balanceSol, 'SOL');

      res.json({ success: true, balance: balanceSol });
    } catch (error: any) {
      console.error("[Balance Check] Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Dashboard Metrics (from benchmark data)
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const { timeWindow = "24h" } = req.query;
      const metrics = await storage.getBenchmarkAggregatedMetrics(timeWindow as string);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Route Configurations
  app.get("/api/configurations/active", async (req, res) => {
    try {
      const config = await storage.getActiveConfiguration();
      res.json(config || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/configurations", async (req, res) => {
    try {
      const configs = await storage.getAllConfigurations();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/configurations", async (req, res) => {
    try {
      const validatedData = insertRouteConfigurationSchema.parse(req.body);
      const newConfig = await storage.createConfiguration(validatedData);

      // Create history entry
      await storage.createHistoryEntry({
        configurationId: newConfig.id,
        action: "created",
        changesSummary: `Created new configuration: ${newConfig.name}`,
        newConfig: newConfig.routes,
        performedBy: "Mission Controller",
      });

      res.json(newConfig);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/configurations/apply", async (req, res) => {
    try {
      const { routes } = req.body;

      // Validate routes structure
      if (!Array.isArray(routes)) {
        return res.status(400).json({ error: "Routes must be an array" });
      }

      // Ensure routes have correct schema - remove any extra fields
      const validatedRoutes = routes.map((r: any) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        endpoint: r.endpoint || "",
        weight: typeof r.weight === 'number' ? r.weight : parseFloat(r.weight) || 0,
        enabled: Boolean(r.enabled),
      }));

      // Create or update active configuration
      const activeConfig = await storage.getActiveConfiguration();
      if (activeConfig) {
        // Capture current routes before update (deep copy to prevent mutation)
        const previousRoutes = JSON.parse(JSON.stringify(activeConfig.routes));
        
        await storage.updateConfiguration(activeConfig.id, { routes: validatedRoutes });

        console.log('[Config Apply] Previous routes:', JSON.stringify(previousRoutes.map((r: any) => ({ name: r.name, weight: r.weight }))));
        console.log('[Config Apply] New routes:', JSON.stringify(validatedRoutes.map((r: any) => ({ name: r.name, weight: r.weight }))));

        await storage.createHistoryEntry({
          configurationId: activeConfig.id,
          action: "updated",
          changesSummary: "Applied routing configuration changes",
          previousConfig: previousRoutes,
          newConfig: validatedRoutes,
          performedBy: "Mission Controller",
        });

        // Broadcast update via WebSocket
        broadcast("configUpdate", { routes: validatedRoutes });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Transactions
  app.get("/api/transactions/recent", async (req, res) => {
    try {
      const transactions = await storage.getRecentTransactions(50);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions/send", async (req, res) => {
    try {
      const { transaction } = req.body;
      const activeConfig = await storage.getActiveConfiguration();

      if (!activeConfig) {
        return res.status(400).json({ error: "No active configuration" });
      }

      // Send transaction via Sanctum Gateway
      const result = await sanctumGateway.sendTransaction({
        signedTransaction: transaction,
        configuration: activeConfig,
      });

      // Log transaction
      await storage.createTransactionLog({
        configurationId: activeConfig.id,
        routeType: result.route,
        routeName: result.route,
        signature: result.signature,
        status: result.status,
        confirmationTime: Math.round(result.confirmationTime),
        cost: result.cost.toString(),
        jitoTipRefunded: result.jitoTipRefunded?.toString() || "0",
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics (from benchmark data)
  app.get("/api/analytics/metrics", async (req, res) => {
    try {
      const { timeWindow = "24h" } = req.query;
      const aggregated = await storage.getBenchmarkAggregatedMetrics(timeWindow as string);
      const timeSeries = await storage.getBenchmarkTimeSeriesData(timeWindow as string);

      res.json({
        summary: aggregated,
        timeSeries,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/timeseries", async (req, res) => {
    try {
      const { timeWindow = "24h" } = req.query;
      const timeSeries = await storage.getBenchmarkTimeSeriesData(timeWindow as string);
      res.json(timeSeries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Benchmark comparison - compare different benchmark runs
  app.get("/api/analytics/route-comparison", async (req, res) => {
    try {
      const { timeWindow = "24h" } = req.query;
      const benchmarks = await storage.getBenchmarkRuns();
      
      // Return benchmark runs as comparison data
      const comparison = benchmarks.slice(0, 10).map(run => ({
        name: run.name,
        successRate: parseFloat(run.successRate || '0'),
        avgConfirmation: parseFloat(run.avgLatency || '0'),
        totalTransactions: run.totalTransactions || 0,
        cost: parseFloat(run.avgCost || '0'),
        failureRate: 100 - parseFloat(run.successRate || '0'),
      }));

      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Insights
  app.get("/api/ai/insights", async (req, res) => {
    try {
      const insights = await storage.getAIInsights();
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ai/insights/recent", async (req, res) => {
    try {
      const insights = await storage.getAIInsights();
      res.json(insights.slice(0, 5));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/insights/:id/apply", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.applyAIInsight(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const transactions = await storage.getRecentTransactions(100);

      // Generate AI insights
      const recommendations = await openRouter.generateRecommendations({
        transactions,
      });

      // Store recommendations
      for (const rec of recommendations) {
        await storage.createAIInsight({
          type: "recommendation",
          title: rec.title,
          description: rec.description,
          severity: rec.severity,
          confidenceScore: rec.confidenceScore?.toString() || "0.85",
          recommendation: rec.recommendation,
        });
      }

      res.json({ success: true, count: recommendations.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Chat
  app.get("/api/ai/chat/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getChatMessages(limit);
      res.json(messages.reverse()); // Reverse to get chronological order
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;

      // Save user message
      await storage.createChatMessage({
        role: "user",
        content: message,
      });

      // Get context from recent messages
      const recentMessages = await storage.getChatMessages(10);
      const chatHistory = recentMessages
        .reverse()
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Fetch benchmark data to provide context
      const benchmarkMetrics = await storage.getBenchmarkAggregatedMetrics("24h");
      const recentBenchmarks = await storage.getBenchmarkRuns();
      const latestBenchmark = recentBenchmarks[0]; // Most recent benchmark

      // Get latest benchmark transaction details if available
      let latestBenchmarkDetails = "";
      if (latestBenchmark) {
        const transactions = await storage.getBenchmarkTransactions(latestBenchmark.id);
        const avgLatency = transactions.length > 0
          ? (transactions.reduce((sum, tx) => sum + (tx.latencyMs || 0), 0) / transactions.length).toFixed(2)
          : "0";
        const successCount = transactions.filter(tx => tx.status === 'success').length;
        const successRate = transactions.length > 0
          ? ((successCount / transactions.length) * 100).toFixed(1)
          : "0";

        latestBenchmarkDetails = `
LATEST BENCHMARK RUN (${latestBenchmark.name}):
- Status: ${latestBenchmark.status}
- Total Transactions: ${transactions.length}
- Success Rate: ${successRate}%
- Average Latency: ${avgLatency}ms
- Total Cost: ${latestBenchmark.totalCost || 0} SOL
- Created: ${new Date(latestBenchmark.createdAt).toLocaleString()}`;
      }

      // Add system context with benchmark data
      const systemMessage = {
        role: "system",
        content: `You are the Benchmark Assistant for The Observatory, a live benchmarking platform for Sanctum Gateway on Solana. 
Your role is to help users analyze benchmark results, understand performance metrics, and provide actionable insights about Gateway's performance.

LIVE BENCHMARK DATA (as of now):

AGGREGATED METRICS (Last 24 hours):
- Total Benchmarks Run: ${benchmarkMetrics.totalBenchmarks}
- Total Transactions Executed: ${benchmarkMetrics.totalTransactions}
- Average Success Rate: ${benchmarkMetrics.avgSuccessRate}
- Average Latency: ${benchmarkMetrics.avgLatency}
- Average Transaction Cost: ${benchmarkMetrics.avgCost} SOL
- Total Cost: ${benchmarkMetrics.totalCost} SOL
${latestBenchmarkDetails}

RECENT BENCHMARK RUNS:
${recentBenchmarks.slice(0, 5).map((run, idx) => 
  `${idx + 1}. ${run.name} - Status: ${run.status}, Transactions: ${run.totalTransactions || 0}, Success: ${run.successRate || 'N/A'}%`
).join("\n")}

YOUR CAPABILITIES:
- Analyze benchmark performance trends and patterns
- Explain what metrics mean and why they matter
- Compare benchmark runs and highlight differences
- Suggest optimizations based on results
- Help interpret success rates, latency, and costs
- Provide context about Gateway's performance

IMPORTANT GUIDELINES:
1. Use the live data above to answer questions - cite specific numbers
2. Be concise, technical, and data-driven
3. Focus on actionable insights and clear explanations
4. When comparing runs, highlight meaningful differences
5. Help users understand ROI and performance improvements
6. If data is limited, acknowledge it and explain what more benchmarks would show`,
      };

      // Get AI response
      const response = await openRouter.chat([
        systemMessage,
        ...chatHistory,
        { role: "user", content: message },
      ]);

      // Save assistant response
      await storage.createChatMessage({
        role: "assistant",
        content: response,
      });

      res.json({ response });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/alerts/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markAlertAsRead(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Alert Rules
  app.get("/api/alert-rules", async (req, res) => {
    try {
      const rules = await storage.getAlertRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-Pilot
  app.get("/api/autopilot/status", async (req, res) => {
    try {
      const { autoPilot } = await import("./index");
      res.json({
        isActive: autoPilot.isActive(),
        lastOptimization: autoPilot.getLastOptimization(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/autopilot/start", async (req, res) => {
    try {
      const { autoPilot } = await import("./index");
      await autoPilot.start();
      res.json({ success: true, message: "Auto-Pilot started" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/autopilot/stop", async (req, res) => {
    try {
      const { autoPilot } = await import("./index");
      autoPilot.stop();
      res.json({ success: true, message: "Auto-Pilot stopped" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/alert-rules", async (req, res) => {
    try {
      const rule = await storage.createAlertRule(req.body);
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Configuration History
  app.get("/api/configurations/history", async (req, res) => {
    try {
      const history = await storage.getConfigurationHistory();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rollback Configuration
  app.post("/api/configurations/rollback/:historyId", async (req, res) => {
    try {
      const { historyId } = req.params;
      
      // Get the history entry
      const allHistory = await storage.getConfigurationHistory();
      const historyEntry = allHistory.find((h: any) => h.id === historyId);
      
      if (!historyEntry) {
        return res.status(404).json({ error: "History entry not found" });
      }

      if (!historyEntry.previousConfig) {
        return res.status(400).json({ error: "No previous configuration to rollback to" });
      }

      // Get the current active configuration
      const activeConfig = await storage.getActiveConfiguration();
      if (!activeConfig) {
        return res.status(404).json({ error: "No active configuration found" });
      }

      // Capture current routes before rollback
      const currentRoutes = JSON.parse(JSON.stringify(activeConfig.routes));

      // Update the active configuration with the previous config
      await storage.updateConfiguration(activeConfig.id, {
        routes: historyEntry.previousConfig as any,
      });

      // Create history entry for the rollback
      await storage.createHistoryEntry({
        configurationId: activeConfig.id,
        action: "rollback",
        changesSummary: `Rolled back to configuration from ${new Date(historyEntry.createdAt).toLocaleString()}`,
        previousConfig: currentRoutes,
        newConfig: historyEntry.previousConfig,
        performedBy: "Mission Controller",
      });

      res.json({ success: true, message: "Configuration rolled back successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return httpServer;
}
