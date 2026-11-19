export type PeopleRole = "client" | "adviser" | "admin" | "compliance" | "operations";

export type PeopleAction =
  | { action: "invite"; email: string; role: PeopleRole; fullName: string }
  | { action: "role"; userId: string; role: PeopleRole }
  | { action: "deactivate" | "reactivate" | "reset_password" | "reset_mfa"; userId: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max
    ? value.trim()
    : null;
}

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function parseUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function parsePeopleAction(value: unknown): PeopleAction | null {
  if (!isRecord(value) || typeof value.action !== "string") return null;
  if (value.action === "invite") {
    const email = parseEmail(value.email);
    const fullName = boundedText(value.fullName, 160);
    if (!email || !fullName) return null;
    if (!["client", "adviser", "admin", "compliance", "operations"].includes(String(value.role))) return null;
    return { action: "invite", email, role: value.role as PeopleRole, fullName };
  }
  if (value.action === "role") {
    const userId = parseUuid(value.userId);
    if (!userId || !["client", "adviser", "admin", "compliance", "operations"].includes(String(value.role))) return null;
    return { action: "role", userId, role: value.role as "client" | "adviser" | "admin" | "compliance" | "operations" };
  }
  if (["deactivate", "reactivate", "reset_password", "reset_mfa"].includes(value.action)) {
    const userId = parseUuid(value.userId);
    if (!userId) return null;
    return { action: value.action as "deactivate" | "reactivate" | "reset_password" | "reset_mfa", userId };
  }
  return null;
}
