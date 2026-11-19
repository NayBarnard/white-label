// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdviserPlatformsPage } from "./AdviserPlatformsPage";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: { div: "div", section: "section" },
  useReducedMotion: () => true,
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useSpring: (value: unknown) => value,
  useTransform: () => 1,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdviserPlatformsPage", () => {
  it("shows the exact empty state, disclaimer, recognized query, and search placeholder", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        items: [],
        recognizedQuery: null,
        emptyMessage: "No platform availability has been published yet",
      }), { status: 200 }),
    ));
    render(<AdviserPlatformsPage />);

    const search = screen.getByRole("textbox", { name: "Search by fund name, ISIN or JSE code" });
    expect(search).toHaveAttribute("placeholder", "Search by fund name, ISIN or JSE code");
    expect(search).toHaveFocus();
    expect(await screen.findByText("No platform availability has been published yet")).toBeInTheDocument();
    expect(screen.getByText("Information for authorised financial advisers. Always confirm codes and availability with the platform before placing a transaction.")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(search, { target: { value: "ZA1234567890" } });
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(screen.getByText("Recognized query: ISIN")).toBeInTheDocument();
  });
});
