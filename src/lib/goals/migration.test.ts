import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("client goals migration RLS", () => {
  it("scopes every client operation to its authenticated owner and checks goal bounds", async () => {
    const sql = await readFile(
      path.join(process.cwd(), "supabase/migrations/202611170003_client_goals.sql"),
      "utf8",
    );
    expect(sql).toMatch(/alter table public\.client_goals enable row level security/i);
    expect(sql).toMatch(/target_amount >= 0/);
    expect(sql).toMatch(/monthly_contribution >= 0/);
    expect(sql).toMatch(/assumed_annual_growth_percent between 0 and 30/);
    expect(sql).toMatch(/target_date > current_date/i);
    expect(sql.match(/user_id = \(select auth\.uid\(\)\)/g)).toHaveLength(5);
  });
});
