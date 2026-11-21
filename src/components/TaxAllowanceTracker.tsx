"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, CircleDollarSign } from "lucide-react";

type Rule = {
  id: string;
  tenant_id: string;
  product_code: string;
  tax_year_label: string;
  period_start: string;
  period_end: string;
  annual_limit: number;
  lifetime_limit: number | null;
  currency: string;
  over_contribution_penalty_rate: number;
};

type Summary = {
  annual_contributed: number;
  annual_remaining_headroom: number;
  lifetime_contributed: number;
  lifetime_remaining_headroom: number | null;
  annual_utilization_pct: number;
  status: "NORMAL" | "APPROACHING_CAP" | "CAP_REACHED" | "OVER_CONTRIBUTED";
  internal_annual_contributed: number;
  external_annual_contributed: number;
  annual_excess: number;
  lifetime_excess: number;
  estimated_penalty: number;
};

type ExternalLog = {
  id: string;
  amount: number;
  contribution_date: string;
  notes: string | null;
};

type AllowanceResponse = {
  rule: Rule;
  rules: Rule[];
  summary: Summary;
  externalLogs: ExternalLog[];
};

const fieldClass = "mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function getDaysRemaining(endDate: string) {
  const [year, month, day] = endDate.split("-").map(Number);
  const end = Date.UTC(year, month - 1, day);
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(todayParts.find((value) => value.type === type)?.value);
  const today = Date.UTC(part("year"), part("month") - 1, part("day"));
  return Math.max(0, Math.ceil((end - today) / 86_400_000));
}

function getSouthAfricanTodayLabel() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function TaxAllowanceTracker({ clientId }: { clientId?: string }) {
  const [data, setData] = useState<AllowanceResponse | null>(null);
  const [product, setProduct] = useState("");
  const [year, setYear] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [amount, setAmount] = useState("");
  const [contributionDate, setContributionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (product) params.set("product", product);
    if (year) params.set("year", year);
    return `/api/tax-allowance${params.size ? `?${params.toString()}` : ""}`;
  }, [clientId, product, year]);

  async function requestAllowance(url: string) {
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json() as AllowanceResponse & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Allowance details could not be loaded.");
    return payload;
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const payload = await requestAllowance(apiUrl);
        if (!active) return;
        setData(payload);
        setProduct(payload.rule.product_code);
        setYear(payload.rule.tax_year_label);
        setContributionDate((value) => value || payload.rule.period_start);
        setErrorMessage("");
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Allowance details could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [apiUrl]);

  const rule = data?.rule;
  const summary = data?.summary;
  const planned = Number(plannedAmount);
  const plannedValid = plannedAmount.trim() !== "" && Number.isFinite(planned) && planned > 0;
  const projectedAnnual = summary && plannedValid ? summary.annual_contributed + planned : null;
  const projectedLifetime = summary && plannedValid ? summary.lifetime_contributed + planned : null;
  const projectedAnnualExcess = rule && projectedAnnual !== null
    ? Math.max(0, projectedAnnual - rule.annual_limit)
    : 0;
  const projectedLifetimeExcess = rule?.lifetime_limit !== null && rule?.lifetime_limit !== undefined && projectedLifetime !== null
    ? Math.max(0, projectedLifetime - rule.lifetime_limit)
    : 0;
  const projectedPenalty = rule
    ? Math.max(projectedAnnualExcess, projectedLifetimeExcess) * rule.over_contribution_penalty_rate
    : 0;
  const dayCount = rule ? getDaysRemaining(rule.period_end) : 0;
  const productOptions = [...new Set((data?.rules ?? []).map((item) => item.product_code))];
  const yearOptions = (data?.rules ?? [])
    .filter((item) => item.product_code === product)
    .sort((a, b) => b.period_start.localeCompare(a.period_start));
  const contributionMaxDate = rule
    ? [rule.period_end, getSouthAfricanTodayLabel()].sort()[0]
    : undefined;

  async function saveContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rule || !amount || !contributionDate) return;
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch(`/api/tax-allowance${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          productCode: rule.product_code,
          taxYearLabel: rule.tax_year_label,
          amount: Number(amount),
          contributionDate,
          notes,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The contribution could not be saved.");
      setAmount("");
      setNotes("");
      setEditingId(null);
      setSuccessMessage("External contribution saved.");
      const refreshed = await requestAllowance(apiUrl);
      setData(refreshed);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The contribution could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function editContribution(log: ExternalLog) {
    setEditingId(log.id);
    setAmount(String(log.amount));
    setContributionDate(log.contribution_date);
    setNotes(log.notes ?? "");
    setSuccessMessage("");
  }

  return (
    <section className="glass rounded-2xl p-5 sm:p-6" aria-labelledby="allowance-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">TAX-YEAR ALLOWANCE</p>
          <h2 id="allowance-heading" className="mt-2 text-xl font-semibold">Contribution tracker</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {productOptions.length > 1 ? (
            <label className="sr-only" htmlFor="allowance-product">Product</label>
          ) : null}
          {productOptions.length > 1 ? (
            <select id="allowance-product" value={product} onChange={(event) => { setYear(""); setProduct(event.target.value); setContributionDate(""); setEditingId(null); setAmount(""); setNotes(""); setLoading(true); }} className="min-h-10 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
              {productOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          ) : null}
          {yearOptions.length > 1 ? (
            <>
              <label className="sr-only" htmlFor="allowance-year">Tax year</label>
              <select id="allowance-year" value={year} onChange={(event) => { setYear(event.target.value); setContributionDate(yearOptions.find((item) => item.tax_year_label === event.target.value)?.period_start ?? ""); setEditingId(null); setAmount(""); setNotes(""); setLoading(true); }} className="min-h-10 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                {yearOptions.map((item) => <option key={item.tax_year_label} value={item.tax_year_label}>{item.tax_year_label}</option>)}
              </select>
            </>
          ) : null}
          {rule ? <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] px-3 text-sm font-semibold">{dayCount} days to reset</span> : null}
        </div>
      </div>

      {loading ? <p role="status" className="mt-5 text-sm text-[var(--muted)]">Loading contribution allowances…</p> : null}
      {!loading && errorMessage ? <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{errorMessage}</p> : null}
      {!loading && !errorMessage && rule && summary ? (
        <>
          {summary.status === "OVER_CONTRIBUTED" || summary.lifetime_excess > 0 ? (
            <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={19} aria-hidden="true" />
              <p>
                <strong>
                  {summary.annual_excess > 0 ? `Annual cap exceeded by ${formatCurrency(summary.annual_excess, rule.currency)}.` : ""}
                  {summary.annual_excess > 0 && summary.lifetime_excess > 0 ? " " : ""}
                  {summary.lifetime_excess > 0 ? `Lifetime cap exceeded by ${formatCurrency(summary.lifetime_excess, rule.currency)}.` : ""}
                </strong>
                {" "}Estimated tax penalty: {formatCurrency(summary.estimated_penalty, rule.currency)} at {(rule.over_contribution_penalty_rate * 100).toFixed(0)}%.
              </p>
            </div>
          ) : summary.status === "APPROACHING_CAP" || summary.status === "CAP_REACHED" ? (
            <div role="status" className="mt-5 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={19} aria-hidden="true" />
              <p><strong>{summary.status === "CAP_REACHED" ? "Annual cap reached." : "Approaching annual cap."}</strong> Remaining annual headroom: {formatCurrency(summary.annual_remaining_headroom, rule.currency)}.</p>
            </div>
          ) : (
            <div className="mt-5 flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
              <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" size={19} aria-hidden="true" />
              <p>{rule.tax_year_label} allowance for {rule.product_code}. Contributions are shown across platform and declared institutions.</p>
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Meter
              title="Annual cap"
              contributed={summary.annual_contributed}
              limit={rule.annual_limit}
              currency={rule.currency}
              remaining={summary.annual_remaining_headroom}
              percent={summary.annual_utilization_pct}
              breakdown={[
                ["On platform", summary.internal_annual_contributed],
                ["External institutions", summary.external_annual_contributed],
              ]}
            />
            {rule.lifetime_limit !== null ? (
              <Meter
                title="Lifetime cap"
                contributed={summary.lifetime_contributed}
                limit={rule.lifetime_limit}
                currency={rule.currency}
                remaining={summary.lifetime_remaining_headroom ?? 0}
                percent={(summary.lifetime_contributed / rule.lifetime_limit) * 100}
              />
            ) : null}
          </div>

          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><CircleDollarSign size={17} aria-hidden="true" />Check planned contribution</h3>
            <label className="mt-3 block text-sm" htmlFor="planned-contribution">
              Proposed amount
              <input id="planned-contribution" className={fieldClass} type="number" min="0.01" step="0.01" inputMode="decimal" value={plannedAmount} onChange={(event) => setPlannedAmount(event.target.value)} placeholder="e.g. 5,000" />
            </label>
            {plannedValid && projectedAnnual !== null && projectedLifetime !== null ? (
              <div aria-live="polite" className={`mt-3 rounded-lg p-3 text-sm ${projectedAnnualExcess || projectedLifetimeExcess ? "border border-red-500/40 bg-red-500/10" : "border border-[var(--border)]"}`}>
                <p>After deposit: annual headroom {formatCurrency(Math.max(0, rule.annual_limit - projectedAnnual), rule.currency)}.</p>
                {rule.lifetime_limit !== null ? <p className="mt-1">Lifetime headroom {formatCurrency(Math.max(0, rule.lifetime_limit - projectedLifetime), rule.currency)}.</p> : null}
                {projectedAnnualExcess > 0 || projectedLifetimeExcess > 0 ? (
                  <p className="mt-1 font-semibold text-red-700">
                    This deposit breaches {projectedAnnualExcess > 0 && projectedLifetimeExcess > 0 ? "the annual and lifetime caps" : projectedAnnualExcess > 0 ? "the annual cap" : "the lifetime cap"}.
                    {projectedPenalty > 0 ? ` Estimated penalty: ${formatCurrency(projectedPenalty, rule.currency)}.` : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <form onSubmit={(event) => void saveContribution(event)} className="rounded-xl border border-[var(--border)] p-4">
              <h3 className="text-sm font-semibold">{editingId ? "Edit external contribution" : "Log external contribution"}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Record contributions held at another institution so your allowance estimate is more complete.</p>
              <label className="mt-3 block text-sm">Amount
                <input className={fieldClass} required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label className="mt-3 block text-sm">Contribution date
                    <input className={fieldClass} required type="date" min={rule.period_start} max={contributionMaxDate} value={contributionDate} onChange={(event) => setContributionDate(event.target.value)} />
              </label>
              <label className="mt-3 block text-sm">Institution or note
                <input className={fieldClass} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={saving} className="min-h-10 rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)] disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save changes" : "Add contribution"}</button>
                {editingId ? <button type="button" onClick={() => { setEditingId(null); setAmount(""); setNotes(""); }} className="min-h-10 rounded-full border border-[var(--border)] px-4 text-sm">Cancel</button> : null}
              </div>
              {successMessage ? <p role="status" className="mt-3 text-xs text-[var(--accent)]">{successMessage}</p> : null}
            </form>

            <div className="rounded-xl border border-[var(--border)] p-4">
              <h3 className="text-sm font-semibold">External institutions · {rule.tax_year_label}</h3>
              {data.externalLogs.length ? (
                <ul className="mt-3 divide-y divide-[var(--border)]">
                  {data.externalLogs.map((log) => (
                    <li key={log.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <span>{formatCurrency(log.amount, rule.currency)} · {new Date(`${log.contribution_date}T00:00:00`).toLocaleDateString("en-ZA")}{log.notes ? <span className="block text-xs text-[var(--muted)]">{log.notes}</span> : null}</span>
                      <button type="button" onClick={() => editContribution(log)} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold">Edit</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-[var(--muted)]">No external contributions logged for this tax year.</p>}
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Allowance limits and penalty rates are configured by your firm. External contributions are declared by you; verify your full position with your provider and SARS before making a deposit.</p>
        </>
      ) : null}
    </section>
  );
}

function Meter({
  title,
  contributed,
  limit,
  currency,
  remaining,
  percent,
  breakdown,
}: {
  title: string;
  contributed: number;
  limit: number;
  currency: string;
  remaining: number;
  percent: number;
  breakdown?: [string, number][];
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4" aria-label={`${title} progress`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs tabular-nums text-[var(--muted)]">{percent.toFixed(1)}%</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface)]" role="progressbar" aria-label={`${title} utilization`} aria-valuenow={Math.min(100, Math.round(percent))} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all ${percent > 100 ? "bg-red-600" : percent >= 80 ? "bg-amber-500" : "bg-[var(--accent-fill)]"}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <p className="mt-3 text-sm"><strong>{formatCurrency(contributed, currency)}</strong> of {formatCurrency(limit, currency)}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">Headroom: {formatCurrency(remaining, currency)}</p>
      {breakdown ? (
        <dl className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-xs">
          {breakdown.map(([label, amount]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="tabular-nums">{formatCurrency(amount, currency)}</dd></div>)}
        </dl>
      ) : null}
    </section>
  );
}
