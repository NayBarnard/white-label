import { describe, expect, it } from "vitest";
import {
  canReadLinkedClientRecord,
  searchAdvisorFunds,
  searchAdvisorPlatformListings,
  type AdvisorClientGrant,
  type AdvisorFundSearchRecord,
  type AdvisorPlatformListing,
} from "./model";

const funds: AdvisorFundSearchRecord[] = [
  { id: "balanced", name: "your firm Balanced", strategy: "Moderate to Aggressive", jseCode: null, isin: null },
  { id: "cautious", name: "your firm Cautious", strategy: "Conservative to Cautious", jseCode: null, isin: null },
];

describe("searchAdvisorFunds", () => {
  it("searches published identifiers and fund labels without inventing missing codes", () => {
    expect(searchAdvisorFunds(funds, " cautious ").map(({ id }) => id)).toEqual(["cautious"]);
    expect(searchAdvisorFunds(funds, "isin-that-is-not-published")).toEqual([]);
    expect(searchAdvisorFunds(funds, "")).toHaveLength(2);
  });
});

describe("searchAdvisorPlatformListings", () => {
  it("searches only supplied, verified listings and keeps empty data empty", () => {
    const emptyListings: AdvisorPlatformListing[] = [];
    expect(searchAdvisorPlatformListings(emptyListings, "platform")).toEqual([]);
    expect(searchAdvisorPlatformListings([
      {
        fundId: "test-fund",
        fundName: "Fund A",
        platformName: "Platform A",
        platformFundCode: null,
        jseCode: null,
        isin: null,
        availability: "under_review",
        verifiedAt: null,
      },
    ], "platform a")).toHaveLength(1);
  });
});

describe("canReadLinkedClientRecord", () => {
  const activeGrant: AdvisorClientGrant = {
    status: "active",
    scopes: ["investments"],
    clientConsentedAt: "2026-11-17T08:00:00Z",
    placeholderApprovedAt: "2026-11-17T08:05:00Z",
    revokedAt: null,
  };

  it("requires active status, client consent, your firm approval, and the requested scope", () => {
    expect(canReadLinkedClientRecord(activeGrant, "investments")).toBe(true);
    expect(canReadLinkedClientRecord(activeGrant, "documents")).toBe(false);
    expect(canReadLinkedClientRecord({ ...activeGrant, clientConsentedAt: null }, "investments")).toBe(false);
    expect(canReadLinkedClientRecord({ ...activeGrant, placeholderApprovedAt: null }, "investments")).toBe(false);
    expect(canReadLinkedClientRecord({ ...activeGrant, revokedAt: "2026-11-17T09:00:00Z" }, "investments")).toBe(false);
    expect(canReadLinkedClientRecord({ ...activeGrant, status: "pending_placeholder_approval" }, "investments")).toBe(false);
    expect(canReadLinkedClientRecord({ ...activeGrant, status: "pending_client_consent" }, "investments")).toBe(false);
    expect(canReadLinkedClientRecord(null, "investments")).toBe(false);
  });
});
