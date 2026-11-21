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

  it("creates private tenant-scoped allowance tables and seeds March tax years", async () => {
    const sql = await readFile(
      path.join(process.cwd(), "supabase/migrations/202611220001_tax_allowance_tracker.sql"),
      "utf8",
    );
    expect(sql).toMatch(/create table if not exists public\.tax_allowance_rules/i);
    expect(sql).toMatch(/create table if not exists public\.client_contribution_logs/i);
    expect(sql).toMatch(/tenant_id text not null/i);
    expect(sql).toMatch(/alter table public\.client_contribution_logs enable row level security/i);
    expect(sql).toMatch(/\('default', 'TFSA', '2026\/2027', '2026-03-01', '2027-02-28'/i);
  });
});
