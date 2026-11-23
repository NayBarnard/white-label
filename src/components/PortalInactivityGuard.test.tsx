// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortalInactivityGuard } from "./PortalInactivityGuard";

const state = vi.hoisted(() => ({
  role: "client",
  replace: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
}));

vi.mock("@/components/PortalSessionProvider", () => ({
  usePortalSession: () => ({
    status: "signed-in",
    role: state.role,
    fullName: "Test User",
    email: "test@example.com",
    totalInvested: null,
    assetValue: null,
  }),
}));

vi.mock("@/lib/supabase/portal", () => ({
  getPortalSupabaseClient: () => ({ auth: { signOut: state.signOut } }),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: { div: "div", section: "section" },
  useReducedMotion: () => true,
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useSpring: (value: unknown) => value,
  useTransform: () => 1,
}));

describe("PortalInactivityGuard", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    ["client", "/portal/dashboard"],
    ["adviser", "/advisor/login"],
    ["admin", "/admin/login"],
    ["platform_operator", "/platform/login"],
  ])("warns before signing out an inactive %s session", async (role, destination) => {
    vi.useFakeTimers();
    state.role = role;
    state.replace.mockReset();
    state.signOut.mockReset().mockResolvedValue({ error: null });
    render(<PortalInactivityGuard />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    });
    expect(screen.getByRole("dialog", { name: "Session expiring" })).toBeInTheDocument();
    expect(screen.getByText(/signed out in 60 seconds due to inactivity/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign out now" }));
      await Promise.resolve();
    });
    expect(state.signOut).toHaveBeenCalledOnce();
    expect(state.replace).toHaveBeenCalledWith(destination);
  });

  it("resets the countdown when the user chooses to stay signed in", async () => {
    vi.useFakeTimers();
    state.role = "client";
    state.replace.mockReset();
    state.signOut.mockReset().mockResolvedValue({ error: null });
    render(<PortalInactivityGuard />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));
    expect(screen.queryByRole("dialog", { name: "Session expiring" })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    });
    expect(screen.getByRole("dialog", { name: "Session expiring" })).toBeInTheDocument();
    expect(state.signOut).not.toHaveBeenCalled();
  });
});
