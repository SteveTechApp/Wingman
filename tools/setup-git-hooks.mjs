import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

if (existsSync(".git")) {
  try {
    execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  } catch {
    // Not fatal - e.g. read-only checkout or git unavailable in this environment.
  }
}
