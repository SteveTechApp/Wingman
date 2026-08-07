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
  const strict = /^(1|true|yes)$/i.test(String(process.env.WM_CHUNK_BUDGET_STRICT || ""));

  return {
    name: "wingman-chunk-budget",
    generateBundle(_options, bundle) {
      const overLimitChunks: string[] = [];

      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") {
          continue;
        }

        const sizeKb = Buffer.byteLength(output.code, "utf8") / 1024;

        if (sizeKb >= reviewKb) {
          this.warn(`[chunk-budget] ${output.fileName} is ${sizeKb.toFixed(2)} kB (review threshold ${reviewKb} kB).`);
        }

        if (sizeKb >= failKb) {
          overLimitChunks.push(`${output.fileName} ${sizeKb.toFixed(2)} kB`);
        }
      }

      if (overLimitChunks.length === 0) {
        return;
      }

      const report = `[chunk-budget] Chunks exceed the ${failKb} kB target:\n${overLimitChunks
        .map((item) => `- ${item}`)
        .join("\n")}`;

      if (strict) {
        this.error(report);
        return;
      }

      this.warn(`${report}\n[chunk-budget] Reporting only. Set WM_CHUNK_BUDGET_STRICT=true to enforce this target.`);
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
            // The eager application shell. The `$initial` tag captures only the
            // wingman2 modules that are statically reachable from the entry
            // (main.tsx and its static dependency chain). Because this group has
            // the highest priority, those modules are removed from the broad
            // heavy-feature groups below — so an always-on module whose filename
            // happens to contain "compare"/"project"/"template" (e.g. the
            // startup shims, projectStore, its ingest normaliser) can no longer
            // drag an entire multi-hundred-KB feature chunk into the initial
            // modulepreload. The Compare engine, competitor registry, product
            // evidence and project-workflow chunks now load only with the lazy
            // routes that actually use them, cutting the eager JS the dashboard
            // downloads from ~3.1 MB to ~0.47 MB. Verified via the entry HTML's
            // modulepreload set (see the initial:js size budget).
            {
              name: "wm-app-core",
              tags: ["$initial"],
              test: /src[\\/]wingman2[\\/]/,
              priority: 100,
            },
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/,
            },
            {
              name: "vendor-ui",
              test: /node_modules[\\/](@radix-ui|lucide-react|clsx|class-variance-authority)[\\/]/,
            },
            {
              name: "vendor-visual-tools",
              test: /node_modules[\\/](@xyflow|reactflow|dagre)[\\/]/,
            },
            {
              name: "wm-competitor-registry",
              test: /src[\\/]wingman2[\\/]lib[\\/](competitorProductIntelligence|competitorSpecRegistry|knownCompareProfiles|knownWyrestormCompareProfiles)\.tsx?$/,
            },
            {
              name: "wm-compare-engine",
              test: /src[\\/]wingman2[\\/]lib[\\/].*(compare|Compare|competitor|Competitor).*\.tsx?$/,
            },
            {
              name: "wm-compare-ui",
              test: /src[\\/]wingman2[\\/]components[\\/].*(compare|Compare|competitor|Competitor).*\.tsx?$/,
            },
            {
              name: "wm-product-evidence",
              test: /src[\\/]wingman2[\\/](lib|data)[\\/].*(productStory|productPositioning|recommendationEvidence|salesReadiness|wyrestormSkuBusinessStatus|roomTemplates).*\.tsx?$/,
            },
            {
              // Proposal compilation and DOCX authoring are needed only by the
              // lazy project/template workflow. Keep their document runtime and
              // market-story compiler out of the shared project workspace chunk.
              name: "wm-proposal-generation",
              test: /src[\\/]wingman2[\\/]lib[\\/](?:proposalCompiler|proposalDocxExport)\.tsx?$/,
              priority: 20,
            },
            {
              name: "vendor-docx",
              test: /node_modules[\\/]docx[\\/]/,
              priority: 20,
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
