import { getSouthAfricanToday } from "@/lib/tax/tax-year";

export type GoalInput = {
  name: string;
  target_amount: number;
  target_date: string;
  monthly_contribution: number;
  assumed_annual_growth_percent: number;
};

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseGoalInput(input: unknown, now = new Date()): GoalInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (
    typeof record.name !== "string" ||
    typeof record.target_amount !== "number" ||
    typeof record.target_date !== "string" ||
    typeof record.monthly_contribution !== "number" ||
    typeof record.assumed_annual_growth_percent !== "number"
  ) {
    return null;
  }
  const name = record.name.trim();
  const today = getSouthAfricanToday(now).toISOString().slice(0, 10);
  if (
    !name ||
    name.length > 120 ||
    !Number.isFinite(record.target_amount) ||
    record.target_amount < 0 ||
    !isValidDate(record.target_date) ||
    record.target_date <= today ||
    !Number.isFinite(record.monthly_contribution) ||
    record.monthly_contribution < 0 ||
    !Number.isFinite(record.assumed_annual_growth_percent) ||
    record.assumed_annual_growth_percent < 0 ||
    record.assumed_annual_growth_percent > 30
  ) {
    return null;
  }
  return {
    name,
    target_amount: record.target_amount,
    target_date: record.target_date,
    monthly_contribution: record.monthly_contribution,
    assumed_annual_growth_percent: record.assumed_annual_growth_percent,
  };
}

export function projectGoalValue(
  startingValue: number,
  monthlyContribution: number,
  annualGrowthPercent: number,
  months: number,
): number | null {
  if (
    ![startingValue, monthlyContribution, annualGrowthPercent, months].every(Number.isFinite) ||
    startingValue < 0 ||
    monthlyContribution < 0 ||
    annualGrowthPercent < 0 ||
    annualGrowthPercent > 30 ||
    months < 0
  ) {
    return null;
  }
  const wholeMonths = Math.floor(months);
  const monthlyRate = Math.pow(1 + annualGrowthPercent / 100, 1 / 12) - 1;
  if (monthlyRate === 0) return startingValue + monthlyContribution * wholeMonths;
  const growth = Math.pow(1 + monthlyRate, wholeMonths);
  return startingValue * growth + monthlyContribution * ((growth - 1) / monthlyRate);
}

export function monthsUntilGoalDate(targetDate: string, from = new Date()): number {
  if (!isValidDate(targetDate)) return 0;
  const today = getSouthAfricanToday(from);
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const calendarMonths =
    (target.getUTCFullYear() - today.getUTCFullYear()) * 12 +
    target.getUTCMonth() -
    today.getUTCMonth();
  return Math.max(0, calendarMonths - (target.getUTCDate() <= today.getUTCDate() ? 1 : 0));
}

export function calculateGoalProgress(currentValuation: number | null, targetAmount: number): number | null {
  if (currentValuation === null || !Number.isFinite(currentValuation) || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return null;
  }
  return Math.max(0, Math.min(100, (currentValuation / targetAmount) * 100));
}
