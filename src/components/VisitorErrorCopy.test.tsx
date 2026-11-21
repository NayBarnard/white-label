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
  it("uses plain-language messages without provider or database terminology", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Website versions could not be loaded." }),
    } as Response);

    const { container } = render(
      <>
        <ClientDashboard />
        <HomePageStudio />
      </>,
    );

    expect(
      screen.getByText("The client portal is unavailable right now. Please try again or contact placeholder."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Website versions could not be loaded.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/supabase|service role|postgres/i);
  });
});
