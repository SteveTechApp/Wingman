import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { templateProducts } from "../wingman2/lib/templateReviewProposal";
import { roomTemplates } from "../wingman2/lib/roomTemplates";

describe("proposal visual template handoff", () => {
  // The page's proposal actions are its own hook's, so the visuals handoff is
  // read from the module that saves and navigates rather than the page markup.
  const reviewPage = readFileSync(join(process.cwd(), "src/wingman2/pages/template/useTemplateProposal.ts"), "utf8");
  // The page's actions and chrome are rendered by the page itself, so the
  // handoff a rep triggers is read from the page and its own action row.
  const reviewChrome = readFileSync(join(process.cwd(), "src/wingman2/pages/TemplateReviewPage.tsx"), "utf8");
  const styles = readFileSync(join(process.cwd(), "src/wingman2/styles/wingman-workflow-theme.css"), "utf8");

  it("preserves template BOM quantities and activates the reviewed template before opening visuals", () => {
    const row = { ...roomTemplates[0].bom[0], qty: 7 };
    expect(templateProducts([row])[0]).toMatchObject({ sku: row.sku, quantity: 7 });
    expect(reviewPage).toContain("buildTemplateProject(template, selectedRows)");
    expect(reviewPage).toContain("upsertStoredProject(project)");
    expect(reviewPage).toContain("routeCatalogByKey.proposalVisuals.path");
    expect(reviewPage + reviewChrome).toContain("Create visual");
  });

  it("applies the React Flow canvas foundation to the consolidated route", () => {
    expect(styles).toContain('html[data-wingman-route="proposalVisuals"]');
    expect(styles).toContain("position: absolute");
    expect(styles).toContain("height: 100%");
  });
});
