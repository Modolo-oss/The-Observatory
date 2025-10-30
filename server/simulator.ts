import { storage } from "./storage";

// Transaction simulator to generate realistic demo data
export class TransactionSimulator {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  async generateTransaction() {
    const routes = ["rpc", "jito", "sanctum"];
    const selectedRoute = routes[Math.floor(Math.random() * routes.length)];
    
    // 95% success rate
    const status = Math.random() > 0.05 ? "success" : "failed";
    
    // Confirmation times vary by route
    let confirmationTime: number;
    if (selectedRoute === "rpc") {
      confirmationTime = Math.random() * 1000 + 800; // 800-1800ms
    } else if (selectedRoute === "jito") {
      confirmationTime = Math.random() * 600 + 400; // 400-1000ms (faster)
    } else {
      confirmationTime = Math.random() * 700 + 500; // 500-1200ms
    }

    // Cost varies by route
    let cost: number;
    if (selectedRoute === "jito") {
      cost = Math.random() * 0.003 + 0.002; // 0.002-0.005 SOL
    } else {
      cost = Math.random() * 0.002 + 0.0005; // 0.0005-0.0025 SOL
    }

    // Jito sometimes refunds tips
    const jitoTipRefunded = selectedRoute === "jito" && Math.random() > 0.4 
      ? Math.random() * 0.001 + 0.0005 
      : 0;

    try {
      const activeConfig = await storage.getActiveConfiguration();
      await storage.createTransactionLog({
        configurationId: activeConfig?.id || "default",
        routeType: selectedRoute,
        routeName: selectedRoute.charAt(0).toUpperCase() + selectedRoute.slice(1),
        signature: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status,
        confirmationTime: Math.round(confirmationTime),
        cost: cost.toString(),
        jitoTipRefunded: jitoTipRefunded.toString(),
      });

      console.log(`[Simulator] Generated ${status} transaction via ${selectedRoute} (${Math.round(confirmationTime)}ms)`);
    } catch (error) {
      console.error("[Simulator] Error generating transaction:", error);
    }
  }

  async generateBatch(count: number) {
    console.log(`[Simulator] Generating ${count} transactions...`);
    for (let i = 0; i < count; i++) {
      await this.generateTransaction();
      // Small delay to spread out timestamps
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    }
    console.log(`[Simulator] Batch complete!`);
  }

  async generateHistoricalData() {
    console.log("[Simulator] Generating historical data...");
    const now = Date.now();
    const hoursBack = 72; // 3 days of data

    for (let i = 0; i < hoursBack; i++) {
      const transactionsPerHour = Math.floor(Math.random() * 30) + 20; // 20-50 per hour
      
      for (let j = 0; j < transactionsPerHour; j++) {
        const routes = ["rpc", "jito", "sanctum"];
        const selectedRoute = routes[Math.floor(Math.random() * routes.length)];
        const status = Math.random() > 0.05 ? "success" : "failed";
        
        let confirmationTime: number;
        if (selectedRoute === "rpc") {
          confirmationTime = Math.random() * 1000 + 800;
        } else if (selectedRoute === "jito") {
          confirmationTime = Math.random() * 600 + 400;
        } else {
          confirmationTime = Math.random() * 700 + 500;
        }

        let cost: number;
        if (selectedRoute === "jito") {
          cost = Math.random() * 0.003 + 0.002;
        } else {
          cost = Math.random() * 0.002 + 0.0005;
        }

        const jitoTipRefunded = selectedRoute === "jito" && Math.random() > 0.4 
          ? Math.random() * 0.001 + 0.0005 
          : 0;

        try {
          const activeConfig = await storage.getActiveConfiguration();
          
          // Create transaction with historical timestamp
          const timestamp = new Date(now - (i * 60 * 60 * 1000) - (j * 2 * 60 * 1000));
          
          await storage.createTransactionLog({
            configurationId: activeConfig?.id || "default",
            routeType: selectedRoute,
            routeName: selectedRoute.charAt(0).toUpperCase() + selectedRoute.slice(1),
            signature: `hist_${timestamp.getTime()}_${Math.random().toString(36).substring(7)}`,
            status,
            confirmationTime: Math.round(confirmationTime),
            cost: cost.toString(),
            jitoTipRefunded: jitoTipRefunded.toString(),
            createdAt: timestamp,
          });
        } catch (error) {
          console.error("[Simulator] Error generating historical transaction:", error);
        }
      }
      
      if (i % 12 === 0) {
        console.log(`[Simulator] Generated ${i}/${hoursBack} hours of data...`);
      }
    }
    
    console.log("[Simulator] Historical data generation complete!");
  }

  start(intervalMs: number = 5000) {
    if (this.isRunning) {
      console.log("[Simulator] Already running");
      return;
    }

    console.log(`[Simulator] Starting (interval: ${intervalMs}ms)...`);
    this.isRunning = true;

    // Generate immediately
    this.generateTransaction();

    // Then generate at intervals
    this.intervalId = setInterval(() => {
      this.generateTransaction();
    }, intervalMs);
  }

  stop() {
    if (!this.isRunning) {
      console.log("[Simulator] Not running");
      return;
    }

    console.log("[Simulator] Stopping...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const transactionSimulator = new TransactionSimulator();
