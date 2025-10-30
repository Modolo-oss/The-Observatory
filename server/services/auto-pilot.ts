import type { IStorage } from "../storage";
import { openRouter } from "./openrouter";

export class AutoPilot {
  private storage: IStorage;
  private isEnabled: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastOptimization: Date | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async start() {
    if (this.isEnabled) {
      console.log("[AutoPilot] Already running");
      return;
    }

    this.isEnabled = true;
    console.log("[AutoPilot] Starting...");

    // Run optimization every 5 minutes
    this.checkInterval = setInterval(async () => {
      await this.optimize();
    }, 5 * 60 * 1000);

    // Run immediately on start
    await this.optimize();
  }

  stop() {
    if (!this.isEnabled) {
      console.log("[AutoPilot] Not running");
      return;
    }

    this.isEnabled = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log("[AutoPilot] Stopped");
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  getLastOptimization(): Date | null {
    return this.lastOptimization;
  }

  private async optimize() {
    try {
      console.log("[AutoPilot] Running optimization check...");

      // Get recent performance data
      const recentTransactions = await this.storage.getRecentTransactions(100);
      const currentConfig = await this.storage.getActiveConfiguration();

      if (!currentConfig) {
        console.log("[AutoPilot] No active configuration found");
        return;
      }

      // Calculate route performance
      const routeStats: { [key: string]: { success: number; total: number; avgTime: number } } = {};
      
      recentTransactions.forEach((tx) => {
        const routeType = tx.routeType;
        if (!routeStats[routeType]) {
          routeStats[routeType] = { success: 0, total: 0, avgTime: 0 };
        }
        routeStats[routeType].total++;
        if (tx.status === "success") {
          routeStats[routeType].success++;
          routeStats[routeType].avgTime += tx.confirmationTime || 0;
        }
      });

      // Calculate success rates and avg times
      const routePerformance = Object.entries(routeStats).map(([route, stats]) => ({
        route,
        successRate: (stats.success / stats.total) * 100,
        avgConfirmationTime: stats.success > 0 ? stats.avgTime / stats.success : 0,
        totalTransactions: stats.total,
      }));

      console.log("[AutoPilot] Route performance:", routePerformance);

      // Use AI to determine optimal weights
      const aiPrompt = `You are an AI optimizer for Solana transaction routing. Based on the following route performance data, suggest optimal weight distribution:

ROUTE PERFORMANCE (Last 100 transactions):
${routePerformance.map(r => 
  `- ${r.route}: ${r.successRate.toFixed(1)}% success rate, ${r.avgConfirmationTime.toFixed(0)}ms avg confirmation, ${r.totalTransactions} txs`
).join('\n')}

CURRENT CONFIGURATION:
${currentConfig.routes.map(r => `- ${r.type}: ${r.weight}% weight`).join('\n')}

OPTIMIZATION GOALS:
1. Maximize overall success rate
2. Minimize confirmation times
3. Distribute load appropriately

Respond with ONLY a JSON object in this exact format:
{
  "rpc": <weight_percentage>,
  "jito": <weight_percentage>,
  "sanctum": <weight_percentage>,
  "reasoning": "<brief explanation>"
}

Weights must sum to 100. Respond ONLY with the JSON, no other text.`;

      const aiResponse = await openRouter.chat([
        { role: "system", content: "You are a routing optimization AI. Respond ONLY with valid JSON." },
        { role: "user", content: aiPrompt },
      ]);

      // Parse AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log("[AutoPilot] Failed to parse AI response:", aiResponse);
        return;
      }

      const suggestion = JSON.parse(jsonMatch[0]);
      console.log("[AutoPilot] AI Suggestion:", suggestion);

      // Check if weights are significantly different (>10% change)
      const currentWeights = currentConfig.routes.reduce((acc, r) => {
        acc[r.type] = r.weight;
        return acc;
      }, {} as { [key: string]: number });

      const hasSignificantChange = Object.entries(suggestion).some(([route, newWeight]) => {
        if (route === "reasoning") return false;
        const currentWeight = currentWeights[route] || 0;
        return Math.abs(currentWeight - (newWeight as number)) > 10;
      });

      if (!hasSignificantChange) {
        console.log("[AutoPilot] No significant changes needed");
        this.lastOptimization = new Date();
        return;
      }

      // Create new optimized configuration
      const newRoutes = currentConfig.routes.map(r => ({
        ...r,
        weight: suggestion[r.type] || r.weight,
      }));

      // Ensure weights sum to 100
      const totalWeight = newRoutes.reduce((sum, r) => sum + r.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.1) {
        const factor = 100 / totalWeight;
        newRoutes.forEach(r => {
          r.weight = Math.round(r.weight * factor);
        });
      }

      // Create new configuration
      const newConfig = await this.storage.createConfiguration({
        name: `Auto-Optimized ${new Date().toISOString().split('T')[0]}`,
        description: `AI-optimized: ${suggestion.reasoning}`,
        routes: newRoutes,
        isActive: true,
      });

      // Log optimization (history is automatically created when new config is activated)
      console.log(`[AutoPilot] ✓ Configuration optimized! ${suggestion.reasoning}`);
      console.log("[AutoPilot] New weights:", newRoutes.map(r => `${r.type}=${r.weight}%`).join(", "));
      this.lastOptimization = new Date();

    } catch (error) {
      console.error("[AutoPilot] Optimization error:", error);
    }
  }
}
