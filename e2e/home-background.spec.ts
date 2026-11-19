import { expect, test } from "@playwright/test";

test("home background covers the full mobile page in both themes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/fund-metrics", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ source: "Published data", updatedAt: null, metrics: {} }),
    });
  });

  for (const theme of ["light", "dark"] as const) {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Long-term total returns" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Investment strategies" })).toBeVisible();
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle("dark", mode === "dark");
    }, theme);
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark).*$/);

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let scrollTop = 0; scrollTop < pageHeight; scrollTop += 700) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollTop);
    }

    const screenshot = await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`home-${theme}.png`),
    });
    const publicContentHeight = await page.evaluate(() => {
      const footer = document.querySelector(".public-footer");
      return footer ? footer.getBoundingClientRect().top + window.scrollY : document.documentElement.scrollHeight;
    });
    const edgeSamples = await page.evaluate(async ({ imageBase64, contentHeight }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${imageBase64}`;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable for screenshot inspection.");
      context.drawImage(image, 0, 0);

      const samples: { red: number; green: number; blue: number }[] = [];
      const sampledHeight = Math.min(image.naturalHeight, contentHeight);
      const yStep = Math.max(100, Math.floor(sampledHeight / 30));
      for (let y = 8; y < sampledHeight; y += yStep) {
        for (const x of [4, image.naturalWidth - 5]) {
          const pixel = context.getImageData(x, y, 1, 1).data;
          samples.push({ red: pixel[0], green: pixel[1], blue: pixel[2] });
        }
      }
      return samples;
    }, { imageBase64: screenshot.toString("base64"), contentHeight: publicContentHeight });
    const oppositeThemeSamples = edgeSamples.filter(({ red, green, blue }) =>
      theme === "light"
        ? red < 45 && green < 45 && blue < 60
        : red > 225 && green > 225 && blue > 225,
    );
    expect(oppositeThemeSamples, `Unexpected opposite-theme background in ${theme} mode`).toHaveLength(0);

    const contrastRatios = await page.evaluate(() => {
      function colorChannels(color: string) {
        if (color.startsWith("#")) {
          const hex = color.slice(1);
          return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
        }
        return (color.match(/\d+(?:\.\d+)?/g) ?? []).slice(0, 3).map(Number);
      }

      function luminance(color: string) {
        const channels = colorChannels(color).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      }

      const background = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
      const headings = [
        document.querySelector("h1"),
        document.querySelector("#long-term-returns-heading"),
        document.querySelector("#strategies-heading"),
      ];

      return headings.map((heading) => {
        if (!heading) throw new Error("A key home heading is missing.");
        const foreground = getComputedStyle(heading).color;
        const levels = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (levels[0] + 0.05) / (levels[1] + 0.05);
      });
    });
    expect(contrastRatios.every((ratio) => ratio >= 4.5), `${theme} heading contrast`).toBe(true);
  }
});
