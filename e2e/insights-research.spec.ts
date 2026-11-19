import { expect, test } from "@playwright/test";

test("canonical research article exposes institutional sections and adviser PDFs", async ({ page }) => {
  await page.goto("/insights/building-resilient-portfolios");

  await expect(page.getByRole("heading", { name: "Building resilient portfolios through diversification" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Research", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Published fund-performance context" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Key takeaways" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PLACEHOLDER BRAND perspective" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Related research" })).toBeVisible();
  await expect(page.getByText(/Financial Sector Conduct Authority \(FSCA\)/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Clean PDF" })).toHaveAttribute("href", /branding=clean/);
  await expect(page.getByRole("link", { name: "Adviser-ready PDF" })).toHaveAttribute("href", /branding=co-branded/);
});

test("insights hub searches and filters canonical records", async ({ page }) => {
  await page.route("**/api/insights?category=**", async (route) => {
    await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Feed unavailable for this test." }) });
  });
  await page.goto("/insights");

  await expect(page.getByText("FEATURED RESEARCH")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Market snapshot" })).toBeVisible();
  await expect(page.getByText("No verified quote available").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse the versioned research library" })).toHaveAttribute("href", "/insights/library");

  await page.getByRole("combobox", { name: "Category" }).selectOption("Investment Strategy");
  await expect(page.getByRole("heading", { name: "Building resilient portfolios through diversification" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Understanding the role of investment costs" })).toHaveCount(0);

  await page.getByRole("combobox", { name: "Category" }).selectOption("All");
  await page.getByRole("searchbox", { name: "Search research" }).fill("investment costs");
  await expect(page.getByRole("heading", { name: "Understanding the role of investment costs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Building resilient portfolios through diversification" })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Search research" }).fill("");
  await page.getByLabel("Published from").fill("2026-07-21");
  await expect(page.getByRole("heading", { name: "Market context and investment time horizons" })).toHaveCount(0);
});

test("versioned research library identifies archived files and prevents their download", async ({ page }) => {
  await page.route("**/api/insights/library", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        documents: [
          {
            id: "latest",
            slug: "placeholder-balanced-fact-sheet",
            title: "PLACEHOLDER BRAND Balanced Fact Sheet",
            version: 3,
            category: "Fund Fact Sheets / MDDs",
            strategy: "PLACEHOLDER BRAND Balanced",
            publicationDate: "2026-09-30",
            format: "PDF",
            sizeBytes: 12000,
            checksum: "a".repeat(64),
            status: "Latest",
            approvedAt: "2026-10-01T10:00:00Z",
            publishedAt: "2026-10-01T10:00:00Z",
            downloadUrl: "/api/documents/placeholder-balanced-fact-sheet?version=3",
          },
          {
            id: "archived",
            slug: "placeholder-balanced-fact-sheet",
            title: "PLACEHOLDER BRAND Balanced Fact Sheet",
            version: 2,
            category: "Fund Fact Sheets / MDDs",
            strategy: "PLACEHOLDER BRAND Balanced",
            publicationDate: "2026-06-30",
            format: "PDF",
            sizeBytes: 11000,
            checksum: "b".repeat(64),
            status: "Archived",
            approvedAt: "2026-07-01T10:00:00Z",
            publishedAt: "2026-07-01T10:00:00Z",
            downloadUrl: null,
          },
        ],
      }),
    });
  });
  await page.goto("/insights/library");

  await expect(page.getByRole("heading", { name: "Versioned research library" })).toBeVisible();
  await page.getByRole("combobox", { name: "Version status" }).selectOption("Latest");
  await expect(page.getByText("Latest · v3")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download latest version" })).toHaveAttribute("href", /version=3/);

  await page.getByRole("combobox", { name: "Version status" }).selectOption("Archived");
  await expect(page.getByText("Archived · v2")).toBeVisible();
  await expect(page.getByText(/downloads are disabled to prevent accidental use/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Download latest version" })).toHaveCount(0);
});
