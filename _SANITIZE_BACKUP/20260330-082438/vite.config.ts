import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function readPackageVersion(): string {
  try {
    const packageJsonPath = path.resolve(rootDir, "package.json");
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
    const version = tidy(parsed.version);
    return version || "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function detectBuildCommit(env: Record<string, string>): string {
  const fromEnv = tidy(
    env.VITE_APP_COMMIT ||
      env.GITHUB_SHA ||
      env.CI_COMMIT_SHA ||
      env.VERCEL_GIT_COMMIT_SHA ||
      env.BITBUCKET_COMMIT ||
      env.BUILD_VCS_NUMBER,
  );
  if (fromEnv) return fromEnv.slice(0, 12);

  try {
    const commit = execSync("git rev-parse --short=12 HEAD", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return tidy(commit) || "local";
  } catch {
    return "local";
  }
}

function detectBuildNumber(env: Record<string, string>): string {
  return tidy(
    env.VITE_BUILD_NUMBER ||
      env.GITHUB_RUN_NUMBER ||
      env.CI_PIPELINE_IID ||
      env.BUILD_BUILDNUMBER ||
      env.BUILD_NUMBER,
  );
}

function normalizeModuleId(id: string): string {
  return id.replace(/\\/g, "/");
}

function manualChunkForModule(id: string): string | undefined {
  const normalized = normalizeModuleId(id);

  if (normalized.includes("/node_modules/pdfjs-dist/")) {
    return "pdf-processing";
  }

  if (
    normalized.includes("/node_modules/mammoth/")
  ) {
    return "mammoth-processing";
  }

  if (
    normalized.includes("/node_modules/jszip/") ||
    normalized.includes("/node_modules/bluebird/") ||
    normalized.includes("/node_modules/underscore/") ||
    normalized.includes("/node_modules/docx/")
  ) {
    return "document-processing";
  }

  if (
    normalized.includes("/src/services/productIntelligenceService.ts") ||
    normalized.includes("/src/services/liveProductDataStore.ts") ||
    normalized.includes("/src/catalog/repository.ts") ||
    normalized.includes("/src/catalog/seedCatalog.ts") ||
    normalized.includes("/src/catalog/recommendationCatalog.ts") ||
    normalized.includes("/src/catalog/workflowCatalog.ts") ||
    normalized.includes("/src/catalog/guruCatalog.ts") ||
    normalized.includes("/src/catalog/serviceRecommendations.ts") ||
    normalized.includes("/src/catalog/boundCatalogue.ts") ||
    normalized.includes("/src/data/sku/") ||
    normalized.includes("/src/data/catalog/competitor-catalog.phase4.json")
  ) {
    return "catalog-intelligence";
  }

  if (
    normalized.includes("/node_modules/react/") ||
    normalized.includes("/node_modules/react-dom/") ||
    normalized.includes("/node_modules/react-router/") ||
    normalized.includes("/node_modules/react-router-dom/") ||
    normalized.includes("/node_modules/scheduler/")
  ) {
    return "react-vendor";
  }

  if (
    normalized.includes("/node_modules/@react-three/") ||
    normalized.includes("/node_modules/three/") ||
    normalized.includes("/node_modules/reactflow/")
  ) {
    return "spatial-vendor";
  }

  if (
    normalized.includes("/node_modules/recharts/") ||
    normalized.includes("/node_modules/d3-")
  ) {
    return "charting-vendor";
  }

  if (normalized.includes("/node_modules/lucide-react/")) {
    return "icon-vendor";
  }

  if (
    normalized.includes("/node_modules/firebase/") ||
    normalized.includes("/node_modules/@supabase/")
  ) {
    return "backend-vendor";
  }

  if (
    normalized.includes("/node_modules/@google/genai/") ||
    normalized.includes("/node_modules/@google/generative-ai/") ||
    normalized.includes("/node_modules/zod/")
  ) {
    return "ai-vendor";
  }

  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const packageVersion = readPackageVersion();
  const version = tidy(env.VITE_APP_VERSION) || packageVersion;
  const buildCommit = detectBuildCommit(env);
  const buildNumber = detectBuildNumber(env);
  const buildDate = tidy(env.VITE_BUILD_DATE) || new Date().toISOString();
  const buildChannel = tidy(env.VITE_BUILD_CHANNEL) || mode;

  return {
    server: { port: 3000, strictPort: true },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            return manualChunkForModule(id);
          },
        },
      },
    },
    define: {
      "process.env": {
        API_KEY: env.API_KEY,
      },
      __APP_VERSION__: JSON.stringify(version),
      __APP_BUILD_COMMIT__: JSON.stringify(buildCommit),
      __APP_BUILD_NUMBER__: JSON.stringify(buildNumber),
      __APP_BUILD_DATE__: JSON.stringify(buildDate),
      __APP_BUILD_CHANNEL__: JSON.stringify(buildChannel),
    },
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
      },
    },
  };
});

