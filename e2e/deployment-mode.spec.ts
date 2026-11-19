import { expect, test } from "@playwright/test";

const isStaffDeployment = process.env.APP_MODE === "staff";

test("deployment exposes only its configured site surface", async ({ request, page }) => {
  const staffPage = await request.get("/advisor/login");
  const publicPage = await request.get("/about");
  const clientPage = await request.get("/portal");
  const publicApi = await request.get("/api/documents/placeholder-balanced-fact-sheet");
  const staffApi = await request.get("/api/admin/setup");

  if (isStaffDeployment) {
    expect(staffPage.status()).toBe(200);
    expect(publicPage.status()).toBe(404);
    expect(clientPage.status()).toBe(404);
    expect(publicApi.status()).toBe(404);
    expect([401, 403, 503]).toContain(staffApi.status());

    const root = await request.get("/");
    expect(new URL(root.url()).pathname).toBe("/advisor/login");
    expect(root.headers()["x-robots-tag"]).toContain("noindex");
    const csp = root.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("'strict-dynamic'");
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    expect(await root.text()).toContain(`nonce="${nonce}"`);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
    await expect(page.locator("footer.workspace-footer")).toBeVisible();
    await expect(page.locator("header.site-header")).toHaveAttribute("data-accent-scope", "workspace");
  } else {
    expect(staffPage.status()).toBe(200);
    expect(publicPage.status()).toBe(200);
    expect(clientPage.status()).toBe(200);
    expect(publicApi.status()).toBe(200);
    expect(staffApi.status()).toBe(404);

    const homepageHtml = await (await request.get("/")).text();
    expect(homepageHtml).not.toMatch(/Staff sign-in/i);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const robots = await (await request.get("/robots.txt")).text();
    expect(sitemap).not.toMatch(/\/admin|\/advisor|\/studio/);
    expect(robots).not.toMatch(/\/admin|\/advisor|\/studio/);
  }
});
