export const RENEWAL_ITEM_TYPES = ["document", "confirmation", "information"] as const;
export const MAX_RENEWAL_ITEMS = 20;
export const MAX_RENEWAL_FILE_BYTES = 10 * 1024 * 1024;
export const RENEWAL_FILE_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export type RenewalItemType = (typeof RENEWAL_ITEM_TYPES)[number];
export type RenewalItemInput = {
  label: string;
  type: RenewalItemType;
  required: boolean;
};
export type RenewalPackInput = {
  title: string;
  expiresInDays: number;
  items: RenewalItemInput[];
};
export type RenewalChecklistItem = {
  required: boolean;
  status: string;
  response_text?: string | null;
  object_path?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRenewalPackInput(value: unknown): RenewalPackInput | null {
  if (!isRecord(value) || !Object.keys(value).every((key) => ["title", "expiresInDays", "items"].includes(key))) return null;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const expiresInDays = value.expiresInDays;
  if (
    title.length < 1 ||
    title.length > 120 ||
    typeof expiresInDays !== "number" ||
    !Number.isInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 90 ||
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > MAX_RENEWAL_ITEMS
  ) return null;

  const items: RenewalItemInput[] = [];
  for (const item of value.items) {
    if (
      !isRecord(item) ||
      !Object.keys(item).every((key) => ["label", "type", "required"].includes(key)) ||
      typeof item.label !== "string" ||
      item.label.trim().length < 1 ||
      item.label.trim().length > 160 ||
      typeof item.type !== "string" ||
      !RENEWAL_ITEM_TYPES.includes(item.type as RenewalItemType) ||
      typeof item.required !== "boolean"
    ) return null;
    items.push({ label: item.label.trim(), type: item.type as RenewalItemType, required: item.required });
  }
  if (!items.some((item) => item.required)) return null;
  return { title, expiresInDays, items };
}

export function isRenewalSubmissionComplete(items: readonly RenewalChecklistItem[]) {
  return items.every((item) =>
    !item.required ||
    (["submitted", "verified"].includes(item.status) && Boolean(item.response_text?.trim() || item.object_path)),
  );
}

export function parseRenewalResponse(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 2000
    ? value.trim()
    : null;
}

export function parseRenewalItemId(value: string) {
  return UUID_PATTERN.test(value);
}

export function isAllowedRenewalFile(type: string, size: number) {
  return RENEWAL_FILE_MIME_TYPES.includes(type as (typeof RENEWAL_FILE_MIME_TYPES)[number]) &&
    Number.isInteger(size) &&
    size > 0 &&
    size <= MAX_RENEWAL_FILE_BYTES;
}
