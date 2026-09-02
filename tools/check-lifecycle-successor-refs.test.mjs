import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { collectSuccessorProblems, parseLifecycleCsv } from "./check-lifecycle-successor-refs.mjs";

const baseRow = (sku, overrides = {}) => ({
  sku,
  lifecycle_status: "active",
  business_status: "active",
  do_not_spec: "false",
  successor: "",
  reason: "",
  evidence_source: "",
  last_reviewed: "2026-09-02",
  reviewer: "test",
  ...overrides,
});

describe("collectSuccessorProblems", () => {
  it("accepts a discontinued SKU whose successor is active", () => {
    const rows = [
      baseRow("NHD-500-TX"),
      baseRow("NHD-500-TX-OLD", { lifecycle_status: "discontinued", successor: "NHD-500-TX" }),
    ];
    expect(collectSuccessorProblems(rows)).toEqual([]);
  });

  it("rejects a successor that points at a discontinued product (the dangling-remap class)", () => {
    const rows = [
      baseRow("NHD-TOUCH", { lifecycle_status: "discontinued" }),
      baseRow("NETWORKHDTOUCHTM", { lifecycle_status: "discontinued", successor: "NHD-TOUCH" }),
    ];
    const problems = collectSuccessorProblems(rows);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/NHD-TOUCH/);
    expect(problems[0]).toMatch(/must point at an active/);
  });

  it("rejects a successor that does not resolve to any lifecycle row", () => {
    const rows = [baseRow("OLD-SKU", { lifecycle_status: "discontinued", successor: "NO-SUCH-SKU" })];
    const problems = collectSuccessorProblems(rows);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/does not resolve to any lifecycle row/);
  });

  it("rejects a row that names itself as its own successor", () => {
    const rows = [baseRow("SELF-SKU", { lifecycle_status: "discontinued", successor: "self-sku" })];
    const problems = collectSuccessorProblems(rows);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/names itself/);
  });

  it("rejects an active source row that declares a successor", () => {
    const rows = [baseRow("NHD-500-TX"), baseRow("STILL-CURRENT", { successor: "NHD-500-TX" })];
    const problems = collectSuccessorProblems(rows);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/is active but names successor/);
  });
});

describe("checkLifecycleSuccessorRefs (committed lifecycle.csv)", () => {
  it("reports no problems against the real file - the guard would have caught NETWORKHDTOUCHTM -> NHD-TOUCH", () => {
    const rows = parseLifecycleCsv(
      readFileSync(path.join(process.cwd(), "data-sources", "wyrestorm", "lifecycle.csv"), "utf8"),
    );
    expect(collectSuccessorProblems(rows)).toEqual([]);
  });
});
