import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkWingmanArchitecture, parseMigrationAllowlistJson } from "./wingman-architecture-boundaries.mjs";

const roots = [];
function fixture(files) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-architecture-"));
  roots.push(rootDir);
  for (const [file, source] of Object.entries(files)) {
    const absolute = path.join(rootDir, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, source);
  }
  return rootDir;
}
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

describe("checkWingmanArchitecture", () => {
  it("accepts 1,200 lines and rejects 1,201 lines", () => {
    const rootDir = fixture({
      "src/wingman2/data/boundary.ts": Array(1200).fill("export const value = 1;").join("\n"),
      "src/wingman2/data/huge.ts": Array(1201).fill("export const value = 1;").join("\n"),
    });
    expect(checkWingmanArchitecture({ rootDir })).toEqual([
      expect.objectContaining({ rule: "max-file-lines", file: "src/wingman2/data/huge.ts" }),
    ]);
  });

  it("accepts 400 page lines and rejects 401 page lines", () => {
    const rootDir = fixture({
      "src/wingman2/pages/BoundaryPage.tsx": Array(400).fill("export const value = 1;").join("\n"),
      "src/wingman2/pages/ExamplePage.tsx": Array(401).fill("export const value = 1;").join("\n"),
    });
    expect(checkWingmanArchitecture({ rootDir })).toEqual([
      expect.objectContaining({ rule: "page-entry-lines", file: "src/wingman2/pages/ExamplePage.tsx" }),
    ]);
  });

  it("counts CRLF files without treating the terminal newline as another line", () => {
    const rootDir = fixture({ "src/wingman2/pages/WindowsPage.tsx": `${Array(400).fill("export const value = 1;").join("\r\n")}\r\n` });
    expect(checkWingmanArchitecture({ rootDir })).toEqual([]);
  });

  it("rejects private cross-feature imports but permits public APIs", () => {
    const rootDir = fixture({
      "src/wingman2/features/orders/view.ts": 'import { secret } from "../catalog/private/secret";\nimport { catalog } from "../catalog";',
    });
    const violations = checkWingmanArchitecture({ rootDir });
    expect(violations.filter((item) => item.rule === "private-cross-feature-import")).toHaveLength(1);
  });

  it("recognises extensionless root and index imports as public feature APIs", () => {
    const rootDir = fixture({
      "src/wingman2/features/orders/view.ts": 'import { a } from "../catalog";\nimport { b } from "../billing/index";',
    });
    expect(checkWingmanArchitecture({ rootDir })).toEqual([]);
  });

  it("rejects app-core imports from feature internals but permits public APIs", () => {
    const rootDir = fixture({
      "src/wingman2/app/router.ts": 'import { secret } from "../features/orders/private/secret";\nimport { orders } from "../features/orders";',
    });
    const violations = checkWingmanArchitecture({ rootDir });
    expect(violations.filter((item) => item.rule === "app-core-imports-feature-private")).toHaveLength(1);
  });

  it("scans import type, re-exports, multiline imports, aliases, and dynamic imports", () => {
    const rootDir = fixture({
      "src/wingman2/app/router.ts": [
        'import type { A } from "../features/alpha/private/types";',
        'export { b } from "../features/beta/private/value";',
        'import {\n c\n} from "@/wingman2/features/gamma/private/value";',
        'const lazy = import("../features/delta/private/view");',
      ].join("\n"),
    });
    expect(checkWingmanArchitecture({ rootDir }).filter((item) => item.rule === "app-core-imports-feature-private")).toHaveLength(4);
  });

  it("scans dynamic imports across feature boundaries", () => {
    const rootDir = fixture({ "src/wingman2/features/orders/view.ts": 'const lazy = import("../catalog/private/secret");' });
    expect(checkWingmanArchitecture({ rootDir })).toEqual([
      expect.objectContaining({ rule: "private-cross-feature-import" }),
    ]);
  });

  it("allows recorded debt only up to its line ceiling", () => {
    const file = "src/wingman2/pages/DiscoveryPage.tsx";
    const rootDir = fixture({ [file]: Array(402).fill("export const value = 1;").join("\n") });
    const migrationAllowlist = { violations: { [`page-entry-lines:${file}`]: { maxLines: 401 } } };
    expect(checkWingmanArchitecture({ rootDir, migrationAllowlist })).toEqual([
      expect.objectContaining({ rule: "page-entry-lines", file }),
    ]);
  });

  it("allows active recorded debt at its ceiling", () => {
    const file = "src/wingman2/pages/DiscoveryPage.tsx";
    const rootDir = fixture({ [file]: Array(401).fill("export const value = 1;").join("\n") });
    const migrationAllowlist = { violations: { [`page-entry-lines:${file}`]: { maxLines: 401 } } };
    expect(checkWingmanArchitecture({ rootDir, migrationAllowlist })).toEqual([]);
  });

  it("fails stale allowlist entries for missing and repaired files", () => {
    const missing = "src/wingman2/pages/DiscoveryPage.tsx";
    const repaired = "src/wingman2/pages/ProfilePage.tsx";
    const rootDir = fixture({ [repaired]: "export const ProfilePage = () => null;" });
    const migrationAllowlist = { violations: {
      [`page-entry-lines:${missing}`]: { maxLines: 1809 },
      [`page-entry-lines:${repaired}`]: { maxLines: 519 },
    } };
    expect(checkWingmanArchitecture({ rootDir, migrationAllowlist }).filter((item) => item.rule === "migration-allowlist-stale")).toHaveLength(2);
  });

  it("rejects additions to the migration allowlist", () => {
    const rootDir = fixture({});
    const migrationAllowlist = { violations: { "page-entry-lines:src/wingman2/pages/NewPage.tsx": { maxLines: 999 } } };
    expect(checkWingmanArchitecture({ rootDir, migrationAllowlist })).toEqual([
      expect.objectContaining({ rule: "migration-allowlist-addition" }),
    ]);
  });

  it("validates duplicate keys, unknown rules, and missing ceilings", () => {
    const parsed = parseMigrationAllowlistJson(`{
      "violations": {
        "mystery:src/wingman2/pages/X.tsx": {},
        "mystery:src/wingman2/pages/X.tsx": { "maxLines": 2 }
      }
    }`);
    const rules = checkWingmanArchitecture({ rootDir: fixture({}), migrationAllowlist: parsed }).map((item) => item.rule);
    expect(rules).toEqual(expect.arrayContaining([
      "migration-allowlist-addition",
      "migration-allowlist-duplicate",
      "migration-allowlist-unknown-rule",
    ]));

    const missingCeiling = { violations: { "page-entry-lines:src/wingman2/pages/DiscoveryPage.tsx": {} } };
    expect(checkWingmanArchitecture({ rootDir: fixture({}), migrationAllowlist: missingCeiling }).map((item) => item.rule)).toContain("migration-allowlist-invalid-ceiling");
  });

  it("returns violations in deterministic rule/file/detail order", () => {
    const rootDir = fixture({
      "src/wingman2/pages/ZPage.tsx": Array(401).fill("x").join("\n"),
      "src/wingman2/pages/APage.tsx": Array(401).fill("x").join("\n"),
      "src/wingman2/app/router.ts": 'import "../features/z/private";',
    });
    const result = checkWingmanArchitecture({ rootDir });
    expect(result).toEqual([...result].sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file) || a.detail.localeCompare(b.detail)));
  });
});
