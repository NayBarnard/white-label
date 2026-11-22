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
});
