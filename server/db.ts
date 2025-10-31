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
    
    // Check if any table exists by querying information_schema
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('[DB] No tables found, creating tables...');
      
      // Get all SQL CREATE TABLE statements from drizzle-kit
      // We need to use drizzle-kit's introspection or create tables manually
      // For now, let's use a simple approach: try to query a table and catch error
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS session (
          sid VARCHAR NOT NULL COLLATE "default",
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        );
        ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
      `);
      
      console.log('[DB] Basic tables created. Full migration may be needed.');
    } else {
      console.log('[DB] Tables already exist');
    }
  } catch (error: any) {
    console.error('[DB] Error creating tables:', error.message);
    // Don't exit, let the server try to start anyway
  }
}
