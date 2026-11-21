// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@puckeditor/core", () => ({
  Puck: () => null,
  Render: () => null,
}));

import { ClientDashboard } from "@/components/ClientDashboard";
import { HomePageStudio } from "@/components/home/HomePageStudio";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("visitor-facing unavailable states", () => {
  it("keeps the Studio on generic browser-only placeholders without requesting real data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { container } = render(
      <>
        <ClientDashboard />
        <HomePageStudio />
      </>,
    );

    expect(
      screen.getByText("The client portal is unavailable right now. Please try again or contact placeholder."),
    ).toBeInTheDocument();
    expect(await screen.findByText(/No real business or customer data is loaded/)).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/supabase|service role|postgres/i);
  });
});
