export type PortalRole = "client" | "adviser" | "admin" | "compliance" | "operations";

export function getPostLoginDestination(role: unknown): "/portal" | "/advisor" | "/admin" | "/advisor/login" | null {
  if (role === undefined || role === null) return "/portal";
  if (role === "client") return "/portal";
  if (role === "adviser") return "/advisor";
  if (role === "admin") return "/admin";
  if (role === "compliance" || role === "operations") return "/admin";
  return null;
}
