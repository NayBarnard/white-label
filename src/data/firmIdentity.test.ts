import { readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".webmanifest",
  ".xml",
  ".yaml",
  ".yml",
]);

function textFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return textFilesUnder(path);
    return textExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

function isTestFile(path: string) {
  return /\.test\.[^.]+$|\.spec\.[^.]+$/.test(path);
}

function filesContaining(paths: string[], phrase: string) {
  return paths.filter((path) => readFileSync(path, "utf8").includes(phrase));
}

describe("published firm identity wording", () => {
  it("keeps the regulatory notice in firmData only", () => {
    const sourceFiles = textFilesUnder(resolve("src")).filter(
      (path) =>
        !path.endsWith(join("data", "firmData.ts")) &&
        !isTestFile(path),
    );
    const fspNo622 = "FSP No. " + "622";
    const fsp622 = "FSP " + "622";

    expect([
      ...filesContaining(sourceFiles, fspNo622),
      ...filesContaining(sourceFiles, fsp622),
    ]).toEqual([]);
  });

  it("does not publish the prohibited firm name in text files", () => {
    const directories = ["src", "docs", "public"].map((directory) =>
      textFilesUnder(resolve(directory)).filter((path) => !isTestFile(path)),
    );
    const prohibitedName = ["Multi", "Asset"].join(" ");

    expect(
      directories.flatMap((paths) => filesContaining(paths, prohibitedName)),
    ).toEqual([]);
  });
});
