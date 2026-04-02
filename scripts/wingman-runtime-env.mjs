import fs from "node:fs";
import path from "node:path";

function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of String(text ?? "").split(/\r?\n/g)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = stripQuotes(line.slice(separator + 1));
    if (key) out[key] = value.replace(/\\n/g, "\n");
  }
  return out;
}

function readDotEnv(rootDir) {
  const dotEnvPath = path.join(rootDir, ".env");
  if (!fs.existsSync(dotEnvPath)) return {};
  try {
    return parseEnvFile(fs.readFileSync(dotEnvPath, "utf8"));
  } catch {
    return {};
  }
}

export function loadWingmanRuntimeEnv(rootDir, overrides = {}) {
  const fileEnv = readDotEnv(rootDir);
  const env = {
    ...fileEnv,
    ...process.env,
    ...overrides,
  };

  const backendHost = String(env.HOST || "127.0.0.1").trim() || "127.0.0.1";
  const backendPort = String(env.PORT || "8787").trim() || "8787";
  const backendBase = `http://${backendHost}:${backendPort}`;

  env.HOST = backendHost;
  env.PORT = backendPort;
  env.VITE_WINGMAN_LOCAL_BACKEND_HOST = String(env.VITE_WINGMAN_LOCAL_BACKEND_HOST || backendHost).trim();
  env.VITE_WINGMAN_LOCAL_BACKEND_PORT = String(env.VITE_WINGMAN_LOCAL_BACKEND_PORT || backendPort).trim();
  env.VITE_COMPETITOR_LOOKUP_ENDPOINT = String(env.VITE_COMPETITOR_LOOKUP_ENDPOINT || `${backendBase}/api/competitor-lookup`).trim();
  env.VITE_COMPETITOR_APPROVAL_ENDPOINT = String(env.VITE_COMPETITOR_APPROVAL_ENDPOINT || `${backendBase}/api/competitor-approvals`).trim();
  env.VITE_PRODUCT_INTELLIGENCE_ENDPOINT = String(env.VITE_PRODUCT_INTELLIGENCE_ENDPOINT || `${backendBase}/api/product-intelligence`).trim();
  env.VITE_PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT = String(env.VITE_PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT || `${backendBase}/api/product-intelligence/health`).trim();
  env.VITE_WINGMAN_API_BASE_URL = String(env.VITE_WINGMAN_API_BASE_URL || `${backendBase}/api/wingman`).trim();
  env.WINGMAN_API_HEALTH_URL = String(env.WINGMAN_API_HEALTH_URL || `${backendBase}/api/health`).trim();
  env.WINGMAN_UI_HOST = String(env.WINGMAN_UI_HOST || "127.0.0.1").trim() || "127.0.0.1";

  return env;
}
