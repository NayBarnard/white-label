// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WealthPlanningLab } from "./WealthPlanningLab";

describe("WealthPlanningLab persistence feedback", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("reports hosted persistence failures while retaining the local scenario", async () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_STORAGE_MODE", "supabase");
    render(<WealthPlanningLab />);

    fireEvent.click(screen.getByRole("button", { name: "Save scenario" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "no hosted save is confirmed",
    );
    expect(screen.getByText("Base scenario")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/wealth-os/scenarios",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("continues to save a local scenario without calling hosted APIs in standalone mode", () => {
    render(<WealthPlanningLab />);

    fireEvent.click(screen.getByRole("button", { name: "Save scenario" }));

    expect(screen.getByText("Base scenario")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps reported financial inputs unknown until entered", () => {
    render(<WealthPlanningLab />);

    expect(screen.getByLabelText(/Reported monthly surplus/)).toHaveValue(null);
    expect(screen.getByLabelText(/Reported remaining tax allowance/)).toHaveValue(null);
    expect(screen.getByText("No holdings entered; no holding-risk findings are inferred.")).toBeInTheDocument();
    expect(screen.getByText("No relationship entities recorded.")).toBeInTheDocument();
    expect(screen.getByText("No knowledge records are available.")).toBeInTheDocument();
    expect(screen.queryByText("Fictional beneficiary — needs verification")).not.toBeInTheDocument();
    expect(screen.queryByText("Approved review process")).not.toBeInTheDocument();
  });

  it("analyses reported holdings and stores relationship and knowledge records only after user entry", () => {
    render(<WealthPlanningLab />);

    fireEvent.change(screen.getByLabelText("Holding name"), { target: { value: "Reported equity fund" } });
    fireEvent.change(screen.getByLabelText("Asset class"), { target: { value: "Equity" } });
    fireEvent.change(screen.getByLabelText("Holding currency (3-letter code)"), { target: { value: "USD" } });
    fireEvent.change(screen.getByLabelText("Reported value (R)"), { target: { value: "600000" } });
    const holdingForm = screen.getByRole("button", { name: "Add reported holding" }).closest("form");
    if (!holdingForm) throw new Error("Reported holding form was not rendered.");
    fireEvent.submit(holdingForm);
    expect(screen.getByText(/Reported equity fund · Equity · USD · R/)).toBeInTheDocument();
    expect(screen.getByText("High Equity concentration")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Entity label"), { target: { value: "Client beneficiary" } });
    fireEvent.change(screen.getByLabelText("Relationship type"), { target: { value: "Beneficiary" } });
    fireEvent.click(screen.getByRole("button", { name: "Add relationship record" }));
    expect(screen.getByText("Client beneficiary")).toBeInTheDocument();
    expect(screen.getByText("Type: Beneficiary · Verification: not verified")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Record title"), { target: { value: "Adviser review policy" } });
    fireEvent.change(screen.getByLabelText("Summary"), { target: { value: "Review before making a recommendation." } });
    fireEvent.change(screen.getByLabelText("Source reference"), { target: { value: "Firm policy 2026-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Add sourced knowledge record" }));
    expect(screen.getByText("Adviser review policy · not approved")).toBeInTheDocument();
    expect(screen.getByText("Source: Firm policy 2026-01")).toBeInTheDocument();
  });
});
