import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  const errorMessage = [
    "❌ DATABASE_URL is not set!",
    "",
    "📋 SOLUTION:",
    "1. Go to Railway Dashboard",
    "2. Click on your SERVICE (The Observatory app) - NOT the database service",
    "3. Click 'Variables' tab",
    "4. Click 'New Variable'",
    "5. Choose 'Add Variable Reference'",
    "6. Name: DATABASE_URL",
    "7. Reference: Select your Database Service → DATABASE_URL",
    "8. Save and wait for redeploy",
    "",
    "⚠️  IMPORTANT: Variables must be set at SERVICE level, not PROJECT level!"
  ].join("\n");
  
  console.error(errorMessage);
  throw new Error("DATABASE_URL must be set. See error message above for instructions.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
