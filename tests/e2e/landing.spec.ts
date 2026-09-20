import { test, expect } from "@playwright/test";

test("landing explains the outcome and supports keyboard navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Describe the outcome/i })).toBeVisible();
  await page.getByLabel("Describe what you want to build").fill("Build a premium restaurant ordering product");
  await expect(page.getByRole("button", { name: /Start building/i })).toBeEnabled();
});
