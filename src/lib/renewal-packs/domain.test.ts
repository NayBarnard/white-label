import { describe, expect, it } from "vitest";
import {
  isAllowedRenewalFile,
  isRenewalSubmissionComplete,
  parseRenewalPackInput,
  parseRenewalResponse,
} from "./domain";

describe("renewal pack domain validation", () => {
  it("accepts bounded pack data and rejects invalid expiry, item types, and excessive items", () => {
    const valid = {
      title: "Annual review",
      expiresInDays: 14,
      items: [{ label: "Proof of address", type: "document", required: true }],
    };
    expect(parseRenewalPackInput(valid)).toEqual(valid);
    expect(parseRenewalPackInput({ ...valid, expiresInDays: 0 })).toBeNull();
    expect(parseRenewalPackInput({
      ...valid,
      items: [{ label: "Anything", type: "unknown", required: true }],
    })).toBeNull();
    expect(parseRenewalPackInput({
      ...valid,
      items: Array.from({ length: 21 }, (_, index) => ({ label: `Item ${index}`, type: "document", required: true })),
    })).toBeNull();
    expect(parseRenewalPackInput({
      ...valid,
      items: [{ label: "Optional item", type: "document", required: false }],
    })).toBeNull();
  });

  it("requires complete required checklist entries before submission", () => {
    expect(isRenewalSubmissionComplete([
      { required: true, status: "submitted", object_path: "tenant/client/pack/item/evidence.pdf" },
      { required: false, status: "pending" },
    ])).toBe(true);
    expect(isRenewalSubmissionComplete([{ required: true, status: "submitted" }])).toBe(false);
    expect(isRenewalSubmissionComplete([{ required: true, status: "rejected", response_text: "Updated" }])).toBe(false);
    expect(isRenewalSubmissionComplete([{ required: true, status: "verified", response_text: "Confirmed" }])).toBe(true);
  });

  it("validates response length and allowed upload types and size", () => {
    expect(parseRenewalResponse("  Confirmed  ")).toBe("Confirmed");
    expect(parseRenewalResponse(" ".repeat(3))).toBeNull();
    expect(parseRenewalResponse("x".repeat(2001))).toBeNull();
    expect(isAllowedRenewalFile("application/pdf", 10 * 1024 * 1024)).toBe(true);
    expect(isAllowedRenewalFile("application/pdf", 10 * 1024 * 1024 + 1)).toBe(false);
    expect(isAllowedRenewalFile("text/plain", 10)).toBe(false);
  });
});
