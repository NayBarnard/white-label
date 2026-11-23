import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const standaloneOrigin = "http://127.0.0.1:3101";

function readStoredZip(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameOffset = offset + 30;
    const dataOffset = nameOffset + nameLength + extraLength;
    const name = buffer.toString("utf8", nameOffset, nameOffset + nameLength);
    entries.set(name, buffer.subarray(dataOffset, dataOffset + size));
    offset = dataOffset + size;
  }
  return entries;
}

test("standalone client and adviser workspaces open without Supabase credentials", async ({ page }) => {
  await page.goto(`${standaloneOrigin}/portal/dashboard`);
  await expect(page).toHaveURL(`${standaloneOrigin}/portal`);
  await expect(page.getByRole("heading", { name: "Client portal" })).toBeVisible();
  await expect(page.getByText("No client record is available")).toBeVisible();

  await page.goto(`${standaloneOrigin}/advisor/login`);
  await expect(page).toHaveURL(`${standaloneOrigin}/advisor`);
  await expect(page.getByRole("heading", { name: "Adviser workspace" })).toBeVisible();
  await expect(page.getByText("No adviser profile is available")).toBeVisible();
});

test("standalone firm, adviser, and client workflows persist and restore without network services", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") externalRequests.push(request.url());
  });

  await page.goto(`${standaloneOrigin}/admin`);
  await expect(page.getByRole("heading", { name: "Firm administration" })).toBeVisible();
  await page.getByLabel("Firm name").fill("North Oak Advisory");
  await page.getByLabel("Name", { exact: true }).fill("Riley Adviser");
  await page.getByLabel("Email", { exact: true }).fill("riley@example.test");
  await page.getByLabel("Role", { exact: true }).selectOption("Adviser");
  await page.getByRole("button", { name: "Add user record" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Avery Client");
  await page.getByLabel("Email", { exact: true }).fill("avery@example.test");
  await page.getByLabel("Role", { exact: true }).selectOption("Client");
  await page.getByRole("button", { name: "Add user record" }).click();
  await page.getByLabel("Adviser for Avery Client").selectOption({ label: "Riley Adviser" });

  await page.getByLabel("Client", { exact: true }).first().selectOption({ label: "Avery Client" });
  await page.getByLabel("Holding").fill("Global equity fund");
  await page.getByLabel("Asset class").fill("Equities");
  await page.getByLabel("Value").fill("12345.67");
  await page.getByRole("button", { name: "Add holding" }).click();

  await page.getByLabel("Client", { exact: true }).nth(1).selectOption({ label: "Avery Client" });
  await page.getByLabel("Description").fill("Quarterly contribution");
  await page.getByLabel("Amount").fill("125.50");
  await page.getByRole("button", { name: "Add transaction record" }).click();

  await page.getByLabel("Document client").selectOption({ label: "Avery Client" });
  await page.getByLabel("Upload file").setInputFiles({
    name: "client-statement.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 local test document"),
  });
  await expect(page.getByText("client-statement.pdf", { exact: true })).toBeVisible();
  await page.waitForTimeout(300);

  await page.goto(`${standaloneOrigin}/advisor`);
  await page.getByLabel("Local adviser profile").selectOption({ label: "Riley Adviser" });
  await page.getByRole("button", { name: /Avery Client/ }).click();
  await page.getByLabel("Adviser note").fill("Reviewed client-provided information.");
  await page.getByLabel("Task").fill("Confirm supporting documents");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.waitForTimeout(300);
  await expect(page.getByText("Confirm supporting documents")).toBeVisible();

  await page.goto(`${standaloneOrigin}/portal`);
  await page.getByRole("button", { name: "Holdings", exact: true }).click();
  await expect(page.getByText("Global equity fund")).toBeVisible();
  await expect(page.getByText("$12,345.67")).toBeVisible();

  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(page.getByText("Quarterly contribution")).toBeVisible();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByLabel("Goal name").fill("Education");
  await page.getByLabel("Target amount").fill("20000");
  await page.getByLabel("Current amount", { exact: true }).fill("5000");
  await page.getByLabel("Target date").fill("2035-01-01");
  await page.getByRole("button", { name: "Add goal" }).click();
  await expect(page.getByRole("heading", { name: "Education" })).toBeVisible();

  await page.getByRole("button", { name: "Documents", exact: true }).click();
  const documentDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  expect((await documentDownload).suggestedFilename()).toBe("client-statement.pdf");

  await page.goto(`${standaloneOrigin}/admin`);
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const backupPath = await (await backupDownload).path();
  expect(backupPath).toBeTruthy();
  const backup = JSON.parse(await fs.readFile(backupPath!, "utf8"));
  expect(backup.format).toBe("wealth-os-local-workspace");
  expect(backup.records.some((entry: { key: string }) => entry.key === "wealth-os:workspace:people")).toBe(true);
  expect(backup.records.some((entry: { key: string; value: { kind?: string } }) => entry.key.startsWith("wealth-os:file:") && entry.value.kind === "blob")).toBe(true);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset workspace" }).click();
  await expect(page.getByText("Your local workspace is empty")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('input[type="file"][accept="application/json"]').setInputFiles(backupPath!);
  await expect(page.getByLabel("Adviser for Avery Client")).toHaveValue(/.+/);
  await page.goto(`${standaloneOrigin}/portal`);
  await page.getByRole("button", { name: "Holdings", exact: true }).click();
  await expect(page.getByText("Global equity fund")).toBeVisible();
  await expect(externalRequests).toEqual([]);
});

test("Studio supports create, edit, drag, save, publish, import and export", async ({ page }) => {
  await page.goto(`${standaloneOrigin}/studio`);
  await expect(page.getByText("WEALTH OS", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Add page" }).click();
  await page.getByLabel("Page URL").fill("/site/audit-page");
  await page.getByLabel("SEO title").fill("Independent wealth planning");
  await page.getByLabel("Meta description").fill("An audited local website page.");

  await page.getByRole("button", { name: "Components" }).click();
  const heroButton = page.getByRole("button", { name: /hero/i }).first();
  await expect(heroButton).toBeVisible();
  await heroButton.dragTo(page.locator("article").last());

  await page.getByRole("button", { name: "Layers" }).click();
  await page.getByText(/hero ·/i).last().click();
  await page.getByLabel("Title").fill("A distinctive wealth business");
  await page.getByLabel("Body").fill("A fully local, editable website demonstration.");
  await page.getByRole("slider", { name: "Padding", exact: true }).fill("96");
  await page.getByRole("slider", { name: "Section height", exact: true }).fill("420");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Draft saved locally")).toBeVisible();
  await page.reload();
  await expect(page.getByText("A distinctive wealth business")).toBeVisible();

  await page.getByRole("button", { name: "Layers" }).click();
  await page.getByText(/hero ·/i).last().click();
  await page.getByRole("button", { name: "Duplicate" }).first().click();
  await expect.poll(() => page.getByText(/hero ·/i).count()).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "Delete" }).first().click();

  const exportPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export standalone website ZIP" }).click();
  const download = await exportPromise;
  expect(download.suggestedFilename()).toMatch(/website\.zip$/);
  const archivePath = await download.path();
  expect(archivePath).toBeTruthy();
  const archive = readStoredZip(await fs.readFile(archivePath!));
  expect(archive.has("index.html")).toBe(true);
  expect(archive.has("audit-page/index.html")).toBe(true);
  expect(archive.has("assets/site.css")).toBe(true);
  expect(archive.has("README.md")).toBe(true);
  const backup = JSON.parse(archive.get("wealth-os-project.json")!.toString("utf8"));
  expect(backup.schemaVersion).toBe(1);
  expect(backup.pages.some((item: { slug: string }) => item.slug === "/site/audit-page")).toBe(true);

  const deploymentDir = await fs.mkdtemp(join(tmpdir(), "wealth-os-static-"));
  try {
    for (const [filePath, contents] of archive) {
      const target = join(deploymentDir, ...filePath.split("/"));
      await fs.mkdir(join(target, ".."), { recursive: true });
      await fs.writeFile(target, contents);
    }
    await page.goto(`file://${join(deploymentDir, "index.html")}`);
    await expect(page).toHaveTitle("WEALTH OS | Considered wealth management");
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.locator(".desktop-nav a").filter({ hasText: "About" })).toHaveAttribute("href", "about/index.html");
    await page.goto(`file://${join(deploymentDir, "about/index.html")}`);
    await expect(page).toHaveTitle("About | WEALTH OS");
    await expect(page.locator("footer")).toBeVisible();
  } finally {
    await fs.rm(deploymentDir, { recursive: true, force: true });
  }

  await page.goto(`${standaloneOrigin}/studio`);
  await page.getByRole("button", { name: "Pages" }).click();
  await page.getByLabel("SEO title").fill("Changed after backup");
  await page.locator('input[type="file"][accept="application/json"]').setInputFiles({
    name: "wealth-os-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByLabel("SEO title")).toHaveValue("Independent wealth planning");

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published locally. This is exportable and visible in this browser only.", { exact: true })).toBeVisible();
  await page.goto(`${standaloneOrigin}/site/audit-page`);
  await expect(page.getByText("A distinctive wealth business")).toBeVisible();
});

test("Studio media persists, exports, and creative suggestions are reviewable", async ({ page }) => {
  await page.goto(`${standaloneOrigin}/studio`);
  await page.getByRole("button", { name: "Media" }).click();
  await page.getByRole("button", { name: "Upload asset" }).click();

  const fileInput = page.locator('input[type="file"][accept="image/png,image/jpeg,image/webp,image/gif,image/avif,application/pdf"]');
  await fileInput.setInputFiles("public/icons/icon-192.png");
  await expect(page.getByText("icon-192.png added to the local media library.")).toBeVisible();
  await expect(page.getByRole("img", { name: "icon-192.png" })).toBeVisible();
  await page.getByRole("button", { name: "Use on page" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Media" }).click();
  await expect(page.getByRole("img", { name: "icon-192.png" })).toBeVisible();

  const exportPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export standalone website ZIP" }).click();
  const archivePath = await (await exportPromise).path();
  const files = readStoredZip(await fs.readFile(archivePath!));
  expect([...files.keys()].some((name) => name.includes("icon-192.png"))).toBe(true);
  const projectBackup = JSON.parse(files.get("wealth-os-project.json")!.toString("utf8"));
  expect(projectBackup.pages.some((entry: { sections: { image: string }[] }) => entry.sections.some((section) => section.image.startsWith("asset:")))).toBe(true);
  const browserProject = await page.evaluate(() => {
    const activeId = localStorage.getItem("wealth-os.studio.active-project.v1") || "default";
    return JSON.parse(localStorage.getItem(`wealth-os.studio.project.${activeId}.v1`) || "null");
  });
  expect(browserProject.assets[0].dataUrl).toBe("");
  const deploymentDir = await fs.mkdtemp(join(tmpdir(), "wealth-os-media-export-"));
  try {
    for (const [filePath, contents] of files) {
      const target = join(deploymentDir, ...filePath.split("/"));
      await fs.mkdir(join(target, ".."), { recursive: true });
      await fs.writeFile(target, contents);
    }
    await page.goto(`file://${join(deploymentDir, "index.html")}`);
    await expect.poll(() => page.locator("main img").first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".nav-menu")).toBeVisible();
    await page.locator(".nav-menu summary").click();
    await expect(page.locator(".nav-menu nav a").first()).toBeVisible();
  } finally {
    await fs.rm(deploymentDir, { recursive: true, force: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${standaloneOrigin}/studio`);

  await page.getByRole("button", { name: "Quality" }).click();
  await expect(page.getByText(/Quality & compliance/i)).toBeVisible();

  await page.getByRole("button", { name: "Creative AI" }).click();
  await page.getByPlaceholder(/luxury private wealth/i).fill("Transform my website into luxury private wealth");
  await page.getByRole("button", { name: "Apply suggestion" }).click();
  await expect(page.getByRole("dialog", { name: "Review creative suggestion" })).toBeVisible();
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.getByText(/Local creative suggestion applied/i)).toBeVisible();
});

test("Studio keeps independent projects separate across reloads", async ({ page }) => {
  await page.goto(`${standaloneOrigin}/studio`);
  await page.getByRole("button", { name: "Create website project" }).click();
  await page.getByLabel("SEO title").fill("Independent Alpha home");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("SEO title")).toHaveValue("Independent Alpha home");

  const projectPicker = page.getByRole("combobox", { name: "Website project" });
  await projectPicker.selectOption("default");
  await expect(page.getByLabel("SEO title")).toHaveValue("WEALTH OS | Considered wealth management");
  await projectPicker.selectOption({ label: "New Wealth Business" });
  await expect(page.getByLabel("SEO title")).toHaveValue("Independent Alpha home");
});

test("product onboarding creates a branded local website project", async ({ page }) => {
  await page.goto(`${standaloneOrigin}/product`);
  await expect(page.getByRole("heading", { name: /A considered digital home/i })).toBeVisible();
  await page.goto(`${standaloneOrigin}/welcome`);
  await page.getByLabel("Business or trading name").fill("Harbour Point Advisory");
  await page.getByLabel("Starting design").selectOption("institutional");
  await page.getByRole("button", { name: "Create local website project" }).click();
  await expect(page).toHaveURL(`${standaloneOrigin}/studio`);
  await expect(page.getByLabel("SEO title")).toHaveValue("Home | Harbour Point Advisory");
  await expect(page.getByRole("combobox", { name: "Website project" })).toHaveValue(/project-/);
  await page.goto(`${standaloneOrigin}/licensing`);
  await expect(page.getByText(/No commercial pricing/i).first()).toBeVisible();
});

test("template previews, application and local template duplication work", async ({ page }) => {
  await page.goto(`${standaloneOrigin}/studio`);
  await page.getByRole("button", { name: "Templates" }).click();
  await expect(page.getByText("Private Office", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preview template" }).first().click();
  await expect(page.getByRole("dialog", { name: "Private Office" })).toBeVisible();
  await page.getByRole("button", { name: "Apply template" }).click();
  await page.getByRole("button", { name: "Pages" }).click();
  await expect(page.getByLabel("SEO title")).toHaveValue("Private Office | WEALTH OS");

  await page.getByRole("button", { name: "Templates" }).click();
  page.once("dialog", (dialog) => dialog.accept("Reusable family office"));
  await page.getByRole("button", { name: "Save current as template" }).click();
  const savedTemplate = page.locator("article").filter({ hasText: "Reusable family office" });
  await expect(savedTemplate).toBeVisible();
  await savedTemplate.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByText("Reusable family office copy", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Pages" }).click();
  await page.locator("section article").first().click();
  page.once("dialog", (dialog) => dialog.accept("Reusable hero section"));
  await page.getByRole("button", { name: "Save as reusable section" }).click();
  await page.getByRole("button", { name: "Components" }).click();
  const reusable = page.getByRole("button", { name: "Reusable hero section", exact: true });
  await expect(reusable).toBeVisible();
  await reusable.click();
});

test("Planning and data-backed adviser reports download as real PDFs", async ({ page }) => {
  await page.goto(`${standaloneOrigin}/planning`);
  await expect(page.getByRole("heading", { name: "Illustrative growth scenarios" })).toBeVisible();
  const planningDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export branded PDF" }).click();
  const planning = await planningDownload;
  expect(planning.suggestedFilename()).toBe("wealth-planning-illustration.pdf");
  const planningPath = await planning.path();
  expect(planningPath).toBeTruthy();
  expect(await fs.readFile(planningPath!, "utf8")).toMatch(/^%PDF-/);

  await page.goto(`${standaloneOrigin}/admin`);
  await page.getByLabel("Name", { exact: true }).fill("Riley Adviser");
  await page.getByLabel("Email", { exact: true }).fill("riley@example.test");
  await page.getByLabel("Role", { exact: true }).selectOption("Adviser");
  await page.getByRole("button", { name: "Add user record" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Avery Client");
  await page.getByLabel("Email", { exact: true }).fill("avery@example.test");
  await page.getByLabel("Role", { exact: true }).selectOption("Client");
  await page.getByRole("button", { name: "Add user record" }).click();
  await page.getByLabel("Adviser for Avery Client").selectOption({ label: "Riley Adviser" });
  await page.waitForTimeout(250);

  await page.goto(`${standaloneOrigin}/advisor`);
  await expect(page.getByLabel("Local adviser profile")).toHaveValue(/.+/);
  await page.getByLabel("Local adviser profile").selectOption({ label: "Riley Adviser" });
  await expect(page.getByRole("button", { name: /Avery Client/ })).toBeVisible();
  const adviserDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export review pack PDF" }).click();
  const adviser = await adviserDownload;
  expect(adviser.suggestedFilename()).toMatch(/review-pack\.pdf$/);
  const adviserPath = await adviser.path();
  expect(adviserPath).toBeTruthy();
  expect(await fs.readFile(adviserPath!, "utf8")).toMatch(/^%PDF-/);
});

test("Studio remains usable at mobile and tablet widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${standaloneOrigin}/studio`);
  await page.getByRole("button", { name: "Open panels" }).click();
  await expect(page.getByRole("button", { name: "Pages" })).toBeVisible();
  await page.getByRole("button", { name: "Close panels" }).click();
  await page.getByRole("button", { name: "Properties" }).click();
  await expect(page.getByRole("button", { name: "Close properties" }).last()).toBeVisible();
});

test("all primary routes respond and local portal screens render", async ({ page, request }) => {
  const routes = ["/", "/about", "/contact", "/portfolios", "/insights", "/onboarding", "/welcome", "/product", "/licensing", "/planning", "/client", "/portal", "/advisor", "/admin", "/studio", "/privacy", "/terms", "/resources", "/offline"];
  for (const route of routes) {
    const response = await request.get(`${standaloneOrigin}${route}`);
    expect(response.status(), route).toBeLessThan(400);
  }
  await page.goto(`${standaloneOrigin}/client`);
  await expect(page.getByText("STANDALONE LOCAL WORKSPACE", { exact: true }).first()).toBeVisible();
  await page.goto(`${standaloneOrigin}/advisor`);
  await expect(page.getByText("Adviser dashboard")).toBeVisible();
  await page.goto(`${standaloneOrigin}/admin`);
  await expect(page.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
});
