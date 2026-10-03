import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectClaims, extractClaims, findPortCollisions } from "./check-spawn-port-collisions.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// A spawn-based e2e suite must import node:child_process for the capability
// gate; without it, port literals are treated as inert fixture content.
const SPAWN_HEADER = 'import { spawn } from "node:child_process";\n';

function makeSandbox(files) {
  const root = mkdtempSync(path.join(tmpdir(), "spawn-port-collisions-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe("extractClaims", () => {
  it("claims plain port-named constants", () => {
    const claims = extractClaims("const PORT = 8877;\nconst NEG_PORT = 8878;\n");
    expect([...claims.keys()].sort()).toEqual([8877, 8878]);
  });

  it("claims env-defaulted constants", () => {
    const claims = extractClaims(
      "const API_PORT = Number(process.env.E2E_SMOKE_API_PORT || 8892);\nconst port = Number(process.env.X || 4177);\n",
    );
    expect([...claims.keys()].sort()).toEqual([4177, 8892]);
  });

  it("claims literal listen() and --port flags", () => {
    const claims = extractClaims("server.listen(8898, HOST);\nvite preview --port 4177\n");
    expect([...claims.keys()].sort()).toEqual([4177, 8898]);
  });

  it("claims literal PORT env entries but never WINGMAN_UI_PORT", () => {
    const src =
      'PORT: "8876",\nWINGMAN_UI_PORT: "3996", // CORS origin only - never bound\n';
    const claims = extractClaims(src);
    expect([...claims.keys()]).toEqual([8876]);
  });

  it("ignores comments that name other suites' ports", () => {
    const src = `const PORT = 8879; // distinct from 413 e2e (8876), agents e2e (8877/8878), api-contract-check (8898), check:workflow (8899)`;
    const claims = extractClaims(src);
    expect([...claims.keys()]).toEqual([8879]);
  });

  it("ignores ephemeral listen(0)", () => {
    const claims = extractClaims('server.listen(0, "127.0.0.1", () => {})');
    expect(claims.size).toBe(0);
  });

  it("ignores out-of-range numbers", () => {
    const claims = extractClaims("const PORT = 80;\nconst TIMEOUT = 30;\n");
    expect(claims.size).toBe(0);
  });

  it("strips block comments spanning lines", () => {
    const src = `/*
     * comment naming 8876 and 8877 across lines
     */
const PORT = 8879;`;
    const claims = extractClaims(src);
    expect([...claims.keys()]).toEqual([8879]);
  });
});

describe("collectClaims capability gate", () => {
  it("treats port literals in non-spawn files as inert", () => {
    const root = makeSandbox({
      // Not spawn-capable: the literal is fixture content, not a bind.
      "tools/helper.mjs": "export const PORT = 8876; // no spawn here\n",
      "server/one.e2e.test.mjs": `${SPAWN_HEADER}const PORT = 8876;\n`,
    });
    try {
      const byFile = collectClaims(root);
      expect([...byFile.keys()]).toEqual(["server/one.e2e.test.mjs"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("findPortCollisions", () => {
  it("flags one port claimed by two files", () => {
    const root = makeSandbox({
      "server/one.e2e.test.mjs": `${SPAWN_HEADER}const PORT = 8876;\n`,
      "server/two.e2e.test.mjs": `${SPAWN_HEADER}const PORT = 8876;\n`,
    });
    try {
      const { collisions, reservedConflicts } = findPortCollisions(root);
      expect(reservedConflicts).toEqual([]);
      expect(collisions).toHaveLength(1);
      expect(collisions[0].port).toBe(8876);
      expect(collisions[0].owners.sort()).toEqual([
        "server/one.e2e.test.mjs",
        "server/two.e2e.test.mjs",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not flag the same port twice within one file", () => {
    const root = makeSandbox({
      "server/one.e2e.test.mjs": `${SPAWN_HEADER}const PORT = 8876;\nconst BASE = \`http://127.0.0.1:\${PORT}\`;\n`,
    });
    try {
      const { collisions } = findPortCollisions(root);
      expect(collisions).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores shared WINGMAN_UI_PORT config values", () => {
    const root = makeSandbox({
      "server/one.e2e.test.mjs": `${SPAWN_HEADER}WINGMAN_UI_PORT: "3996",\nconst PORT = 8876;\n`,
      "server/two.e2e.test.mjs": `${SPAWN_HEADER}WINGMAN_UI_PORT: "3996",\nconst PORT = 8877;\n`,
    });
    try {
      const { collisions } = findPortCollisions(root);
      expect(collisions).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags reserved dev ports claimed by a test file", () => {
    const root = makeSandbox({
      "server/one.e2e.test.mjs": `${SPAWN_HEADER}const PORT = 8787;\n`,
    });
    try {
      const { reservedConflicts } = findPortCollisions(root);
      expect(reservedConflicts).toHaveLength(1);
      expect(reservedConflicts[0]).toMatchObject({ port: 8787, file: "server/one.e2e.test.mjs" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("catches a collision where one owner defaults its port via env", () => {
    const root = makeSandbox({
      "server/one.e2e.test.mjs": `${SPAWN_HEADER}const API_PORT = Number(process.env.FOO_API_PORT || 8892);\n`,
      "tools/e2e-other-check.mjs": `${SPAWN_HEADER}const API_PORT = Number(process.env.BAR_API_PORT || 8892);\n`,
    });
    try {
      const { collisions } = findPortCollisions(root);
      expect(collisions).toHaveLength(1);
      expect(collisions[0].port).toBe(8892);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("real tree posture", () => {
  it("reports no fixed-port collisions across every spawn-based suite and tool", () => {
    const { collisions, reservedConflicts } = findPortCollisions(REPO_ROOT);
    expect(collisions, JSON.stringify(collisions, null, 2)).toEqual([]);
    expect(reservedConflicts, JSON.stringify(reservedConflicts, null, 2)).toEqual([]);
  });
});
