export const PLATFORM_REVERIFICATION_DAYS = 180;

export type PlatformStatus =
  | "verified_available"
  | "verified_unavailable"
  | "not_verified";

export type PlatformRecord = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ShareClassRecord = {
  id: string;
  fundName: string;
  shareClass: string;
  jseCode: string | null;
  isin: string | null;
  isActive: boolean;
};

export type AvailabilityRecord = {
  id: string;
  shareClassId: string;
  platformId: string;
  status: PlatformStatus;
  platformFundCode: string | null;
  source: string | null;
  sourceUrl: string | null;
  verifiedBy: string | null;
  verifiedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformSearchRecord = {
  shareClass: ShareClassRecord;
  platform: PlatformRecord;
  availability: AvailabilityRecord;
};

export type QueryKind = "isin" | "jse_code" | "name";

function statusRank(status: PlatformStatus) {
  if (status === "verified_available") return 0;
  if (status === "verified_unavailable") return 1;
  return 2;
}

export function normalizeIsin(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isIsinFormatValid(value: string) {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(normalizeIsin(value));
}

export function isIsinChecksumValid(value: string) {
  const isin = normalizeIsin(value);
  if (!isIsinFormatValid(isin)) return false;
  const expanded = [...isin]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code >= 65 && code <= 90 ? String(code - 55) : character;
    })
    .join("");
  let sum = 0;
  let double = false;
  for (let index = expanded.length - 1; index >= 0; index -= 1) {
    let digit = Number(expanded[index]) * (double ? 2 : 1);
    if (digit > 9) digit -= 9;
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function normalizeJseCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function classifyPlatformQuery(
  query: string,
  records: PlatformSearchRecord[] = [],
): QueryKind {
  const trimmed = query.trim();
  const normalized = normalizeIsin(trimmed);
  if (/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(normalized)) return "isin";
  const jseQuery = normalizeJseCode(trimmed);
  if (records.some((record) => normalizeJseCode(record.shareClass.jseCode ?? "") === jseQuery)) {
    return "jse_code";
  }
  if (/^[A-Z0-9][A-Z0-9.]{1,14}$/.test(jseQuery) && /[0-9.]/.test(jseQuery)) {
    return "jse_code";
  }
  return "name";
}

export function searchPlatformRecords(
  records: PlatformSearchRecord[],
  query: string,
): PlatformSearchRecord[] {
  const normalizedQuery = normalizeJseCode(query);
  const textQuery = query.trim().toLocaleLowerCase();
  if (!textQuery) {
    return [...records].sort((left, right) =>
      statusRank(left.availability.status) - statusRank(right.availability.status) ||
      left.shareClass.fundName.localeCompare(right.shareClass.fundName) ||
      left.platform.name.localeCompare(right.platform.name),
    );
  }
  const ranked = records.flatMap((record) => {
    const isin = normalizeIsin(record.shareClass.isin ?? "");
    const jseCode = normalizeJseCode(record.shareClass.jseCode ?? "");
    const platformCode = normalizeJseCode(record.availability.platformFundCode ?? "");
    const names = [
      record.shareClass.fundName,
      record.shareClass.shareClass,
      record.platform.name,
    ].map((value) => value.toLocaleLowerCase());
    const rank = isin === normalizedQuery
      ? 0
      : jseCode === normalizedQuery
        ? 1
        : platformCode === normalizedQuery
          ? 2
          : [isin, jseCode, platformCode, ...names]
              .some((value) => value.startsWith(textQuery))
            ? 3
            : [isin, jseCode, platformCode, ...names]
                .some((value) => value.includes(textQuery))
              ? 4
              : -1;
    return rank < 0 ? [] : [{ record, rank }];
  });
  return ranked
    .sort((left, right) =>
      left.rank - right.rank ||
      statusRank(left.record.availability.status) - statusRank(right.record.availability.status) ||
      left.record.shareClass.fundName.localeCompare(right.record.shareClass.fundName) ||
      left.record.platform.name.localeCompare(right.record.platform.name),
    )
    .map(({ record }) => record);
}

export function isAvailabilityStale(verifiedOn: string | null, now = new Date()) {
  if (!verifiedOn) return false;
  const verifiedDate = new Date(`${verifiedOn}T00:00:00.000Z`);
  if (Number.isNaN(verifiedDate.getTime())) return false;
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const verifiedUtc = Date.UTC(
    verifiedDate.getUTCFullYear(),
    verifiedDate.getUTCMonth(),
    verifiedDate.getUTCDate(),
  );
  return todayUtc - verifiedUtc > PLATFORM_REVERIFICATION_DAYS * 86_400_000;
}
