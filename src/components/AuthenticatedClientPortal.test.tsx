// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticatedClientPortal } from "./AuthenticatedClientPortal";
import { company } from "@/data/firmData";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("recharts", () => {
  const MockChart = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Area: () => null,
    AreaChart: MockChart,
    CartesianGrid: () => null,
    Cell: () => null,
    Legend: () => null,
    Pie: MockChart,
    PieChart: MockChart,
    ResponsiveContainer: MockChart,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

vi.mock("@/lib/supabase/portal", () => ({
  getPortalSupabaseClient: () => ({
    auth: { onAuthStateChange: mocks.onAuthStateChange },
    from: mocks.from,
    storage: { from: vi.fn() },
  }),
}));

function renderPortal(email: string) {
  return render(
    <AuthenticatedClientPortal
      user={{ id: "client-1", email, name: "Portal Client" }}
    />,
  );
}

describe("AuthenticatedClientPortal demo data", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_ACCOUNT_EMAILS", "");
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.from.mockImplementation(() => {
      const result = Promise.resolve({ data: [], error: null });
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        then: result.then.bind(result),
      };
      return query;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("shows a linked-account empty state without sample rand amounts for non-demo clients", async () => {
    const { container } = renderPortal("client@example.com");
    expect(container.querySelector('[role="tablist"]')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/Your portfolio details will appear here once your account is linked/),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(company.phone)).toBeInTheDocument();
    expect(screen.getByText(company.email)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/R\s*\d[\d\s,]*/);

    fireEvent(window, new CustomEvent("placeholder-portal-navigate", { detail: "holdings" }));
    expect(screen.queryByText("Savings goals")).not.toBeInTheDocument();
    expect(mocks.from.mock.calls.some(([table]) => table === "client_goals")).toBe(false);

    fireEvent(window, new CustomEvent("placeholder-portal-navigate", { detail: "documents" }));
    expect(screen.getByLabelText("Filter document category")).toHaveValue("Select");
    fireEvent.change(screen.getByLabelText("Filter document category"), {
      target: { value: "All" },
    });
    expect(screen.queryByText("2026 IT3(b) & IT3(c) Tax Certificate")).not.toBeInTheDocument();

    fireEvent(window, new CustomEvent("placeholder-portal-navigate", { detail: "requests" }));
    expect(
      screen.getByText("Your fees are set out in your signed mandate and fee schedule. Contact the PLACEHOLDER BRAND team for a copy."),
    ).toBeInTheDocument();
    expect(screen.queryByText("0.55%")).not.toBeInTheDocument();
  });

  it("shows illustrative data only for a configured email, ignoring case and whitespace", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_DEMO_ACCOUNT_EMAILS",
      " other@example.com, Demo.Client@example.com ",
    );
    renderPortal("demo.client@example.com");

    await waitFor(() => {
      expect(screen.getByText(/Demonstration figures are illustrative only/)).toBeInTheDocument();
    });
    expect(screen.getByText("Glacier by Sanlam")).toBeInTheDocument();
  });

  it("shows friendly account and request errors without exposing provider details", async () => {
    const providerError = { message: "Postgres service role connection failed" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.from.mockImplementation(() => {
      const result = Promise.resolve({ data: null, error: providerError });
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        then: result.then.bind(result),
      };
      return query;
    });

    const { container } = renderPortal("client@example.com");

    expect(await screen.findByText("We couldn't load your account details right now. Please try again or contact placeholder.")).toBeInTheDocument();
    fireEvent(window, new CustomEvent("placeholder-portal-navigate", { detail: "requests" }));
    expect(screen.getByText("Request history is unavailable right now. Please try again later.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/supabase|service role|postgres/i);
  });
});
