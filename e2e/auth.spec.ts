import { test, expect } from "@playwright/test";

test.describe("Login form validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("login page shows email and password fields", async ({ page }) => {
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });

  test("login page has a submit button", async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');
    await expect(submitBtn.first()).toBeVisible();
  });

  test("login page has link to signup", async ({ page }) => {
    const signupLink = page.locator('a[href*="signup"], a:has-text("Sign up"), a:has-text("Create account")');
    await expect(signupLink.first()).toBeVisible();
  });
});

test.describe("Signup form validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("signup page shows required fields", async ({ page }) => {
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
  });

  test("signup page has a submit button", async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Create account")');
    await expect(submitBtn.first()).toBeVisible();
  });

  test("signup page has link back to login", async ({ page }) => {
    const loginLink = page.locator('a[href*="login"], a:has-text("Log in"), a:has-text("Sign in")');
    await expect(loginLink.first()).toBeVisible();
  });
});
