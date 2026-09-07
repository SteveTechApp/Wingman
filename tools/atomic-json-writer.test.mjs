import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { atomicWriteJson, atomicWriteJsonSync } from "./lib/atomic-json-writer.mjs";

function tempDir() {
  return mkdtempSync(join(tmpdir(), "atomic-json-writer-"));
}

const SAMPLE = { version: "1", items: [1, 2, { ok: true }] };

describe("atomicWriteJsonSync", () => {
  it("writes canonical pretty JSON with trailing newline", () => {
    const dir = tempDir();
    const target = join(dir, "out.json");
    atomicWriteJsonSync(target, SAMPLE);
    expect(readFileSync(target, "utf8")).toBe(`${JSON.stringify(SAMPLE, null, 2)}\n`);
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the parent directory when missing", () => {
    const dir = tempDir();
    const target = join(dir, "nested", "deep", "out.json");
    atomicWriteJsonSync(target, SAMPLE);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(SAMPLE);
    rmSync(dir, { recursive: true, force: true });
  });

  it("replaces an existing file atomically (old content never half-visible)", () => {
    const dir = tempDir();
    const target = join(dir, "out.json");
    writeFileSync(target, "OLD");
    atomicWriteJsonSync(target, SAMPLE);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(SAMPLE);
    rmSync(dir, { recursive: true, force: true });
  });

  it("leaves no temp files behind and preserves the old file on failure", () => {
    const dir = tempDir();
    const target = join(dir, "out.json");
    writeFileSync(target, "OLD");
    // A value that cannot be serialized makes the write throw.
    const cyclic = {};
    cyclic.self = cyclic;
    expect(() => atomicWriteJsonSync(target, cyclic)).toThrow();
    expect(readFileSync(target, "utf8")).toBe("OLD");
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("atomicWriteJson (async)", () => {
  it("writes canonical pretty JSON with trailing newline", async () => {
    const dir = tempDir();
    const target = join(dir, "out.json");
    await atomicWriteJson(target, SAMPLE);
    expect(readFileSync(target, "utf8")).toBe(`${JSON.stringify(SAMPLE, null, 2)}\n`);
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the parent directory when missing", async () => {
    const dir = tempDir();
    const target = join(dir, "a", "b", "c", "out.json");
    await atomicWriteJson(target, SAMPLE);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(SAMPLE);
    rmSync(dir, { recursive: true, force: true });
  });

  it("preserves the old file and cleans up on failure", async () => {
    const dir = tempDir();
    const target = join(dir, "out.json");
    writeFileSync(target, "OLD");
    const cyclic = {};
    cyclic.self = cyclic;
    await expect(atomicWriteJson(target, cyclic)).rejects.toThrow();
    expect(readFileSync(target, "utf8")).toBe("OLD");
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("format lockstep", () => {
  it("sync and async variants byte-match each other", async () => {
    const dir = tempDir();
    const syncTarget = join(dir, "sync.json");
    const asyncTarget = join(dir, "async.json");
    atomicWriteJsonSync(syncTarget, SAMPLE);
    await atomicWriteJson(asyncTarget, SAMPLE);
    expect(readFileSync(asyncTarget, "utf8")).toBe(readFileSync(syncTarget, "utf8"));
    rmSync(dir, { recursive: true, force: true });
  });
});