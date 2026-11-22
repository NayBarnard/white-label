// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fundFacts } from "@/data/firmData";
import { FundFactsPanel } from "./FundFactsPanel";

describe("FundFactsPanel", () => {
  it("renders nothing when no facts are published", () => {
    const { container } = render(<FundFactsPanel strategyName="your firm Balanced Strategy" facts={fundFacts.balanced} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders key facts, an allocation chart, cost dates, and holdings when supplied", () => {
    render(
      <FundFactsPanel
        strategyName="your firm Balanced Strategy"
        facts={{
          ...fundFacts.balanced,
          isin: "ZA0000000000",
          managementCompany: { name: "Example Management Company" },
          assetAllocation: [{ name: "Local equities", percent: 45 }],
          assetAllocationAsAt: "30 June 2026",
          tradingCosts: { ter: 0.75, asAt: "31 May 2026" },
          topHoldings: ["Example holding"],
          source: "Approved fund fact sheet",
        }}
      />,
    );

    expect(screen.getByText("Key facts")).toBeInTheDocument();
    expect(screen.getByText("ZA0000000000")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "your firm Balanced Strategy asset allocation donut chart" })).toBeInTheDocument();
    expect(screen.getByText("As at 30 June 2026 · Source: Approved fund fact sheet")).toBeInTheDocument();
    expect(screen.getByText("As at 31 May 2026")).toBeInTheDocument();
    expect(screen.getByText("Example holding")).toBeInTheDocument();
  });
});
