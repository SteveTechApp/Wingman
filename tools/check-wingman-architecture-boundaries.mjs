import fs from "node:fs";
import path from "node:path";
import { checkWingmanArchitecture, parseMigrationAllowlistJson } from "./lib/wingman-architecture-boundaries.mjs";

const rootDir = process.cwd();
const allowlistPath = path.join(rootDir, "tools", "wingman-architecture-allowlist.json");
const migrationAllowlist = parseMigrationAllowlistJson(fs.readFileSync(allowlistPath, "utf8"));
const violations = checkWingmanArchitecture({ rootDir, migrationAllowlist });

if (violations.length) {
  console.error(`[architecture-boundaries] FAILED with ${violations.length} violation(s):`);
  for (const violation of violations) console.error(`- ${violation.rule}: ${violation.file} — ${violation.detail}`);
  process.exitCode = 1;
} else {
  console.log("[architecture-boundaries] OK. File and feature dependency boundaries hold.");
}

export { checkWingmanArchitecture };
