import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadWingmanRuntimeEnv } from "./wingman-runtime-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

Object.assign(process.env, loadWingmanRuntimeEnv(rootDir));

await import(pathToFileURL(path.join(rootDir, "server", "competitor-lookup-server.mjs")).href);
