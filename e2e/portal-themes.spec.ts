import { expect, test } from "@playwright/test";

function contrastRatio(foreground: string, background: string) {
  function luminance(color: string) {
    const raw = color.replace("#", "");
    const hex = raw.length === 3 ? [...raw].map((value) => value + value).join("") : raw;
    const channels = hex.match(/[0-9a-f]{2}/gi)?.map((value) => parseInt(value, 16) / 255);
    if (!channels || channels.length < 3) throw new Error(`Unexpected CSS color: ${color}`);
    const linear = channels.slice(0, 3).map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test("the configured portal theme uses its AA-contrast palette", async ({ page }) => {
  const isStaffDeployment = process.env.APP_MODE === "staff";
  const routes = isStaffDeployment
    ? [["/advisor/login", "workspace", "#2563eb", "#dbeafe"]] as const
    : [["/portal/dashboard", "client", "#805c0a", "#f6d365"]] as const;

  if (!isStaffDeployment) {
    const staffPage = await page.goto("/advisor/login");
    expect(staffPage?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
  }

  for (const [path, scope, expectedLight, expectedDark] of routes) {
    await page.goto(path);
    const header = page.locator(`.site-header[data-accent-scope="${scope}"]`);
    await expect(header).toBeVisible();

    for (const [dark, expectedAccent] of [[false, expectedLight], [true, expectedDark]] as const) {
      await page.evaluate((isDark) => document.documentElement.classList.toggle("dark", isDark), dark);
      const palette = await header.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          accent: styles.getPropertyValue("--accent").trim(),
          fill: styles.getPropertyValue("--accent-fill").trim(),
          buttonText: styles.getPropertyValue("--button-text").trim(),
          background: styles.getPropertyValue("--background").trim(),
          foreground: styles.getPropertyValue("--foreground").trim(),
          chartBlue: styles.getPropertyValue("--chart-blue").trim(),
          chartFund: styles.getPropertyValue("--chart-fund").trim(),
          input: styles.getPropertyValue("--glass-input-bg").trim(),
        };
      });

      expect(palette.accent).toBe(expectedAccent);
      expect(contrastRatio(palette.accent, palette.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.buttonText, palette.fill)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.foreground, palette.background)).toBeGreaterThanOrEqual(4.5);
      const tokens = `${palette.accent} ${palette.fill} ${palette.chartBlue} ${palette.chartFund} ${palette.input}`.toLowerCase();
      if (scope === "client") {
        expect(tokens).not.toMatch(/2563eb|1d4ed8|37,\s*99,\s*235/);
      } else {
        expect(tokens).not.toMatch(/d4af37|f6d365|805c0a|212,\s*175,\s*55/);
      }
    }
  }
});
