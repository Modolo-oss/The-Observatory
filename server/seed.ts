import { db } from "./db";
import { routeConfigurations, aiInsights, alerts } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Create default route configuration
  const [defaultConfig] = await db.insert(routeConfigurations).values({
    name: "Default Configuration",
    description: "Initial routing configuration with balanced distribution",
    routes: [
      { id: "rpc-1", type: "rpc", name: "RPC A", endpoint: "https://api.mainnet-beta.solana.com", weight: 40, enabled: true },
      { id: "jito-1", type: "jito", name: "Jito Bundle", endpoint: "", weight: 40, enabled: true },
      { id: "sanctum-1", type: "sanctum", name: "Sanctum Sender", endpoint: "", weight: 20, enabled: true },
    ],
    isActive: true,
  }).returning();

  console.log("Created default configuration:", defaultConfig.id);

  // Create sample AI insights
  const insights = [
    {
      type: "recommendation",
      title: "RPC Performance Degradation Detected",
      description: "RPC A is showing 15% slower confirmation times compared to historical averages. Consider reducing traffic allocation.",
      severity: "warning",
      confidenceScore: "0.87",
      recommendation: {
        action: "Reduce RPC A traffic from 40% to 25%, increase Jito to 55%",
        expectedImpact: "Estimated 12% improvement in average confirmation time",
      },
      isApplied: false,
    },
    {
      type: "optimization",
      title: "Cost Optimization Opportunity",
      description: "Network congestion is low. Switching more traffic to RPC could save additional Jito tips.",
      severity: "info",
      confidenceScore: "0.92",
      recommendation: {
        action: "Shift 15% from Jito to RPC A for non-critical transactions",
        expectedImpact: "Save approximately 0.15 SOL per day in Jito tips",
      },
      isApplied: false,
    },
  ];

  for (const insight of insights) {
    await db.insert(aiInsights).values(insight);
  }

  console.log("Created AI insights");

  // Create sample alerts
  const sampleAlerts = [
    {
      type: "threshold",
      title: "High Network Congestion",
      message: "Average confirmation time increased by 23%",
      severity: "warning",
      source: "system",
      isRead: false,
    },
    {
      type: "threshold",
      title: "Cost Savings Milestone",
      message: "Successfully saved 1 SOL in Jito tip refunds this week",
      severity: "info",
      source: "system",
      isRead: true,
    },
  ];

  for (const alert of sampleAlerts) {
    await db.insert(alerts).values(alert);
  }

  console.log("Created sample alerts");

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
