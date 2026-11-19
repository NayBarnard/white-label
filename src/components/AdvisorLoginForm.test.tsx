// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdvisorLoginForm } from "./AdvisorLoginForm";

const { signInWithPassword, signOut, getAAL, replace, refresh } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getAAL: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/supabase/portal", () => ({
  getPortalSupabaseClient: () => ({
    auth: {
      signInWithPassword,
      signOut,
      mfa: { getAuthenticatorAssuranceLevel: getAAL },
    },
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("AdvisorLoginForm", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
    signInWithPassword.mockReset();
    signOut.mockReset().mockResolvedValue({ error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
    getAAL.mockReset().mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2", factors: [] },
      error: null,
    });
    replace.mockReset();
    refresh.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("signs in an authorized adviser and opens the adviser portal", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: "adviser" } } },
      error: null,
    });
    render(<AdvisorLoginForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "advisor@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SIGN IN" }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "advisor@example.com",
        password: "secure-password",
      });
      expect(replace).toHaveBeenCalledWith("/advisor");
      expect(refresh).toHaveBeenCalled();
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs in an authorized admin and opens the admin area", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: "admin" } } },
      error: null,
    });
    render(<AdvisorLoginForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SIGN IN" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/admin");
      expect(refresh).toHaveBeenCalled();
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out clients and explains that staff sign-in is only for staff", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: "client" } } },
      error: null,
    });
    render(<AdvisorLoginForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "client@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "client-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SIGN IN" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "This is staff sign-in only.",
    );
    expect(signOut).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows sign-in as unavailable when authentication is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    render(<AdvisorLoginForm />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Staff sign-in is unavailable right now.",
    );
    expect(screen.getByRole("button", { name: "SIGN IN" })).toBeDisabled();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
