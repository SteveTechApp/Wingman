import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  checkClosestWyrestormArchRefs,
  collectArchitectureProblems,
  normaliseSku,
  parseCsv,
} from "./check-closest-wyrestorm-arch-refs.mjs";

// Active SKU universe for fixture tests - covers the three NetworkHD
// generations (NHD-1xx/5xx/6xx), Apollo and the EX extender family.
const lifecycleRows = [
  ["NHD-120-TX", "active"],
  ["NHD-150-RX", "active"],
  ["NHD-500-TX", "active"],
  ["NHD-600-TX", "active"],
  ["APO-VX20-UC-V2", "active"],
  ["EX-100-G2", "active"],
  ["NHD-400-TX", "discontinued"], // retired generation
  ["EX-70", "discontinued"], // retired SKU
].map(([sku, status]) => ({ sku, lifecycle_status: status, business_status: status, do_not_spec: "", successor: "" }));

const activeSkus = new Set(
  lifecycleRows.filter((row) => row.lifecycle_status === "active").map((row) => normaliseSku(row.sku)),
);
const lifecycleBySku = new Map(lifecycleRows.map((row) => [normaliseSku(row.sku), row]));

const check = (file, value) =>
  collectArchitectureProblems(file, { closest_wyrestorm_architecture: value }, activeSkus, lifecycleBySku);

describe("collectArchitectureProblems", () => {
  it("accepts the current NetworkHD generations with active SKUs", () => {
    for (const value of [
      "NetworkHD 100 (standard 1GbE AVoIP decoder)",
      "NetworkHD 500 (premium 1GbE AVoIP)",
      "NetworkHD 600 (10G zero-latency AVoIP)",
      "NetworkHD 100/500 (1GbE AVoIP decoder)", // combo of two current gens
    ]) {
      expect(check("f.csv", value), value).toEqual([]);
    }
  });

  it("accepts generic category prose and no-equivalent statements without family refs", () => {
    expect(check("f.csv", "4x4 HDBaseT matrix switcher")).toEqual([]);
    expect(check("f.csv", "No direct WyreStorm hardware equivalent")).toEqual([]);
    expect(check("f.csv", "Wireless presentation hub")).toEqual([]);
    // "NetworkHD" alone (no generation) is a current family direction.
    expect(check("f.csv", "NetworkHD multiview processing")).toEqual([]);
  });

  it("flags a retired NetworkHD generation mention (the class this check exists for)", () => {
    const problems = check("f.csv", "NetworkHD 400 (premium AVoIP encoder)");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/NetworkHD 400/);
    expect(problems[0]).toMatch(/not a current WyreStorm architecture family/);
  });

  it("flags a combo mentioning any retired generation", () => {
    const problems = check("f.csv", "NetworkHD 100/200 (1GbE AVoIP)");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/NetworkHD 200/);
  });

  it("accepts an Apollo mention while the range has active SKUs and flags it once retired", () => {
    expect(check("f.csv", "HDBaseT / Apollo (UC presentation)")).toEqual([]);
    const noApollo = new Set([...activeSkus].filter((sku) => !sku.startsWith("APO-")));
    const problems = collectArchitectureProblems(
      "f.csv",
      { closest_wyrestorm_architecture: "Apollo UC soundbar" },
      noApollo,
      lifecycleBySku,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/Apollo range/);
  });

  it("flags an embedded retired SKU token the same way the SKU-column checker does", () => {
    const problems = check("f.csv", "Long-range extender kit (EX-70 class)");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/EX-70/);
    expect(problems[0]).toMatch(/not active/);
  });

  it("accepts an embedded current SKU token", () => {
    expect(check("f.csv", "1:4 distribution (EX-100-G2 architecture)")).toEqual([]);
  });
});

describe("checkClosestWyrestormArchRefs (committed competitor data)", () => {
  it("reports no problems - every architecture reference names a current family", () => {
    expect(checkClosestWyrestormArchRefs()).toEqual([]);
  });

  it("parses the committed lifecycle file without regression", () => {
    const text = readFileSync(
      path.join(process.cwd(), "data-sources", "wyrestorm", "lifecycle.csv"),
      "utf8",
    );
    expect(parseCsv(text).length).toBeGreaterThan(100);
  });
});
