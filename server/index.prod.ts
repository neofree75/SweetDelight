/**
 * Produkčný vstupný bod – bez importu ./vite a vite.config.
 * Používa sa len pre esbuild (npm run build / Docker). Pre dev: tsx server/index.ts
 */
import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import multer from "multer";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";

const app = express();

const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!") as any, false);
  },
});
app.locals.upload = upload;

app.use((req, res, next) => {
  const origin = req.get("Origin");
  const defaultOrigins = [
    "https://bakery.erpnext.sk", "http://bakery.erpnext.sk",
    "https://marselabakery.erpnext.sk", "http://marselabakery.erpnext.sk",
    "http://localhost:5001", "http://localhost:3000",
  ];
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : defaultOrigins;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/"))
    console.log(`[api-request] ${req.method} ${req.path} from ${req.get("host")}`);
  next();
});

const sessionStore = MemoryStore(session);
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET)
  throw new Error("SESSION_SECRET environment variable is required in production");

app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-dev-secret-key-change-in-production",
  store: new sessionStore({ checkPeriod: 86400000 }),
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.USE_HTTPS !== "false" && process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "lax",
  },
  name: "sessionId",
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });
  next();
});

(async () => {
  try {
    const { erpNextService } = await import("./erpnext-service");
    const credentialsCheck = await erpNextService.validateCredentials();
    if (!credentialsCheck.valid) {
      log(`❌ ERPNext Configuration Error: ${credentialsCheck.error}`);
      log("⚠️  Server will start but ERPNext integration will not work properly");
    } else log("✅ ERPNext credentials validated successfully");
  } catch (error) {
    log(`⚠️  Could not validate ERPNext credentials: ${error instanceof Error ? error.message : "Unknown"}`);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Unhandled error:", err);
    res.status(status).json({ message });
  });

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/"))
      return res.status(404).json({ error: "API endpoint not found", path: req.path });
    next();
  });

  console.log("[index] Setting up static file serving (production mode)");
  serveStatic(app);

  const port = parseInt(process.env.PORT || "5001", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
