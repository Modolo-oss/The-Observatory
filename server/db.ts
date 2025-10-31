import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

// Railway provides multiple database URLs:
// - DATABASE_PRIVATE_URL: For connections within Railway network (RECOMMENDED)
// - DATABASE_PUBLIC_URL: For external IPv4 connections
// - DATABASE_URL: Standard URL (may use IPv6)
const databaseUrl = process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  const errorMessage = [
    "❌ DATABASE_URL is not set!",
    "",
    "📋 SOLUTION:",
    "1. Go to Railway Dashboard",
    "2. Click on your SERVICE (The Observatory app) - NOT the database service",
    "3. Click 'Variables' tab",
    "4. Click 'New Variable'",
    "5. Choose 'Add Variable Reference'",
    "6. Name: DATABASE_PRIVATE_URL (best), DATABASE_PUBLIC_URL, or DATABASE_URL",
    "7. Reference: Select your Database Service → Choose one of the above",
    "8. Save and wait for redeploy",
    "",
    "💡 TIP: DATABASE_PRIVATE_URL is recommended for internal connections!",
    "⚠️  IMPORTANT: Variables must be set at SERVICE level, not PROJECT level!"
  ].join("\n");
  
  console.error(errorMessage);
  throw new Error("DATABASE_PRIVATE_URL, DATABASE_PUBLIC_URL, or DATABASE_URL must be set. See error message above for instructions.");
}

// Log which URL is being used (without exposing the actual URL)
const usedVar = process.env.DATABASE_PRIVATE_URL ? 'DATABASE_PRIVATE_URL' : 
                process.env.DATABASE_PUBLIC_URL ? 'DATABASE_PUBLIC_URL' : 'DATABASE_URL';
console.log(`[DB] Using ${usedVar} for database connection`);

// Configure SSL for Railway PostgreSQL
const isProduction = process.env.NODE_ENV === 'production';
const sslConfig = isProduction ? { rejectUnauthorized: false } : false;

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err, _client) => {
  console.error('[DB] Unexpected error on idle client:', err);
  process.exit(-1);
});

export const db = drizzle({ client: pool, schema });

// Function to create tables if they don't exist (auto-migration)
export async function createTablesIfNotExist() {
  try {
    console.log('[DB] Checking if tables exist...');
    
    // Check if users table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('[DB] No tables found, creating all tables...');
      
      await pool.query(`
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          organization_id TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          last_login_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Session table for express-session
        CREATE TABLE IF NOT EXISTS session (
          sid VARCHAR NOT NULL COLLATE "default",
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL,
          CONSTRAINT session_pkey PRIMARY KEY (sid)
        );
        
        -- Route Configurations
        CREATE TABLE IF NOT EXISTS route_configurations (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          routes JSONB NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Transaction Logs
        CREATE TABLE IF NOT EXISTS transaction_logs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          configuration_id VARCHAR REFERENCES route_configurations(id),
          route_type TEXT NOT NULL,
          route_name TEXT NOT NULL,
          signature TEXT,
          status TEXT NOT NULL,
          confirmation_time INTEGER,
          cost DECIMAL(20, 9),
          jito_tip_refunded DECIMAL(20, 9),
          error_message TEXT,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Analytics Metrics
        CREATE TABLE IF NOT EXISTS analytics_metrics (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          route_type TEXT NOT NULL,
          route_name TEXT NOT NULL,
          time_window TEXT NOT NULL,
          total_transactions INTEGER NOT NULL DEFAULT 0,
          successful_transactions INTEGER NOT NULL DEFAULT 0,
          failed_transactions INTEGER NOT NULL DEFAULT 0,
          avg_confirmation_time DECIMAL(10, 2),
          avg_cost DECIMAL(20, 9),
          total_jito_tip_refunded DECIMAL(20, 9),
          success_rate DECIMAL(5, 2),
          period_start TIMESTAMP NOT NULL,
          period_end TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- AI Insights
        CREATE TABLE IF NOT EXISTS ai_insights (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          severity TEXT NOT NULL,
          confidence_score DECIMAL(3, 2),
          recommendation JSONB,
          is_applied BOOLEAN NOT NULL DEFAULT false,
          applied_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Alerts
        CREATE TABLE IF NOT EXISTS alerts (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          severity TEXT NOT NULL,
          source TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT false,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Alert Rules
        CREATE TABLE IF NOT EXISTS alert_rules (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          metric TEXT NOT NULL,
          condition TEXT NOT NULL,
          threshold DECIMAL(20, 2) NOT NULL,
          route_type TEXT,
          enabled BOOLEAN NOT NULL DEFAULT true,
          webhook_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Configuration History
        CREATE TABLE IF NOT EXISTS configuration_history (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          configuration_id VARCHAR REFERENCES route_configurations(id),
          action TEXT NOT NULL,
          changes_summary TEXT NOT NULL,
          previous_config JSONB,
          new_config JSONB,
          performed_by TEXT NOT NULL DEFAULT 'system',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Chat Messages
        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- API Keys
        CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR REFERENCES users(id) NOT NULL,
          name TEXT NOT NULL,
          key_hash TEXT NOT NULL UNIQUE,
          key_preview TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          rate_limit INTEGER NOT NULL DEFAULT 1000,
          last_used_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- API Usage Logs
        CREATE TABLE IF NOT EXISTS api_usage_logs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          api_key_id VARCHAR REFERENCES api_keys(id) NOT NULL,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          response_time INTEGER,
          ip_address TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Benchmark Runs
        CREATE TABLE IF NOT EXISTS benchmark_runs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR REFERENCES users(id),
          name TEXT,
          total_transactions INTEGER NOT NULL DEFAULT 0,
          successful_transactions INTEGER NOT NULL DEFAULT 0,
          failed_transactions INTEGER NOT NULL DEFAULT 0,
          success_rate DECIMAL(5, 2),
          avg_latency DECIMAL(10, 2),
          min_latency DECIMAL(10, 2),
          max_latency DECIMAL(10, 2),
          avg_cost DECIMAL(20, 9),
          total_cost DECIMAL(20, 9),
          jito_tip_refunded DECIMAL(20, 9),
          status TEXT NOT NULL DEFAULT 'running',
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP
        );
        
        -- Benchmark Transactions
        CREATE TABLE IF NOT EXISTS benchmark_transactions (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          run_id VARCHAR REFERENCES benchmark_runs(id) NOT NULL,
          tx_hash TEXT,
          status TEXT NOT NULL,
          latency_ms INTEGER,
          fee_sol DECIMAL(20, 9),
          jito_tip_refunded DECIMAL(20, 9),
          error_message TEXT,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          confirmed_at TIMESTAMP
        );
      `);
      
      console.log('[DB] ✅ All tables created successfully!');
    } else {
      console.log('[DB] Tables already exist');
    }
  } catch (error: any) {
    console.error('[DB] Error creating tables:', error.message);
    console.error('[DB] Stack:', error.stack);
    // Don't exit, let the server try to start anyway
  }
}
