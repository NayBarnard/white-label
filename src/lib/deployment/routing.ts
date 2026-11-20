export type AppMode = "public" | "staff";

export type RouteDisposition = "allow" | "not-found" | "redirect-to-login";

export function getAppMode(value: string | undefined): AppMode {
  return value === "staff" ? "staff" : "public";
}

export function getRouteDisposition(
  mode: AppMode,
  pathname: string,
): RouteDisposition {
  void mode;
  void pathname;
  // Standalone demos expose all public and staff surfaces in a single app.
  return "allow";
}
