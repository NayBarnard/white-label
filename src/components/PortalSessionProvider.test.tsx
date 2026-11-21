// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortalSessionProvider, usePortalSession } from "./PortalSessionProvider";

const mocks = vi.hoisted(() => ({
  authListener: null as
    | ((event: string, session: { user: { id: string; email: string; user_metadata: { full_name: string } } }) => void)
    | null,
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  pathname: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.pathname,
}));

vi.mock("@/lib/supabase/portal", () => ({
  getPortalSupabaseClient: () => ({
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: mocks.from,
  }),
}));

const user = {
  id: "client-1",
  email: "client@example.com",
  user_metadata: { full_name: "Client Name" },
};

function PortalSessionStatus() {
  return <output>{usePortalSession().status}</output>;
}

describe("PortalSessionProvider", () => {
  beforeEach(() => {
    mocks.pathname.mockReturnValue("/");
    mocks.getUser.mockClear();
    mocks.onAuthStateChange.mockClear();
    mocks.from.mockClear();
    mocks.authListener = null;
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    mocks.onAuthStateChange.mockImplementation((callback) => {
      mocks.authListener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mocks.from.mockImplementation((table: string) => {
      const result = { data: [], error: null };
      return {
        select: () => ({
          eq: () =>
            table === "client_portfolios"
              ? Promise.resolve(result)
              : { eq: () => ({ gt: () => Promise.resolve(result) }) },
        }),
      };
    });
  });

  it("does not return to loading on another auth event for the signed-in user", async () => {
    const observedStatuses: string[] = [];
    function StatusObserver() {
      const { status } = usePortalSession();
      observedStatuses.push(status);
      return <output>{status}</output>;
    }

    render(
      <PortalSessionProvider>
        <StatusObserver />
      </PortalSessionProvider>,
    );

    await waitFor(() => expect(screen.getByText("signed-in")).toBeInTheDocument());
    observedStatuses.length = 0;

    act(() => {
      mocks.authListener?.("TOKEN_REFRESHED", { user });
    });

    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(4));
    expect(observedStatuses).not.toContain("loading");
  });

  it("does not initialize Supabase on the Studio route", () => {
    mocks.pathname.mockReturnValue("/studio");
    render(
      <PortalSessionProvider>
        <PortalSessionStatus />
      </PortalSessionProvider>,
    );

    expect(screen.getByText("signed-out")).toBeInTheDocument();
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.onAuthStateChange).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
