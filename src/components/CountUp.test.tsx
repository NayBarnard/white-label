// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CountUp } from "./CountUp";
import { FirmStats } from "./FirmStats";

describe("CountUp", () => {
  it("renders the final value in the server HTML before animation", () => {
    expect(renderToStaticMarkup(<CountUp value={65} />)).toContain(">65</span>");
  });

  it("keeps the final value when reduced motion is preferred", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<CountUp value={65} suffix="+" />);
    expect(screen.getByLabelText("65+")).toHaveTextContent("65+");
    vi.unstubAllGlobals();
  });

  it("hides the satisfied-client tile when its value is null", () => {
    render(<FirmStats />);
    expect(screen.queryByText("Satisfied clients")).not.toBeInTheDocument();
    expect(screen.getByText("Investment strategies")).toBeInTheDocument();
  });
});
