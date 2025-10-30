import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Route Configurations - User-defined transaction routing strategies
export const routeConfigurations = pgTable("route_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  routes: jsonb("routes").notNull().$type<Array<{
    id: string;
    type: 'rpc' | 'jito' | 'sanctum';
    name: string;
    endpoint?: string;
    weight: number;
    enabled: boolean;
  }>>(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transaction Logs - Track all transactions processed through Observatory
export const transactionLogs = pgTable("transaction_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configurationId: varchar("configuration_id").references(() => routeConfigurations.id),
  routeType: text("route_type").notNull(), // 'rpc' | 'jito' | 'sanctum'
  routeName: text("route_name").notNull(),
  signature: text("signature"),
  status: text("status").notNull(), // 'success' | 'failed' | 'pending'
  confirmationTime: integer("confirmation_time"), // in milliseconds
  cost: decimal("cost", { precision: 20, scale: 9 }), // in SOL
  jitoTipRefunded: decimal("jito_tip_refunded", { precision: 20, scale: 9 }), // in SOL
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Analytics Metrics - Pre-aggregated analytics for dashboard
export const analyticsMetrics = pgTable("analytics_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeType: text("route_type").notNull(),
  routeName: text("route_name").notNull(),
  timeWindow: text("time_window").notNull(), // '1h' | '24h' | '7d' | '30d'
  totalTransactions: integer("total_transactions").notNull().default(0),
  successfulTransactions: integer("successful_transactions").notNull().default(0),
  failedTransactions: integer("failed_transactions").notNull().default(0),
  avgConfirmationTime: decimal("avg_confirmation_time", { precision: 10, scale: 2 }),
  avgCost: decimal("avg_cost", { precision: 20, scale: 9 }),
  totalJitoTipRefunded: decimal("total_jito_tip_refunded", { precision: 20, scale: 9 }),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }), // percentage
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI Insights - AI-generated recommendations and analysis
export const aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'recommendation' | 'anomaly' | 'optimization'
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // 'info' | 'warning' | 'critical'
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  recommendation: jsonb("recommendation").$type<{
    action: string;
    expectedImpact: string;
    configuration?: any;
  }>(),
  isApplied: boolean("is_applied").notNull().default(false),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alerts - User-configured alerts and system-generated notifications
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'threshold' | 'anomaly' | 'system'
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull(), // 'info' | 'warning' | 'critical'
  source: text("source").notNull(), // 'user' | 'ai' | 'system'
  isRead: boolean("is_read").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alert Rules - User-defined alert thresholds
export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  metric: text("metric").notNull(), // 'success_rate' | 'avg_cost' | 'confirmation_time'
  condition: text("condition").notNull(), // 'below' | 'above'
  threshold: decimal("threshold", { precision: 20, scale: 2 }).notNull(),
  routeType: text("route_type"), // optional, applies to specific route
  enabled: boolean("enabled").notNull().default(true),
  webhookUrl: text("webhook_url"), // Slack/Discord webhook
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Configuration History - Track all configuration changes
export const configurationHistory = pgTable("configuration_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configurationId: varchar("configuration_id").references(() => routeConfigurations.id),
  action: text("action").notNull(), // 'created' | 'updated' | 'activated' | 'deactivated'
  changesSummary: text("changes_summary").notNull(),
  previousConfig: jsonb("previous_config"),
  newConfig: jsonb("new_config"),
  performedBy: text("performed_by").notNull().default('system'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat Messages - AI chat assistant conversation history
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Users - Authentication and user management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default('user'), // 'user' | 'admin'
  organizationId: text("organization_id"), // For multi-tenant support
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// API Keys - Developer API access tokens
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(), // Friendly name for the key
  keyHash: text("key_hash").notNull().unique(), // Hashed API key (bcrypt) - unique to prevent duplicates
  keyPreview: text("key_preview").notNull(), // First 12 chars for display
  isActive: boolean("is_active").notNull().default(true),
  rateLimit: integer("rate_limit").notNull().default(1000), // Requests per hour
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// API Usage Logs - Track API key usage for analytics
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id).notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(), // 'GET' | 'POST' | 'PUT' | 'DELETE'
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"), // in milliseconds
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Benchmark Runs - Track benchmark test runs
export const benchmarkRuns = pgTable("benchmark_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name"), // Optional descriptive name
  totalTransactions: integer("total_transactions").notNull().default(0),
  successfulTransactions: integer("successful_transactions").notNull().default(0),
  failedTransactions: integer("failed_transactions").notNull().default(0),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }), // percentage (0.00 - 100.00)
  avgLatency: decimal("avg_latency", { precision: 10, scale: 2 }), // in milliseconds
  minLatency: decimal("min_latency", { precision: 10, scale: 2 }),
  maxLatency: decimal("max_latency", { precision: 10, scale: 2 }),
  avgCost: decimal("avg_cost", { precision: 20, scale: 9 }), // in SOL
  totalCost: decimal("total_cost", { precision: 20, scale: 9 }), // in SOL
  jitoTipRefunded: decimal("jito_tip_refunded", { precision: 20, scale: 9 }), // in SOL - Tips refunded by Gateway
  status: text("status").notNull().default('running'), // 'running' | 'completed' | 'failed'
  metadata: jsonb("metadata"), // Store configuration, notes, etc
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Benchmark Transactions - Individual transactions from benchmark runs
export const benchmarkTransactions = pgTable("benchmark_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").references(() => benchmarkRuns.id).notNull(),
  txHash: text("tx_hash"), // Solana transaction signature
  status: text("status").notNull(), // 'success' | 'failed' | 'pending'
  latencyMs: integer("latency_ms"), // confirmation time in milliseconds
  feeSol: decimal("fee_sol", { precision: 20, scale: 9 }), // transaction fee in SOL
  jitoTipRefunded: decimal("jito_tip_refunded", { precision: 20, scale: 9 }), // in SOL - Jito tip refunded by Gateway
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional data (routing info, etc)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

// Insert Schemas
export const insertRouteConfigurationSchema = createInsertSchema(routeConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionLogSchema = createInsertSchema(transactionLogs).omit({
  id: true,
});

export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
});

export const insertConfigurationHistorySchema = createInsertSchema(configurationHistory).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export const insertBenchmarkRunSchema = createInsertSchema(benchmarkRuns).omit({
  id: true,
  createdAt: true,
});

export const insertBenchmarkTransactionSchema = createInsertSchema(benchmarkTransactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type RouteConfiguration = typeof routeConfigurations.$inferSelect;
export type InsertRouteConfiguration = z.infer<typeof insertRouteConfigurationSchema>;

export type TransactionLog = typeof transactionLogs.$inferSelect;
export type InsertTransactionLog = z.infer<typeof insertTransactionLogSchema>;

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;

export type ConfigurationHistory = typeof configurationHistory.$inferSelect;
export type InsertConfigurationHistory = z.infer<typeof insertConfigurationHistorySchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;

export type BenchmarkRun = typeof benchmarkRuns.$inferSelect;
export type InsertBenchmarkRun = z.infer<typeof insertBenchmarkRunSchema>;

export type BenchmarkTransaction = typeof benchmarkTransactions.$inferSelect;
export type InsertBenchmarkTransaction = z.infer<typeof insertBenchmarkTransactionSchema>;
