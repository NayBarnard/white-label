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
}));

import { ClientDashboard } from "@/components/ClientDashboard";
import { HomePageStudio } from "@/components/home/HomePageStudio";

afterEach(() => {
  cleanup();
});

describe("visitor-facing unavailable states", () => {
  it("uses plain-language messages without provider or database terminology", () => {
    const { container } = render(
      <>
        <ClientDashboard />
        <HomePageStudio />
      </>,
    );

    expect(
      screen.getByText("The client portal is unavailable right now. Please try again or contact placeholder."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Website editing is unavailable right now. Please try again later."),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/supabase|service role|postgres/i);
  });
});
