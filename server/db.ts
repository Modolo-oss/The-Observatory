import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

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
