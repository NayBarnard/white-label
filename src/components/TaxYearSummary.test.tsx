// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { taxYearLimits } from "@/data/firmData";
import { TaxYearSummary } from "./TaxYearSummary";

afterEach(cleanup);

describe("TaxYearSummary", () => {
  it("shows verified limits and PLACEHOLDER BRAND TFSA contributions during tax-year-end season", () => {
    render(
      <TaxYearSummary
        limits={taxYearLimits}
        date={new Date("2026-12-01T12:00:00Z")}
        transactions={[
          { account_type: "TFSA", amount: 10_000, status: "Completed", transacted_at: "2026-03-01T12:00:00Z" },
          { account_type: "TFSA", amount: 3_000, status: "Pending", transacted_at: "2026-04-01T12:00:00Z" },
        ]}
      />,
    );

    expect(screen.getByText(taxYearLimits.taxYearLabel)).toBeInTheDocument();
    expect(screen.getByText(/89\s*days left/)).toBeInTheDocument();
    expect(screen.getByText(/R\s*10\s*000,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\s*36\s*000,00/)).toBeInTheDocument();
    expect(screen.getByText(/Verified on 2026-11-17/)).toBeInTheDocument();
    expect(screen.getByText(/This only counts contributions made through placeholder/)).toBeInTheDocument();
    expect(screen.queryByText(/Retirement annuity deductions/)).not.toBeInTheDocument();
  });

  it("omits the seasonal card outside December through February but keeps the note", () => {
    render(<TaxYearSummary limits={taxYearLimits} transactions={[]} date={new Date("2027-03-01T12:00:00Z")} />);
    expect(screen.queryByText(taxYearLimits.taxYearLabel)).not.toBeInTheDocument();
    expect(screen.getByText(/This only counts contributions made through placeholder/)).toBeInTheDocument();
  });
});
