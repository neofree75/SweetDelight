import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const currentDir = import.meta.dirname || __dirname || process.cwd();
      const clientTemplate = path.resolve(
        currentDir,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use __dirname fallback for compatibility
  const currentDir = import.meta.dirname || __dirname || process.cwd();
  const distPath = path.resolve(currentDir, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Serve uploaded files statically
  // In production, PM2 runs with --cwd $APP_DIR, so uploads is in the same directory
  const uploadsPath = process.env.NODE_ENV === 'production' 
    ? path.resolve(process.cwd(), "uploads")
    : path.resolve(currentDir, "..", "uploads");
    
  console.log(`[static] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[static] process.cwd(): ${process.cwd()}`);
  console.log(`[static] uploadsPath: ${uploadsPath}`);
  console.log(`[static] uploadsPath exists: ${fs.existsSync(uploadsPath)}`);
    
  if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath));
    console.log(`[static] Serving uploads from: ${uploadsPath}`);
  } else {
    console.warn(`[static] Uploads directory not found: ${uploadsPath}`);
    // Try alternative paths in production
    if (process.env.NODE_ENV === 'production') {
      const altPaths = [
        path.resolve(process.cwd(), "..", "uploads"),
        path.resolve(process.cwd(), "..", "..", "uploads"),
        path.resolve("/var/www/SweetDelight", "uploads"),
        path.resolve("/home/ubuntu/SweetDelight", "uploads")
      ];
      
      for (const altPath of altPaths) {
        console.log(`[static] Trying alternative path: ${altPath}`);
        if (fs.existsSync(altPath)) {
          app.use('/uploads', express.static(altPath));
          console.log(`[static] Serving uploads from alternative path: ${altPath}`);
          break;
        }
      }
    }
  }

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
