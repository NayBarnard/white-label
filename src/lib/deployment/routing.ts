export type AppMode = "public" | "staff";

export type RouteDisposition = "allow" | "not-found" | "redirect-to-login";

export function isStandaloneLocalMode(
  appMode: string | undefined,
  supabaseUrl: string | undefined,
  supabaseAnonKey: string | undefined,
) {
  return !appMode && !supabaseUrl && !supabaseAnonKey;
}

export function getAppMode(value: string | undefined): AppMode {
  return value === "staff" ? "staff" : "public";
}

export function getRouteDisposition(
  mode: AppMode,
  pathname: string,
  allowLocalStudioDemo = false,
  allowStandaloneLocalRoutes = false,
): RouteDisposition {
  const normalizedPath = normalizePath(pathname);
  if (!normalizedPath) return "not-found";

  if (mode === "public" && allowLocalStudioDemo && normalizedPath === "/studio") {
    return "allow";
  }
  if (mode === "public" && allowStandaloneLocalRoutes && (
    normalizedPath === "/client" ||
    normalizedPath === "/planning" ||
    isUnderPath(normalizedPath, ["/admin", "/advisor", "/studio", "/planning"])
  )) {
    return "allow";
  }

  if (mode === "public" && normalizedPath !== "/advisor/login" && isUnderPath(normalizedPath, [
    "/admin",
    "/advisor",
    "/studio",
    "/api/admin",
    "/api/advisor",
    "/api/auth",
    "/api/studio",
  ])) {
    return "not-found";
  }

  if (mode === "staff") {
    if (normalizedPath === "/") return "redirect-to-login";
    if (normalizedPath === "/auth/callback") return "allow";
    if (isUnderPath(normalizedPath, [
      "/about",
      "/contact",
      "/insights",
      "/onboarding",
      "/portal",
      "/portfolios",
      "/privacy",
      "/resources",
      "/terms",
      "/unsubscribe",
      "/documents",
      "/api/chat",
      "/api/cron",
      "/api/documents",
      "/api/enquiry",
      "/api/fund-comparison",
      "/api/fund-metrics",
      "/api/insights",
      "/api/portal",
      "/api/subscribe",
      "/api/unsubscribe",
      "/manifest.webmanifest",
      "/sitemap.xml",
      "/sw.js",
    ])) {
      return "not-found";
    }
  }

  return "allow";
}

function normalizePath(pathname: string): string | null {
  let decoded = pathname;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }
  return decoded.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase() || "/";
}

function isUnderPath(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
