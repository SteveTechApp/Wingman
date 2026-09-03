import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import { writeJsonFileAtomic } from "./atomic-json-file.mjs";

// Crash-window semantics of writeJsonFileAtomic, pinned deterministically via
// an in-memory node:fs/promises (same mock shape wingman-app-store.test.mjs
// uses). The property that matters is: the TARGET file is only ever replaced
// by the rename - a failure between the temp write and the rename must leave
// the target byte-identical (a plain writeFile would already have truncated
// it), and no *.tmp litter may survive either outcome.
const { makeEnoent } = vi.hoisted(() => ({
  makeEnoent: () => {
    const error = new Error("ENOENT: no such file or directory");
    error.code = "ENOENT";
    return error;
  },
}));

const { files } = vi.hoisted(() => ({ files: new Map() }));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(async (filePath) => {
      const key = String(filePath);
      if (!files.has(key)) throw makeEnoent();
      return files.get(key);
    }),
    writeFile: vi.fn(async (filePath, content) => {
      files.set(String(filePath), String(content));
    }),
    rename: vi.fn(async (from, to) => {
      const key = String(from);
      if (!files.has(key)) throw makeEnoent();
      files.set(String(to), files.get(key));
      files.delete(key);
    }),
    rm: vi.fn(async (filePath) => {
      files.delete(String(filePath));
    }),
    mkdir: vi.fn(async () => undefined),
  },
}));

const TARGET = "data/runtime/audited-file.json";
const tmpKeys = () => [...files.keys()].filter((key) => key.endsWith(".tmp"));

describe("writeJsonFileAtomic crash-atomicity", () => {
  afterEach(() => {
    files.clear();
    vi.mocked(fs.writeFile).mockClear();
    vi.mocked(fs.rename).mockClear();
    vi.mocked(fs.rm).mockClear();
    vi.mocked(fs.mkdir).mockClear();
  });

  it("writes serialized content through a temp file + rename, leaving no .tmp litter", async () => {
    const value = { version: 2, records: { crestron: [{ sku: "TSW-770" }] } };

    await writeJsonFileAtomic(TARGET, value);

    expect(files.get(TARGET)).toBe(JSON.stringify(value, null, 2));
    expect(tmpKeys()).toEqual([]);
    // The rename moved the temp file over the target rather than rewriting it.
    expect(vi.mocked(fs.rename)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fs.writeFile).mock.calls[0][0]).toMatch(/\.tmp$/);
  });

  it("creates the parent directory recursively before writing", async () => {
    await writeJsonFileAtomic(TARGET, { a: 1 });
    expect(vi.mocked(fs.mkdir)).toHaveBeenCalledWith("data/runtime", { recursive: true });
  });

  it("a crash during the temp write leaves the target untouched and cleans the temp file", async () => {
    files.set(TARGET, '{"old":true}');
    const boom = new Error("ENOSPC: no space left on device");
    boom.code = "ENOSPC";
    vi.mocked(fs.writeFile).mockRejectedValueOnce(boom);

    await expect(writeJsonFileAtomic(TARGET, { replacement: "never lands" })).rejects.toThrow("ENOSPC");

    // Target byte-identical - never truncated, never partially overwritten.
    expect(files.get(TARGET)).toBe('{"old":true}');
    // The failed temp write was cleaned up.
    expect(vi.mocked(fs.rm)).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), { force: true });
    expect(tmpKeys()).toEqual([]);
  });

  it("a crash between the temp write and the rename keeps the OLD content (the plain-writeFile failure mode)", async () => {
    files.set(TARGET, '{"old":true}');
    const boom = new Error("EPERM: operation not permitted");
    boom.code = "EPERM";
    vi.mocked(fs.rename).mockRejectedValueOnce(boom);

    await expect(writeJsonFileAtomic(TARGET, { replacement: "staged" })).rejects.toThrow("EPERM");

    // The distinguishing property vs a plain writeFile: the target still holds
    // the old content because replacement only ever happens via the rename.
    expect(files.get(TARGET)).toBe('{"old":true}');
    // The fully-written temp file was removed, not left to confuse a later read.
    expect(vi.mocked(fs.rm)).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), { force: true });
    expect(tmpKeys()).toEqual([]);
  });

  it("rethrows the original error so callers never believe the write landed", async () => {
    const boom = new Error("ENOSPC: no space left on device");
    boom.code = "ENOSPC";
    vi.mocked(fs.writeFile).mockRejectedValueOnce(boom);

    await expect(writeJsonFileAtomic(TARGET, { x: 1 })).rejects.toBe(boom);
    expect(files.has(TARGET)).toBe(false);
  });

  it("replaces existing content atomically on success", async () => {
    files.set(TARGET, '{"old":true}');

    await writeJsonFileAtomic(TARGET, { fresh: [1, 2, 3] });

    expect(files.get(TARGET)).toBe(JSON.stringify({ fresh: [1, 2, 3] }, null, 2));
    expect(tmpKeys()).toEqual([]);
  });
});
