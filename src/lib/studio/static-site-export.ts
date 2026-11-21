import type { StudioAsset, StudioPage, StudioProject } from "@/lib/studio/universal-schema";

export type ExportFile = { path: string; data: Uint8Array };

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function u16(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZip(files: ExportFile[]) {
  const localRecords: Uint8Array[] = [];
  const centralRecords: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = utf8(file.path.replaceAll("\\", "/").replace(/^\/+/, ""));
    if (!name.length || file.path.split(/[\\/]/).includes("..")) throw new Error("Unsafe ZIP entry path.");
    const checksum = crc32(file.data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(checksum), u32(file.data.length), u32(file.data.length),
      u16(name.length), u16(0), name, file.data,
    ]);
    localRecords.push(local);
    centralRecords.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(checksum), u32(file.data.length), u32(file.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }
  const central = concat(centralRecords);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return concat([...localRecords, central, end]);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function safeSlug(slug: string) {
  const parts = slug.split("/").filter(Boolean);
  if (parts[0] === "site") parts.shift();
  const safe = parts.map((part) => part.toLowerCase().replace(/[^a-z0-9_-]/g, "-")).filter(Boolean);
  return safe.length ? `${safe.join("/")}/index.html` : "index.html";
}

function relativePath(fromFile: string, toFile: string) {
  const from = fromFile.split("/").slice(0, -1);
  const to = toFile.split("/");
  while (from.length && to.length && from[0] === to[0]) {
    from.shift();
    to.shift();
  }
  return `${"../".repeat(from.length)}${to.join("/") || "index.html"}`;
}

function decodeDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("Unsupported embedded asset format.");
  const content = match[3];
  if (match[2]) {
    const binary = atob(content);
    return { mime: match[1] || "application/octet-stream", data: Uint8Array.from(binary, (char) => char.charCodeAt(0)) };
  }
  return { mime: match[1] || "text/plain", data: utf8(decodeURIComponent(content)) };
}

function safeAssetName(asset: StudioAsset) {
  const basename = asset.name.split(/[\\/]/).pop() || "asset";
  return basename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
}

function safeColor(value: string, fallback: string) {
  return /^#[\da-f]{3,8}$/i.test(value) || /^(transparent|white|black)$/i.test(value) ? value : fallback;
}

function safeNumber(value: number, fallback: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function makeAssetFiles(project: StudioProject) {
  const files: ExportFile[] = [];
  const lookup = new Map<string, string>();
  const paths = new Set<string>();
  for (const asset of project.assets) {
    if (!asset.dataUrl) continue;
    const decoded = decodeDataUrl(asset.dataUrl);
    const id = asset.id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100) || "asset";
    const path = `assets/${id}-${safeAssetName(asset)}`;
    if (paths.has(path)) throw new Error("Duplicate media asset names cannot be exported.");
    paths.add(path);
    files.push({ path, data: decoded.data });
    lookup.set(asset.id, path);
    lookup.set(asset.dataUrl, path);
  }
  return { files, lookup };
}

function safeLink(href: string, page: StudioPage, outputPath: string, pages: StudioPage[]) {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return escapeHtml(trimmed);
  if (!trimmed.startsWith("/")) return "#";
  const target = pages.find((candidate) => candidate.slug === trimmed);
  if (!target) return escapeHtml(trimmed);
  return escapeHtml(relativePath(outputPath, safeSlug(target.slug)));
}

function renderPage(project: StudioProject, page: StudioPage, outputPath: string, assetLookup: Map<string, string>) {
  const primary = safeColor(project.tokens.primary, "#d4af37");
  const accent = safeColor(project.tokens.accent, "#805c0a");
  const backgroundColor = safeColor(project.tokens.background, "#ffffff");
  const foregroundColor = safeColor(project.tokens.foreground, "#111827");
  const mutedColor = safeColor(project.tokens.muted, "#64748b");
  const nav = project.navigation.map((item) =>
    `<a href="${safeLink(item.href, page, outputPath, project.pages)}">${escapeHtml(item.label)}</a>`,
  ).join("");
  const logoPath = assetLookup.get(project.logo) ?? (project.logo.startsWith("asset:") ? assetLookup.get(project.logo.slice(6)) : undefined);
  const header = project.header.visible
    ? `<header class="site-header ${["standard", "floating", "minimal"].includes(project.header.style) ? project.header.style : "standard"}"${project.header.transparent ? ' data-transparent="true"' : ""}><a class="brand" href="${escapeHtml(relativePath(outputPath, "index.html"))}">${logoPath ? `<img src="${escapeHtml(relativePath(outputPath, logoPath))}" alt="${escapeHtml(project.tradingName)} logo">` : `<span class="brand-mark">${escapeHtml(project.tradingName.slice(0, 1))}</span>`}<span>${escapeHtml(project.tradingName)}</span></a><details class="nav-menu"><summary aria-label="Toggle navigation">Menu</summary><nav>${nav}</nav></details><nav class="desktop-nav">${nav}</nav></header>`
    : "";
  const sections = page.sections.filter((section) => !section.hidden).map((section) => {
    const imagePath = assetLookup.get(section.image) ?? (section.image.startsWith("asset:") ? assetLookup.get(section.image.slice(6)) : undefined);
    const image = imagePath
      ? `<img class="section-image" src="${escapeHtml(relativePath(outputPath, imagePath))}" alt="">`
      : "";
    const background = safeColor(section.background, section.type === "cta" ? primary : backgroundColor);
    const foreground = safeColor(section.textColor, foregroundColor);
    const style = [
      `--section-bg:${background}`,
      `--section-fg:${foreground}`,
      `--section-accent:${safeColor(section.accent, accent)}`,
      `--section-padding:${safeNumber(section.padding, 72, 0, 240)}px`,
      `--section-height:${safeNumber(section.height, 220, 120, 1200)}px`,
      `--section-radius:${safeNumber(section.radius, 18, 0, 80)}px`,
      `--mobile-padding:${safeNumber(section.mobilePadding, 24, 8, 160)}px`,
      `text-align:${["left", "center", "right"].includes(section.alignment) ? section.alignment : "left"}`,
    ].join(";");
    const layout = ["stack", "columns", "split", "grid"].includes(section.layout) ? section.layout : "stack";
    return `<section class="section ${escapeHtml(section.type)} layout-${layout}" style="${style}"><div class="section-copy"><p class="eyebrow">${escapeHtml(section.eyebrow)}</p><h1>${escapeHtml(section.title)}</h1><p class="body">${escapeHtml(section.body)}</p>${section.type === "hero" ? `<a class="button" href="${escapeHtml(project.contact.email ? `mailto:${project.contact.email}` : "#contact")}">Speak with our team</a>` : ""}</div>${image}</section>`;
  }).join("\n");
  const footer = project.footer.visible
    ? `<footer><strong>${escapeHtml(project.footer.text)}</strong><p>${escapeHtml(project.footer.disclosure)}</p><small>© ${new Date().getFullYear()} ${escapeHtml(project.tradingName)}</small></footer>`
    : "";
  const favicon = `<link rel="icon" href="${escapeHtml(relativePath(outputPath, "favicon.svg"))}" type="image/svg+xml">`;
  const tokens = project.tokens;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(page.title || page.name)}</title><meta name="description" content="${escapeHtml(page.description)}"><meta property="og:title" content="${escapeHtml(page.title || page.name)}"><meta property="og:description" content="${escapeHtml(page.description)}">${favicon}<link rel="stylesheet" href="${escapeHtml(relativePath(outputPath, "assets/site.css"))}"><script defer src="${escapeHtml(relativePath(outputPath, "assets/site.js"))}"></script></head><body style="--brand-primary:${escapeHtml(primary)};--brand-accent:${escapeHtml(accent)};--page-bg:${escapeHtml(backgroundColor)};--page-fg:${escapeHtml(foregroundColor)};--muted:${escapeHtml(mutedColor)};--font:${escapeHtml(["Georgia", "Inter", "Arial"].includes(tokens.font) ? tokens.font : "Georgia")};--radius:${safeNumber(tokens.radius, 18, 0, 80)}px">${header}<main>${sections}</main>${footer}</body></html>`;
}

const stylesheet = `
:root{font-family:var(--font),Georgia,serif;color:var(--page-fg);background:var(--page-bg);font-synthesis:none;text-rendering:optimizeLegibility}
*{box-sizing:border-box}body{margin:0;background:var(--page-bg);color:var(--page-fg)}a{color:inherit}
.site-header{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:2rem;min-height:76px;padding:12px clamp(20px,7vw,100px);background:var(--page-bg);border-bottom:1px solid color-mix(in srgb,var(--brand-primary) 20%,transparent)}
.site-header.floating{margin:16px;border:1px solid #ffffff44;border-radius:20px;box-shadow:0 12px 40px #10203318;backdrop-filter:blur(20px)}.site-header.minimal{border:0}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700}.brand img{width:36px;height:36px;object-fit:contain}.brand-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--brand-primary);color:var(--page-bg)}
.desktop-nav,.nav-menu nav{display:flex;align-items:center;gap:clamp(12px,2vw,28px)}.desktop-nav a,.nav-menu a{text-decoration:none;font:500 13px/1.5 system-ui,sans-serif}.desktop-nav a:hover,.nav-menu a:hover{text-decoration:underline;color:var(--brand-accent)}.nav-menu{display:none}.nav-menu summary{cursor:pointer;list-style:none;padding:10px 14px;border:1px solid #8884;border-radius:999px;font:13px system-ui}
.section{display:flex;align-items:center;gap:clamp(24px,6vw,80px);min-height:var(--section-height);padding:var(--section-padding) clamp(24px,8vw,120px);background:var(--section-bg);color:var(--section-fg);border-radius:var(--section-radius);overflow:hidden}.section:nth-child(even){background:color-mix(in srgb,var(--section-bg) 92%,var(--brand-primary))}
.section.layout-stack{display:block}.section.layout-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}.section-copy{max-width:760px;flex:1}.section-image{display:block;width:min(42%,560px);max-height:520px;object-fit:cover;border-radius:var(--radius)}.eyebrow{font:700 11px/1.5 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--section-accent)}h1{max-width:950px;margin:14px 0;font-size:clamp(2rem,5vw,4.4rem);line-height:1.04;letter-spacing:-.04em}.body{max-width:680px;color:color-mix(in srgb,var(--section-fg) 76%,transparent);font:400 16px/1.8 system-ui,sans-serif}.button{display:inline-flex;align-items:center;min-height:46px;margin-top:22px;padding:0 22px;border-radius:999px;background:var(--brand-primary);color:var(--page-bg);text-decoration:none;font:700 13px system-ui}
footer{padding:42px clamp(24px,8vw,120px);background:var(--page-fg);color:var(--page-bg);font:13px/1.7 system-ui,sans-serif}footer p{max-width:760px;opacity:.75}footer small{display:block;margin-top:18px;opacity:.6}
@media(max-width:720px){.site-header{min-height:64px;padding:10px 18px}.desktop-nav{display:none}.nav-menu{display:block;position:relative}.nav-menu[open] nav{position:absolute;right:0;top:44px;display:grid;min-width:190px;padding:16px;border:1px solid #ffffff55;border-radius:16px;background:var(--page-bg);box-shadow:0 18px 40px #0b142522}.section{display:flex;flex-direction:column;align-items:stretch;min-height:unset;padding:var(--mobile-padding,24px) 24px}.section.layout-grid{grid-template-columns:1fr}.section-image{width:100%;max-height:300px}h1{font-size:clamp(2rem,10vw,3.3rem)}.body{font-size:15px}}
`;

const script = `document.querySelectorAll('.nav-menu').forEach(menu=>{document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.removeAttribute('open')})});`;

export function generateStaticSiteFiles(project: StudioProject): ExportFile[] {
  if (!project.pages.length) throw new Error("Cannot export an empty website.");
  const { files: assets, lookup } = makeAssetFiles(project);
  const pagePaths = new Set<string>();
  const pageFiles = project.pages.map((page) => {
    const path = safeSlug(page.slug);
    if (pagePaths.has(path)) throw new Error("Each website page must have a unique URL before export.");
    pagePaths.add(path);
    return { path, data: utf8(renderPage(project, page, path, lookup)) };
  });
  const projectJson = utf8(JSON.stringify(project, null, 2));
  const mark = escapeHtml(project.tradingName.slice(0, 1) || "W");
  const favicon = utf8(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${escapeHtml(project.tokens.primary)}"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="38" font-weight="700" fill="${escapeHtml(project.tokens.background)}">${mark}</text></svg>`);
  const readme = utf8(`# ${project.tradingName} — static website export

This self-contained website was exported from WEALTH OS Studio.

## Deploy

Upload the contents of this folder to any static web host or serve it locally
with any static file server. Open \`index.html\` to preview. No application
server, database, build tool, credentials or paid service is required.

## Pages and assets

- Each page is an independent HTML document with metadata and responsive CSS.
- Uploaded site assets are in \`assets/\`.
- \`wealth-os-project.json\` is the editable source backup. Import it from
  WEALTH OS Studio to continue editing.
- Update \`assets/site.css\` to make hand-written changes after export.

The export is static. Forms, client logins and financial data integrations
require separately configured trusted services and are not included.
`);
  return [
    ...pageFiles,
    ...assets,
    { path: "assets/site.css", data: utf8(stylesheet) },
    { path: "assets/site.js", data: utf8(script) },
    { path: "favicon.svg", data: favicon },
    { path: "wealth-os-project.json", data: projectJson },
    { path: "README.md", data: readme },
  ];
}

export function exportStaticWebsiteZip(project: StudioProject) {
  const files = generateStaticSiteFiles(project);
  return createZip(files);
}
