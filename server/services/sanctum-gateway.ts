// Sanctum Gateway Service for real Solana transaction routing
// Uses JSON-RPC format as per official documentation
export class SanctumGatewayService {
  private apiKey: string;
  private cluster: "mainnet" | "devnet";
  private useMockData: boolean;

  constructor(apiKey: string, cluster: "mainnet" | "devnet" = "devnet") {
    this.apiKey = apiKey;
    this.cluster = cluster;
    // Use mock data if no API key provided (for development/demo)
    this.useMockData = !apiKey || apiKey === "your_sanctum_gateway_api_key_here";
    
    if (this.useMockData) {
      console.log("[SanctumGateway] Running in MOCK mode (no API key configured)");
    } else {
      console.log(`[SanctumGateway] Running in LIVE mode with real API (${cluster})`);
    }
  }

  private getEndpoint(): string {
    if (!this.apiKey) {
      throw new Error("SANCTUM_GATEWAY_API_KEY not configured");
    }
    return `https://tpg.sanctum.so/v1/${this.cluster}?apiKey=${this.apiKey}`;
  }

  /**
   * Build a Gateway transaction using buildGatewayTransaction JSON-RPC method
   * This optimizes the transaction for delivery via Gateway
   */
  async buildGatewayTransaction(params: {
    transaction: string; // base64 encoded unsigned transaction
    options?: {
      encoding?: "base64" | "base58";
      skipSimulation?: boolean;
      skipPriorityFee?: boolean;
      cuPriceRange?: "low" | "medium" | "high";
      jitoTipRange?: "low" | "medium" | "high" | "max";
      expireInSlots?: number;
      deliveryMethodType?: "rpc" | "jito" | "sanctum-sender" | "helius-sender";
    };
  }) {
    // Apply dashboard defaults if not specified
    const defaultOptions = {
      encoding: "base64" as const,
      skipSimulation: true, // Skip simulation by default for testing
      cuPriceRange: "medium" as const, // Dashboard setting: median
      jitoTipRange: "medium" as const, // Dashboard setting: median
      ...params.options,
    };
    if (this.useMockData) {
      console.log("[SanctumGateway] MOCK: buildGatewayTransaction");
      return {
        transaction: params.transaction,
        latestBlockhash: {
          blockhash: "mock_blockhash_" + Date.now(),
          lastValidBlockHeight: "999999",
        },
      };
    }

    try {
      // Validate transaction is not empty
      if (!params.transaction || params.transaction.length < 10) {
        throw new Error("Invalid transaction: transaction data is empty or too short");
      }

      const requestBody = {
        id: "build-gateway-tx",
        jsonrpc: "2.0",
        method: "buildGatewayTransaction",
        params: [
          params.transaction,
          {
            encoding: defaultOptions.encoding,
            skipSimulation: defaultOptions.skipSimulation,
            skipPriorityFee: false,
            cuPriceRange: defaultOptions.cuPriceRange,
            jitoTipRange: defaultOptions.jitoTipRange,
          }
        ],
      };
      
      console.log("[SanctumGateway] Building Gateway transaction");
      console.log("[SanctumGateway] Endpoint:", this.getEndpoint());
      console.log("[SanctumGateway] Transaction length:", params.transaction.length, "bytes");
      console.log("[SanctumGateway] Request body:", JSON.stringify(requestBody).substring(0, 200) + "...");
      
      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SanctumGateway] HTTP error:", response.status, response.statusText);
        console.error("[SanctumGateway] Error body:", errorText);
        throw new Error(`Gateway API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[SanctumGateway] Response:", JSON.stringify(data).substring(0, 300) + "...");
      
      if (data.error) {
        console.error("[SanctumGateway] JSON-RPC error:", JSON.stringify(data.error, null, 2));
        const errorMsg = data.error.message || 'Unknown Gateway error';
        const errorCode = data.error.code;
        const errorData = data.error.data ? JSON.stringify(data.error.data) : 'N/A';
        
        throw new Error(
          `Gateway RPC error [${errorCode}]: ${errorMsg}\n` +
          `Error details: ${errorData}\n` +
          `Tip: Check if transaction is properly formatted and has valid instructions`
        );
      }

      if (!data.result) {
        console.error("[SanctumGateway] No result in response:", data);
        throw new Error("Gateway returned no result - transaction may be invalid");
      }

      console.log("[SanctumGateway] ✅ Build successful!");
      return data.result;
    } catch (error) {
      console.error("[SanctumGateway] buildGatewayTransaction failed:", error);
      throw error;
    }
  }

  /**
   * Send a signed transaction via Gateway using sendTransaction JSON-RPC method
   */
  async sendTransaction(params: {
    signedTransaction: string; // base64 encoded signed transaction
    configuration?: any; // Route configuration from our database
    options?: {
      encoding?: "base64";
      startSlot?: number; // For slot latency tracking
    };
  }) {
    // Mock mode - simulate transaction
    if (this.useMockData) {
      const routes = params.configuration?.routes || [];
      const selectedRoute = this.selectRouteByWeight(routes);
      console.log("[SanctumGateway] MOCK: Simulating transaction via", selectedRoute);
      
      return {
        signature: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: Math.random() > 0.05 ? "success" : "failed",
        route: selectedRoute,
        confirmationTime: this.getMockConfirmationTime(selectedRoute),
        cost: this.getMockCost(selectedRoute),
        jitoTipRefunded: selectedRoute === "jito" && Math.random() > 0.5 ? Math.random() * 0.001 : 0,
      };
    }

    // Live mode - real API call
    try {
      const sendOptions = {
        encoding: "base64" as const,
        ...params.options,
      };
      
      console.log("[SanctumGateway] LIVE: Sending signed transaction via Gateway API");

      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: "send-tx",
          jsonrpc: "2.0",
          method: "sendTransaction",
          params: [params.signedTransaction, sendOptions],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SanctumGateway] sendTransaction error:", errorText);
        throw new Error(`Gateway API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error("[SanctumGateway] JSON-RPC error:", JSON.stringify(data.error, null, 2));
        throw new Error(`Gateway RPC error: ${data.error.message}`);
      }

      // Gateway returns just the signature as result
      const signature = data.result;
      
      console.log("[SanctumGateway] ✅ Transaction sent successfully:", signature);

      // Return in our format - if we got a signature, it's successful submission
      return {
        signature,
        status: "success", // Successfully submitted to Gateway
        route: "gateway", // Gateway handles routing internally
        confirmationTime: 0, // Will update after confirmation
        cost: 0, // Will be calculated from chain later
        jitoTipRefunded: 0, // Will be updated if applicable
      };
    } catch (error) {
      console.error("[SanctumGateway] sendTransaction failed:", error);
      // Don't fallback to mock in live mode - propagate the error
      throw error;
    }
  }

  /**
   * Get tip instructions using getTipInstructions JSON-RPC method
   */
  async getTipInstructions(params: {
    feePayer: string;
    jitoTipRange?: "low" | "medium" | "high" | "max";
    deliveryMethodType?: "rpc" | "jito" | "sanctum-sender" | "helius-sender";
  }) {
    if (this.useMockData) {
      return [];
    }

    try {
      const requestBody = {
        id: "observatory-" + Date.now(),
        jsonrpc: "2.0",
        method: "getTipInstructions",
        params: [params],
      };
      
      console.log("[SanctumGateway] getTipInstructions request:", JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Gateway API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error("[SanctumGateway] getTipInstructions error:", JSON.stringify(data.error, null, 2));
        throw new Error(`Gateway RPC error: ${data.error.message}`);
      }

      console.log("[SanctumGateway] getTipInstructions response:", JSON.stringify(data, null, 2));
      return data.result;
    } catch (error) {
      console.error("[SanctumGateway] getTipInstructions error:", error);
      throw error;
    }
  }

  /**
   * Check transaction status on chain
   */
  async getTransactionStatus(signature: string) {
    if (this.useMockData) {
      return {
        signature,
        status: "confirmed",
        confirmations: 32,
        slot: Math.floor(Date.now() / 1000),
      };
    }

    try {
      // Use standard Solana RPC getSignatureStatuses
      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: "observatory-" + Date.now(),
          jsonrpc: "2.0",
          method: "getSignatureStatuses",
          params: [[signature]],
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
      }

      const statusInfo = data.result?.value?.[0];

      if (!statusInfo) {
        return {
          signature,
          status: "not_found",
          confirmations: 0,
          slot: 0,
        };
      }

      return {
        signature,
        status: statusInfo.confirmationStatus || "processed",
        confirmations: statusInfo.confirmations || 0,
        slot: statusInfo.slot || 0,
        err: statusInfo.err,
      };
    } catch (error) {
      console.error("[SanctumGateway] getTransactionStatus error:", error);
      throw error;
    }
  }

  private selectRouteByWeight(routes: Array<{ type: string; weight: number; enabled: boolean }>) {
    const enabledRoutes = routes.filter(r => r.enabled);
    if (enabledRoutes.length === 0) return "rpc";

    const totalWeight = enabledRoutes.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    for (const route of enabledRoutes) {
      random -= route.weight;
      if (random <= 0) return route.type;
    }

    return enabledRoutes[0].type;
  }

  private getMockConfirmationTime(route: string): number {
    if (route === "jito") return Math.random() * 600 + 400; // 400-1000ms
    if (route === "rpc") return Math.random() * 1000 + 800; // 800-1800ms
    return Math.random() * 700 + 500; // 500-1200ms
  }

  private getMockCost(route: string): number {
    if (route === "jito") return Math.random() * 0.003 + 0.002; // 0.002-0.005 SOL
    return Math.random() * 0.002 + 0.0005; // 0.0005-0.0025 SOL
  }
}
