"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { isAvailabilityStale, isIsinChecksumValid, isIsinFormatValid, normalizeIsin, type AvailabilityRecord, type PlatformRecord, type PlatformStatus, type ShareClassRecord } from "@/lib/platforms";

type HistoryRecord = {
  id: number;
  availabilityId: string;
  action: "insert" | "update";
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown>;
  changedAt: string;
};

type PlatformAdminData = {
  platforms: PlatformRecord[];
  shareClasses: ShareClassRecord[];
  availability: AvailabilityRecord[];
  history: HistoryRecord[];
};

type ApiResult = { error?: string };

function isVerified(status: PlatformStatus) {
  return status !== "not_verified";
}

function AvailabilityCellEditor({
  shareClass,
  platform,
  current,
  history,
  onSave,
}: {
  shareClass: ShareClassRecord;
  platform: PlatformRecord;
  current?: AvailabilityRecord;
  history: HistoryRecord[];
  onSave: (form: HTMLFormElement, shareClassId: string, platformId: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<PlatformStatus>(current?.status ?? "not_verified");
  return (
    <details className="rounded-xl border border-[var(--border)] p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        {platform.name}: {status === "verified_available" ? "Verified available" : status === "verified_unavailable" ? "Verified not available" : "Not verified"}
        {current?.verifiedOn ? <span className="ml-2 text-xs font-normal text-[var(--muted)]">{current.verifiedOn}</span> : null}
      </summary>
      <form className="mt-4 grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        void onSave(event.currentTarget, shareClass.id, platform.id);
      }}>
        <label className="grid gap-1 text-xs font-semibold">
          Status
          <select name="status" className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as PlatformStatus)}>
            <option value="not_verified">Not verified</option>
            <option value="verified_available">Verified available</option>
            <option value="verified_unavailable">Verified not available</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Platform fund code
          <input name="platformFundCode" defaultValue={current?.platformFundCode ?? ""} maxLength={80} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm" />
        </label>
        {isVerified(status) ? (
          <>
            <label className="grid gap-1 text-xs font-semibold">
              Source
              <input name="source" required maxLength={500} defaultValue={current?.source ?? ""} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Source URL (optional)
              <input name="sourceUrl" type="url" defaultValue={current?.sourceUrl ?? ""} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Verified by
              <input name="verifiedBy" required maxLength={120} defaultValue={current?.verifiedBy ?? ""} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Verified on
              <input name="verifiedOn" required type="date" defaultValue={current?.verifiedOn ?? ""} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm" />
            </label>
          </>
        ) : null}
        <button type="submit" className="min-h-11 rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)]">Save availability</button>
      </form>
      <details className="mt-4 border-t border-[var(--border)] pt-3">
        <summary className="cursor-pointer text-xs font-semibold">Change history ({history.length})</summary>
        {history.length ? (
          <ol className="mt-3 space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="text-xs leading-5 text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">{entry.action === "insert" ? "Created" : "Updated"}</strong>
                {" · "}{new Date(entry.changedAt).toLocaleString("en-ZA")}
                <pre className="mt-1 whitespace-pre-wrap break-words font-sans">Status: {String(entry.newValues.status ?? "Not recorded")} · Code: {String(entry.newValues.platform_fund_code ?? "Not listed")}</pre>
              </li>
            ))}
          </ol>
        ) : <p className="mt-2 text-xs text-[var(--muted)]">No changes recorded for this entry.</p>}
      </details>
    </details>
  );
}

function ShareClassEditor({
  item,
  onSave,
}: {
  item: ShareClassRecord;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [isin, setIsin] = useState(item.isin ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const normalizedIsin = normalizeIsin(isin);
  const isinFormatValid = !normalizedIsin || isIsinFormatValid(normalizedIsin);
  const checksumFailed = Boolean(normalizedIsin && isinFormatValid && !isIsinChecksumValid(normalizedIsin));
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void onSave({
        action: "update_share_class", id: item.id,
        fundName: form.get("fundName"), shareClass: form.get("shareClass"),
        jseCode: form.get("jseCode"), isin: normalizedIsin,
        isActive: form.get("isActive") === "on", confirmIsinChecksum: confirmed,
      });
    }}>
      <label className="grid gap-1 text-xs font-semibold">Fund name<input name="fundName" required maxLength={160} defaultValue={item.fundName} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm font-normal" /></label>
      <label className="grid gap-1 text-xs font-semibold">Share class<input name="shareClass" required maxLength={120} defaultValue={item.shareClass} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm font-normal" /></label>
      <label className="grid gap-1 text-xs font-semibold">JSE code<input name="jseCode" maxLength={32} defaultValue={item.jseCode ?? ""} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm font-normal" /></label>
      <label className="grid gap-1 text-xs font-semibold">ISIN<input name="isin" maxLength={32} value={isin} onChange={(event) => { setIsin(event.target.value); setConfirmed(false); }} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm font-normal" /></label>
      {!isinFormatValid ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">ISIN format should be two letters, nine alphanumeric characters, and a final digit.</p> : null}
      {checksumFailed ? <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200 sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />ISIN check digit failed. Confirm the value against its source document before saving.</label> : null}
      <label className="flex min-h-11 items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={item.isActive} />Active</label>
      <button type="submit" disabled={!isinFormatValid || (checksumFailed && !confirmed)} className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold disabled:opacity-50">Save share class</button>
    </form>
  );
}

export function AdminPlatformsPage() {
  const [data, setData] = useState<PlatformAdminData>({ platforms: [], shareClasses: [], availability: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isinValue, setIsinValue] = useState("");
  const [confirmBadChecksum, setConfirmBadChecksum] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/platforms", { cache: "no-store" });
      const result = await response.json() as PlatformAdminData & ApiResult;
      if (!response.ok) throw new Error(result.error ?? "Platform data could not be loaded.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Platform data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const staleEntries = useMemo(
    () => data.availability.filter((item) => isAvailabilityStale(item.verifiedOn)),
    [data.availability],
  );

  async function submitJson(path: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok) throw new Error(result.error ?? "The change could not be saved.");
      setMessage("Saved successfully.");
      await refresh();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The change could not be saved.");
      return false;
    }
  }

  async function savePlatform(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (await submitJson("/api/admin/platforms", "POST", { action: "create_platform", name: form.get("name") })) {
      formElement.reset();
    }
  }

  async function saveShareClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const isin = normalizeIsin(String(form.get("isin") ?? ""));
    const result = await submitJson("/api/admin/platforms", "POST", {
      action: "create_share_class",
      fundName: form.get("fundName"),
      shareClass: form.get("shareClass"),
      jseCode: form.get("jseCode"),
      isin,
      confirmIsinChecksum: confirmBadChecksum,
    });
    if (result) {
      formElement.reset();
      setIsinValue("");
      setConfirmBadChecksum(false);
    }
  }

  async function saveAvailability(form: HTMLFormElement, shareClassId: string, platformId: string) {
    const values = new FormData(form);
    const status = form.querySelector<HTMLSelectElement>("select[name=status]")?.value;
    await submitJson("/api/admin/platforms", "POST", {
      action: "save_availability",
      shareClassId,
      platformId,
      status,
      platformFundCode: values.get("platformFundCode"),
      source: values.get("source"),
      sourceUrl: values.get("sourceUrl"),
      verifiedBy: values.get("verifiedBy"),
      verifiedOn: values.get("verifiedOn"),
    });
  }

  async function togglePlatform(platform: PlatformRecord) {
    const isActive = !platform.isActive;
    if (!isActive && !window.confirm(`Deactivate ${platform.name}? Existing availability and history will be retained.`)) return;
    await submitJson("/api/admin/platforms", "PATCH", {
      action: "update_platform", id: platform.id, name: platform.name, isActive,
    });
  }

  async function updateShareClass(values: Record<string, unknown>) {
    await submitJson("/api/admin/platforms", "PATCH", values);
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-5 py-10 lg:px-8 lg:py-14">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">ADMIN</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Platforms &amp; codes</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Maintain verified platform availability and share-class identifiers. Entries are not published to clients or public search.
        </p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">{message}</p> : null}
      {loading ? <p role="status" className="text-sm text-[var(--muted)]">Loading platform records…</p> : null}

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Manage platforms and share classes">
        <form onSubmit={(event) => void savePlatform(event)} className="placeholder-glass-card space-y-4 rounded-2xl p-5">
          <h2 className="text-xl font-semibold">Add platform</h2>
          <label className="grid gap-2 text-sm font-semibold">Platform name
            <input name="name" required maxLength={120} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 font-normal" />
          </label>
          <button type="submit" className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Add platform</button>
          <ul className="divide-y divide-[var(--border)]">
            {data.platforms.map((platform) => (
              <li key={platform.id} className="py-3">
                <form className="flex flex-wrap items-center gap-3" onSubmit={(event) => {
                  event.preventDefault();
                  const name = new FormData(event.currentTarget).get("name");
                  void submitJson("/api/admin/platforms", "PATCH", {
                    action: "update_platform", id: platform.id, name, isActive: platform.isActive,
                  });
                }}>
                  <input aria-label={`Platform name: ${platform.name}`} name="name" required maxLength={120} defaultValue={platform.name} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm" />
                  <span className="text-xs text-[var(--muted)]">{platform.isActive ? "Active" : "Inactive"}</span>
                  <button type="submit" className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold">Save name</button>
                  <button type="button" onClick={() => void togglePlatform(platform)} className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold">
                    {platform.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </form>

        <form onSubmit={(event) => void saveShareClass(event)} className="placeholder-glass-card space-y-4 rounded-2xl p-5">
          <h2 className="text-xl font-semibold">Add fund share class</h2>
          <label className="grid gap-2 text-sm font-semibold">Fund name
            <input name="fundName" required maxLength={160} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">Share class
            <input name="shareClass" required maxLength={120} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">JSE code (optional)
            <input name="jseCode" maxLength={32} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">ISIN (optional)
            <input name="isin" value={isinValue} onChange={(event) => { setIsinValue(event.target.value); setConfirmBadChecksum(false); }} maxLength={32} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 font-normal" />
          </label>
          {isinValue.trim() && !isIsinFormatValid(isinValue) ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">ISIN format should be two letters, nine alphanumeric characters, and a final digit.</p> : null}
          {isinValue.trim() && isIsinFormatValid(isinValue) && !isIsinChecksumValid(isinValue) ? (
            <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <input type="checkbox" checked={confirmBadChecksum} onChange={(event) => setConfirmBadChecksum(event.target.checked)} />
              ISIN check digit failed. Confirm the ISIN against the source document before saving.
            </label>
          ) : null}
          <button type="submit" disabled={Boolean(isinValue.trim() && isIsinFormatValid(isinValue) && !isIsinChecksumValid(isinValue) && !confirmBadChecksum)} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50">Add share class</button>
          <ul className="divide-y divide-[var(--border)]">
            {data.shareClasses.map((item) => (
              <li key={item.id} className="border-t border-[var(--border)] py-3">
                <ShareClassEditor key={`${item.id}:${item.fundName}:${item.shareClass}:${item.jseCode}:${item.isin}`} item={item} onSave={updateShareClass} />
              </li>
            ))}
          </ul>
        </form>
      </section>

      <section className="placeholder-glass-card rounded-2xl p-5 sm:p-6" aria-labelledby="availability-matrix-heading">
        <h2 id="availability-matrix-heading" className="text-2xl font-semibold">Availability matrix</h2>
        {!data.shareClasses.length || !data.platforms.length ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Add the firm-supplied platform and share-class records to begin. No availability data is preloaded.</p>
        ) : (
          <div className="mt-5 space-y-5">
            {data.shareClasses.map((shareClass) => (
              <section key={shareClass.id} className="rounded-xl border border-[var(--border)] p-4">
                <h3 className="font-semibold">{shareClass.fundName} · {shareClass.shareClass}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">JSE: {shareClass.jseCode ?? "Not recorded"} · ISIN: {shareClass.isin ?? "Not recorded"}</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {data.platforms.map((platform) => {
                    const current = data.availability.find((item) => item.shareClassId === shareClass.id && item.platformId === platform.id);
                    return (
                      <AvailabilityCellEditor
                        key={`${shareClass.id}-${platform.id}-${current?.id ?? "new"}`}
                        shareClass={shareClass}
                        platform={platform}
                        current={current}
                        history={data.history.filter((item) => item.availabilityId === current?.id)}
                        onSave={saveAvailability}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="placeholder-glass-card rounded-2xl p-5 sm:p-6" aria-labelledby="reverification-heading">
        <h2 id="reverification-heading" className="text-2xl font-semibold">Re-verification queue</h2>
        {staleEntries.length ? (
          <ul className="mt-4 space-y-3">
            {staleEntries.map((entry) => {
              const shareClass = data.shareClasses.find((item) => item.id === entry.shareClassId);
              const platform = data.platforms.find((item) => item.id === entry.platformId);
              return <li key={entry.id} className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"><strong>Re-verify</strong> · {shareClass?.fundName ?? "Fund"} {shareClass?.shareClass ?? ""} · {platform?.name ?? "Platform"} · Verified {entry.verifiedOn ?? "Not recorded"}</li>;
            })}
          </ul>
        ) : <p className="mt-3 text-sm text-[var(--muted)]">No entries are due for re-verification.</p>}
      </section>
    </main>
  );
}
