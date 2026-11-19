import { expect, test } from "@playwright/test";
import { company, documents } from "../src/data/firmData";

test("unauthenticated portal access redirects to login", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Client Portal" })).toBeVisible();
});

test("unauthenticated admin access is not found", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(/\/admin$/);
});

test("staff routes are not reachable from the public deployment", async ({ page }) => {
  const response = await page.goto("/advisor/platforms");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(/\/advisor\/platforms$/);
});

test("signed-out users cannot open platform administration", async ({ page }) => {
  const response = await page.goto("/admin/platforms");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(/\/admin\/platforms$/);
});

test("public header groups client and advisor portal access in desktop and mobile menus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const header = page.locator("header");
  await header.getByRole("button", { name: "PORTALS" }).click();
  const portalMenu = header.getByRole("navigation", { name: "Portal access" });
  await expect(portalMenu.getByRole("link", { name: "CLIENT PORTAL" })).toHaveAttribute("href", "/portal/login");
  await expect(portalMenu.getByRole("link", { name: "ADVISOR PORTAL" })).toHaveAttribute("href", "/advisor/login");
  await expect(header.getByText("ENQUIRE NOW")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const mobileMenu = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileMenu.getByRole("link", { name: "CLIENT PORTAL" })).toHaveAttribute("href", "/portal/login");
  await expect(mobileMenu.getByRole("link", { name: "ADVISOR PORTAL" })).toHaveAttribute("href", "/advisor/login");
  await expect(mobileMenu.getByText("ENQUIRE NOW")).toHaveCount(0);
});

test("firm statement ticker appears on public pages but not portal routes", async ({ page }) => {
  const statement = "Independent. Owner-Managed. Client-First";
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Firm statement" })).toContainText(statement);
  await expect(page.locator("main").getByText(statement, { exact: true })).toHaveCount(0);

  await page.goto("/about");
  await expect(page.getByRole("region", { name: "Firm statement" })).toBeVisible();
  await expect(page.locator("main").getByText(statement, { exact: true })).toHaveCount(0);

  await page.goto("/portal/login");
  await expect(page.getByRole("region", { name: "Firm statement" })).toHaveCount(0);

  await page.goto("/advisor/login");
  await expect(page.getByRole("region", { name: "Firm statement" })).toHaveCount(0);
});

test("homepage shows firm stats and portfolio carousel keeps the side-peek interaction", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("region", { name: "PLACEHOLDER BRAND at a glance" }).getByText("65")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Long-term total returns" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Fund comparison" })).toBeVisible();

  await page.goto("/portfolios");
  const carousel = page.getByLabel("Fund strategies");
  const firstCard = carousel.locator(":scope > div").first();
  const firstCardWidth = await firstCard.evaluate((element) => element.getBoundingClientRect().width);
  const carouselWidth = await carousel.evaluate((element) => element.clientWidth);
  expect(firstCardWidth).toBeGreaterThan(carouselWidth * 0.8);
  expect(firstCardWidth).toBeLessThan(carouselWidth);

  await page.getByRole("button", { name: "Show PLACEHOLDER BRAND Cautious" }).click();
  await expect(page.getByRole("button", { name: "Show PLACEHOLDER BRAND Cautious" })).toHaveAttribute("aria-current", "true");
});

test("homepage shows requested strategy, insight and swipe sections", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("region", { name: "Distribution platforms" })).toContainText("Absa");
  const statistics = page.getByRole("region", { name: "PLACEHOLDER BRAND at a glance" });
  await expect(statistics).toContainText(/4[\s,]942\+/);
  const statCards = statistics.locator(":scope > div");
  const statLayout = await statistics.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      columns: styles.gridTemplateColumns.split(" ").length,
      cardBounds: Array.from(element.children, (card) => {
        const { width, height } = card.getBoundingClientRect();
        return { width, height };
      }),
    };
  });
  expect(statLayout.columns).toBe(2);
  expect(await statCards.count()).toBe(4);
  for (const { width, height } of statLayout.cardBounds) {
    expect(Math.abs(width - height)).toBeLessThan(1);
  }
  await expect(page.getByRole("heading", { name: "WHY PLACEHOLDER BRAND" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OUR INVESTMENT STRATEGIES" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MARKET COMMENTARY", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Q1 2026 Market Commentary" })).toBeVisible();

  const strategies = page.getByRole("region", { name: "Investment strategies" });
  await expect(strategies.getByRole("heading", { name: "PLACEHOLDER BRAND Balanced Strategy" })).toBeVisible();
  const cautiousControl = strategies.getByRole("button", { name: "Show PLACEHOLDER BRAND Cautious Strategy" });
  await cautiousControl.click();
  await expect(cautiousControl).toHaveAttribute("aria-current", "true");
  await expect.poll(() => strategies.locator(".home-swipe-track").evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);

  const insights = page.getByRole("region", { name: "Investment strategy and client updates" });
  await expect(insights.getByRole("heading", { name: "Asset Allocation in Uncertain Times" })).toBeVisible();
  await expect(insights.getByRole("heading", { name: "Understanding Fee Impact on Returns" })).toBeVisible();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("fund comparison controls respond to fund and timeframe input", async ({ page }) => {
  await page.goto("/");

  const comparison = page.getByRole("region", { name: "Interactive fund performance comparison" });
  await comparison.scrollIntoViewIfNeeded();
  const funds = comparison.getByRole("group", { name: "Select fund" });
  const periods = comparison.getByRole("group", { name: "Select comparison timeframe" });
  const cautious = funds.getByRole("button", { name: "PLACEHOLDER BRAND Cautious" });
  const threeYears = periods.getByRole("button", { name: "3Y Annualised" });

  await expect(funds.getByRole("button", { name: "PLACEHOLDER BRAND Balanced" })).toHaveAttribute("aria-pressed", "true");
  await cautious.click();
  await expect(cautious).toHaveAttribute("aria-pressed", "true");
  await expect(funds.getByRole("button", { name: "PLACEHOLDER BRAND Balanced" })).toHaveAttribute("aria-pressed", "false");

  await threeYears.click();
  await expect(threeYears).toHaveAttribute("aria-pressed", "true");
  await expect(periods.getByRole("button", { name: "1Y" })).toHaveAttribute("aria-pressed", "false");
});

test("floating navigation stays on public pages and is hidden on portal routes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".floating-island")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.locator(".island-chat-launcher")).toBeVisible();

  await page.goto("/portal/dashboard");
  await expect(page.locator(".floating-island")).toHaveCount(0);
  await expect(page.locator(".island-chat-launcher")).toHaveCount(0);
});

test("open navigation and chat panels dismiss when clicking elsewhere", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const mobileMenu = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileMenu).toBeVisible();

  await page.locator(".island-chat-launcher").click();
  await expect(mobileMenu).toHaveCount(0);
  const chatPanel = page.getByRole("region", { name: "PLACEHOLDER BRAND AI Assistant chat" });
  await expect(chatPanel).toBeVisible();
  await expect(chatPanel.locator(".chatbot-message-assistant")).toContainText("How can I help?");
  const chatStyle = await chatPanel.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, zIndex: style.zIndex };
  });
  expect(chatStyle.background).toBe("rgba(253, 249, 238, 0.94)");
  expect(Number(chatStyle.zIndex)).toBeGreaterThan(50);
  await expect(chatPanel.locator("#assistant-message")).toHaveCSS("border-radius", "9999px");

  await page.getByRole("heading", { name: "Long-term total returns" }).click();
  await expect(chatPanel).toHaveCount(0);
});

test("public footer contains only the requested firm, contact and policy links", async ({ page }) => {
  await page.goto("/");

  const footer = page.locator("footer.public-footer");
  await expect(footer).toContainText("Independent Investment Management");
  await expect(footer).toContainText("Authorised FSP in terms of the FAIS Act of South Africa - FSP No. 622");
  await expect(footer).toContainText("Category: Discretionary Investment Management");
  await expect(footer).toContainText(company.phone);
  await expect(footer).toContainText(company.email);
  await expect(footer).toContainText(company.address);
  await expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  await expect(footer.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
  await expect(footer.getByRole("link", { name: "POPIA Compliance" })).toHaveAttribute("href", "/api/documents/popi-act-statement");
  await expect(page.locator("footer.compliance-footer")).toHaveCount(0);
});

test("client routes use the gold accent", async ({ page }) => {
  await page.goto("/portal/dashboard");

  await expect(page.locator("header.site-header")).toHaveAttribute("data-accent-scope", "client");
  const clientAccent = await page.locator("main").first().evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--accent-fill").trim(),
  );
  expect(clientAccent).toBe("#d4af37");
});

test("production responses include security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
  expect(headers["strict-transport-security"]).toContain("max-age=");
});

test("page routes expose unique titles, descriptions, and Open Graph metadata", async ({ page }) => {
  const routes = [
    "/",
    "/about",
    "/portfolios",
    "/insights",
    "/contact",
    "/resources",
    "/onboarding",
    "/portal/dashboard",
    "/unsubscribe",
    "/privacy",
    "/terms",
  ];
  const titles = new Set<string>();

  for (const route of routes) {
    await page.goto(route);
    const title = await page.title();
    titles.add(title);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('meta[property="og:description"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('meta[property="og:url"]').getAttribute("content")).toContain(route);
  }

  expect(titles.size).toBe(routes.length);
});

test("unknown routes render the branded not-found page", async ({ request }) => {
  const response = await request.get("/this-page-does-not-exist");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("This page isn’t available");
});

test("staff studio route is unavailable on the public deployment", async ({ page }) => {
  const response = await page.goto("/studio");
  expect(response?.status()).toBe(404);
});

test("primary pages fit supported viewports in both themes", async ({ page }) => {
  test.setTimeout(120_000);
  const routes = [
    "/",
    "/about",
    "/portfolios",
    "/insights",
    "/contact",
    "/resources",
    "/onboarding",
    "/portal/dashboard",
    "/privacy",
    "/terms",
  ];
  const widths = [360, 768, 1024, 1440];

  for (const route of routes) {
    await page.goto(route);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"] as const) {
        await page.evaluate((currentTheme) => {
          document.documentElement.classList.toggle("dark", currentTheme === "dark");
        }, theme);
        const documentWidth = await page.evaluate(
          () => document.documentElement.scrollWidth,
        );
        expect(documentWidth, `${route} overflows at ${width}px in ${theme} mode`).toBeLessThanOrEqual(width);
      }
    }
  }
});

test("cumulative return comparison fits a mobile viewport without table scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/portfolios");

  const heading = page.getByRole("heading", { name: "Cumulative total return comparison" });
  const section = page.locator("section.glass").filter({ has: heading });
  const table = section.locator("table");

  await expect(heading).toBeVisible();
  await expect(section.getByRole("rowheader")).toHaveCount(4);
  expect(await table.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
    await table.evaluate((element) => element.clientWidth),
  );
});

test("connection splash is one-time and uses only the backup logo", async ({ page }) => {
  let connectionChecks = 0;
  await page.route("**/api/fund-metrics", async (route) => {
    connectionChecks += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ source: "Published data", updatedAt: null, metrics: {} }),
    });
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const splash = page.getByRole("status", { name: "Connecting securely" });
  await expect(splash).toBeVisible();
  await expect(splash.locator(".connection-splash-panel")).toBeVisible();
  await expect(splash.locator("img")).toHaveAttribute("src", /logo-splash-last\.png/);
  await expect(splash.locator("video")).toHaveCount(0);
  await expect(splash).toHaveCount(0, { timeout: 3000 });

  await page.getByRole("link", { name: "ABOUT", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator(".connection-splash")).toHaveCount(0);
  expect(connectionChecks).toBe(1);
});

test("pending initial connection shows only the backup logo and requests no animation", async ({ page }) => {
  const animationRequests: string[] = [];
  page.on("request", (request) => {
    if (/logo-splash-(stacked|fallback)\.mp4/.test(request.url())) {
      animationRequests.push(request.url());
    }
  });
  await page.route("**/api/fund-metrics", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ source: "Published data", updatedAt: null, metrics: {} }),
    });
  });

  await page.goto("/");
  const splash = page.getByRole("status", { name: "Connecting securely" });
  await expect(splash).toBeVisible();
  await expect(splash.locator("img")).toHaveAttribute("src", /logo-splash-last\.png/);
  await expect(splash.locator("video")).toHaveCount(0);
  expect(animationRequests).toEqual([]);
});

for (const document of documents) {
  test(`download: ${document.name}`, async ({ request }) => {
    const href =
      "file" in document ? document.file : `/api/documents/${document.slug}`;
    const response = await request.get(href);

    expect(response.ok(), `${document.name} should be downloadable`).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect((await response.body()).byteLength).toBeGreaterThan(100);
  });
}
