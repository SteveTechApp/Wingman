import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectEquipmentSkus,
  fixtureSourceFiles,
  fixtureSkuProblems,
  isFixtureFile,
  loadFixtureAllowlist,
} from "./check-fixture-sku-lifecycle.mjs";
import { lifecycleRowsBySku, loadLifecycleRows, parseLifecycleCsv, resolveSkuStatus } from "./lib/sku-lifecycle.mjs";

const rows = (...entries) =>
  lifecycleRowsBySku(
    entries.map(([sku, status]) => ({ sku, lifecycle_status: status, business_status: status, do_not_spec: "false" })),
  );

describe("collectEquipmentSkus", () => {
  it("reads a BOM row as equipment", () => {
    const source = `
      const parityBom = [
        { item: 1, sku: "NHD-600-E-TX", description: "Encoder", qty: 2 },
        { item: 2, sku: "MXV-0808-H2A", qty: 1 },
      ];
    `;

    expect(collectEquipmentSkus(source)).toEqual([
      { sku: "NHD-600-E-TX", line: 3 },
      { sku: "MXV-0808-H2A", line: 4 },
    ]);
  });

  it("is not fooled by a mention, an assertion or a commented row", () => {
    const source = `
      // { sku: "SYN-TOUCH10", qty: 1 } — the row this test replaced
      expect(decision.sku).toBe("SYN-TOUCH10");
      expect(catalogue).not.toContain("NHD-250-RX");
      const note = "{ sku: 'CAB-HAOC-6', qty: 1 }";
    `;

    // A fixture that names a retired SKU to prove the app rejects it is doing
    // its job; only inventory-shaped rows are equipment.
    expect(collectEquipmentSkus(source)).toEqual([]);
  });

  it("needs an equipment field, not just a sku key", () => {
    expect(collectEquipmentSkus(`const selected = { sku: "MXV-0808-H2A" };`)).toEqual([]);
    expect(collectEquipmentSkus(`const selected = { sku: "MXV-0808-H2A", role: "Matrix" };`)).toEqual([
      { sku: "MXV-0808-H2A", line: 1 },
    ]);
  });

  it("finds the innermost row, so a schedule of rows is read one at a time", () => {
    const source = `const fixture = { proposal: { bomRows: [
      { sku: "NHD-500-TX", quantity: 4, description: "Encoder" },
    ] } };`;

    expect(collectEquipmentSkus(source)).toEqual([{ sku: "NHD-500-TX", line: 2 }]);
  });
});

describe("fixtureSkuProblems", () => {
  const statuses = rows(
    ["NHD-600-E-TX", "active"],
    ["MXV-0808-H2A", "discontinued"],
    ["SYN-TOUCH10", "do-not-spec"],
    ["CAB-HAOC-6", "discontinued"],
  );

  it("fails a fixture that quotes a discontinued SKU as current equipment", () => {
    const { problems } = fixtureSkuProblems({
      rows: [{ file: "src/a.test.ts", line: 12, sku: "MXV-0808-H2A" }],
      statuses,
      allowlist: {},
    });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("src/a.test.ts:12 quotes MXV-0808-H2A as equipment");
    expect(problems[0]).toContain('"discontinued"');
  });

  it("treats a do-not-spec SKU the same way", () => {
    const { problems } = fixtureSkuProblems({
      rows: [{ file: "src/a.test.ts", line: 3, sku: "SYN-TOUCH10" }],
      statuses,
      allowlist: {},
    });

    expect(problems[0]).toContain('"do-not-spec"');
  });

  it("leaves current equipment alone", () => {
    const { problems } = fixtureSkuProblems({
      rows: [{ file: "src/a.test.ts", line: 3, sku: "NHD-600-E-TX" }],
      statuses,
      allowlist: {},
    });

    expect(problems).toEqual([]);
  });

  it("honours an allowance for a fixture that exists to prove retirement behaviour", () => {
    const allowlist = { "src/a.test.ts": { "CAB-HAOC-6": "The blocked product in the export lifecycle test." } };

    const { problems, usedAllowances } = fixtureSkuProblems({
      rows: [{ file: "src/a.test.ts", line: 3, sku: "CAB-HAOC-6" }],
      statuses,
      allowlist,
    });

    expect(problems).toEqual([]);
    expect([...usedAllowances]).toEqual(["src/a.test.ts\u0000CAB-HAOC-6"]);
  });

  it("fails an allowance the fixture no longer needs, so the list only shrinks", () => {
    const allowlist = { "src/a.test.ts": { "CAB-HAOC-6": "Was the blocked product until the row changed." } };

    const { problems } = fixtureSkuProblems({ rows: [], statuses, allowlist });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("allowlist entry CAB-HAOC-6 is no longer needed");
  });

  it("fails an allowance with no reason", () => {
    const allowlist = { "src/a.test.ts": { "CAB-HAOC-6": "  " } };

    const { problems } = fixtureSkuProblems({
      rows: [{ file: "src/a.test.ts", line: 3, sku: "CAB-HAOC-6" }],
      statuses,
      allowlist,
    });

    // A blank reason silences nothing, so the row is still a failure - and the
    // entry itself is reported as the reason it cannot be honoured.
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("quotes CAB-HAOC-6 as equipment");
    expect(problems[1]).toContain("has an allowlist entry for CAB-HAOC-6 with no reason");
  });
});

describe("fixture files", () => {
  it("counts test files and anything under a fixtures directory", () => {
    expect(isFixtureFile(path.join("src", "lib", "a.test.ts"))).toBe(true);
    expect(isFixtureFile(path.join("e2e", "fixtures", "parity.ts"))).toBe(true);
    expect(isFixtureFile(path.join("server", "a.e2e.test.mjs"))).toBe(true);
    expect(isFixtureFile(path.join("src", "lib", "a.ts"))).toBe(false);
  });
});

describe("the committed tree", () => {
  const root = process.cwd();

  it("resolves a review placeholder through its canonical -V2 row", () => {
    // The rule a second copy of the reader would get wrong: the app quotes this
    // SKU as active, so a fixture quoting it must not be blocked.
    const statuses = lifecycleRowsBySku(
      parseLifecycleCsv(`sku,lifecycle_status\nAPO-VX20-UC,review\nAPO-VX20-UC-V2,active\n`),
    );

    expect(resolveSkuStatus("APO-VX20-UC", statuses)).toBe("active");
    expect(resolveSkuStatus("not-a-sku", statuses)).toBe("unlisted");
  });

  it("finds no retired SKU quoted as equipment, and no allowance it does not need", () => {
    const statuses = loadLifecycleRows(root);
    const files = fixtureSourceFiles(root);
    const equipment = files.flatMap((file) => {
      const relative = path.relative(root, file).split(path.sep).join("/");
      return collectEquipmentSkus(readFileSync(file, "utf8")).map((row) => ({ ...row, file: relative }));
    });

    const { problems, usedAllowances } = fixtureSkuProblems({
      rows: equipment,
      statuses,
      allowlist: loadFixtureAllowlist(root),
    });

    expect(equipment.length).toBeGreaterThan(100);
    expect(problems).toEqual([]);
    // The allowlist is not a graveyard: every entry still covers a row above.
    expect(usedAllowances.size).toBe(Object.values(loadFixtureAllowlist(root)).flatMap((entries) => Object.keys(entries)).length);
  });
});
