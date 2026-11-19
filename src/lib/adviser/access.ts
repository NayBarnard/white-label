export function canAccessAdviserPortal(role: unknown): boolean {
  return role === "adviser" || role === "admin";
}
