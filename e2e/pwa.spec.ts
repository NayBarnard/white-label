import { expect, test } from "@playwright/test";
import { company } from "../src/data/firmData";

test("PWA manifest exposes valid icons and shortcuts", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: "WEALTH OS",
    short_name: "WEALTH OS",
    start_url: "/",
    display: "standalone",
    background_color: "#0A1124",
    theme_color: "#0A1124",
  });
  expect(manifest.shortcuts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "Client Portal", url: "/portal" }),
      expect.objectContaining({ name: "Funds", url: "/portfolios" }),
    ]),
  );
  for (const icon of manifest.icons as { src: string; sizes: string; purpose?: string }[]) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBeTruthy();
    expect(icon.sizes).toMatch(/^(192|512)x\1$/);
    expect(Array.from((await response.body()).slice(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
  }
  expect(manifest.icons).toContainEqual(
    expect.objectContaining({ purpose: "maskable", sizes: "512x512" }),
  );
});

test("service worker registers, offline page has help and chat, and portal is not cached", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    return { active: Boolean(ready.active), scope: ready.scope };
  });
  expect(registration.active).toBe(true);
  expect(registration.scope).toContain("/");

  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  const offlineContent = page.getByRole("main");
  await expect(offlineContent.locator('a[href^="tel:"]')).toBeVisible();
  await expect(offlineContent.locator('a[href^="mailto:"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Open your firm AI Assistant" })).toBeVisible();

  await page.getByRole("button", { name: "Open your firm AI Assistant" }).click();
  await page.context().setOffline(true);
  await page.getByRole("textbox", { name: "Message your firm AI Assistant" }).fill("What is the phone number?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByLabel("your firm AI Assistant chat").locator(".placeholder-chat-message").filter({
      hasText: company.phone,
    }),
  ).toBeVisible();
  await page.context().setOffline(false);

  await page.goto("/portal/dashboard");
  const cachedPaths = await page.evaluate(async () => {
    const names = await caches.keys();
    const keys = await Promise.all(
      names.map(async (name) => (await caches.open(name)).keys()),
    );
    return keys.flat().map((request) => new URL(request.url).pathname);
  });
  expect(cachedPaths.some((pathname) => /^\/portal(?:\/|$)/.test(pathname))).toBe(false);
  expect(cachedPaths.some((pathname) => /^\/advisor(?:\/|$)/.test(pathname))).toBe(false);
  expect(cachedPaths).toContain("/offline");
});

test("chatbot answers questions after greetings and understands a follow-up", async ({ page }) => {
  await page.goto("/offline");
  await page.getByRole("button", { name: "Open your firm AI Assistant" }).click();
  const chat = page.getByLabel("your firm AI Assistant chat");
  const input = page.getByRole("textbox", { name: "Message your firm AI Assistant" });
  const send = page.getByRole("button", { name: "Send message" });

  await input.fill("Hi, how are you? What is the FSP number?");
  await send.click();
  await expect(chat.locator(".placeholder-chat-message").filter({ hasText: company.regulatoryNotice })).toBeVisible();

  await input.fill("What are the fees for Balanced?");
  await send.click();
  await expect(chat.locator(".placeholder-chat-message").filter({ hasText: "TER: not published" })).toBeVisible();

  await input.fill("And what about Cautious?");
  await send.click();
  await expect(chat.locator(".placeholder-chat-message").filter({ hasText: "your firm Cautious Strategy" })).toBeVisible();
});
