import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("proposal visual template handoff", () => {
  const reviewPage = readFileSync(join(process.cwd(), "src/wingman2/pages/TemplateReviewPage.tsx"), "utf8");
  const styles = readFileSync(join(process.cwd(), "src/wingman2/styles/wingman-workflow-theme.css"), "utf8");

  it("preserves template BOM quantities and activates the reviewed template before opening visuals", () => {
    expect(reviewPage).toContain("quantity: row.qty");
    expect(reviewPage).toContain("upsertStoredProject(buildTemplateProject(template, selectedRows))");
    expect(reviewPage).toContain("routeCatalogByKey.proposalVisuals.path");
    expect(reviewPage).toContain("Create visual");
  });

  it("applies the React Flow canvas foundation to the consolidated route", () => {
    expect(styles).toContain('html[data-wingman-route="proposalVisuals"]');
    expect(styles).toContain("position: absolute !important");
    expect(styles).toContain("height: 100% !important");
  });
});
