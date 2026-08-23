import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { routeByPath, routeCatalogByKey } from "./routeCatalog";

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const routeManifest = JSON.parse(read("src/wingman2/app/route-manifest.json")) as Array<{
  key: string;
  path: string;
  segment: string;
  pageFile: string;
}>;

const featureAudit = JSON.parse(read("src/wingman2/content/feature-audit.json")) as Array<{
  routeKey: string;
  status: string;
}>;

const featureSurfacePolicy = JSON.parse(
  read("tools/wingman-feature-surface-policy.json"),
) as { approvedRouteKeys: string[] };

describe("Terms & legal route wiring", () => {
  it("registers the terms route in the route manifest with its page file", () => {
    const entry = routeManifest.find((route) => route.key === "terms");

    expect(entry).toBeDefined();
    expect(entry?.path).toBe("/wingman/terms");
    expect(entry?.segment).toBe("terms");
    expect(entry?.pageFile).toBe("TermsPage.tsx");
  });

  it("resolves /wingman/terms to the governed terms route", () => {
    expect(routeByPath("/wingman/terms")).toBe(routeCatalogByKey.terms);
    expect(routeCatalogByKey.terms.path).toBe("/wingman/terms");
  });

  it("lazy-loads TermsPage from the page registry in routes.tsx", () => {
    const routes = read("src/wingman2/app/routes.tsx");

    expect(routes).toContain('terms: lazy(fromNamedExport(() => import("../pages/TermsPage"), "TermsPage"))');
  });

  it("keeps terms in the WingmanRouteKey union and icon map", () => {
    const catalog = read("src/wingman2/app/routeCatalog.ts");

    expect(catalog).toMatch(/\|\s*"terms";/);
    expect(catalog).toContain("terms: Shield,");
    expect(catalog).toMatch(/Shield,?\n\s*Workflow,/);
  });

  it("pins the persistent sidebar footer link in AppShell", () => {
    const appShell = read("src/wingman2/layout/AppShell.tsx");

    expect(appShell).toContain("wingman-sidebar-footer");
    expect(appShell).toContain("wingman-sidebar-footer-link");
    expect(appShell).toContain("routeCatalogByKey.terms.path");
    expect(appShell).toContain('aria-label="Terms and legal disclaimer"');
  });

  it("pins the Terms link on the Support page", () => {
    const supportPage = read("src/wingman2/pages/SupportPage.tsx");

    expect(supportPage).toContain('<Link to="/wingman/terms">Terms &amp; legal disclaimer</Link>');
  });

  it("keeps the terms page covered by the feature audit", () => {
    const entry = featureAudit.find((item) => item.routeKey === "terms");

    expect(entry).toBeDefined();
    expect(entry?.status).toBe("wired");
  });

  it("keeps the terms route approved in the feature-surface policy", () => {
    expect(featureSurfacePolicy.approvedRouteKeys).toContain("terms");
  });
});
