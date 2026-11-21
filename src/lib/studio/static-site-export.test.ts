import { describe, expect, it } from "vitest";
import { makeProject } from "./universal-schema";
import { createZip, exportStaticWebsiteZip, generateStaticSiteFiles } from "./static-site-export";

function readZipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    entries.set(name, bytes.slice(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return entries;
}

describe("static website export", () => {
  it("generates linked independent HTML pages, responsive assets, metadata and source backup", () => {
    const project = makeProject();
    project.tradingName = "North & Oak";
    project.navigation = [{ label: "About", href: "/about" }];
    project.pages[0].sections[0].image = "data:image/png;base64,aGVsbG8=";
    project.assets.push({
      id: "asset-1",
      name: "portrait.png",
      type: "image",
      dataUrl: "data:image/png;base64,aGVsbG8=",
      size: 5,
      createdAt: new Date(0).toISOString(),
    });

    const files = generateStaticSiteFiles(project);
    const byName = new Map(files.map((file) => [file.path, new TextDecoder().decode(file.data)]));
    expect(byName.get("index.html")).toContain('href="about/index.html"');
    expect(byName.get("about/index.html")).toContain("<title>About | WEALTH OS</title>");
    expect(byName.get("index.html")).toContain("assets/asset-1-portrait.png");
    expect(byName.get("assets/site.css")).toContain("@media(max-width:720px)");
    expect(byName.get("wealth-os-project.json")).toContain('"tradingName": "North & Oak"');
    expect(files.find((file) => file.path === "assets/asset-1-portrait.png")?.data).toEqual(new TextEncoder().encode("hello"));
    expect(byName.get("README.md")).toContain("any static web host");
  });

  it("creates a valid store-only ZIP with the website files", () => {
    const project = makeProject();
    const archive = exportStaticWebsiteZip(project);
    const entries = readZipEntries(archive);
    expect(new DataView(archive.buffer, archive.byteOffset, archive.byteLength).getUint32(0, true)).toBe(0x04034b50);
    expect(entries.has("index.html")).toBe(true);
    expect(entries.has("about/index.html")).toBe(true);
    expect(entries.has("assets/site.css")).toBe(true);
    expect(entries.has("wealth-os-project.json")).toBe(true);
    expect(entries.has("README.md")).toBe(true);
    expect(new TextDecoder().decode(entries.get("index.html"))).toContain("name=\"viewport\"");
  });

  it("rejects unsafe ZIP paths and conflicting page URLs", () => {
    expect(() => createZip([{ path: "../outside.txt", data: new Uint8Array() }])).toThrow("Unsafe ZIP entry path");
    const project = makeProject();
    project.pages[1].slug = "/";
    expect(() => generateStaticSiteFiles(project)).toThrow("unique URL");
  });

  it("escapes user content and constrains imported CSS values", () => {
    const project = makeProject();
    project.pages[0].sections[0].title = "<script>alert(1)</script>";
    project.pages[0].sections[0].background = 'red; background-image:url("x")';
    const html = new TextDecoder().decode(generateStaticSiteFiles(project).find((file) => file.path === "index.html")?.data);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain('background-image:url("x")');
  });
});
