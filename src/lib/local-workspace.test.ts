import { describe, expect, it } from "vitest";
import { restoreWorkspaceBackup } from "./local-workspace";

function serialized(records: unknown[]) {
  return JSON.stringify({ format: "wealth-os-local-workspace", schemaVersion: 1, records });
}

describe("local workspace backup validation", () => {
  it("rejects malformed, unsupported, or unknown records before replacing local data", async () => {
    await expect(restoreWorkspaceBackup("{")).rejects.toThrow("valid JSON");
    await expect(restoreWorkspaceBackup(JSON.stringify({ format: "other", schemaVersion: 1, records: [] }))).rejects.toThrow("supported WEALTH OS");
    await expect(restoreWorkspaceBackup(serialized([{ key: "unrelated", value: [] }]))).rejects.toThrow("invalid or duplicate");
    await expect(restoreWorkspaceBackup(serialized([{ key: "wealth-os:workspace:unknown", value: [] }]))).rejects.toThrow("invalid unknown data");
  });

  it("rejects records with missing clients, invalid money, or missing document blobs", async () => {
    const records = [
      { key: "wealth-os:workspace:people", value: [{ id: "client-1", name: "Client", email: "client@example.test", role: "Client", status: "Active", createdAt: "2026-01-01" }] },
      { key: "wealth-os:workspace:holdings", value: [{ id: "holding-1", clientId: "client-1", name: "Holding", assetClass: "Equity", valueMinor: -1, currency: "USD", valuedAt: "2026-01-01" }] },
    ];
    await expect(restoreWorkspaceBackup(serialized(records))).rejects.toThrow("invalid holdings data");

    const missingClient = [
      { key: "wealth-os:workspace:people", value: [] },
      { key: "wealth-os:workspace:tasks", value: [{ id: "task-1", clientId: "missing", title: "Task", dueDate: "2026-01-01", status: "Open", createdAt: "2026-01-01" }] },
    ];
    await expect(restoreWorkspaceBackup(serialized(missingClient))).rejects.toThrow("refers to a missing client");

    const missingFile = [
      { key: "wealth-os:workspace:people", value: [{ id: "client-1", name: "Client", email: "client@example.test", role: "Client", status: "Active", createdAt: "2026-01-01" }] },
      { key: "wealth-os:workspace:documents", value: [{ id: "document-1", clientId: "client-1", name: "statement.pdf", category: "Statement", mimeType: "application/pdf", size: 12, fileId: "file-1", createdAt: "2026-01-01" }] },
    ];
    await expect(restoreWorkspaceBackup(serialized(missingFile))).rejects.toThrow("missing its file");
  });
});
