import { expect, test } from "playwright/test";

const ownerEmail = `owner-${Date.now()}@wingman.test`;
const invitedEmail = `customer-${Date.now()}@wingman.test`;
const password = "WingmanTest123!";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("allows admins to invite a customer collaborator with restricted workspace access", async ({ page, browser }) => {
  await page.goto("/signup");
  await page.getByRole("textbox", { name: /^Name$/ }).fill("Workspace Owner");
  await page.getByRole("textbox", { name: /^Company$/ }).fill("Invite Systems");
  await page.getByRole("textbox", { name: /^Email$/ }).fill(ownerEmail);
  await page.getByLabel(/^Password$/).fill(password);
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL(/\/app\/projects\/new$/);

  await page.goto("/app/settings/workspace");
  await expect(page.getByText("Workspace Settings").first()).toBeVisible();

  await page.getByRole("textbox", { name: /^Email$/ }).fill(invitedEmail);
  await page.getByRole("combobox", { name: /^Role$/ }).selectOption("customer");
  await page.getByRole("button", { name: "Create Invitation" }).click();

  const invitePath = await page.locator(".wm-body-sm", { hasText: "/invite?token=" }).last().innerText();
  const inviteUrl = new URL(invitePath, page.url()).toString();

  const inviteContext = await browser.newContext();
  const invitePage = await inviteContext.newPage();
  await invitePage.goto(inviteUrl);

  await expect(invitePage.getByText("Join Workspace").first()).toBeVisible();
  await expect(invitePage.getByText(invitedEmail)).toBeVisible();
  await invitePage.getByRole("textbox", { name: /^Name$/ }).fill("Customer User");
  await invitePage.getByLabel(/^Password$/).fill(password);
  await invitePage.getByRole("button", { name: "Join Workspace" }).click();

  await expect(invitePage).toHaveURL(/\/app\/dashboard$/);

  await invitePage.goto("/app/settings/workspace");
  await expect(invitePage.getByText(/Workspace administration is limited to admin roles/i)).toBeVisible();

  await inviteContext.close();
});
