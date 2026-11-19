export const STAFF_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const STAFF_WARNING_DURATION_MS = 60 * 1000;
export const STAFF_ABSOLUTE_SESSION_MS = 12 * 60 * 60 * 1000;
export const STAFF_ABSOLUTE_SIGN_IN_KEY = "placeholder.staff.absolute-sign-in-at";

export type AssuranceClaims = {
  aal?: unknown;
};

export function isAal2Claims(claims: unknown): boolean {
  if (!claims || typeof claims !== "object") return false;
  return (claims as AssuranceClaims).aal === "aal2";
}

export function getAbsoluteSignInDeadline(now = Date.now()) {
  if (typeof window === "undefined") return now + STAFF_ABSOLUTE_SESSION_MS;
  const existing = Number(window.sessionStorage.getItem(STAFF_ABSOLUTE_SIGN_IN_KEY));
  if (Number.isFinite(existing) && existing > 0) return existing;
  const deadline = now + STAFF_ABSOLUTE_SESSION_MS;
  window.sessionStorage.setItem(STAFF_ABSOLUTE_SIGN_IN_KEY, String(deadline));
  return deadline;
}

export function clearAbsoluteSignInDeadline() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(STAFF_ABSOLUTE_SIGN_IN_KEY);
  }
}
