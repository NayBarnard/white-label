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

describe("PortalSessionProvider", () => {
  beforeEach(() => {
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
});
