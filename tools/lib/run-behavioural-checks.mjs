import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

export function runBehaviouralChecks(files) {
  const require = createRequire(import.meta.url);
  const entry = path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs");
  execFileSync(process.execPath, [entry, "run", ...files], { stdio: "inherit" });
}
