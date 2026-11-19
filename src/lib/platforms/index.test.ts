import { describe, expect, it } from "vitest";
import {
  classifyPlatformQuery,
  isAvailabilityStale,
  isIsinChecksumValid,
  isIsinFormatValid,
  normalizeIsin,
  normalizeJseCode,
  PLATFORM_REVERIFICATION_DAYS,
  searchPlatformRecords,
  type PlatformSearchRecord,
} from "./index";

const record = (
  overrides: {
    shareClass?: Partial<PlatformSearchRecord["shareClass"]>;
    platform?: Partial<PlatformSearchRecord["platform"]>;
    availability?: Partial<PlatformSearchRecord["availability"]>;
  } = {},
): PlatformSearchRecord => ({
  shareClass: {
    id: "share-1",
    fundName: "Sample Fund",
    shareClass: "Class A",
    jseCode: "SAMP1",
    isin: "ZAE000000000",
    isActive: true,
    ...overrides.shareClass,
  },
  platform: { id: "platform-1", name: "Example Platform", isActive: true, ...overrides.platform },
  availability: {
    id: "availability-1",
    shareClassId: "share-1",
    platformId: "platform-1",
    status: "verified_available",
    platformFundCode: "EXM123",
    source: "Approved statement",
    sourceUrl: null,
    verifiedBy: "Operations",
    verifiedOn: "2026-10-01",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides.availability,
  },
});

describe("platform lookup", () => {
  it("normalizes ISIN and JSE input and verifies ISIN format and checksum separately", () => {
    expect(normalizeIsin(" zae-000 000 017 ")).toBe("ZAE000000017");
    expect(isIsinFormatValid("US0378331005")).toBe(true);
    expect(isIsinChecksumValid("US0378331005")).toBe(true);
    expect(isIsinChecksumValid("US0378331006")).toBe(false);
    expect(isIsinFormatValid("ZAE0000017")).toBe(false);
    expect(normalizeJseCode(" samp-1 ")).toBe("SAMP1");
  });

  it("classifies recognised ISIN and JSE queries", () => {
    expect(classifyPlatformQuery("ZAE000000017")).toBe("isin");
    expect(classifyPlatformQuery("SAMP1", [record()])).toBe("jse_code");
    expect(classifyPlatformQuery("Sample", [record()])).toBe("name");
  });

  it("ranks exact identifiers first and puts verified availability before other statuses", () => {
    const exact = record();
    const nameMatch = record({
      shareClass: { id: "share-2", fundName: "Sample Growth Fund", jseCode: null, isin: null },
      platform: { id: "platform-2", name: "Other Platform" },
      availability: {
        id: "availability-2",
        status: "not_verified",
        platformFundCode: null,
      },
    });
    const unavailable = record({
      shareClass: { id: "share-3", fundName: "Another Fund", jseCode: "OTHR1", isin: null },
      platform: { id: "platform-3", name: "Third Platform" },
      availability: {
        id: "availability-3",
        status: "verified_unavailable",
        platformFundCode: null,
      },
    });
    expect(searchPlatformRecords([nameMatch, exact], "SAMP1")).toEqual([exact]);
    expect(searchPlatformRecords([nameMatch, exact], "Sample")[0]).toEqual(exact);
    expect(searchPlatformRecords([nameMatch, exact, unavailable], "").map(({ availability }) => availability.status))
      .toEqual(["verified_available", "verified_unavailable", "not_verified"]);
  });

  it("marks only entries older than 180 days for re-verification", () => {
    const now = new Date("2026-11-18T12:00:00.000Z");
    expect(PLATFORM_REVERIFICATION_DAYS).toBe(180);
    expect(isAvailabilityStale("2026-05-22", now)).toBe(false);
    expect(isAvailabilityStale("2026-05-21", now)).toBe(true);
    expect(isAvailabilityStale(null, now)).toBe(false);
  });
});
