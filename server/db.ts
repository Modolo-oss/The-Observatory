import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

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

// Add sslmode=require to connection string if not present (needed for Railway)
let connectionString = databaseUrl;
if (!connectionString.includes('sslmode=')) {
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString = `${connectionString}${separator}sslmode=require`;
  console.log('[DB] Added sslmode=require to connection string');
}

// Configure neonConfig to allow self-signed certificates for Railway
if (process.env.NODE_ENV === 'production') {
  neonConfig.fetchConnectionCache = true;
  // Disable SSL certificate validation for Railway
  console.log('[DB] Production mode detected - configuring for Railway compatibility');
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
