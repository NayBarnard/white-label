import { expect, test } from "@playwright/test";

test("manager updates are not reachable or linked when the feature flag is off", async ({ page }) => {
  await page.goto("/portal/dashboard");
  await expect(page.getByRole("link", { name: "Manager Updates" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Manager Updates" })).toHaveCount(0);
  const response = await page.request.get("/api/admin/manager-updates");
  expect(response.status()).toBe(404);
});
