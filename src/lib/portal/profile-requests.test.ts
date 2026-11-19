import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseProfileRequest } from "./profile-requests";

describe("profile and mandate requests", () => {
  it("accepts only the two allowed request types with bounded details", () => {
    expect(parseProfileRequest("Contact Details Update", "  Please update my email.  ")).toEqual({
      requestType: "Contact Details Update",
      details: "Please update my email.",
    });
    expect(parseProfileRequest("Banking Details Change", "Please call me to verify.")).not.toBeNull();
    expect(parseProfileRequest("Bank Details", "Please call me.")).toBeNull();
    expect(parseProfileRequest("Banking Details Change", "  ")).toBeNull();
    expect(parseProfileRequest("Contact Details Update", "x".repeat(1501))).toBeNull();
    expect(parseProfileRequest("Contact Details Update", 123)).toBeNull();
  });

  it("submits these requests to the request table without updating client details", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/components/AuthenticatedClientPortal.tsx"),
      "utf8",
    );
    const start = source.indexOf("async function submitRequest(");
    const end = source.indexOf("async function submitReview(", start);
    const submitHandler = source.slice(start, end);
    expect(submitHandler).toContain('.from("client_portal_requests")');
    expect(submitHandler).toContain(".insert(");
    expect(submitHandler).not.toMatch(/\.update\s*\(/);
  });

  it("extends the request-type constraint without removing existing values", async () => {
    const sql = await readFile(
      path.join(process.cwd(), "supabase/migrations/202611170004_profile_mandate_requests.sql"),
      "utf8",
    );
    for (const type of [
      "Lump Sum Top-Up",
      "Strategy Switch",
      "Debit Order Update",
      "Withdrawal",
      "Portfolio Review",
      "Personal Data Deletion",
      "Contact Details Update",
      "Banking Details Change",
    ]) {
      expect(sql).toContain(`'${type}'`);
    }
  });
});
