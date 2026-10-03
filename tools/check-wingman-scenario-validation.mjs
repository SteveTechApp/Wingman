import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const scriptPath = path.join(ROOT, "tools", "check-wingman-recommendation-scenarios.mjs");

const result = spawnSync(process.execPath, [scriptPath], {
  cwd: ROOT,
  stdio: "inherit",
  shell: false
});

if (result.error) {
  console.error(`[wingman-scenarios] Failed to run recommendation scenario validation: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("");
console.log("[wingman-scenarios] Delegated scenario validation to recommendation scenario contract.");