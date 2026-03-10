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
