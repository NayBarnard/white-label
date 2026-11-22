"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownToLine, FileText, RefreshCw, Send, ShieldCheck, Wallet } from "lucide-react";
import { getPortalSupabaseClient, type PortalDatabase } from "@/lib/supabase/portal";

type Portfolio = PortalDatabase["public"]["Tables"]["client_portfolios"]["Row"];
type Allocation = PortalDatabase["public"]["Tables"]["client_allocations"]["Row"];
type Transaction = PortalDatabase["public"]["Tables"]["client_transactions"]["Row"];
type SupportMessage = PortalDatabase["public"]["Tables"]["client_support_messages"]["Row"];
type ClientDocument = PortalDatabase["public"]["Tables"]["client_documents"]["Row"];
type PortfolioSummary = { portfolio: Portfolio; allocations: Allocation[] };
type VaultDocument = ClientDocument & { signedUrl: string };

const panelClass =
  "placeholder-glass-card rounded-2xl shadow-[0_18px_50px_rgba(2,6,23,0.24)]";
const fieldClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";
const allocationColors = [
  "bg-[#C5A880]",
  "bg-[#7589A8]",
  "bg-[#A7B0C1]",
  "bg-[#6C7890]",
];

const isConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function ClientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const currentUserId = useRef<string | null>(null);
  const [client] = useState(() =>
    typeof window !== "undefined" && isConfigured ? getPortalSupabaseClient() : null,
  );
  const [authReady, setAuthReady] = useState(!isConfigured);
  const [authMode, setAuthMode] = useState<"login" | "request-access">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSetup, setPasswordSetup] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState(
    isConfigured
      ? ""
      : "The client portal is unavailable right now. Please try again or contact placeholder.",
  );
  const [portfolioSummaries, setPortfolioSummaries] = useState<PortfolioSummary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [dataBusy, setDataBusy] = useState(false);
  const [dataMessage, setDataMessage] = useState("");
  const [supportInput, setSupportInput] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!client) return;
    const supabase = client;
    const verificationError =
      new URLSearchParams(window.location.search).get("authError") === "verification";
    const recoveryLink =
      new URLSearchParams(window.location.search).get("authAction") === "recovery";
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      if (currentUserId.current !== (nextUser?.id ?? null)) {
        setPortfolioSummaries([]);
        setTransactions([]);
        setSupportMessages([]);
        setDocuments([]);
      }
      currentUserId.current = nextUser?.id ?? null;
      setUser(nextUser);
      if (event === "SIGNED_IN" && !recoveryLink) router.replace("/portal");
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Client portal sign-in status could not be loaded.", error);
        setAuthMessage("We couldn't check your sign-in right now. Please try again or contact placeholder.");
      } else {
        currentUserId.current = data.session?.user.id ?? null;
        setUser(data.session?.user ?? null);
        if (recoveryLink && data.session) setPasswordSetup(true);
        else if (data.session) router.replace("/portal");
        if (verificationError) {
          setAuthMessage("We couldn’t verify that email link. Request a new confirmation email or sign in if your account is already confirmed.");
        }
      }
      setAuthReady(true);
    }).catch((error: unknown) => {
      console.error("Client portal sign-in status could not be loaded.", error);
      setAuthMessage("We couldn't check your sign-in right now. Please try again or contact placeholder.");
      setAuthReady(true);
    });

    return () => authListener.subscription.unsubscribe();
  }, [client, router]);

  useEffect(() => {
    if (!client || !user) return;

    let active = true;
    async function loadClientData(supabase: NonNullable<typeof client>) {
      setDataBusy(true);
      setDataMessage("");
      try {
        const [portfolioResult, transactionResult, messageResult, documentResult] = await Promise.all([
          supabase.from("client_portfolios").select("*").order("created_at", { ascending: false }),
          supabase.from("client_transactions").select("*").order("transacted_at", { ascending: false }).limit(50),
          supabase.from("client_support_messages").select("*").order("created_at", { ascending: true }),
          supabase.from("client_documents").select("*").order("issued_at", { ascending: false }),
        ]);
        if (!active) return;

        const dataErrors = [
          portfolioResult.error,
          transactionResult.error,
          messageResult.error,
          documentResult.error,
        ].filter((error) => error !== null);
        dataErrors.forEach((error) => console.error("Client account data could not be loaded.", error));
        if (dataErrors.length) {
          setDataMessage("We couldn't load your account details right now. Please try again or contact placeholder.");
        }

        const portfolios = portfolioResult.data ?? [];
        let allocations: Allocation[] = [];
        if (portfolios.length) {
          const allocationResult = await supabase
            .from("client_allocations")
            .select("*")
            .in("portfolio_id", portfolios.map((portfolio) => portfolio.id));
          if (!active) return;
          if (allocationResult.error) {
            console.error("Client asset allocations could not be loaded.", allocationResult.error);
            setDataMessage("We couldn't load your account details right now. Please try again or contact placeholder.");
          } else {
            allocations = allocationResult.data ?? [];
          }
        }

        setPortfolioSummaries(
          portfolios.map((portfolio) => ({
            portfolio,
            allocations: allocations.filter((allocation) => allocation.portfolio_id === portfolio.id),
          })),
        );
        setTransactions(transactionResult.data ?? []);
        setSupportMessages(messageResult.data ?? []);
        const documentProblems: string[] = [];
        const signedDocuments = await Promise.all(
          (documentResult.data ?? []).map(async (document) => {
            const { data, error } = await supabase.storage
              .from("client-documents")
              .createSignedUrl(document.object_path, 300);
            if (error || !data?.signedUrl) {
              if (error) console.error("A client document preview link could not be created.", error);
              documentProblems.push(document.id);
              return null;
            }
            return { ...document, signedUrl: data.signedUrl };
          }),
        );
        if (!active) return;
        setDocuments(signedDocuments.filter((document): document is VaultDocument => document !== null));
        if (documentProblems.length) {
          setDataMessage("Some documents could not be opened right now. Please try again or contact placeholder.");
        }
      } catch (error) {
        if (active) {
          console.error("Client account data could not be loaded.", error);
          setDataMessage("We couldn't load your account details right now. Please try again or contact placeholder.");
        }
      } finally {
        if (active) setDataBusy(false);
      }
    }

    void loadClientData(client);
    return () => {
      active = false;
    };
  }, [client, user, refreshVersion]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const result =
        authMode === "login"
          ? await client.auth.signInWithPassword({ email, password })
          : await client.auth.signInWithOtp({
              email,
              options: {
                shouldCreateUser: true,
                emailRedirectTo: new URL("/auth/callback", window.location.origin).toString(),
              },
            });

      if (result.error) {
        console.error("Client authentication failed.", result.error);
        setAuthMessage(
          authMode === "login"
            ? "We couldn't sign you in. Please check your details and try again."
            : "We couldn't send a sign-in link right now. Please try again or contact placeholder.",
        );
      } else if (authMode === "request-access") {
        setAuthMessage("If this email can access the portal, a secure sign-in link has been sent. Follow it to sign in or complete your access setup.");
      }
    } catch (error) {
      console.error("Client authentication failed.", error);
      setAuthMessage("We couldn't complete sign-in right now. Please try again or contact placeholder.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestPasswordSetup() {
    if (!client || !email.trim()) {
      setAuthMessage("Enter your email address first so we can send a secure password setup link.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/auth/callback?flow=recovery", window.location.origin).toString(),
      });
      if (error) throw error;
      setAuthMessage("If an account exists for this address, a secure password setup link will arrive by email.");
    } catch (error) {
      console.error("Client password setup email could not be sent.", error);
      setAuthMessage("We couldn't send the password setup link right now. Please try again or contact placeholder.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function saveNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || newPassword.length < 8) return;
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSetup(false);
      setNewPassword("");
      setAuthMessage("Your password has been set. You can use it the next time you log in.");
      window.history.replaceState(window.history.state, "", "/portal/dashboard");
    } catch (error) {
      console.error("Client password could not be updated.", error);
      setAuthMessage("We couldn't update your password right now. Please try again or contact placeholder.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (!client) return;
    try {
      const { error } = await client.auth.signOut();
      if (error) {
        console.error("Client sign-out failed.", error);
        setAuthMessage("We couldn't sign you out right now. Please try again.");
      }
      else setAuthMessage("");
    } catch (error) {
      console.error("Client sign-out failed.", error);
      setAuthMessage("We couldn't sign you out right now. Please try again.");
    }
  }

  async function sendSupportMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !user || !supportInput.trim() || supportBusy) return;
    setSupportBusy(true);
    setDataMessage("");
    try {
      const { data, error } = await client
        .from("client_support_messages")
        .insert({
          user_id: user.id,
          sender_role: "client",
          message: supportInput.trim(),
        })
        .select("*")
        .single();

      if (error) {
        console.error("Client support message could not be sent.", error);
        setDataMessage("We couldn't send your message right now. Please try again or contact placeholder.");
      } else {
        setSupportMessages((current) => [...current, data]);
        setSupportInput("");
      }
    } catch (error) {
      console.error("Client support message could not be sent.", error);
      setDataMessage("We couldn't send your message right now. Please try again or contact placeholder.");
    } finally {
      setSupportBusy(false);
    }
  }

  const completeValuation =
    portfolioSummaries.length > 0 &&
    portfolioSummaries.every(({ portfolio }) => portfolio.valuation_zar !== null);
  const totalValuation = completeValuation
    ? portfolioSummaries.reduce((total, { portfolio }) => total + (portfolio.valuation_zar ?? 0), 0)
    : null;
  const hasCompletePerformance =
    completeValuation &&
    totalValuation !== null &&
    totalValuation > 0 &&
    portfolioSummaries.every(({ portfolio }) => portfolio.performance_percent !== null) &&
    portfolioSummaries.every(
      ({ portfolio }) => portfolio.performance_period === portfolioSummaries[0]?.portfolio.performance_period,
    ) &&
    Boolean(portfolioSummaries[0]?.portfolio.performance_period);
  const weightedPerformance = hasCompletePerformance
    ? portfolioSummaries.reduce(
        (total, { portfolio }) =>
          total + (portfolio.valuation_zar ?? 0) * (portfolio.performance_percent ?? 0),
        0,
      ) / (totalValuation ?? 1)
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      {!authReady ? (
        <div className={`${panelClass} p-6 text-sm text-[var(--muted)]`} role="status">
          Connecting securely to the client portal…
        </div>
      ) : !user ? (
        <section className={`${panelClass} mx-auto max-w-lg p-6 sm:p-8`}>
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
              <ShieldCheck size={21} />
            </span>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]">SECURE CLIENT ACCESS</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {authMode === "login" ? "Login" : "Request portal access"}
              </h2>
            </div>
          </div>

          {isConfigured ? (
            <form onSubmit={(event) => void handleAuth(event)} className="mt-7 space-y-4">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClass}
                />
              </label>
              {authMode === "login" ? (
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              ) : (
                <p className="text-sm leading-6 text-[var(--muted)]">
                  We’ll email a secure one-time sign-in link. No temporary password is sent.
                </p>
              )}
              <button
                type="submit"
                disabled={authBusy}
                className="min-h-11 w-full rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50"
              >
                {authBusy ? "PLEASE WAIT…" : authMode === "login" ? "LOGIN" : "EMAIL ME A SECURE LINK"}
              </button>
              {authMode === "login" && (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void requestPasswordSetup()}
                  className="w-full text-center text-xs text-[var(--muted)] underline underline-offset-2 transition hover:text-[var(--accent)] disabled:opacity-50"
                >
                  Set or reset password by email
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAuthMessage("");
                  setAuthMode((mode) => mode === "login" ? "request-access" : "login");
                }}
                className="w-full text-center text-xs text-[var(--muted)] transition hover:text-[var(--accent)]"
              >
                {authMode === "login" ? "New to placeholder? Request portal access" : "Already have access? Return to Login"}
              </button>
            </form>
          ) : (
            <p className="mt-6 rounded-xl border border-[#C5A880]/25 bg-[#C5A880]/5 p-4 text-sm leading-6 text-[var(--muted)]">
              {authMessage}
            </p>
          )}
          {authMessage && isConfigured && (
            <p role="status" aria-live="polite" className="mt-4 text-sm text-[var(--accent)]">
              {authMessage}
            </p>
          )}
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
            Your account information is private and is shown only after you sign in.
          </p>
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <Link
              href="/advisor/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--border-strong)] text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Advisor / staff sign-in
            </Link>
          </div>
        </section>
      ) : (
        <>
          {passwordSetup && (
            <form onSubmit={(event) => void saveNewPassword(event)} className={`${panelClass} mb-6 max-w-lg p-5 sm:p-6`}>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Set your portal password</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Choose a password for future logins. This replaces the one-time email link as your sign-in method.
              </p>
              <label className="mt-4 block text-sm font-medium text-[var(--foreground)]">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <button
                type="submit"
                disabled={authBusy}
                className="mt-4 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50"
              >
                {authBusy ? "SAVING…" : "SET PASSWORD"}
              </button>
            </form>
          )}
          <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]">PRIVATE CLIENT PORTAL</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Your investment dashboard</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{user.email}</p>
            </div>
            <div className="flex gap-2">
              {!passwordSetup && (
                <button
                  type="button"
                  onClick={() => setPasswordSetup(true)}
                  className="min-h-10 rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-4 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
                >
                  SET PASSWORD
                </button>
              )}
              <button
                type="button"
                onClick={() => setRefreshVersion((version) => version + 1)}
                disabled={dataBusy}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-4 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
              >
                <RefreshCw size={14} className={dataBusy ? "animate-spin" : ""} /> REFRESH
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="min-h-10 rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-4 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
              >
                SIGN OUT
              </button>
            </div>
          </header>

          {dataMessage && (
            <p role="alert" className="mb-5 rounded-xl border border-[#C5A880]/30 bg-[#C5A880]/5 p-3 text-sm text-[var(--foreground)]">
              {dataMessage}
            </p>
          )}

          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className={`${panelClass} p-5`}>
              <p className="text-xs font-medium text-[var(--muted)]">Portfolio valuation</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                {totalValuation === null
                  ? "Not reported"
                  : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(totalValuation)}
              </p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">
                Latest account valuation · Source: authenticated portfolio records
                {completeValuation && portfolioSummaries.every(({ portfolio }) => portfolio.valuation_as_of === portfolioSummaries[0]?.portfolio.valuation_as_of) &&
                portfolioSummaries[0]?.portfolio.valuation_as_of
                  ? ` · As at ${new Date(`${portfolioSummaries[0].portfolio.valuation_as_of}T00:00:00`).toLocaleDateString("en-ZA")}`
                  : ""}
              </p>
            </article>
            <article className={`${panelClass} p-5`}>
              <p className="text-xs font-medium text-[var(--muted)]">Reported performance</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--accent)]">
                {weightedPerformance === null ? "Not reported" : `${weightedPerformance.toFixed(2)}%`}
              </p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">
                {hasCompletePerformance
                  ? `As at: Not provided · Weighted by current valuation · Source: authenticated account performance records · ${portfolioSummaries[0]?.portfolio.performance_period}`
                  : "As at: Not reported · Source: authenticated account performance records"}
              </p>
            </article>
            <article className={`${panelClass} p-5`}>
              <p className="text-xs font-medium text-[var(--muted)]">Managed accounts</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{portfolioSummaries.length}</p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">your firm Balanced and your firm Cautious records</p>
            </article>
            <article className={`${panelClass} p-5`}>
              <p className="text-xs font-medium text-[var(--muted)]">Secure documents</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{documents.length}</p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">Private, time-limited document links</p>
              <a href="#document-vault" className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]">
                Open document vault
              </a>
            </article>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={`${panelClass} p-5 sm:p-6`}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
                  <Wallet size={19} />
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Portfolio allocations</h3>
                  <p className="text-xs text-[var(--muted)]">Account-specific records</p>
                </div>
              </div>
              <div className="mt-5 space-y-5">
                {portfolioSummaries.length ? portfolioSummaries.map(({ portfolio, allocations }) => (
                  <article key={portfolio.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--foreground)]">{portfolio.label}</h4>
                    {allocations.length ? (
                      <>
                        <div
                          className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-[var(--border)]"
                          aria-label={`${portfolio.label} managed asset allocation`}
                        >
                          {allocations.map((allocation, index) => (
                            <span
                              key={allocation.id}
                              title={`${allocation.asset_class}: ${allocation.allocation_percent}%`}
                              className={allocationColors[index % allocationColors.length]}
                              style={{ width: `${allocation.allocation_percent}%` }}
                            />
                          ))}
                        </div>
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                          {allocations.map((allocation, index) => (
                            <li key={allocation.id} className="flex items-center justify-between gap-3 text-xs">
                              <span className="flex min-w-0 items-center gap-2 text-[var(--muted)]">
                                <span className={`size-2 shrink-0 rounded-full ${allocationColors[index % allocationColors.length]}`} />
                                <span className="truncate">{allocation.asset_class}</span>
                              </span>
                              <span className="font-semibold text-[var(--foreground)]">{allocation.allocation_percent}%</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="mt-3 text-xs text-[var(--muted)]">No asset allocations are available for this portfolio.</p>
                    )}
                  </article>
                )) : (
                  <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm leading-6 text-[var(--muted)]">
                    No portfolio summaries are assigned to this account yet. Contact your financial advisor if you expect to see an account here.
                  </p>
                )}
              </div>
            </section>

            <section className={`${panelClass} p-5 sm:p-6`}>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">Transaction history</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Latest account activity · up to 50 records</p>
              </div>
              <div className="mt-5 overflow-x-auto">
                {transactions.length ? (
                  <table className="w-full min-w-[460px] text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <tr>
                        <th className="pb-3 pr-3 font-medium">Date</th>
                        <th className="pb-3 pr-3 font-medium">Activity</th>
                        <th className="pb-3 pr-3 text-right font-medium">Amount</th>
                        <th className="pb-3 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-t border-[var(--border)]">
                          <td className="py-3 pr-3 text-[var(--muted)]">
                            {new Date(transaction.transacted_at).toLocaleDateString("en-ZA")}
                          </td>
                          <td className="max-w-40 truncate py-3 pr-3 text-[var(--foreground)]">{transaction.description}</td>
                          <td className="py-3 pr-3 text-right font-medium text-[var(--foreground)]">
                            {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(transaction.amount)}
                          </td>
                          <td className="py-3 text-right text-[var(--muted)]">{transaction.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm leading-6 text-[var(--muted)]">
                    No transaction records are available for this account.
                  </p>
                )}
              </div>
            </section>

            <section id="document-vault" className={`${panelClass} scroll-mt-24 p-5 sm:col-span-2 sm:p-6`}>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--accent)]">PRIVATE DOCUMENTS</p>
                <h3 className="mt-1 font-semibold text-[var(--foreground)]">Secure document vault</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Documents assigned to your account. Access links expire after five minutes.</p>
              </div>
              <ul className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--background)]">
                {documents.length ? documents.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText size={17} className="shrink-0 text-[var(--accent)]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{document.title}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                          {document.document_type}
                          {document.issued_at ? ` · ${new Date(document.issued_at).toLocaleDateString("en-ZA")}` : ""}
                        </p>
                      </div>
                    </div>
                    <a
                      href={document.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-xs font-semibold text-[var(--accent)] transition hover:border-[var(--accent)]"
                    >
                      <ArrowDownToLine size={14} /> OPEN
                    </a>
                  </li>
                )) : (
                  <li className="px-4 py-4 text-sm text-[var(--muted)]">No tax certificates or quarterly fact sheets have been assigned yet.</li>
                )}
              </ul>
            </section>

            <section className={`${panelClass} p-5 sm:col-span-2 sm:p-6`}>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--accent)]">CLIENT SERVICE</p>
                <h3 className="mt-1 font-semibold text-[var(--foreground)]">Secure message thread</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Messages are saved to your private account thread. This is asynchronous messaging, not live chat.
                </p>
              </div>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" aria-live="polite">
                {supportMessages.length ? supportMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-xl border px-3 py-2.5 text-sm leading-5 ${
                      message.sender_role === "client"
                        ? "ml-auto border-[#C5A880]/30 bg-[#C5A880]/15 text-[var(--foreground)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.message}</p>
                    <time className="mt-1 block text-[10px] text-[var(--muted)]">
                      {new Date(message.created_at).toLocaleString("en-ZA")}
                    </time>
                  </div>
                )) : (
                  <p className="p-3 text-sm text-[var(--muted)]">Your secure support conveplaceholdertion will appear here.</p>
                )}
              </div>
              <form onSubmit={(event) => void sendSupportMessage(event)} className="mt-3 flex gap-2">
                <label htmlFor="support-message" className="sr-only">Message the your firm client service team</label>
                <input
                  id="support-message"
                  value={supportInput}
                  onChange={(event) => setSupportInput(event.target.value)}
                  maxLength={2000}
                  required
                  placeholder="Write a message to our team…"
                  className={fieldClass}
                />
                <button
                  type="submit"
                  disabled={supportBusy || !supportInput.trim()}
                  aria-label="Send support message"
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-fill)] text-[var(--button-text)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={17} />
                </button>
              </form>
              <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">
                Do not include passwords, identity numbers, bank details, or other sensitive information in a message.
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
