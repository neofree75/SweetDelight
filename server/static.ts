import express from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: express.Express) {
  const currentDir = import.meta.dirname || __dirname || process.cwd();
  const distPath = path.resolve(currentDir, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    express.static(distPath)(req, res, next);
  });

  console.log("[static] Serving from dist/public/");

  app.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
