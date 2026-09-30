import { describe, expect, it } from "vitest";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { deterministicGeneratedAt, inputsHashOf, writeDeterministicArtifactPair } from "./deterministic-artifact-writer.mjs";

function sandbox() {
  const dir = fsSync.mkdtempSync(path.join(os.tmpdir(), "det-artifact-"));
  return {
    dir,
    jsonPath: path.join(dir, "report.json"),
    markdownPath: path.join(dir, "report.md"),
  };
}

function payloadOf(generatedAt, status = "passed") {
  return { generatedAt, status, passed: ["a-check"], warnings: [], errors: [] };
}

function markdownOf(generatedAt, status = "passed") {
  return `# Report\n\nGenerated: ${generatedAt}\n\nStatus: **${status.toUpperCase()}**\n`;
}

describe("deterministic artifact writer", () => {
  it("refuses wall-clock timestamps - that is the churn being guarded against", () => {
    expect(() => deterministicGeneratedAt({})).toThrow(/wall-clock/);
    expect(() => deterministicGeneratedAt({ inputsHash: "", measuredAt: "" })).toThrow(/wall-clock/);
  });

  it("derives the timestamp from the inputs hash (first 12 hex chars)", () => {
    const hash = inputsHashOf("alpha-bytes", "beta-bytes");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(deterministicGeneratedAt({ inputsHash: hash })).toBe(`input-${hash.slice(0, 12)}`);
  });

  it("falls back to a caller-measured date (never the clock)", () => {
    expect(deterministicGeneratedAt({ measuredAt: "2026-09-30" })).toBe("2026-09-30");
  });

  it("produces identical bytes for identical inputs on every call", () => {
    const a = inputsHashOf("same", "bytes");
    const b = inputsHashOf("same", "bytes");
    expect(a).toBe(b);
    expect(deterministicGeneratedAt({ inputsHash: a })).toBe(deterministicGeneratedAt({ inputsHash: b }));
  });

  it("changes the hash when any input byte changes", () => {
    expect(inputsHashOf("data-v1")).not.toBe(inputsHashOf("data-v2"));
    expect(inputsHashOf("data", "csv-v1")).not.toBe(inputsHashOf("data", "csv-v2"));
  });

  it("writes on first run, then writes NOTHING on an identical rerun", () => {
    const { jsonPath, markdownPath } = sandbox();
    const hash = inputsHashOf("inputs-v1");
    const payload = payloadOf(deterministicGeneratedAt({ inputsHash: hash }), "passed");
    const markdown = markdownOf(payload.generatedAt, "passed");

    const first = writeDeterministicArtifactPair({ jsonPath, markdownPath, payload, markdown });
    expect(first.changed).toBe(true);
    expect(first.wroteJson).toBe(true);
    expect(first.wroteMarkdown).toBe(true);

    const jsonAfterFirst = fsSync.readFileSync(jsonPath, "utf8");
    const jsonMtime = fsSync.statSync(jsonPath).mtimeMs;

    const second = writeDeterministicArtifactPair({ jsonPath, markdownPath, payload, markdown });
    expect(second.changed).toBe(false);
    expect(second.wroteJson).toBe(false);
    expect(second.wroteMarkdown).toBe(false);
    // mtime untouched proves the file was not rewritten behind our back.
    expect(fsSync.statSync(jsonPath).mtimeMs).toBe(jsonMtime);
    expect(fsSync.readFileSync(jsonPath, "utf8")).toBe(jsonAfterFirst);
  });

  it("regenerates both artifacts when an input byte changes", () => {
    const { jsonPath, markdownPath } = sandbox();
    const v1 = deterministicGeneratedAt({ inputsHash: inputsHashOf("inputs-v1") });
    writeDeterministicArtifactPair({
      jsonPath,
      markdownPath,
      payload: payloadOf(v1),
      markdown: markdownOf(v1),
    });

    const v2 = deterministicGeneratedAt({ inputsHash: inputsHashOf("inputs-v2") });
    const third = writeDeterministicArtifactPair({
      jsonPath,
      markdownPath,
      payload: payloadOf(v2),
      markdown: markdownOf(v2),
    });
    expect(third.changed).toBe(true);
    expect(JSON.parse(fsSync.readFileSync(jsonPath, "utf8")).generatedAt).toBe(v2);
    expect(fsSync.readFileSync(markdownPath, "utf8")).toContain(v2);
  });

  it("regenerates when the STATUS changes even at a constant timestamp (failure runs must surface)", () => {
    const { jsonPath, markdownPath } = sandbox();
    const stamp = deterministicGeneratedAt({ measuredAt: "2026-09-30" });
    writeDeterministicArtifactPair({ jsonPath, markdownPath, payload: payloadOf(stamp, "passed"), markdown: markdownOf(stamp, "passed") });
    const failed = writeDeterministicArtifactPair({ jsonPath, markdownPath, payload: payloadOf(stamp, "failed"), markdown: markdownOf(stamp, "failed") });
    expect(failed.changed).toBe(true);
    expect(JSON.parse(fsSync.readFileSync(jsonPath, "utf8")).status).toBe("failed");
  });

  it("keeps json and markdown moving together (markdown renders from the same payload)", () => {
    const { jsonPath, markdownPath } = sandbox();
    const stamp = deterministicGeneratedAt({ measuredAt: "2026-08-16" });
    const payload = payloadOf(stamp);
    // Hand-write ONLY the json first; the markdown must still be written.
    writeDeterministicArtifactPair({ jsonPath, markdownPath, payload, markdown: markdownOf(stamp) });
    fsSync.rmSync(markdownPath);
    const rerun = writeDeterministicArtifactPair({ jsonPath, markdownPath, payload, markdown: markdownOf(stamp) });
    expect(rerun.changed).toBe(true);
    expect(rerun.wroteJson).toBe(false);
    expect(rerun.wroteMarkdown).toBe(true);
  });
});
