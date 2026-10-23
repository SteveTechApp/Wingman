import { describe, expect, it } from "vitest";
import { checkDiscoveryLocators, findCopyLocators } from "./check-discovery-locators.mjs";

describe("discovery locator contract", () => {
  it("pins the real smoke flow", () => expect(checkDiscoveryLocators()).toEqual([]));
  for (const locator of [
    'page.getByText("Continue")', 'page.getByRole("button", {\nname: /Continue/})',
    'page.locator("button").filter({hasText: label})', 'page.locator("text=Continue")',
    'page.getByLabel(variable)', 'page.locator("button:has-text(Continue)")',
  ]) it(`rejects ${locator}`, () => {
    expect(findCopyLocators(`async function walkDiscovery(page) { await ${locator}.click(); }`)).toHaveLength(1);
  });
  it("allows test IDs, structural assertions and copy in diagnostics", () => {
    expect(findCopyLocators('async function walkDiscovery(page) { /* getByText("copy") */ await page.getByTestId("discovery-continue").click(); await page.getByRole("status").isVisible(); console.log("Continue"); }')).toEqual([]);
  });
});
