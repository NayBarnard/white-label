import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("client transaction account type migration", () => {
  it("adds a nullable account type restricted to the supported account categories", async () => {
    const sql = await readFile(
      path.join(process.cwd(), "supabase/migrations/202611170002_client_transaction_account_type.sql"),
      "utf8",
    );
    expect(sql).toMatch(/add column if not exists account_type text/i);
    expect(sql).toMatch(/account_type is null or account_type in \('Unit Trust', 'TFSA', 'RA'\)/i);
  });
});
