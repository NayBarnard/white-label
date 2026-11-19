"use client";

import { useEffect, useState, type FormEvent } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { FeatureLink } from "@/components/FeatureGate";
import type { AdminRequestStatus } from "@/lib/admin/validation";

type AdminClient = {
  id: string;
  email: string;
  name: string;
  portfolios: AdminPortfolio[];
};

type AdminPortfolio = {
  id: string;
  label: string;
  valuation_zar: number | null;
  valuation_as_of: string | null;
  performance_percent: number | null;
  performance_period: string | null;
  created_at: string;
};

type SupportMessage = {
  id: string;
  user_id: string;
  sender_role: "client" | "manager";
  message: string;
  created_at: string;
};

type ClientRequest = {
  id: string;
  user_id: string;
  request_type: string;
  details: string;
  status: AdminRequestStatus;
  created_at: string;
};

const requestStatuses: AdminRequestStatus[] = ["Submitted", "In Review", "Completed"];
const inputClass =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--glass-input-text)] outline-none focus-visible:border-[var(--glass-focus-border)] focus-visible:ring-2 focus-visible:ring-[var(--glass-focus-ring)]";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAdminClient(value: unknown): value is AdminClient {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.portfolios) &&
    value.portfolios.every(isAdminPortfolio)
  );
}

function isAdminPortfolio(value: unknown): value is AdminPortfolio {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    (typeof value.valuation_zar === "number" || value.valuation_zar === null) &&
    (typeof value.valuation_as_of === "string" || value.valuation_as_of === null) &&
    (typeof value.performance_percent === "number" || value.performance_percent === null) &&
    (typeof value.performance_period === "string" || value.performance_period === null) &&
    typeof value.created_at === "string"
  );
}

function isSupportMessage(value: unknown): value is SupportMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.user_id === "string" &&
    (value.sender_role === "client" || value.sender_role === "manager") &&
    typeof value.message === "string" &&
    typeof value.created_at === "string"
  );
}

function isClientRequest(value: unknown): value is ClientRequest {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.user_id === "string" &&
    typeof value.request_type === "string" &&
    typeof value.details === "string" &&
    typeof value.status === "string" &&
    requestStatuses.some((status) => status === value.status) &&
    typeof value.created_at === "string"
  );
}

async function responseError(response: Response) {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return `Request failed (${response.status}).`;
  }
  return isRecord(payload) && typeof payload.error === "string"
    ? payload.error
    : `Request failed (${response.status}).`;
}

export function AdminBackOffice() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [requestStatusesById, setRequestStatusesById] = useState<Record<string, AdminRequestStatus>>({});
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [portfolioLabel, setPortfolioLabel] = useState("");
  const [valuation, setValuation] = useState("");
  const [valuationAsAt, setValuationAsAt] = useState("");
  const [performance, setPerformance] = useState("");
  const [performancePeriod, setPerformancePeriod] = useState("");
  const [reply, setReply] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function changeSelectedClient(userId: string) {
    setSelectedClientId(userId);
    setSelectedPortfolioId("");
    setPortfolioLabel("");
    setValuation("");
    setValuationAsAt("");
    setPerformance("");
    setPerformancePeriod("");
  }

  function changeSelectedPortfolio(portfolioId: string) {
    setSelectedPortfolioId(portfolioId);
    const portfolio = clients
      .find((client) => client.id === selectedClientId)
      ?.portfolios.find((item) => item.id === portfolioId);
    setPortfolioLabel(portfolio?.label ?? "");
    setValuation(portfolio?.valuation_zar === null || portfolio?.valuation_zar === undefined
      ? ""
      : String(portfolio.valuation_zar));
    setValuationAsAt(portfolio?.valuation_as_of ?? "");
    setPerformance(portfolio?.performance_percent === null || portfolio?.performance_percent === undefined
      ? ""
      : String(portfolio.performance_percent));
    setPerformancePeriod(portfolio?.performance_period ?? "");
  }

  useEffect(() => {
    let active = true;

    async function loadAdminData() {
      setLoading(true);
      setError("");
      try {
        const [clientsResponse, supportResponse, requestsResponse] = await Promise.all([
          fetch("/api/admin/clients", { cache: "no-store" }),
          fetch("/api/admin/support", { cache: "no-store" }),
          fetch("/api/admin/requests", { cache: "no-store" }),
        ]);
        for (const response of [clientsResponse, supportResponse, requestsResponse]) {
          if (!response.ok) throw new Error(await responseError(response));
        }

        const [clientsData, supportData, requestsData]: unknown[] = await Promise.all([
          clientsResponse.json(),
          supportResponse.json(),
          requestsResponse.json(),
        ]);
        const clientValues =
          isRecord(clientsData) && Array.isArray(clientsData.clients)
            ? clientsData.clients
            : null;
        const supportValues =
          isRecord(supportData) && Array.isArray(supportData.messages)
            ? supportData.messages
            : null;
        const requestValues =
          isRecord(requestsData) && Array.isArray(requestsData.requests)
            ? requestsData.requests
            : null;
        const clientItems = clientValues?.filter(isAdminClient) ?? null;
        const supportItems = supportValues?.filter(isSupportMessage) ?? null;
        const requestItems = requestValues?.filter(isClientRequest) ?? null;
        if (
          !clientItems ||
          !clientValues ||
          clientItems.length !== clientValues.length ||
          !supportItems ||
          !supportValues ||
          supportItems.length !== supportValues.length ||
          !requestItems ||
          !requestValues ||
          requestItems.length !== requestValues.length
        ) {
          throw new Error("The admin data response was not in the expected format.");
        }

        if (!active) return;
        const statusById: Record<string, AdminRequestStatus> = {};
        for (const item of requestItems) statusById[item.id] = item.status;
        setClients(clientItems);
        setMessages(supportItems);
        setRequests(requestItems);
        setRequestStatusesById(statusById);
        setSelectedClientId((current) => current || clientItems[0]?.id || "");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Admin data could not be loaded.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAdminData();
    return () => {
      active = false;
    };
  }, [refreshVersion]);

  async function assignPortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction || !selectedClientId) return;
    setBusyAction("portfolio");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedClientId,
          portfolioId: selectedPortfolioId || null,
          label: portfolioLabel,
          valuationZar: valuation.trim() ? Number(valuation) : null,
          valuationAsOf: valuationAsAt || null,
          performancePercent: performance.trim() ? Number(performance) : null,
          performancePeriod: performancePeriod || null,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setNotice(selectedPortfolioId ? "Portfolio assignment updated." : "Portfolio assignment saved.");
      setSelectedPortfolioId("");
      setPortfolioLabel("");
      setValuation("");
      setValuationAsAt("");
      setPerformance("");
      setPerformancePeriod("");
      setRefreshVersion((version) => version + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Portfolio assignment failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("userId", selectedClientId);
    setBusyAction("document");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(await responseError(response));
      setNotice("Document uploaded and added to the client vault.");
      form.reset();
      setRefreshVersion((version) => version + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Document upload failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction || !selectedClientId) return;
    setBusyAction("reply");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedClientId, message: reply }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setReply("");
      setNotice("Manager response sent.");
      setRefreshVersion((version) => version + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Support reply failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function saveRequestStatus(requestId: string) {
    if (busyAction) return;
    setBusyAction(requestId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: requestStatusesById[requestId] }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setNotice("Request status updated.");
      setRefreshVersion((version) => version + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Request update failed.");
    } finally {
      setBusyAction("");
    }
  }

  const clientLabel = (clientId: string) => {
    const client = clients.find((candidate) => candidate.id === clientId);
    return client ? `${client.name || client.email || "Client"} · ${client.id}` : clientId;
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">RESTRICTED ACCESS</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Client administration</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Manage client portfolios, secure documents and portal requests.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshVersion((version) => version + 1)}
          disabled={loading || Boolean(busyAction)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)] disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
        <FeatureLink
          feature="managerUpdates"
          href="/admin/manager-updates"
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)]"
        >
          Manager Updates
        </FeatureLink>
      </header>

      {error ? <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">{error}</p> : null}
      {notice ? <p role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">{notice}</p> : null}
      {loading ? <p role="status" className="mb-5 text-sm text-[var(--muted)]">Loading secure admin data…</p> : null}

      <section id="clients" className="glass rounded-3xl p-5 sm:p-7" aria-labelledby="admin-clients-heading">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[var(--accent)]" size={20} />
          <div>
            <h2 id="admin-clients-heading" className="text-lg font-semibold">Clients</h2>
            <p className="text-xs text-[var(--muted)]">{clients.length} client accounts loaded</p>
          </div>
        </div>
        {!clients.length && !loading ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No client accounts are available.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <li key={client.id} className="glass-inset min-w-0 p-3 text-sm">
                <p className="truncate font-semibold">{client.name || client.email || "Client account"}</p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{client.email}</p>
                <p className="mt-1 break-all text-[10px] text-[var(--muted)]">{client.id}</p>
                <p className="mt-3 text-xs font-semibold">Current portfolio assignments</p>
                {client.portfolios.length ? (
                  <ul className="mt-1 space-y-1 text-xs text-[var(--muted)]">
                    {client.portfolios.map((portfolio) => (
                      <li key={portfolio.id} className="break-words">
                        {portfolio.label}
                        {portfolio.valuation_as_of ? ` · Valued ${portfolio.valuation_as_of}` : " · Valuation date not reported"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-[var(--muted)]">No portfolio is currently assigned.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section id="portfolios" className="glass rounded-3xl p-5 sm:p-7" aria-labelledby="assign-portfolio-heading">
          <h2 id="assign-portfolio-heading" className="text-lg font-semibold">Assign a portfolio</h2>
          <form onSubmit={(event) => void assignPortfolio(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">
              Client
              <select className={inputClass} value={selectedClientId} onChange={(event) => changeSelectedClient(event.target.value)} required>
                <option value="">Select a client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name || client.email || client.id}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Existing assignment to update (optional)
              <select
                className={inputClass}
                value={selectedPortfolioId}
                onChange={(event) => changeSelectedPortfolio(event.target.value)}
              >
                <option value="">Create a new portfolio assignment</option>
                {clients
                  .find((client) => client.id === selectedClientId)
                  ?.portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>{portfolio.label}</option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Portfolio label
              <input className={inputClass} value={portfolioLabel} onChange={(event) => setPortfolioLabel(event.target.value)} maxLength={120} required />
            </label>
            <label className="text-sm font-medium">
              Valuation (ZAR, optional)
              <input className={inputClass} type="number" min="0" step="0.01" value={valuation} onChange={(event) => setValuation(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Valuation as at (optional)
              <input className={inputClass} type="date" value={valuationAsAt} onChange={(event) => setValuationAsAt(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Reported performance % (optional)
              <input className={inputClass} type="number" step="0.0001" value={performance} onChange={(event) => setPerformance(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Performance period (optional)
              <input className={inputClass} value={performancePeriod} onChange={(event) => setPerformancePeriod(event.target.value)} maxLength={80} />
            </label>
            <p className="text-xs leading-5 text-[var(--muted)] sm:col-span-2">Enter only approved account values. Leave unknown figures blank; no illustrative values are inserted.</p>
            <button type="submit" disabled={!selectedClientId || Boolean(busyAction)} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50 sm:col-span-2">
              {busyAction === "portfolio" ? "SAVING…" : "ASSIGN PORTFOLIO"}
            </button>
          </form>
        </section>

        <section id="documents" className="glass rounded-3xl p-5 sm:p-7" aria-labelledby="upload-document-heading">
          <h2 id="upload-document-heading" className="text-lg font-semibold">Upload a client document</h2>
          <form onSubmit={(event) => void uploadDocument(event)} className="mt-4 space-y-4">
            <label className="block text-sm font-medium">
              Client
              <select className={inputClass} value={selectedClientId} onChange={(event) => changeSelectedClient(event.target.value)} required>
                <option value="">Select a client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name || client.email || client.id}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Document title
              <input name="title" className={inputClass} maxLength={160} required />
            </label>
            <label className="block text-sm font-medium">
              Document type
              <input name="documentType" className={inputClass} maxLength={80} required />
            </label>
            <label className="block text-sm font-medium">
              Issued at (optional)
              <input name="issuedAt" type="date" className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              PDF document (maximum 4 MB)
              <input name="file" type="file" accept="application/pdf,.pdf" className={`${inputClass} file:mr-3 file:border-0 file:bg-transparent`} required />
            </label>
            <p className="text-xs text-[var(--muted)]">Files are stored privately under the selected client’s user-ID folder.</p>
            <button type="submit" disabled={!selectedClientId || Boolean(busyAction)} className="min-h-11 w-full rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50">
              {busyAction === "document" ? "UPLOADING…" : "UPLOAD DOCUMENT"}
            </button>
          </form>
        </section>

        <section id="support" className="glass rounded-3xl p-5 sm:p-7" aria-labelledby="support-inbox-heading">
          <h2 id="support-inbox-heading" className="text-lg font-semibold">Support messages</h2>
          {!messages.length ? (
            <p className="mt-4 text-sm text-[var(--muted)]">{loading ? "Loading messages…" : "No support messages were found."}</p>
          ) : (
            <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto">
              {messages.map((message) => (
                <li key={message.id} className="glass-inset p-3">
                  <p className="text-xs font-semibold">{message.sender_role === "manager" ? "Manager response" : "Client message"}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{clientLabel(message.user_id)} · {new Date(message.created_at).toLocaleString("en-ZA")}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={(event) => void sendReply(event)} className="mt-5 space-y-3">
            <label className="block text-sm font-medium">
              Reply to client
              <select className={inputClass} value={selectedClientId} onChange={(event) => changeSelectedClient(event.target.value)} required>
                <option value="">Select a client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name || client.email || client.id}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Manager response
              <textarea className={`${inputClass} min-h-28 resize-y`} value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} required />
            </label>
            <button type="submit" disabled={!selectedClientId || Boolean(busyAction)} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50">
              {busyAction === "reply" ? "SENDING…" : "SEND REPLY"}
            </button>
          </form>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-7" aria-labelledby="client-requests-heading">
          <h2 id="client-requests-heading" className="text-lg font-semibold">Client requests</h2>
          {!requests.length ? (
            <p className="mt-4 text-sm text-[var(--muted)]">{loading ? "Loading requests…" : "No client requests were found."}</p>
          ) : (
            <ul className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto">
              {requests.map((item) => (
                <li key={item.id} className="glass-inset p-4">
                  <p className="font-semibold">{item.request_type}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{clientLabel(item.user_id)} · {new Date(item.created_at).toLocaleString("en-ZA")}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.details}</p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="min-w-40 flex-1 text-xs font-medium">
                      Status
                      <select
                        className={inputClass}
                        value={requestStatusesById[item.id] ?? item.status}
                        onChange={(event) => {
                          const status = requestStatuses.find((candidate) => candidate === event.target.value);
                          if (status) setRequestStatusesById((current) => ({ ...current, [item.id]: status }));
                        }}
                      >
                        {requestStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <button type="button" onClick={() => void saveRequestStatus(item.id)} disabled={Boolean(busyAction)} className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold hover:border-[var(--accent)] disabled:opacity-50">
                      {busyAction === item.id ? "SAVING…" : "SAVE STATUS"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
