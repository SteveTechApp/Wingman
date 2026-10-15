// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { auditRuntimeReachability } from "./lib/runtime-reachability.mjs";

const roots = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
function fixture(files) {
  const root = mkdtempSync(path.join(tmpdir(), "wingman-reachability-"));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), source);
  }
  return root;
}

it("traces aliases, multiline imports, barrel exports and lazy routes", () => {
  const root = fixture({
    "src/main.tsx": 'import {\n value\n} from "@/barrel"; import("./lazy");',
    "src/barrel.ts": 'export { value } from "./value";',
    "src/value.ts": 'export const value = 1;',
    "src/lazy.tsx": 'export default function Lazy() {}',
  });
  expect(auditRuntimeReachability(root)).toMatchObject({ reachable: 4, orphans: [] });
});

it("flags disconnected UI cycles even when their own tests import them", () => {
  const root = fixture({
    "src/main.tsx": 'export {};',
    "src/components/Old.tsx": 'import "./Child";',
    "src/components/Child.tsx": 'import "./Old";',
    "src/components/Old.test.tsx": 'import "./Old";',
  });
  expect(auditRuntimeReachability(root).orphans).toEqual(["src/components/Child.tsx", "src/components/Old.tsx"]);
});

it("requires a reason for support modules and reports stale exceptions", () => {
  const root = fixture({ "src/main.tsx": 'export {};', "src/audit.ts": 'export {};' });
  expect(auditRuntimeReachability(root, { "src/audit.ts": "" }).orphans).toEqual(["src/audit.ts"]);
  expect(auditRuntimeReachability(root, { "src/audit.ts": "CLI audit entry", "src/gone.ts": "Old" })).toMatchObject({ orphans: [], staleRetentions: ["src/gone.ts"] });
});

it("fails closed when the application entry is missing", () => {
  expect(auditRuntimeReachability(fixture({})).missingEntry).toBe(true);
});
