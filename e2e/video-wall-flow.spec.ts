import { expect, test } from "playwright/test";

const accountEmail = `video-wall-flow-${Date.now()}@wingman.test`;
const accountPassword = "WingmanTest123!";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("video wall planner keeps preview and BOM front-and-centre", async ({ page }) => {
  await page.goto("/signup");

  await page.getByRole("textbox", { name: /^Name$/ }).fill("Video Wall Flow User");
  await page.getByRole("textbox", { name: /^Company$/ }).fill("Wingman QA");
  await page.getByRole("textbox", { name: /^Email$/ }).fill(accountEmail);
  await page.getByLabel(/^Password$/).fill(accountPassword);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/app\/projects\/new$/);

  await page.goto("/app/tools/video-wall");
  await expect(page.getByText("Video Wall Designer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wall Preview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Starter BOM" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Supporting Info", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /LCD Video Wall/i }).click();
  await expect(page.getByText("Commercial display panels").first()).toBeVisible();

  await page.getByRole("button", { name: "Supporting Info", exact: true }).click();
  await expect(page.getByText("Recommended family: WyreStorm NetworkHD.").first()).toBeVisible();

  await page.getByRole("button", { name: "Signal Route" }).click();
  await expect(page.getByText("Core route")).toBeVisible();
});
