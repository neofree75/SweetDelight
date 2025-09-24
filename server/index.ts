import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Secure CORS configuration with configurable allowlist
app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  // Default allowed origins with environment override
  const defaultOrigins = [
    'https://bakery.erpnext.sk',
    'http://bakery.erpnext.sk', 
    'https://marselabakery.erpnext.sk',
    'http://marselabakery.erpnext.sk',
    'http://localhost:5000',
    'http://localhost:3000'
  ];
  
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : defaultOrigins;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Trust proxy in production (for secure cookies behind CDN/proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session management with secure settings
// WARNING: MemoryStore loses all sessions on server restart!
// In production, consider using Redis or database-backed session store
const sessionStore = MemoryStore(session);
// Enforce strong SESSION_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-dev-secret-key-change-in-production',
  store: new sessionStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  saveUninitialized: false, // Don't save empty sessions
  cookie: {
    secure: process.env.USE_HTTPS !== 'false' && process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Better CSRF protection
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

    console.error('Unhandled error:', err);
    res.status(status).json({ message });
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
