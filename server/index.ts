import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { transactionSimulator } from "./simulator";
import { storage } from "./storage";
import { alertMonitor } from "./services/alert-monitor";
import { AutoPilot } from "./services/auto-pilot";
import { pool } from "./db";
import bcrypt from "bcrypt";
import type { InsertUser } from "@shared/schema";

// Initialize Auto-Pilot service
export const autoPilot = new AutoPilot(storage);

const app = express();

// Trust proxy for Railway (required for rate limiting behind proxy)
app.set('trust proxy', 1);

// Session store using PostgreSQL
const PgSession = connectPgSimple(session);

// Session middleware
app.use(
  session({
    store: new PgSession({
      pool: pool as any,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET environment variable must be set in production!');
      }
      console.warn('[SECURITY WARNING] Using fallback session secret. Set SESSION_SECRET environment variable.');
      return 'observatory-dev-secret-change-for-production';
    })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Check required environment variables early
    if (!process.env.DATABASE_URL) {
      log("[FATAL] DATABASE_URL is not set!");
      log("[FATAL] Please go to Railway Dashboard → Service → Variables");
      log("[FATAL] Add Variable Reference: Name=DATABASE_URL, Reference=Database Service → DATABASE_URL");
      process.exit(1);
    }

    if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
      log("[FATAL] SESSION_SECRET is not set in production!");
      log("[FATAL] Please add SESSION_SECRET in Railway Variables");
      process.exit(1);
    }

    log("[Server] Environment variables OK, starting server...");
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      let message = err.message || "Internal Server Error";
      
      // Handle Node.js URL errors more gracefully
      if (message.includes("Invalid URL") || err.code === "ERR_INVALID_URL") {
        message = `Invalid URL configuration: ${err.message || "Check environment variables"}`;
      }

      console.error("[Error Handler]", {
        status,
        message,
        code: err.code,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });

      res.status(status).json({ error: message });
      // Don't re-throw in production to prevent crashes
      if (process.env.NODE_ENV !== "production") {
        throw err;
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Create default admin account for easy judge/demo access
    setTimeout(async () => {
      try {
        const adminEmail = "admin@observatory.dev";
        const adminPassword = "Observatory2024!";
        
        try {
          const existingAdmin = await storage.getUserByEmail(adminEmail);
          
          if (!existingAdmin) {
            log("[Server] Creating default admin account...");
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            const adminUser: InsertUser = {
              email: adminEmail,
              passwordHash,
              name: "Observatory Admin",
              role: "admin",
              isActive: true,
            };
            await storage.createUser(adminUser);
            log("[Server] ✅ Default admin account created!");
            log(`[Server] Email: ${adminEmail}`);
            log(`[Server] Password: ${adminPassword}`);
          } else {
            log("[Server] Default admin account already exists");
            log(`[Server] Login with: ${adminEmail} / ${adminPassword}`);
          }
        } catch (dbError: any) {
          log(`[Server] Database error creating admin: ${dbError.message || dbError}`);
          log(`[Server] ⚠️  Admin account not created. You can register at /auth/register`);
        }
      } catch (error: any) {
        log(`[Server] Error in admin account setup: ${error.message || error}`);
        log(`[Server] ⚠️  Please register manually at /auth/register`);
      }
    }, 2000); // Increased delay to ensure database is ready
    
    // Initialize transaction simulator and alert monitoring
    setTimeout(async () => {
      try {
        // Check if simulator is enabled (default: false for cost control)
        const enableSimulator = process.env.ENABLE_SIMULATOR === "true";
        const simulatorInterval = parseInt(process.env.SIMULATOR_INTERVAL || "30000", 10);
        
        log("[Server] Checking for existing transactions...");
        const recentTx = await storage.getRecentTransactions(1);
        
        // Generate historical data only if no transactions exist
        if (recentTx.length === 0) {
          log("[Server] No transactions found, generating historical data...");
          await transactionSimulator.generateHistoricalData();
          log("[Server] Historical data generated!");
        } else {
          log("[Server] Transactions already exist, skipping historical generation");
        }
        
        // Start continuous simulation only if enabled
        if (enableSimulator) {
          transactionSimulator.start(simulatorInterval);
          log(`[Server] Transaction simulator ENABLED (interval: ${simulatorInterval}ms)`);
          log("[Server] WARNING: Simulator is generating transactions - this may incur costs if using real Sanctum API");
        } else {
          log("[Server] Transaction simulator DISABLED (set ENABLE_SIMULATOR=true to enable)");
          log("[Server] Transactions will only be created via Public API or manual submission");
        }
        
        // Start alert monitoring
        alertMonitor.start(60000); // Check every minute
        log("[Server] Alert monitor started");
      } catch (error) {
        log(`[Server] Error initializing simulator: ${error}`);
      }
    }, 3000);
  });
  } catch (error: any) {
    log(`[FATAL] Server startup failed: ${error.message || error}`);
    if (error.stack) {
      log(`[FATAL] Stack: ${error.stack}`);
    }
    log("[FATAL] Please check Railway logs for details");
    process.exit(1);
  }
})();

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: any) => {
  log(`[FATAL] Unhandled rejection: ${error.message || error}`);
  if (error.stack) {
    log(`[FATAL] Stack: ${error.stack}`);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`[FATAL] Uncaught exception: ${error.message}`);
  log(`[FATAL] Stack: ${error.stack}`);
  process.exit(1);
});
