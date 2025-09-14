import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session management with secure settings
const sessionStore = MemoryStore(session);
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-dev-secret-key-change-in-production',
  store: new sessionStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'sessionId' // Custom session cookie name
}));

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
  // Validate ERPNext credentials before starting server
  try {
    const { erpNextService } = await import("./erpnext-service");
    const credentialsCheck = await erpNextService.validateCredentials();
    
    if (!credentialsCheck.valid) {
      log(`❌ ERPNext Configuration Error: ${credentialsCheck.error}`);
      log('⚠️  Server will start but ERPNext integration will not work properly');
      log('💡 Please set the following environment variables:');
      log('   - ERPNEXT_URL: Your ERPNext instance URL');
      log('   - ERPNEXT_API_KEY: Your ERPNext API key');
      log('   - ERPNEXT_API_SECRET: Your ERPNext API secret');
    } else {
      log('✅ ERPNext credentials validated successfully');
    }
  } catch (error) {
    log(`⚠️  Could not validate ERPNext credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const server = await registerRoutes(app);

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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
