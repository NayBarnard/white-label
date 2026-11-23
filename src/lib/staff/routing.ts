export type PortalRole = "client" | "platform_operator" | "adviser" | "admin" | "compliance" | "operations";

export function getPostLoginDestination(role: unknown): "/portal" | "/platform" | "/advisor" | "/admin" | "/advisor/login" | null {
  if (role === undefined || role === null) return "/portal";
  if (role === "client") return "/portal";
  if (role === "platform_operator") return "/platform";
  if (role === "adviser") return "/advisor";
  if (role === "admin") return "/admin";
  if (role === "compliance" || role === "operations") return "/admin";
  return null;
}
