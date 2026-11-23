// @vitest-environment jsdom

import { type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FundComparison } from "@/components/FundComparison";

vi.mock("framer-motion", async () => {
  const { createElement: create } = await import("react");
  const motion = new Proxy(
    {},
    {
      get: (_target, tag) =>
        ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => {
          const domProps = { ...props };
          delete domProps.layoutId;
          delete domProps.transition;
          return create(tag as string, domProps, children);
        },
    },
  );
  return { motion, useReducedMotion: () => true };
});

vi.mock("@/components/PerformanceChart", () => ({
  PerformanceChart: () => <div data-testid="performance-chart" />,
}));

function jsonResponse(value: unknown) {
  return { ok: true, json: async () => value } as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("FundComparison", () => {
  it("shows a clear empty state when the selected fund has no NAV history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({
          source: "your firm fund data",
          updatedAt: null,
          funds: [
            { id: "balanced", name: "Balanced", benchmark: "Benchmark", inceptionDate: null },
            { id: "growth", name: "Growth", benchmark: "Benchmark", inceptionDate: null },
          ],
          observations: [
            {
              fundId: "growth",
              date: "2025-01-01",
              nav: 100,
              benchmarkNav: 100,
              benchmarkName: "Benchmark",
            },
          ],
        }),
      ),
    );

    render(<FundComparison />);

    expect(await screen.findByText("No NAV observations have been published for this fund.")).toBeInTheDocument();
    expect(screen.queryByTestId("performance-chart")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading fund data…")).not.toBeInTheDocument();
    expect(screen.queryByText(/supabase|sync|database|postgres/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a retryable error and retries the failed request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(
        jsonResponse({ source: "your firm fund data", updatedAt: null, funds: [], observations: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<FundComparison />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load fund performance right now. Please try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("No published funds or NAV observations are available.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not invent a fallback fund catalogue when no published funds are available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ source: "Published performance data", updatedAt: null, funds: [], observations: [] }),
      ),
    );

    render(<FundComparison />);

    expect(await screen.findByText("No published funds or NAV observations are available.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Balanced/ })).not.toBeInTheDocument();
  });

  it("times out a stalled request and exposes the retry action", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("The request timed out.", "AbortError")),
            );
          }),
      ),
    );

    render(<FundComparison />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load fund performance right now. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
