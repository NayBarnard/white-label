export const profileRequestTypes = [
  "Contact Details Update",
  "Banking Details Change",
] as const;

export type ProfileRequestType = (typeof profileRequestTypes)[number];

export function isProfileRequestType(value: string): value is ProfileRequestType {
  return profileRequestTypes.some((type) => type === value);
}

export function parseProfileRequest(type: unknown, details: unknown) {
  if (
    typeof type !== "string" ||
    !isProfileRequestType(type) ||
    typeof details !== "string"
  ) {
    return null;
  }
  const trimmedDetails = details.trim();
  if (!trimmedDetails || trimmedDetails.length > 1500) return null;
  return { requestType: type, details: trimmedDetails };
}
