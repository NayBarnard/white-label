// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortalNavigation } from "./PortalNavigation";

const state = vi.hoisted(() => ({
  pathname: "/portal",
  role: "client",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
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
  getPortalSupabaseClient: () => null,
}));

function openMenu() {
  render(<PortalNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "Open portal menu" }));
}

describe("PortalNavigation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("provides every client section before the utility actions in a mobile sheet", async () => {
    state.pathname = "/portal";
    state.role = "client";
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    openMenu();
    const dialog = screen.getByRole("dialog", { name: "Client menu" });
    const links = within(dialog).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Overview",
      "Holdings & Simulator",
      "Document Vault",
      "Requests & Adviser",
      "Statements",
      "Performance Reports",
      "Messages",
    ]);
    expect(within(dialog).getByRole("button", { name: "Chat with your firm AI Assistant" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Install app" })).toBeDisabled();
    expect(within(dialog).getByText("Account")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close portal menu" })).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Open portal menu" })).toHaveFocus());
    expect(document.body.style.overflow).toBe("");
  });

  it("shows adviser sections and does not expose the admin group to advisers", () => {
    state.pathname = "/advisor";
    state.role = "adviser";
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: !query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    openMenu();
    const menu = screen.getByRole("navigation", { name: "adviser sections" });
    expect(within(menu).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/advisor#dashboard");
    expect(within(menu).getByRole("link", { name: "Advisor Resources" })).toHaveAttribute("href", "/advisor#advisor-resources");
    expect(screen.queryByText("Admin", { selector: "p" })).not.toBeInTheDocument();
    expect(screen.queryByText("Admin", { selector: ".portal-menu-admin-badge" })).not.toBeInTheDocument();
  });

  it("shows the requested admin menu group only for admins", () => {
    state.pathname = "/admin";
    state.role = "admin";
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: !query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    openMenu();
    const menu = screen.getByRole("navigation", { name: "admin sections" });
    expect(within(menu).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Clients",
      "Portfolios",
      "Documents",
      "Support",
      "People",
      "Manager updates",
      "Platforms & codes",
      "Setup",
    ]);
    expect(screen.getByText("Admin", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Admin", { selector: ".portal-menu-admin-badge" })).toBeInTheDocument();
  });
});
