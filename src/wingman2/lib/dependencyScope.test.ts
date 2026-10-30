import { describe, expect, it } from "vitest";
import { createDefaultProjectStore } from "../features/projects/model/projectDefaults";
import {
  DEPENDENCY_PROMPT_PREFIX,
  dependencyUnquotedProject,
  isDependencyPromptSku,
  pendingDependencyPrompts,
  projectDependencyPrompts,
  templateDependencyPrompts,
  templateDependencyRecord,
} from "./dependencyScope";
import type { TemplateBomRow } from "./roomTemplates";
import { validateProposalExport } from "./proposalExportValidation";
import { buildSalesReadinessPackage } from "./salesReadiness";

const matrix = {
  sku: "MX-0402-MST",
  title: "Presentation matrix",
  category: "Switching",
  quantity: 1,
  status: "recommended" as const,
  evidence: ["Customer brief"],
};

/**
 * A boardroom long enough that the design depends on extension: the matrix is
 * chosen, the run is unmeasured, so the package carries the pairing and cable
 * path questions as `TBC-` prompts rather than named parts.
 */
function boardroom(unquotedDependencySkus?: string[]) {
  return buildSalesReadinessPackage({
    products: [matrix],
    discovery: {
      projectTitle: "Boardroom",
      summary: "Share slides",
      roomSize: "8 × 6m",
      displays: "1",
      usb: "None",
      distance: "100m+",
      budget: "Unknown",
    },
    assumptions: [],
    unquotedDependencySkus,
  });
}

const promptSkus = (rows: { sku: string }[]) => rows.map((row) => row.sku).filter(isDependencyPromptSku);

describe("governed dependency scope", () => {
  it("lists only the prompts a room has not answered yet", () => {
    const pkg = boardroom();
    const prompts = promptSkus(pkg.bomRows);
    expect(prompts.length).toBe(2);
    // Every prompt has a question to print, which is what the document keeps.
    expect(prompts.every((sku) => pkg.governedDependencies.some((item) => item.sku === sku))).toBe(true);

    const pending = pendingDependencyPrompts(pkg.governedDependencies, [prompts[0]]);
    expect(pending.map((item) => item.sku)).toEqual([prompts[1]]);
    // The same list read with nothing recorded offers both.
    expect(pendingDependencyPrompts(pkg.governedDependencies, undefined).map((item) => item.sku)).toEqual(prompts);
  });

  it("takes the recorded prompt out of the quotation and keeps the question", () => {
    const all = boardroom();
    const [recorded] = promptSkus(all.bomRows);
    const after = boardroom([recorded]);

    // The unpriced line is gone from the BOM the quotation is built from…
    expect(promptSkus(after.bomRows)).not.toContain(recorded);
    expect(after.bomRows.some((row) => row.sku === recorded)).toBe(false);
    // …while the dependency list still names the question the document prints.
    expect(after.governedDependencies.some((item) => item.sku === recorded)).toBe(true);
    expect(after.governedDependencies.find((item) => item.sku === recorded)?.validationQuestion)
      .toBe(all.governedDependencies.find((item) => item.sku === recorded)?.validationQuestion);

    const before = validateProposalExport({ products: [matrix], bomRows: all.bomRows });
    expect(before.blockers.map((blocker) => blocker.id)).toContain("chain-tbc-dependencies");
    expect(before.blockers.find((blocker) => blocker.id === "chain-tbc-dependencies")?.message).toContain("2 BOM row(s)");

    const remaining = validateProposalExport({ products: [matrix], bomRows: after.bomRows });
    expect(remaining.blockers.find((blocker) => blocker.id === "chain-tbc-dependencies")?.message).toContain("1 BOM row(s)");
  });

  it("records the decision on the project once, however often it is taken", () => {
    const project = createDefaultProjectStore(() => "2026-10-26T09:00:00.000Z").projects[0];
    const [prompt] = promptSkus(boardroom().bomRows);

    const recorded = dependencyUnquotedProject(project, prompt.toLowerCase(), "2026-10-26T10:00:00.000Z")!;
    expect(recorded.unquotedDependencySkus).toEqual([prompt]);
    expect(recorded.updatedAt).toBe("2026-10-26T10:00:00.000Z");

    const again = dependencyUnquotedProject(recorded, prompt, "2026-10-26T11:00:00.000Z")!;
    expect(again.unquotedDependencySkus).toEqual([prompt]);
  });

  it("reads a saved response's own prompts, less the ones it has answered", () => {
    const pkg = boardroom();
    const [first, second] = promptSkus(pkg.bomRows);
    const project = createDefaultProjectStore().projects[0];
    project.proposal = {
      title: "Boardroom",
      summary: "Share slides",
      sections: [],
      products: [matrix],
      assumptions: [],
      updatedAt: "2026-10-26T09:00:00.000Z",
      governedDependencies: pkg.governedDependencies,
      bomRows: pkg.bomRows,
    };

    // The record offers exactly what the response carries, with the question the
    // document prints beside the label.
    expect(projectDependencyPrompts(project).map((prompt) => prompt.sku)).toEqual([first, second]);
    expect(projectDependencyPrompts(project)[0].question).toBe(
      pkg.governedDependencies.find((dependency) => dependency.sku === first)?.validationQuestion,
    );

    const answered = dependencyUnquotedProject(project, first)!;
    expect(projectDependencyPrompts(answered).map((prompt) => prompt.sku)).toEqual([second]);
  });

  it("still names a prompt a response recorded only as a placeholder row", () => {
    const pkg = boardroom();
    const [first] = promptSkus(pkg.bomRows);
    const project = createDefaultProjectStore().projects[0];
    // A save written before the dependency list existed: the row is the record.
    project.proposal = {
      title: "Boardroom",
      summary: "Share slides",
      sections: [],
      products: [matrix],
      assumptions: [],
      updatedAt: "2026-10-26T09:00:00.000Z",
      bomRows: pkg.bomRows.filter((row) => row.sku === first),
    };

    expect(projectDependencyPrompts(project)).toEqual([
      { sku: first, label: pkg.bomRows.find((row) => row.sku === first)!.description },
    ]);
  });

  it("offers nothing for a project with no saved response", () => {
    expect(projectDependencyPrompts(createDefaultProjectStore().projects[0])).toEqual([]);
    // A response carrying no placeholder has nothing to answer either.
    const quoted = createDefaultProjectStore().projects[0];
    quoted.proposal = {
      title: "Boardroom",
      summary: "Share slides",
      sections: [],
      products: [matrix],
      assumptions: [],
      updatedAt: "2026-10-26T09:00:00.000Z",
      governedDependencies: [],
      bomRows: [{ item: 1, sku: matrix.sku, description: matrix.title, role: matrix.category, qty: 1, type: "Required", status: "included", evidence: "Customer brief", notes: "" }],
    };
    expect(projectDependencyPrompts(quoted)).toEqual([]);
  });

  it("refuses to leave a named part out of the quotation", () => {
    const project = createDefaultProjectStore().projects[0];
    // A `TBC-` prompt is the only line a decision can take out: an exact
    // dependency is equipment the design needs.
    expect(dependencyUnquotedProject(project, matrix.sku)).toBeNull();
    expect(isDependencyPromptSku(matrix.sku)).toBe(false);
    expect(isDependencyPromptSku(`${DEPENDENCY_PROMPT_PREFIX.toLowerCase()}cable-path`)).toBe(true);

    // A hand-edited store that named it still cannot drop the row.
    const tampered = boardroom([matrix.sku]);
    expect(tampered.bomRows.some((row) => row.sku === matrix.sku)).toBe(true);
  });
});

/** One line of a template's schedule, as a project saved into a template carries it. */
function templateRow(overrides: Partial<TemplateBomRow> & { id: string; sku: string }): TemplateBomRow {
  return {
    description: overrides.sku,
    role: "Room design item",
    qty: 1,
    type: "Validate",
    status: "validate",
    evidence: "Saved from project.",
    notes: "Dependency prompt requiring design validation.",
    ...overrides,
  };
}

describe("template dependency prompts", () => {
  const rows = [
    templateRow({ id: "row-matrix", sku: "MX-0404-HDMI", description: "Presentation matrix", type: "Required", status: "included" }),
    templateRow({ id: "row-network", sku: "tbc-av-network", description: "AV network readiness" }),
    templateRow({ id: "row-endpoints", sku: "TBC-NHD-ENDPOINTS", description: "NetworkHD endpoint count" }),
  ];

  it("reads the placeholders a template inherited from a project", () => {
    const prompts = templateDependencyPrompts(rows);

    // A named part is not an open question, and the SKU is read the way the row
    // stores it rather than the way it was typed.
    expect(prompts).toEqual([
      { sku: "TBC-AV-NETWORK", label: "AV network readiness" },
      { sku: "TBC-NHD-ENDPOINTS", label: "NetworkHD endpoint count" },
    ]);
  });

  it("offers nothing for a row the schedule has already dropped", () => {
    const dropped = rows.map((row) => row.id === "row-network" ? { ...row, status: "excluded", qty: 0 } : row);

    expect(templateDependencyPrompts(dropped).map((prompt) => prompt.sku)).toEqual(["TBC-NHD-ENDPOINTS"]);
    // A quantity of zero is the same decision as an exclusion.
    expect(templateDependencyPrompts(rows.map((row) => ({ ...row, qty: row.id === "row-endpoints" ? 0 : row.qty })))
      .map((prompt) => prompt.sku)).toEqual(["TBC-AV-NETWORK"]);
  });

  it("records a prompt as a dependency to confirm and takes the placeholder out", () => {
    const recorded = templateDependencyRecord(rows, ["Confirm the display height at survey."], "tbc-av-network")!;

    // The row keeps its place in the schedule but stops being quoted, so the
    // rep still sees the line the decision was taken on.
    expect(recorded.rows.find((row) => row.id === "row-network")).toMatchObject({ status: "excluded", qty: 0 });
    expect(recorded.rows.find((row) => row.id === "row-endpoints")).toEqual(rows[2]);
    expect(templateDependencyPrompts(recorded.rows).map((prompt) => prompt.sku)).toEqual(["TBC-NHD-ENDPOINTS"]);
    // The dependency is not deleted from the customer's reading: it joins the
    // template's unresolved items, which the proposal prints.
    expect(recorded.validationItems).toEqual([
      "Confirm the display height at survey.",
      "AV network readiness",
    ]);

    // Taking the decision twice records one dependency, not two.
    const again = templateDependencyRecord(recorded.rows, recorded.validationItems, "TBC-AV-NETWORK")!;
    expect(again.validationItems).toEqual(recorded.validationItems);
  });

  it("refuses to take a named part out of the schedule", () => {
    expect(templateDependencyRecord(rows, [], "MX-0404-HDMI")).toBeNull();
    // A prompt this schedule does not carry has nothing to record either.
    expect(templateDependencyRecord(rows, [], "TBC-CORE-SOLUTION")).toBeNull();
  });
});
