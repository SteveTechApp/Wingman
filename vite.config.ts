import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendHost = String(process.env.VITE_WINGMAN_LOCAL_BACKEND_HOST || "127.0.0.1").trim();
// Deliberately does NOT fall back to the generic process.env.PORT: the backend server
// (server/competitor-lookup-server.mjs) also reads PORT for its own bind address, and
// dev launchers commonly set PORT to the frontend's own port. Trusting PORT here made
// the API proxy target itself whenever both conventions collided (see PORT usage below).
const parsedBackendPort = Number(process.env.VITE_WINGMAN_LOCAL_BACKEND_PORT || 8787);
const backendPort = Number.isFinite(parsedBackendPort) ? parsedBackendPort : 8787;
const apiProxyTarget = String(process.env.VITE_API_PROXY_TARGET || `http://${backendHost}:${backendPort}`).trim();

const serverHost = String(process.env.VITE_SERVER_HOST || process.env.WINGMAN_UI_HOST || "127.0.0.1").trim();
const parsedUiPort = Number(process.env.WINGMAN_UI_PORT || process.env.VITE_WINGMAN_UI_PORT || 3000);
const uiPort = Number.isFinite(parsedUiPort) ? parsedUiPort : 3000;

function wingmanChunkBudget(): Plugin {
  const reviewKb = Number(process.env.WM_CHUNK_REVIEW_KB ?? 500);
  const failKb = Number(process.env.WM_CHUNK_FAIL_KB ?? 850);

  return {
    name: "wingman-chunk-budget",
    generateBundle(_options, bundle) {
      const failingChunks: string[] = [];

      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") {
          continue;
        }

        const sizeKb = Buffer.byteLength(output.code, "utf8") / 1024;

        if (sizeKb >= reviewKb) {
          this.warn(`[chunk-budget] ${output.fileName} is ${sizeKb.toFixed(2)} kB (review threshold ${reviewKb} kB).`);
        }

        if (sizeKb >= failKb) {
          failingChunks.push(`${output.fileName} ${sizeKb.toFixed(2)} kB`);
        }
      }

      if (failingChunks.length > 0) {
        this.error(
          `[chunk-budget] Chunks exceed the ${failKb} kB limit:\n${failingChunks.map((item) => `- ${item}`).join("\n")}`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), wingmanChunkBudget()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 850,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/,
            },
            {
              name: "vendor-ui",
              test: /node_modules[\\/](@radix-ui|lucide-react|clsx|class-variance-authority)[\\/]/,
            },
            {
              name: "vendor-document-tools",
              test: /node_modules[\\/](pdfjs-dist|mammoth|jszip)[\\/]/,
            },
            {
              name: "vendor-visual-tools",
              test: /node_modules[\\/](@xyflow|reactflow|dagre)[\\/]/,
            },
            {
              name: "wm-compare-engine",
              test: /src[\\/]wingman2[\\/](lib|components)[\\/].*(compare|Compare|competitor|Competitor).*\.tsx?$/,
            },
            {
              name: "wm-product-evidence",
              test: /src[\\/]wingman2[\\/](lib|data)[\\/].*(productStory|productPositioning|recommendationEvidence|salesReadiness|wyrestormSkuBusinessStatus|roomTemplates).*\.tsx?$/,
            },
            {
              name: "wm-project-workflow",
              test: /src[\\/]wingman2[\\/](data|lib|components)[\\/].*(project|Project|proposal|Proposal|template|Template).*\.tsx?$/,
            },
          ],
        },
      },
    },
  },
  server: {
    host: serverHost,
    port: uiPort,
    strictPort: false,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: false,
        secure: false,
      },
    },
  },
  preview: {
    host: serverHost,
    port: uiPort,
    strictPort: false,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: false,
        secure: false,
      },
    },
  },
});
