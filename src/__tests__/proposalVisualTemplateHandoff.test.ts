import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { templateProducts } from "../wingman2/lib/templateReviewProposal";
import { roomTemplates } from "../wingman2/lib/roomTemplates";

describe("proposal visual template handoff", () => {
  const reviewPage = readFileSync(join(process.cwd(), "src/wingman2/pages/TemplateReviewPage.tsx"), "utf8");
  const styles = readFileSync(join(process.cwd(), "src/wingman2/styles/wingman-workflow-theme.css"), "utf8");

  it("preserves template BOM quantities and activates the reviewed template before opening visuals", () => {
    const row = { ...roomTemplates[0].bom[0], qty: 7 };
    expect(templateProducts([row])[0]).toMatchObject({ sku: row.sku, quantity: 7 });
    expect(reviewPage).toContain("upsertStoredProject(buildTemplateProject(template, selectedRows))");
    expect(reviewPage).toContain("routeCatalogByKey.proposalVisuals.path");
    expect(reviewPage).toContain("Create visual");
  });

  it("applies the React Flow canvas foundation to the consolidated route", () => {
    expect(styles).toContain('html[data-wingman-route="proposalVisuals"]');
    expect(styles).toContain("position: absolute");
    expect(styles).toContain("height: 100%");
  });
});
