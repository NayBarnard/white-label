// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSetupStatus } from "@/components/AdminSetupStatus";
import { getEnvironmentChecks } from "@/lib/admin/setup-status";

describe("AdminSetupStatus", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows environment variable names and status but never their values", async () => {
    const secretValues = [
      "https://private-project.example.invalid",
      "private-anon-key-value",
      "private-service-role-value",
      "https://private-preview.example.invalid",
    ];
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", secretValues[0]);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", secretValues[1]);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", secretValues[2]);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", secretValues[3]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <AdminSetupStatus initialEnvironment={getEnvironmentChecks()} />,
    );

    expect(await screen.findByText("NEXT_PUBLIC_SUPABASE_URL")).toBeInTheDocument();
    expect(screen.getAllByText("Present")).toHaveLength(4);
    expect(await screen.findByText(/Some setup checks are unavailable/)).toBeInTheDocument();
    for (const secret of secretValues) {
      expect(container.textContent).not.toContain(secret);
    }
  });
});
