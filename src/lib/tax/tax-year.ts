export type TaxTransaction = {
  account_type: string | null;
  amount: number;
  status: string;
  transacted_at: string;
};

export type TaxYearPeriod = {
  startDate: string;
  endDate: string;
  endYear: number;
  endMonth: 1;
  endDay: 28 | 29;
};

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function datePartsInSouthAfrica(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)?.value ?? "";
  return { year: Number(part("year")), month: Number(part("month")), day: Number(part("day")) };
}

export function getSouthAfricanToday(now = new Date()): Date {
  const { year, month, day } = datePartsInSouthAfrica(now);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getTaxYearPeriod(date: Date): TaxYearPeriod {
  const { year, month } = datePartsInSouthAfrica(date);
  const taxYearStartYear = month >= 3 ? year : year - 1;
  const endYear = taxYearStartYear + 1;
  const endDay = isLeapYear(endYear) ? 29 : 28;
  return {
    startDate: `${taxYearStartYear}-03-01`,
    endDate: `${endYear}-02-${endDay}`,
    endYear,
    endMonth: 1,
    endDay,
  };
}

export function isTaxYearEndSeason(date: Date): boolean {
  const { month } = datePartsInSouthAfrica(date);
  return month === 12 || month === 1 || month === 2;
}

export function getDaysUntilTaxYearEnd(date: Date): number {
  const today = getSouthAfricanToday(date);
  const period = getTaxYearPeriod(today);
  const end = new Date(Date.UTC(period.endYear, period.endMonth, period.endDay));
  return Math.max(0, Math.floor((end.getTime() - today.getTime()) / 86_400_000));
}

export function getSouthAfricanDate(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const { year, month, day } = datePartsInSouthAfrica(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function calculateTfsaContributions(
  transactions: TaxTransaction[],
  period: Pick<TaxYearPeriod, "startDate" | "endDate">,
): number {
  return transactions.reduce((total, transaction) => {
    const date = getSouthAfricanDate(transaction.transacted_at);
    if (
      transaction.account_type !== "TFSA" ||
      transaction.status !== "Completed" ||
      !Number.isFinite(transaction.amount) ||
      transaction.amount <= 0 ||
      !date ||
      date < period.startDate ||
      date > period.endDate
    ) {
      return total;
    }
    return total + transaction.amount;
  }, 0);
}

export function remainingTfsaAnnualLimit(annualLimit: number, contributions: number): number {
  return Math.max(0, annualLimit - contributions);
}
