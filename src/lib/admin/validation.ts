const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST_STATUSES = ["Submitted", "In Review", "Completed"] as const;

export type AdminRequestStatus = (typeof REQUEST_STATUSES)[number];

export type PortfolioAssignment = {
  portfolioId: string | null;
  userId: string;
  label: string;
  valuationZar: number | null;
  valuationAsOf: string | null;
  performancePercent: number | null;
  performancePeriod: string | null;
};

export type SupportReply = {
  userId: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function boundedText(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum
    ? value.trim()
    : null;
}

function optionalNumber(value: unknown, minimum: number, maximum: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value >= minimum && value <= maximum ? value : undefined;
}

function optionalIsoDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

export function parsePortfolioAssignment(value: unknown): PortfolioAssignment | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "portfolioId",
      "userId",
      "label",
      "valuationZar",
      "valuationAsOf",
      "performancePercent",
      "performancePeriod",
    ])
  ) {
    return null;
  }
  let portfolioId: string | null = null;
  if (value.portfolioId !== undefined && value.portfolioId !== null && value.portfolioId !== "") {
    const candidate = boundedText(value.portfolioId, 36);
    if (!candidate || !UUID_PATTERN.test(candidate)) return null;
    portfolioId = candidate;
  }
  const userId = boundedText(value.userId, 36);
  const label = boundedText(value.label, 120);
  const valuationZar = optionalNumber(value.valuationZar, 0, 99_999_999_999_999.99);
  const valuationAsOf = optionalIsoDate(value.valuationAsOf);
  const performancePercent = optionalNumber(value.performancePercent, -9999.9999, 9999.9999);
  const performancePeriod =
    value.performancePeriod === undefined || value.performancePeriod === null || value.performancePeriod === ""
      ? null
      : boundedText(value.performancePeriod, 80);

  if (
    !userId ||
    !UUID_PATTERN.test(userId) ||
    !label ||
    valuationZar === undefined ||
    valuationAsOf === undefined ||
    performancePercent === undefined ||
    (value.performancePeriod !== undefined &&
      value.performancePeriod !== null &&
      value.performancePeriod !== "" &&
      !performancePeriod)
  ) {
    return null;
  }

  return {
    portfolioId,
    userId,
    label,
    valuationZar,
    valuationAsOf,
    performancePercent,
    performancePeriod,
  };
}

export function parseSupportReply(value: unknown): SupportReply | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["userId", "message"])) return null;
  const userId = boundedText(value.userId, 36);
  const message = boundedText(value.message, 2000);
  if (!userId || !UUID_PATTERN.test(userId) || !message) return null;
  return { userId, message };
}

export function parseRequestStatus(value: unknown): AdminRequestStatus | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["status"])) return null;
  return REQUEST_STATUSES.find((status) => status === value.status) ?? null;
}

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function isRecordValue(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}
