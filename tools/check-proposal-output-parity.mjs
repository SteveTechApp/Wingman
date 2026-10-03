import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "docs", "release-evidence", "proposal-output-parity", "latest");
const generate = spawnSync(process.execPath, [path.join(root, "node_modules/vitest/vitest.mjs"), "run", "src/wingman2/lib/proposalDocxExport.test.ts"], {
  cwd: root, encoding: "utf8", stdio: "inherit", env: { ...process.env, WINGMAN_WRITE_PROPOSAL_PARITY: "1" },
});
if (generate.error) throw generate.error;
if (generate.status !== 0) process.exit(generate.status ?? 1);
const run = spawnSync(process.execPath, [path.join(root, "node_modules/@playwright/test/cli.js"), "test", "e2e/proposal-output-parity.spec.ts", "--project=chromium", "--workers=1", "--retries=0"], {
  cwd: root, encoding: "utf8", stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_HTML_REPORT: "playwright-report/proposal-output-parity" },
});
if (run.error) throw run.error;
if (run.status !== 0) process.exit(run.status ?? 1);

const manifestPath = path.join(outputDir, "manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error(`Proposal parity manifest was not generated: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const missing = Object.values(manifest.artifacts).filter((relativePath) => !fs.existsSync(path.join(outputDir, relativePath)));
if (missing.length) throw new Error(`Proposal parity artifacts are missing: ${missing.join(", ")}`);
for (const [relativePath, minimumBytes] of [["proposal-screen.png", 20_000], ["proposal.docx", 10_000], ["proposal.pdf", 20_000]]) {
  const bytes = fs.statSync(path.join(outputDir, relativePath)).size;
  if (bytes < minimumBytes) throw new Error(`${relativePath} is unexpectedly small (${bytes} bytes)`);
}
console.log(`Proposal output parity PASS: ${manifest.requiredMarkers.length} semantic markers and 3 SKU quantities agree across screen, DOCX and PDF.`);
console.log(`Evidence: ${path.relative(root, outputDir)}`);
