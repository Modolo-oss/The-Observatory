import { defineConfig } from "drizzle-kit";

// Try DATABASE_PRIVATE_URL first, then fallback to others
const databaseUrl = process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_PRIVATE_URL, DATABASE_PUBLIC_URL, or DATABASE_URL must be set. Ensure the database is provisioned.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
