import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Plugin to copy gallery images to assets
    {
      name: 'copy-gallery',
      writeBundle() {
        const sourceDir = path.resolve(import.meta.dirname, "attached_assets");
        const targetDir = path.resolve(import.meta.dirname, "dist/public/assets");
        
        // Ensure target directory exists
        fs.mkdirSync(targetDir, { recursive: true });
        
        // Copy all files from attached_assets to dist/public/assets
        function copyDir(src: string, dest: string) {
          if (!fs.existsSync(src)) return;
          
          const entries = fs.readdirSync(src, { withFileTypes: true });
          
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
              fs.mkdirSync(destPath, { recursive: true });
              copyDir(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          }
        }
        
        copyDir(sourceDir, targetDir);
        console.log('✅ Gallery images copied to dist/public/assets/');
      }
    },
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    },
    port: 3000
  },
});
