import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("feature route consolidation", () => {
  const routes = read("src/wingman2/app/routes.tsx");

  it.each([
    ["sales-helper", "/wingman/call-coach"],
    ["call-cards", "/wingman/call-coach"],
    ["battle-cards", "/wingman/compare?mode=battle-cards"],
    ["response-pack", "/wingman/documents?mode=publication"],
    ["support", "/wingman/call-coach"],
    ["quote-safety", "/wingman/projects?view=quote-safety"],
    ["analytics", "/wingman/admin/data-manager?view=analytics"],
  ])("redirects %s to its owner interface", (segment, destination) => {
    expect(routes).toContain(`path: "${segment}"`);
    expect(routes).toContain(`to="${destination}"`);
  });

  it("renders conversation intents through Call Coach", () => {
    const hubs = read("src/wingman2/pages/NavigationHubPages.tsx");
    expect(hubs).toContain("return <SalesHelperPage />");
  });

  it("owns product modes under Product Workspace", () => {
    const hubs = read("src/wingman2/pages/NavigationHubPages.tsx");
    expect(hubs).toContain("ProductWorkspaceMode");
    expect(hubs).toContain('["catalogue", "families", "call-cards", "positioning"]');
  });

  it("owns Battle Cards under Compare", () => {
    const compare = read("src/wingman2/pages/ComparePageNew.tsx");
    expect(compare).toContain('new URLSearchParams(window.location.search).get("mode") === "battle-cards"');
    expect(compare).toContain("<BattleCardsPage />");
  });
});
