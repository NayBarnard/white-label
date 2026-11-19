import { expect, test } from "@playwright/test";

test("public and protected routes remain within the viewport at common breakpoints", async ({ page }) => {
  const isStaffDeployment = process.env.APP_MODE === "staff";
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of isStaffDeployment
      ? ["/", "/advisor/login", "/admin"]
      : ["/", "/portal/dashboard", "/advisor/login"]) {
      const response = await page.goto(path);
      if (path === "/admin") {
        expect(response?.status()).toBe(404);
        await expect(page).toHaveURL(/\/admin$/);
      }
      await expect(page.locator("body")).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `horizontal overflow at ${width}px on ${path}`).toBeLessThanOrEqual(dimensions.viewport);
    }
  }
});
