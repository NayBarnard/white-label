import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const realPdfPath = path.join(process.cwd(), "public", "documents", "placeholder-balanced-fact-sheet.pdf");
let originalFile: Buffer | undefined;

beforeEach(async () => {
  originalFile = await readFile(realPdfPath).catch(() => undefined);
});
afterEach(async () => {
  if (originalFile) await writeFile(realPdfPath, originalFile);
  else await unlink(realPdfPath).catch(() => undefined);
});

describe("document downloads", () => {
  it("serves an official PDF file when present", async () => {
    await mkdir(path.dirname(realPdfPath), { recursive: true });
    const pdfBytes = Buffer.from("%PDF-test-file");
    await writeFile(realPdfPath, pdfBytes);

    const response = await GET(new Request("https://example.test/api/documents/placeholder-balanced-fact-sheet"), {
      params: Promise.resolve({ slug: "placeholder-balanced-fact-sheet" }),
    });

    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdfBytes);
  });

  it("returns 404 for an unknown slug", async () => {
    const response = await GET(new Request("https://example.test/api/documents/unknown"), {
      params: Promise.resolve({ slug: "../../outside" }),
    });
    expect(response.status).toBe(404);
  });
});
