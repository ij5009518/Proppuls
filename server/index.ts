import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAIRoutes } from "./ai";
import { registerBillingRoutes } from "./billing";
import { setupVite, serveStatic, log } from "./vite";
import { authenticateToken } from "./auth";
import * as cron from "node-cron";
import { storage } from "./storage";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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
  const server = await registerRoutes(app);
  registerAIRoutes(app);
  registerBillingRoutes(app);

  // Setup automatic billing cron jobs
  setupBillingCronJobs();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  // Gracefully handle server startup
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please stop any other services running on this port.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      throw err;
    }
  });
  
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();

// Billing automation cron jobs
function setupBillingCronJobs() {
  // Run automatic billing generation daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running daily automatic billing generation...');
      const result = await storage.generateAutomaticBilling();
      
      if (result.generated.length > 0) {
        console.log(`Generated ${result.generated.length} new billing records`);
      }
      
      if (result.updated.length > 0) {
        console.log(`Updated ${result.updated.length} records to overdue status`);
      }
    } catch (error) {
      console.error('Error in automatic billing generation:', error);
    }
  });

  // Run overdue status updates every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('Running overdue status updates...');
      const updatedRecords = await storage.updateOverdueStatuses();
      
      if (updatedRecords.length > 0) {
        console.log(`Updated ${updatedRecords.length} records to overdue status`);
      }
    } catch (error) {
      console.error('Error updating overdue statuses:', error);
    }
  });

  // Run monthly billing generation on the 1st of each month at 3 AM
  cron.schedule('0 3 1 * *', async () => {
    try {
      console.log('Running monthly billing generation...');
      const generatedBillings = await storage.generateMonthlyBilling();
      
      if (generatedBillings.length > 0) {
        console.log(`Generated ${generatedBillings.length} monthly billing records`);
      }
    } catch (error) {
      console.error('Error in monthly billing generation:', error);
    }
  });

  console.log('Billing automation cron jobs setup complete');
}
