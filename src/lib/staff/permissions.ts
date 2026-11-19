export type StaffRole = "admin" | "adviser" | "compliance" | "operations";
export type StaffAction =
  | "staff.sign-in"
  | "adviser.portal"
  | "platform.read"
  | "platform.edit"
  | "people.manage"
  | "people.view"
  | "content.draft"
  | "content.approve"
  | "content.publish"
  | "documents.manage"
  | "documents.review"
  | "registers.read"
  | "registers.manage"
  | "audit.read"
  | "audit.export";

export const STAFF_PERMISSIONS: Readonly<Record<StaffRole, ReadonlySet<StaffAction>>> = {
  admin: new Set([
    "staff.sign-in", "adviser.portal", "platform.read", "platform.edit",
    "people.manage", "people.view", "content.draft", "content.approve",
    "content.publish", "documents.manage", "documents.review", "registers.read",
    "registers.manage", "audit.read", "audit.export",
  ]),
  adviser: new Set(["staff.sign-in", "adviser.portal", "platform.read"]),
  compliance: new Set([
    "staff.sign-in", "content.approve", "content.publish", "documents.review",
    "registers.read", "registers.manage", "audit.read", "audit.export",
  ]),
  operations: new Set([
    "staff.sign-in", "people.view", "documents.manage", "documents.review",
  ]),
};

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "adviser" || value === "compliance" || value === "operations";
}

export function canStaff(role: unknown, action: StaffAction): boolean {
  return isStaffRole(role) && STAFF_PERMISSIONS[role].has(action);
}
