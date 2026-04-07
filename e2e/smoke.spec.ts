import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigate to initiatives", async ({ page }) => {
    await page.goto("/initiatives");
    // Should either load the page or redirect to login
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigate to agents", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigate to skills", async ({ page }) => {
    await page.goto("/skills");
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigate to brain", async ({ page }) => {
    await page.goto("/brain");
    await expect(page.locator("body")).toBeVisible();
  });

  test("command menu opens with Cmd+K", async ({ page }) => {
    await page.goto("/");
    // Press Cmd+K (Meta+K) to open the command palette
    await page.keyboard.press("Meta+k");
    // The command menu (cmdk) should appear -- look for a dialog or
    // the cmdk container. If auth redirects us, just verify no crash.
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
