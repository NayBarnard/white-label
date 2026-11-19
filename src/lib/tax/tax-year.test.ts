import { describe, expect, it } from "vitest";
import {
  calculateTfsaContributions,
  getDaysUntilTaxYearEnd,
  getTaxYearPeriod,
  isTaxYearEndSeason,
  remainingTfsaAnnualLimit,
} from "./tax-year";

describe("South African tax-year calculations", () => {
  it("uses leap-year and non-leap-year February boundaries and rolls over on 1 March", () => {
    expect(getTaxYearPeriod(new Date("2024-02-29T12:00:00Z"))).toMatchObject({
      startDate: "2023-03-01",
      endDate: "2024-02-29",
      endDay: 29,
    });
    expect(getTaxYearPeriod(new Date("2025-02-28T12:00:00Z"))).toMatchObject({
      startDate: "2024-03-01",
      endDate: "2025-02-28",
      endDay: 28,
    });
    expect(getTaxYearPeriod(new Date("2024-03-01T12:00:00Z"))).toMatchObject({
      startDate: "2024-03-01",
      endDate: "2025-02-28",
    });
  });

  it("shows the card only from 1 December through the end of February", () => {
    expect(isTaxYearEndSeason(new Date("2026-12-01T12:00:00Z"))).toBe(true);
    expect(isTaxYearEndSeason(new Date("2027-02-28T12:00:00Z"))).toBe(true);
    expect(isTaxYearEndSeason(new Date("2027-03-01T12:00:00Z"))).toBe(false);
    expect(getDaysUntilTaxYearEnd(new Date("2027-02-28T12:00:00Z"))).toBe(0);
  });

  it("sums only completed positive TFSA transactions in the current tax year and floors remaining at zero", () => {
    const contributions = calculateTfsaContributions(
      [
        { account_type: "TFSA", amount: 10_000, status: "Completed", transacted_at: "2026-03-01T00:00:00Z" },
        { account_type: "TFSA", amount: 5_000, status: "Pending", transacted_at: "2026-04-01T00:00:00Z" },
        { account_type: "Unit Trust", amount: 2_000, status: "Completed", transacted_at: "2026-04-01T00:00:00Z" },
        { account_type: "TFSA", amount: -1_000, status: "Completed", transacted_at: "2026-04-01T00:00:00Z" },
        { account_type: "TFSA", amount: 3_000, status: "Completed", transacted_at: "2027-03-01T00:00:00Z" },
      ],
      { startDate: "2026-03-01", endDate: "2027-02-28" },
    );

    expect(contributions).toBe(10_000);
    expect(remainingTfsaAnnualLimit(46_000, contributions)).toBe(36_000);
    expect(remainingTfsaAnnualLimit(46_000, 50_000)).toBe(0);
  });
});
