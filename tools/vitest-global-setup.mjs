import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Several suites (agent e2e, product-story coverage, catalogue integrity,
// compare real-catalog) spawn the server or read the canonical store, which
// lives at data/wingman-canonical-product-store.json and is deliberately
// gitignored (generated artifact, ~14 MB). CI jobs generate it before
// testing, but `npm test` / `verify:fast` on a FRESH checkout does not - so
// a clean clone used to fail with zero recommended products or ENOENT until
// some other command happened to run data:canonical-products first. This
// vitest globalSetup closes that gap: generate the store once, only when it
// is actually missing, so existing builds stay untouched.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default function ensureCanonicalStore() {
  const store = path.join(root, "data", "wingman-canonical-product-store.json");
  if (existsSync(store)) return;
  console.log("[vitest-global-setup] Canonical product store missing - generating it (one-time).");
  const run = spawnSync("npm", ["run", "data:canonical-products"], { cwd: root, stdio: "inherit" });
  if (run.status !== 0) {
    throw new Error(
      `[vitest-global-setup] data/wingman-canonical-product-store.json is missing and could not be generated ` +
        `(npm run data:canonical-products exited ${run.status}). Run it manually and re-run the tests.`,
    );
  }
}