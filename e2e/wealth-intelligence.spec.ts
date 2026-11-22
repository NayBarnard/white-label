import { expect, test } from "@playwright/test";

test("planning journey exposes all financial intelligence capabilities", async ({ page }) => {
  await page.goto("/planning");
  await expect(page.getByRole("heading", { name: "Illustrative growth scenarios" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Probability ranges, not promises" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Competing plan comparison" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Append-only decision context" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence-first holding risk" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Human-review opportunities" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Illustrative institution-style shock" })).toBeVisible();

  await page.getByRole("button", { name: "Load fictional demo holdings" }).click();
  await expect(page.getByText("High Equity concentration")).toBeVisible();
  await expect(page.getByText("High ZAR currency exposure")).toBeVisible();
});
