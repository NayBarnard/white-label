import { describe, expect, it } from "vitest";
import {
  parsePortfolioAssignment,
  parseRequestStatus,
  parseSupportReply,
} from "@/lib/admin/validation";

const userId = "73aa3bd9-2a56-4ff7-9e83-0b0c1a8da4a0";
const portfolioId = "a39b219a-7451-4f82-9a7a-f662fcb66b7a";

describe("admin payload validation", () => {
  it("accepts a known portfolio update and rejects unknown fields", () => {
    const update = {
      userId,
      portfolioId,
      label: "Approved portfolio",
      valuationZar: null,
      valuationAsOf: null,
      performancePercent: null,
      performancePeriod: null,
    };

    expect(parsePortfolioAssignment(update)?.portfolioId).toBe(portfolioId);
    expect(parsePortfolioAssignment({ ...update, role: "admin" })).toBeNull();
  });

  it("rejects unknown support-reply and request-status fields", () => {
    expect(parseSupportReply({ userId, message: "Please call me.", internal: true })).toBeNull();
    expect(parseRequestStatus({ status: "In Review", extra: "value" })).toBeNull();
  });
});
