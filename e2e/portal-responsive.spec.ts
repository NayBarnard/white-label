import { expect, test } from "@playwright/test";

test("public and login portal surfaces fit 360, 390, 768 and 1440 px", async ({ page }) => {
  const isStaffDeployment = process.env.APP_MODE === "staff";
  const routes = isStaffDeployment
    ? ["/", "/advisor/login"]
    : ["/", "/portal/dashboard", "/advisor/login"];
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `${route} overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
    }
  }
});

test("public portal login has no adviser-only navigation trace", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/portal/dashboard");
  await expect(page.getByRole("heading", { name: "Client Portal" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff sign-in" })).toHaveCount(0);
});
