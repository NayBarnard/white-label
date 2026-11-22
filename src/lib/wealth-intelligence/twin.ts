export const FINANCIAL_TWIN_VERSION = "twin-deterministic-monte-carlo-v1";

export type LifeEvent = {
  id: string;
  year: number;
  type: "cash_inflow" | "cash_outflow";
  amount: number;
  confidence: "verified" | "calculated" | "uncertain";
  source: string;
};

export type TwinAssumptions = {
  startingAmount: number;
  monthlyContribution: number;
  monthlyWithdrawal: number;
  horizonYears: number;
  nominalReturnPercent: number;
  inflationPercent: number;
  volatilityPercent: number;
  targetAmount: number;
  seed: number;
  iterations: number;
  lifeEvents: LifeEvent[];
};

export type TwinResult = {
  percentile10: number;
  percentile50: number;
  percentile90: number;
  realPercentile10: number;
  realPercentile50: number;
  realPercentile90: number;
  targetSuccessPercent: number;
  medianAnnualDrawdown: number;
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random: () => number) {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function validateTwinAssumptions(input: unknown): TwinAssumptions | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const numericKeys = [
    "startingAmount", "monthlyContribution", "monthlyWithdrawal", "horizonYears",
    "nominalReturnPercent", "inflationPercent", "volatilityPercent", "targetAmount",
    "seed", "iterations",
  ] as const;
  if (!numericKeys.every((key) => typeof r[key] === "number" && Number.isFinite(r[key]))) return null;
  const a = r as unknown as TwinAssumptions;
  if (
    a.startingAmount < 0 || a.monthlyContribution < 0 || a.monthlyWithdrawal < 0 ||
    a.horizonYears < 1 || a.horizonYears > 60 ||
    a.nominalReturnPercent < -30 || a.nominalReturnPercent > 30 ||
    a.inflationPercent < 0 || a.inflationPercent > 30 ||
    a.volatilityPercent < 0 || a.volatilityPercent > 100 ||
    a.targetAmount < 0 || a.seed < 0 || a.seed > 2147483647 ||
    a.iterations < 100 || a.iterations > 10000 ||
    !Array.isArray(a.lifeEvents)
  ) return null;
  const eventsValid = a.lifeEvents.every((event) =>
    event && typeof event.id === "string" && Number.isInteger(event.year) &&
    event.year >= 0 && event.year <= a.horizonYears &&
    (event.type === "cash_inflow" || event.type === "cash_outflow") &&
    Number.isFinite(event.amount) && event.amount >= 0 &&
    ["verified", "calculated", "uncertain"].includes(event.confidence) &&
    typeof event.source === "string",
  );
  return eventsValid ? a : null;
}

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function simulateFinancialTwin(input: TwinAssumptions): TwinResult {
  const assumptions = validateTwinAssumptions(input);
  if (!assumptions) throw new Error("Invalid financial twin assumptions.");
  const random = mulberry32(assumptions.seed);
  const monthlyRate = assumptions.nominalReturnPercent / 100 / 12;
  const monthlyVolatility = assumptions.volatilityPercent / 100 / Math.sqrt(12);
  const inflationFactor = Math.pow(1 + assumptions.inflationPercent / 100, assumptions.horizonYears);
  const endings: number[] = [];
  let successful = 0;
  const drawdowns: number[] = [];

  for (let iteration = 0; iteration < assumptions.iterations; iteration += 1) {
    let value = assumptions.startingAmount;
    let peak = value;
    let largestDrawdown = 0;
    for (let month = 1; month <= assumptions.horizonYears * 12; month += 1) {
      const annualShock = normal(random) * monthlyVolatility;
      const monthlyReturn = monthlyRate + annualShock;
      value *= 1 + monthlyReturn;
      const year = Math.floor((month - 1) / 12);
      for (const event of assumptions.lifeEvents) {
        if (event.year === year && month === year * 12 + 1) {
          value += event.type === "cash_inflow" ? event.amount : -event.amount;
        }
      }
      value += assumptions.monthlyContribution - assumptions.monthlyWithdrawal;
      value = Math.max(0, value);
      peak = Math.max(peak, value);
      largestDrawdown = Math.max(largestDrawdown, peak > 0 ? (peak - value) / peak : 0);
    }
    endings.push(value);
    drawdowns.push(largestDrawdown);
    if (value >= assumptions.targetAmount) successful += 1;
  }

  return {
    percentile10: percentile(endings, 0.1),
    percentile50: percentile(endings, 0.5),
    percentile90: percentile(endings, 0.9),
    realPercentile10: percentile(endings, 0.1) / inflationFactor,
    realPercentile50: percentile(endings, 0.5) / inflationFactor,
    realPercentile90: percentile(endings, 0.9) / inflationFactor,
    targetSuccessPercent: (successful / assumptions.iterations) * 100,
    medianAnnualDrawdown: percentile(drawdowns, 0.5),
  };
}
