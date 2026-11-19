import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("manager-updates migration access policy", () => {
  it("enables row security for published reads without granting client writes", async () => {
    const sql = await readFile(
      path.join(process.cwd(), "supabase/migrations/202611170001_manager_updates.sql"),
      "utf8",
    );
    expect(sql).toMatch(/alter table public\.manager_updates enable row level security/i);
    expect(sql).toMatch(/for select to authenticated\s+using \(status = 'published'\)/i);
    expect(sql).toMatch(/revoke all on public\.manager_updates from anon, authenticated/i);
    expect(sql).not.toMatch(/create policy[^;]+for (insert|update|delete) to authenticated/i);
    expect(sql).toMatch(/insert into storage\.buckets[\s\S]+?false/);
    expect(sql).toMatch(/manager_updates\.status = 'published'/);
  });

  it("adds review, approval, scheduled publication and archive states without removing legacy records", async () => {
    const sql = await readFile(
      path.join(process.cwd(), "supabase/migrations/202611190001_insights_research_workflow.sql"),
      "utf8",
    );
    expect(sql).toMatch(/add column if not exists public_slug/i);
    expect(sql).toMatch(/status in \('draft', 'internal_review', 'approved', 'published', 'archived'\)/i);
    expect(sql).toMatch(/add column if not exists scheduled_at/i);
    expect(sql).toMatch(/add column if not exists checksum_sha256/i);
    expect(sql).toMatch(/create index if not exists site_documents_published_library_idx/i);
    expect(sql).not.toMatch(/delete from public\.(manager_updates|site_documents)/i);
  });
});
