import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { getAppMode, getRouteDisposition, isStandaloneLocalMode } from "./routing";

describe("deployment route isolation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses public mode unless APP_MODE is exactly staff", () => {
    expect(getAppMode(undefined)).toBe("public");
    expect(getAppMode("invalid")).toBe("public");
    expect(getAppMode("staff")).toBe("staff");
  });

  it("enables login-free local demos only without deployment or Supabase configuration", () => {
    expect(isStandaloneLocalMode(undefined, undefined, undefined)).toBe(true);
    expect(isStandaloneLocalMode("public", undefined, undefined)).toBe(false);
    expect(isStandaloneLocalMode(undefined, "https://example.supabase.co", undefined)).toBe(false);
    expect(isStandaloneLocalMode(undefined, undefined, "configured-key")).toBe(false);
  });

  it.each(["/admin", "/admin/platforms", "/advisor", "/studio", "/api/admin/setup", "/api/advisor/platforms"])(
    "hides staff path %s in public mode",
    (pathname) => expect(getRouteDisposition("public", pathname)).toBe("not-found"),
  );

  it("allows only the Studio page in explicitly enabled local demo mode", () => {
    expect(getRouteDisposition("public", "/studio", true)).toBe("allow");
    expect(getRouteDisposition("public", "/studio/anything", true)).toBe("not-found");
    expect(getRouteDisposition("public", "/api/studio/homepage", true)).toBe("not-found");
  });

  it("allows advisor login in public mode for testing", () => {
    expect(getRouteDisposition("public", "/advisor/login")).toBe("allow");
  });

  it("allows local standalone staff routes only when no deployment mode or Supabase credentials are configured", () => {
    expect(getRouteDisposition("public", "/advisor", false, true)).toBe("allow");
    expect(getRouteDisposition("public", "/admin", false, true)).toBe("allow");
    expect(getRouteDisposition("public", "/client", false, true)).toBe("allow");
    expect(getRouteDisposition("public", "/planning", false, true)).toBe("allow");
  });

  it("allows the client portal entry route in public mode", () => {
    expect(getRouteDisposition("public", "/portal/dashboard")).toBe("allow");
  });

  it.each(["/%61dmin", "/admin%2Fplatforms", "/API/ADVISOR/platforms"])(
    "hides encoded or differently-cased staff path %s in public mode",
    (pathname) => expect(getRouteDisposition("public", pathname)).toBe("not-found"),
  );

  it.each(["/about", "/portal", "/api/documents/example", "/api/subscribe", "/documents/policy.pdf", "/sw.js", "/manifest.webmanifest"])(
    "hides public path %s in staff mode",
    (pathname) => expect(getRouteDisposition("staff", pathname)).toBe("not-found"),
  );

  it("allows staff routes and the auth callback in staff mode", () => {
    for (const pathname of ["/admin", "/advisor", "/advisor/login", "/studio", "/api/admin/setup", "/api/advisor/platforms", "/auth/callback"]) {
      expect(getRouteDisposition("staff", pathname)).toBe("allow");
    }
  });

  it("redirects the staff root and returns 404 for blocked requests", async () => {
    vi.stubEnv("APP_MODE", "staff");
    const rootResponse = await proxy(new NextRequest("https://staff.example/"));
    expect(rootResponse.status).toBe(307);
    expect(rootResponse.headers.get("location")).toBe("https://staff.example/advisor/login");

    const publicResponse = await proxy(new NextRequest("https://staff.example/about"));
    expect(publicResponse.status).toBe(404);
    expect(publicResponse.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("returns an API 404 for staff endpoints on the public deployment", async () => {
    vi.stubEnv("APP_MODE", "public");
    const response = await proxy(new NextRequest("https://www.example/api/admin/setup"));
    expect(response.status).toBe(404);
  });

  it("allows the Studio page in public mode only for the explicit local development demo", async () => {
    vi.stubEnv("APP_MODE", "public");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STUDIO_DEMO_MODE", "true");
    const response = await proxy(new NextRequest("http://localhost:3000/studio"));
    expect(response.status).toBe(200);
  });

  it("allows standalone local application routes without configured Supabase or deployment mode", async () => {
    vi.stubEnv("APP_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    for (const pathname of ["/studio", "/advisor", "/admin", "/client", "/planning"]) {
      const response = await proxy(new NextRequest(`http://localhost:3000${pathname}`));
      expect(response.status, pathname).toBe(200);
    }
  });

  it.each([
    ["/portal/dashboard", "/portal"],
    ["/advisor/login", "/advisor"],
  ])("opens the standalone portal directly from %s", async (pathname, destination) => {
    vi.stubEnv("APP_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await proxy(new NextRequest(`http://localhost:3000${pathname}`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`http://localhost:3000${destination}`);
  });

  it.each(["/portal/dashboard", "/advisor/login"])(
    "does not bypass configured deployment access at %s",
    async (pathname) => {
      vi.stubEnv("APP_MODE", "public");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
      const response = await proxy(new NextRequest(`https://www.example${pathname}`));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it.each(["/admin", "/advisor", "/platform", "/studio", "/api/admin/setup", "/api/advisor/platforms", "/api/platform/firms"])(
    "returns an HTTP 404 for public deployment path %s",
    async (pathname) => {
      vi.stubEnv("APP_MODE", "public");
      const response = await proxy(new NextRequest(`https://www.example${pathname}`));
      expect(response.status).toBe(404);
    },
  );

  it.each(["/about", "/portal", "/api/documents/example", "/api/subscribe"])(
    "returns an HTTP 404 for staff deployment path %s",
    async (pathname) => {
      vi.stubEnv("APP_MODE", "staff");
      const response = await proxy(new NextRequest(`https://staff.example${pathname}`));
      expect(response.status).toBe(404);
    },
  );

  it("sets nonced CSP and privacy headers on staff responses", async () => {
    vi.stubEnv("APP_MODE", "staff");
    const response = await proxy(new NextRequest("https://staff.example/advisor/login"));
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });
});
