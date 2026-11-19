export type AppMode = "public" | "staff";

export type RouteDisposition = "allow" | "not-found" | "redirect-to-login";

const staffPageRoots = ["/admin", "/advisor", "/studio"];
const staffApiRoots = ["/api/admin", "/api/advisor"];

function isWithin(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function isStaticAsset(pathname: string) {
  if (pathname === "/sw.js") return false;
  return pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(?:avif|css|gif|ico|jpe?g|js|map|png|svg|webp|woff2?)$/i.test(pathname);
}

export function getAppMode(value: string | undefined): AppMode {
  return value === "staff" ? "staff" : "public";
}

export function getRouteDisposition(
  mode: AppMode,
  pathname: string,
): RouteDisposition {
  let normalizedPathname: string;
  try {
    normalizedPathname = decodeURIComponent(pathname).toLowerCase();
  } catch {
    return "not-found";
  }

  if (mode === "public") {
    if (normalizedPathname === "/advisor/login") return "allow";
    return [...staffPageRoots, ...staffApiRoots].some((root) => isWithin(normalizedPathname, root))
      ? "not-found"
      : "allow";
  }

  if (normalizedPathname === "/") return "redirect-to-login";
  if (normalizedPathname === "/api" || normalizedPathname.startsWith("/api/")) {
    return staffApiRoots.some((root) => isWithin(normalizedPathname, root)) ? "allow" : "not-found";
  }
  if (
    [...staffPageRoots, ...staffApiRoots].some((root) => isWithin(normalizedPathname, root)) ||
    normalizedPathname === "/auth/callback" ||
    isStaticAsset(normalizedPathname)
  ) {
    return "allow";
  }

  return "not-found";
}
