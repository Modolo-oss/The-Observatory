import {
  routeConfigurations,
  transactionLogs,
  analyticsMetrics,
  aiInsights,
  alerts,
  alertRules,
  configurationHistory,
  chatMessages,
  users,
  apiKeys,
  apiUsageLogs,
  benchmarkRuns,
  benchmarkTransactions,
  type RouteConfiguration,
  type InsertRouteConfiguration,
  type TransactionLog,
  type InsertTransactionLog,
  type AnalyticsMetric,
  type InsertAnalyticsMetric,
  type AiInsight,
  type InsertAiInsight,
  type Alert,
  type InsertAlert,
  type AlertRule,
  type InsertAlertRule,
  type ConfigurationHistory,
  type InsertConfigurationHistory,
  type ChatMessage,
  type InsertChatMessage,
  type User,
  type InsertUser,
  type ApiKey,
  type InsertApiKey,
  type ApiUsageLog,
  type InsertApiUsageLog,
  type BenchmarkRun,
  type InsertBenchmarkRun,
  type BenchmarkTransaction,
  type InsertBenchmarkTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, lte, count, avg, sum } from "drizzle-orm";

export interface IStorage {
  // Route Configurations
  getActiveConfiguration(): Promise<RouteConfiguration | undefined>;
  getConfiguration(id: string): Promise<RouteConfiguration | undefined>;
  getAllConfigurations(): Promise<RouteConfiguration[]>;
  createConfiguration(config: InsertRouteConfiguration): Promise<RouteConfiguration>;
  updateConfiguration(id: string, config: Partial<InsertRouteConfiguration>): Promise<RouteConfiguration>;
  activateConfiguration(id: string): Promise<void>;

  // Transaction Logs
  createTransactionLog(log: InsertTransactionLog): Promise<TransactionLog>;
  getRecentTransactions(limit?: number): Promise<TransactionLog[]>;

  // Analytics
  getMetrics(timeWindow: string): Promise<AnalyticsMetric[]>;
  createMetric(metric: InsertAnalyticsMetric): Promise<AnalyticsMetric>;
  getAggregatedMetrics(timeWindow: string): Promise<any>;
  getRoutePerformance(timeWindow: string): Promise<any[]>;
  getTimeSeriesData(timeWindow: string): Promise<any[]>;

  // AI Insights
  getAIInsights(): Promise<AiInsight[]>;
  createAIInsight(insight: InsertAiInsight): Promise<AiInsight>;
  applyAIInsight(id: string): Promise<void>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: string): Promise<void>;

  // Alert Rules
  getAlertRules(): Promise<AlertRule[]>;
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;

  // Configuration History
  getConfigurationHistory(): Promise<ConfigurationHistory[]>;
  createHistoryEntry(entry: InsertConfigurationHistory): Promise<ConfigurationHistory>;

  // Chat
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;

  // API Keys
  getAllActiveApiKeys(): Promise<ApiKey[]>;
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  deleteApiKey(id: string): Promise<void>;

  // API Usage
  createApiUsageLog(log: InsertApiUsageLog): Promise<ApiUsageLog>;
  getApiUsageStats(apiKeyId: string, timeWindow: string): Promise<any>;

  // Benchmarks
  createBenchmarkRun(run: InsertBenchmarkRun): Promise<BenchmarkRun>;
  getBenchmarkRun(id: string): Promise<BenchmarkRun | undefined>;
  getBenchmarkRuns(): Promise<BenchmarkRun[]>;
  updateBenchmarkRun(id: string, updates: Partial<InsertBenchmarkRun> & { completedAt?: string }): Promise<BenchmarkRun>;
  createBenchmarkTransaction(tx: InsertBenchmarkTransaction): Promise<BenchmarkTransaction>;
  getBenchmarkTransactions(runId: string): Promise<BenchmarkTransaction[]>;
  
  // Benchmark Analytics
  getBenchmarkAggregatedMetrics(timeWindow: string): Promise<any>;
  getBenchmarkTimeSeriesData(timeWindow: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Route Configurations
  async getActiveConfiguration(): Promise<RouteConfiguration | undefined> {
    const [config] = await db.select().from(routeConfigurations).where(eq(routeConfigurations.isActive, true)).limit(1);
    return config;
  }

  async getConfiguration(id: string): Promise<RouteConfiguration | undefined> {
    const [config] = await db.select().from(routeConfigurations).where(eq(routeConfigurations.id, id));
    return config;
  }

  async getAllConfigurations(): Promise<RouteConfiguration[]> {
    return await db.select().from(routeConfigurations).orderBy(desc(routeConfigurations.createdAt));
  }

  async createConfiguration(config: InsertRouteConfiguration): Promise<RouteConfiguration> {
    const [newConfig] = await db.insert(routeConfigurations).values(config).returning();
    return newConfig;
  }

  async updateConfiguration(id: string, config: Partial<InsertRouteConfiguration>): Promise<RouteConfiguration> {
    const [updated] = await db
      .update(routeConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(routeConfigurations.id, id))
      .returning();
    return updated;
  }

  async activateConfiguration(id: string): Promise<void> {
    // Deactivate all configs
    await db.update(routeConfigurations).set({ isActive: false });
    // Activate the selected one
    await db.update(routeConfigurations).set({ isActive: true }).where(eq(routeConfigurations.id, id));
  }

  // Transaction Logs
  async createTransactionLog(log: InsertTransactionLog): Promise<TransactionLog> {
    const [newLog] = await db.insert(transactionLogs).values(log).returning();
    return newLog;
  }

  async getRecentTransactions(limit: number = 100): Promise<TransactionLog[]> {
    return await db.select().from(transactionLogs).orderBy(desc(transactionLogs.createdAt)).limit(limit);
  }

  // Analytics
  async getMetrics(timeWindow: string): Promise<AnalyticsMetric[]> {
    return await db.select().from(analyticsMetrics).where(eq(analyticsMetrics.timeWindow, timeWindow));
  }

  async createMetric(metric: InsertAnalyticsMetric): Promise<AnalyticsMetric> {
    const [newMetric] = await db.insert(analyticsMetrics).values(metric).returning();
    return newMetric;
  }

  async getAggregatedMetrics(timeWindow: string): Promise<any> {
    const timeWindowHours: Record<string, number> = {
      "1h": 1,
      "24h": 24,
      "7d": 24 * 7,
      "30d": 24 * 30,
    };

    const hours = timeWindowHours[timeWindow] || 24;
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result = await db
      .select({
        totalTransactions: count(),
        successCount: sql<number>`COUNT(CASE WHEN ${transactionLogs.status} = 'success' THEN 1 END)`,
        failedCount: sql<number>`COUNT(CASE WHEN ${transactionLogs.status} = 'failed' THEN 1 END)`,
        avgConfirmationTime: avg(transactionLogs.confirmationTime),
        totalCost: sum(transactionLogs.cost),
        totalJitoRefunded: sum(transactionLogs.jitoTipRefunded),
      })
      .from(transactionLogs)
      .where(gte(transactionLogs.createdAt, cutoffTime));

    const data = result[0];
    const successRate = data.totalTransactions > 0 
      ? ((Number(data.successCount) / Number(data.totalTransactions)) * 100).toFixed(1)
      : "0.0";

    return {
      successRate: successRate + "%",
      avgConfirmation: data.avgConfirmationTime 
        ? (Number(data.avgConfirmationTime) / 1000).toFixed(1) + "s"
        : "0.0s",
      costSaved: data.totalJitoRefunded 
        ? Number(data.totalJitoRefunded).toFixed(3) + " SOL"
        : "0.000 SOL",
      totalTransactions: Number(data.totalTransactions).toLocaleString(),
      totalCost: data.totalCost ? Number(data.totalCost).toFixed(3) : "0.000",
      successCount: Number(data.successCount),
      failedCount: Number(data.failedCount),
    };
  }

  async getRoutePerformance(timeWindow: string): Promise<any[]> {
    const timeWindowHours: Record<string, number> = {
      "1h": 1,
      "24h": 24,
      "7d": 24 * 7,
      "30d": 24 * 30,
    };

    const hours = timeWindowHours[timeWindow] || 24;
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const routeStats = await db
      .select({
        routeType: transactionLogs.routeType,
        totalTransactions: count(),
        successCount: sql<number>`COUNT(CASE WHEN ${transactionLogs.status} = 'success' THEN 1 END)`,
        avgConfirmationTime: avg(transactionLogs.confirmationTime),
        totalCost: sum(transactionLogs.cost),
        jitoRefunded: sum(transactionLogs.jitoTipRefunded),
      })
      .from(transactionLogs)
      .where(gte(transactionLogs.createdAt, cutoffTime))
      .groupBy(transactionLogs.routeType);

    return routeStats.map(stat => ({
      route: stat.routeType,
      totalTransactions: Number(stat.totalTransactions),
      successRate: stat.totalTransactions > 0
        ? ((Number(stat.successCount) / Number(stat.totalTransactions)) * 100).toFixed(1)
        : "0.0",
      avgConfirmationTime: stat.avgConfirmationTime 
        ? (Number(stat.avgConfirmationTime) / 1000).toFixed(2)
        : "0.00",
      totalCost: stat.totalCost ? Number(stat.totalCost).toFixed(4) : "0.0000",
      jitoRefunded: stat.jitoRefunded ? Number(stat.jitoRefunded).toFixed(4) : "0.0000",
    }));
  }

  async getTimeSeriesData(timeWindow: string): Promise<any[]> {
    const timeWindowHours: Record<string, number> = {
      "1h": 1,
      "24h": 24,
      "7d": 24 * 7,
      "30d": 24 * 30,
    };

    const hours = timeWindowHours[timeWindow] || 24;
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get hourly aggregates for the time window
    const timeSeriesData = await db
      .select({
        hour: sql<string>`date_trunc('hour', ${transactionLogs.createdAt})`,
        totalTransactions: count(),
        successCount: sql<number>`COUNT(CASE WHEN ${transactionLogs.status} = 'success' THEN 1 END)`,
        avgConfirmationTime: avg(transactionLogs.confirmationTime),
        totalCost: sum(transactionLogs.cost),
      })
      .from(transactionLogs)
      .where(gte(transactionLogs.createdAt, cutoffTime))
      .groupBy(sql`date_trunc('hour', ${transactionLogs.createdAt})`)
      .orderBy(sql`date_trunc('hour', ${transactionLogs.createdAt})`);

    return timeSeriesData.map(data => ({
      time: new Date(data.hour).toISOString(),
      totalTransactions: Number(data.totalTransactions),
      successRate: data.totalTransactions > 0
        ? ((Number(data.successCount) / Number(data.totalTransactions)) * 100).toFixed(1)
        : "0.0",
      avgConfirmationTime: data.avgConfirmationTime 
        ? Number(data.avgConfirmationTime).toFixed(0)
        : "0",
      totalCost: data.totalCost ? Number(data.totalCost).toFixed(4) : "0.0000",
    }));
  }

  // AI Insights
  async getAIInsights(): Promise<AiInsight[]> {
    return await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt)).limit(50);
  }

  async createAIInsight(insight: InsertAiInsight): Promise<AiInsight> {
    const [newInsight] = await db.insert(aiInsights).values(insight).returning();
    return newInsight;
  }

  async applyAIInsight(id: string): Promise<void> {
    await db.update(aiInsights).set({ isApplied: true, appliedAt: new Date() }).where(eq(aiInsights.id, id));
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(100);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async markAlertAsRead(id: string): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  // Alert Rules
  async getAlertRules(): Promise<AlertRule[]> {
    return await db.select().from(alertRules).orderBy(desc(alertRules.createdAt));
  }

  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    const [newRule] = await db.insert(alertRules).values(rule).returning();
    return newRule;
  }

  // Configuration History
  async getConfigurationHistory(): Promise<ConfigurationHistory[]> {
    return await db.select().from(configurationHistory).orderBy(desc(configurationHistory.createdAt)).limit(50);
  }

  async createHistoryEntry(entry: InsertConfigurationHistory): Promise<ConfigurationHistory> {
    const [newEntry] = await db.insert(configurationHistory).values(entry).returning();
    return newEntry;
  }

  // Chat
  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(limit);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  // API Keys
  async getAllActiveApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.isActive, true));
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [newApiKey] = await db.insert(apiKeys).values(apiKey).returning();
    return newApiKey;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  // API Usage
  async createApiUsageLog(log: InsertApiUsageLog): Promise<ApiUsageLog> {
    const [newLog] = await db.insert(apiUsageLogs).values(log).returning();
    return newLog;
  }

  async getApiUsageStats(apiKeyId: string, timeWindow: string): Promise<any> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.getTimeWindowMs(timeWindow));

    const [stats] = await db
      .select({
        totalRequests: count(apiUsageLogs.id),
        avgResponseTime: avg(apiUsageLogs.responseTime),
      })
      .from(apiUsageLogs)
      .where(
        and(
          eq(apiUsageLogs.apiKeyId, apiKeyId),
          gte(apiUsageLogs.createdAt, cutoffTime)
        )
      );

    return {
      totalRequests: Number(stats.totalRequests || 0),
      avgResponseTime: stats.avgResponseTime ? Number(stats.avgResponseTime).toFixed(0) : "0",
    };
  }

  // Benchmarks
  async createBenchmarkRun(run: InsertBenchmarkRun): Promise<BenchmarkRun> {
    const [newRun] = await db.insert(benchmarkRuns).values(run).returning();
    return newRun;
  }

  async getBenchmarkRun(id: string): Promise<BenchmarkRun | undefined> {
    const [run] = await db.select().from(benchmarkRuns).where(eq(benchmarkRuns.id, id));
    return run;
  }

  async getBenchmarkRuns(): Promise<BenchmarkRun[]> {
    return await db.select().from(benchmarkRuns).orderBy(desc(benchmarkRuns.createdAt)).limit(50);
  }

  async updateBenchmarkRun(id: string, updates: Partial<InsertBenchmarkRun> & { completedAt?: string }): Promise<BenchmarkRun> {
    const [updated] = await db
      .update(benchmarkRuns)
      .set(updates as any)
      .where(eq(benchmarkRuns.id, id))
      .returning();
    return updated;
  }

  async createBenchmarkTransaction(tx: InsertBenchmarkTransaction): Promise<BenchmarkTransaction> {
    const [newTx] = await db.insert(benchmarkTransactions).values(tx).returning();
    return newTx;
  }

  async getBenchmarkTransactions(runId: string): Promise<BenchmarkTransaction[]> {
    return await db.select().from(benchmarkTransactions).where(eq(benchmarkTransactions.runId, runId));
  }

  // Benchmark Analytics
  async getBenchmarkAggregatedMetrics(timeWindow: string): Promise<any> {
    const cutoffTime = new Date(Date.now() - this.getTimeWindowMs(timeWindow));

    // Get all completed benchmark runs in time window
    const runs = await db
      .select()
      .from(benchmarkRuns)
      .where(
        and(
          eq(benchmarkRuns.status, 'completed'),
          gte(benchmarkRuns.createdAt, cutoffTime)
        )
      );

    if (runs.length === 0) {
      return {
        totalBenchmarks: 0,
        totalTransactions: 0,
        avgSuccessRate: "0.0",
        avgLatency: "0",
        avgCost: "0.000000000",
        totalCost: "0.000000000",
      };
    }

    // Aggregate metrics from all runs
    const totalBenchmarks = runs.length;
    const totalTransactions = runs.reduce((sum, r) => sum + (r.totalTransactions || 0), 0);
    const totalSuccessful = runs.reduce((sum, r) => sum + (r.successfulTransactions || 0), 0);
    
    // Calculate averages
    const avgSuccessRate = totalTransactions > 0 
      ? ((totalSuccessful / totalTransactions) * 100).toFixed(1)
      : "0.0";
    
    const avgLatency = runs.length > 0
      ? (runs.reduce((sum, r) => sum + parseFloat(r.avgLatency || '0'), 0) / runs.length).toFixed(0)
      : "0";
    
    const avgCost = runs.length > 0
      ? (runs.reduce((sum, r) => sum + parseFloat(r.avgCost || '0'), 0) / runs.length).toFixed(9)
      : "0.000000000";
    
    const totalCost = runs.reduce((sum, r) => sum + parseFloat(r.totalCost || '0'), 0).toFixed(9);

    return {
      totalBenchmarks,
      totalTransactions,
      avgSuccessRate: avgSuccessRate + "%",
      avgLatency: avgLatency + "ms",
      avgCost,
      totalCost,
    };
  }

  async getBenchmarkTimeSeriesData(timeWindow: string): Promise<any[]> {
    const cutoffTime = new Date(Date.now() - this.getTimeWindowMs(timeWindow));

    const runs = await db
      .select()
      .from(benchmarkRuns)
      .where(
        and(
          eq(benchmarkRuns.status, 'completed'),
          gte(benchmarkRuns.createdAt, cutoffTime)
        )
      )
      .orderBy(benchmarkRuns.createdAt);

    return runs.map(run => ({
      timestamp: run.createdAt.toISOString(),
      name: run.name,
      successRate: parseFloat(run.successRate || '0'),
      avgLatency: parseFloat(run.avgLatency || '0'),
      avgCost: parseFloat(run.avgCost || '0'),
      totalTransactions: run.totalTransactions,
    }));
  }

  // Helper method to convert time windows to milliseconds
  private getTimeWindowMs(timeWindow: string): number {
    const windows: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    return windows[timeWindow] || windows['24h'];
  }
}

export const storage = new DatabaseStorage();
