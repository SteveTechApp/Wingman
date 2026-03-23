import { expect, test } from "playwright/test";

const accountEmail = `catalog-filter-${Date.now()}@wingman.test`;
const accountPassword = "WingmanTest123!";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("catalogue technology filter and SKU search return results", async ({ page }) => {
  await page.goto("/signup");

  await page.getByRole("textbox", { name: /^Name$/ }).fill("Catalog Filter User");
  await page.getByRole("textbox", { name: /^Company$/ }).fill("Wingman QA");
  await page.getByRole("textbox", { name: /^Email$/ }).fill(accountEmail);
  await page.getByLabel(/^Password$/).fill(accountPassword);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/app\/projects\/new$/);

  await page.goto("/app/tools/catalog");
  await expect(page.getByRole("heading", { name: "Product Catalogue", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "AV over IP" }).first().click();

  await expect(page.locator(".wm-cat2__group").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "No matching products found" })).toHaveCount(0);

  await page.getByRole("button", { name: "Clear all" }).click();
  await page
    .getByPlaceholder("Search SKU, technology, feature, or application...")
    .fill("APO-210-UC");

  await expect(page.getByText("APO-210-UC").first()).toBeVisible();
});
