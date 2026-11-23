"use client";

import type { TaxYearLimits } from "@/data/firmData";
import {
  calculateTfsaContributions,
  getDaysUntilTaxYearEnd,
  getTaxYearPeriod,
  isTaxYearEndSeason,
  remainingTfsaAnnualLimit,
  type TaxTransaction,
} from "@/lib/tax/tax-year";

function zar(amount: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(amount);
}

export function TaxYearSummary({
  transactions,
  limits,
  date,
}: {
  transactions: TaxTransaction[];
  limits: TaxYearLimits;
  date: Date;
}) {
  const period = getTaxYearPeriod(date);
  const contributions = calculateTfsaContributions(transactions, period);
  const remaining = typeof limits.tfsaAnnual === "number"
    ? remainingTfsaAnnualLimit(limits.tfsaAnnual, contributions)
    : null;
  const showTaxYearCard = isTaxYearEndSeason(date);

  return (
    <div className="space-y-5">
      {showTaxYearCard ? (
        <section className="glass rounded-2xl p-5 sm:p-6" aria-labelledby="tax-year-end-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">TAX YEAR END</p>
              <h2 id="tax-year-end-heading" className="mt-2 text-xl font-semibold">{limits.taxYearLabel ?? "Current tax year (confirm with SARS)"}</h2>
            </div>
            <p className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
              {getDaysUntilTaxYearEnd(date)} days left
            </p>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--background)] p-4">
              <dt className="text-xs text-[var(--muted)]">TFSA annual contribution limit</dt>
              <dd className="mt-1 text-lg font-semibold">{typeof limits.tfsaAnnual === "number" ? zar(limits.tfsaAnnual) : "Not published"}</dd>
            </div>
            <div className="rounded-xl bg-[var(--background)] p-4">
              <dt className="text-xs text-[var(--muted)]">TFSA lifetime contribution limit</dt>
              <dd className="mt-1 text-lg font-semibold">{typeof limits.tfsaLifetime === "number" ? zar(limits.tfsaLifetime) : "Not published"}</dd>
            </div>
            <div className="rounded-xl bg-[var(--background)] p-4">
              <dt className="text-xs text-[var(--muted)]">TFSA contributions recorded with your firm this tax year</dt>
              <dd className="mt-1 text-lg font-semibold">{zar(contributions)}</dd>
            </div>
            <div className="rounded-xl bg-[var(--background)] p-4">
              <dt className="text-xs text-[var(--muted)]">Remaining annual limit</dt>
              <dd className="mt-1 text-lg font-semibold">{remaining === null ? "Not published" : zar(remaining)}</dd>
            </div>
            <div className="rounded-xl bg-[var(--background)] p-4 sm:col-span-2">
              <dt className="text-xs text-[var(--muted)]">Penalty on excess contributions</dt>
              <dd className="mt-1 text-lg font-semibold">{limits.tfsaPenaltyPercent === null ? "Not published" : `${limits.tfsaPenaltyPercent}%`}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Check <a href={limits.source} target="_blank" rel="noopener noreferrer" className="underline">official SARS guidance</a> for current limits.
            {limits.verifiedOn ? ` Verified on ${limits.verifiedOn}.` : " Limits have not been independently verified for this demonstration."}
          </p>
          {limits.raVerified ? (
            <p className="mt-4 rounded-xl border border-[var(--border)] p-4 text-sm leading-6">
              Retirement annuity deductions may be limited to {limits.raDeductionPercent}% of qualifying income, up to {zar(limits.raDeductionCap)}.
            </p>
          ) : null}
        </section>
      ) : null}
      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs leading-5 text-[var(--muted)]">
        This only counts contributions made through placeholder. Contributions elsewhere also count towards your limit. Check SARS eFiling for your full position.
      </p>
    </div>
  );
}
