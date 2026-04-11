import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendPort = Number(process.env.VITE_WINGMAN_LOCAL_BACKEND_PORT || process.env.PORT || 8787);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: false,
        secure: false,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: false,
        secure: false,
      },
    },
  },
});