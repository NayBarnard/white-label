"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  FileText,
  MessageSquareText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import {
  getPortalSupabaseClient,
  type PortalDatabase,
  type SupabaseClient,
} from "@/lib/supabase/portal";
import { company, feeInformation, performanceDisclosures, strategies } from "@/data/firmData";
import { features } from "@/config/features";
import { TaxAllowanceTracker } from "@/components/TaxAllowanceTracker";
import {
  calculateGoalProgress,
  monthsUntilGoalDate,
  parseGoalInput,
  projectGoalValue,
} from "@/lib/goals/calculations";
import {
  isProfileRequestType,
  parseProfileRequest,
  profileRequestTypes,
} from "@/lib/portal/profile-requests";

type PortalUser = { id: string; email: string; name: string };
type PortfolioRow = PortalDatabase["public"]["Tables"]["client_portfolios"]["Row"];
type AllocationRow = PortalDatabase["public"]["Tables"]["client_allocations"]["Row"];
type TransactionRow = PortalDatabase["public"]["Tables"]["client_transactions"]["Row"];
type DocumentRow = PortalDatabase["public"]["Tables"]["client_documents"]["Row"];
type RequestRow = PortalDatabase["public"]["Tables"]["client_portal_requests"]["Row"];
type TabKey = "overview" | "holdings" | "documents" | "requests" | "managerUpdates" | "taxCentre";
type ManagerUpdateRow = PortalDatabase["public"]["Tables"]["manager_updates"]["Row"];
type VisibleManagerUpdate = ManagerUpdateRow & { mediaUrl: string | null };
type GoalRow = PortalDatabase["public"]["Tables"]["client_goals"]["Row"];
type AdviserDetails = { id: string; name: string; email: string; phone: string };
type PortalNotification = PortalDatabase["public"]["Tables"]["portal_notifications"]["Row"];
type GoalFormState = {
  name: string;
  targetAmount: string;
  targetDate: string;
  monthlyContribution: string;
  growthPercent: string;
};
type RequestType =
  | "Lump Sum Top-Up"
  | "Strategy Switch"
  | "Debit Order Update"
  | "Withdrawal"
  | "Portfolio Review"
  | "Personal Data Deletion"
  | (typeof profileRequestTypes)[number];

type DocumentCategory = "Tax Certificates" | "Quarterly Statements" | "Strategy Fact Sheets";
type VaultCategory = "Select" | "All" | DocumentCategory;

const vaultCategories: VaultCategory[] = ["Select", "All", "Tax Certificates", "Quarterly Statements", "Strategy Fact Sheets"];

type VaultItem = {
  id: string;
  title: string;
  category: DocumentCategory;
  issuedAt: string;
  description: string;
  storagePath?: string;
};
type RequestItem = RequestRow & { localOnly?: boolean };

const panelClass = "placeholder-glass-card rounded-2xl p-5 sm:p-6";
const emptyGoalForm: GoalFormState = {
  name: "",
  targetAmount: "",
  targetDate: "",
  monthlyContribution: "",
  growthPercent: "",
};
const fieldClass =
  "mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";
const chartColors = [
  "var(--chart-fund)",
  "var(--chart-benchmark)",
  "var(--chart-axis-color)",
  "var(--chart-mint)",
  "var(--chart-violet)",
];
const demoPortfolio = {
  value: 2_485_320,
  contributions: 2_072_500,
  growth: 412_820,
  returnPercent: 19.9,
};
const demoPlatforms = [
  { name: "Glacier by Sanlam", value: 1_080_000 },
  { name: "Ninety One", value: 795_000 },
  { name: "Sygnia", value: 610_320 },
];
const demoStrategies = [
  { name: strategies[0].title, allocation: 72, ytd: 6.7, risk: strategies[0].profile },
  { name: strategies[1].title, allocation: 28, ytd: 7.3, risk: strategies[1].profile },
];
const demoAssets = [
  { name: "SA Equities", value: 35 },
  { name: "Global Equities", value: 30 },
  { name: "SA Bonds & Income", value: 20 },
  { name: "Listed Property", value: 8 },
  { name: "Cash", value: 7 },
];
const requestTypes: RequestType[] = [
  "Lump Sum Top-Up",
  "Strategy Switch",
  "Debit Order Update",
  "Withdrawal",
  "Personal Data Deletion",
];
const demoDocuments: VaultItem[] = [
  {
    id: "it3-c-2026",
    title: "2026 IT3(b) & IT3(c) Tax Certificate",
    category: "Tax Certificates",
    issuedAt: "2026-10-15",
    description: "Illustrative annual tax certificate covering interest and investment income.",
  },
  {
    id: "ra-11f-2026",
    title: "Section 11F RA Contribution Certificate",
    category: "Tax Certificates",
    issuedAt: "2026-10-15",
    description: "Illustrative retirement annuity contribution summary for the 2026 tax year.",
  },
  {
    id: "q3-valuation-2026",
    title: "Q3 2026 Consolidated Valuation Statement",
    category: "Quarterly Statements",
    issuedAt: "2026-10-01",
    description: "Illustrative consolidated account valuation and platform summary for Q3 2026.",
  },
  {
    id: "placeholder-balanced-factsheet",
    title: "PLACEHOLDER BRAND Balanced Strategy Fact Sheet",
    category: "Strategy Fact Sheets",
    issuedAt: "2026-09-30",
    description: "Strategy objectives, asset allocation and published performance overview.",
  },
];

const monthLabels = Array.from({ length: 61 }, (_, index) =>
  new Intl.DateTimeFormat("en-ZA", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(Date.UTC(2021, 10 + index, 1))),
);
const demoHistory = monthLabels.map((date, index) => {
  const progress = index / (monthLabels.length - 1);
  const movement = Math.sin(index * 1.35) * 0.026 + Math.sin(index * 0.46) * 0.035;
  return {
    date,
    portfolio: Math.round(demoPortfolio.value * (0.835 + progress * 0.165 + movement)),
    benchmark: Math.round(demoPortfolio.value * (0.875 + progress * 0.125 + movement * 0.48)),
  };
});

function zar(value: number, decimals = 0) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function percentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function requestStatus(status: string) {
  if (status === "Completed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "In Review") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]";
}

function downloadName(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createClientPdf(title: string, lines: string[]) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  page.drawText(company.legalName.toUpperCase(), {
    x: 48, y, size: 11, font: bold, color: rgb(0.71, 0.49, 0.18),
  });
  y -= 38;
  page.drawText(title.replace(/[^\x20-\x7E]/g, " "), {
    x: 48, y, size: 19, font: bold, color: rgb(0.06, 0.09, 0.16),
  });
  y -= 22;
  page.drawLine({
    start: { x: 48, y }, end: { x: 547, y }, thickness: 1, color: rgb(0.71, 0.49, 0.18),
  });
  y -= 30;

  for (const rawLine of lines) {
    const text = rawLine.replace(/[^\x20-\x7E]/g, " ");
    const words = text.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (regular.widthOfTextAtSize(next, 10) > 499 && line) {
        if (y < 70) {
          page = pdf.addPage([595, 842]);
          y = 790;
        }
        page.drawText(line, { x: 48, y, size: 10, font: regular });
        y -= 17;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      if (y < 70) {
        page = pdf.addPage([595, 842]);
        y = 790;
      }
      page.drawText(line, { x: 48, y, size: 10, font: regular });
      y -= 17;
    } else {
      y -= 8;
    }
  }
  page.drawText(company.regulatoryNotice.replace(/[^\x20-\x7E]/g, " ").slice(0, 100), {
    x: 48, y: 30, size: 7, font: regular, color: rgb(0.35, 0.4, 0.47),
  });
  const savedBytes = await pdf.save();
  const pdfBuffer = new ArrayBuffer(savedBytes.byteLength);
  new Uint8Array(pdfBuffer).set(savedBytes);
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

function SectionTitle({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">{title}</h2>
        {detail ? <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm leading-6 text-[var(--muted)]">
      {children}
    </p>
  );
}

function AccountEmptyState({ message }: { message: string }) {
  return (
    <EmptyState>
      {message}
      <br />
      Contact PLACEHOLDER BRAND at{" "}
      <a className="font-semibold text-[var(--foreground)] underline" href={`tel:${company.phone.replaceAll(" ", "")}`}>
        {company.phone}
      </a>{" "}
      or{" "}
      <a className="font-semibold text-[var(--foreground)] underline" href={`mailto:${company.email}`}>
        {company.email}
      </a>
      .
    </EmptyState>
  );
}

function isDemoAccount(email: string) {
  return (process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAILS ?? "")
    .split(",")
    .some((demoEmail) => demoEmail.trim().toLowerCase() === email.trim().toLowerCase());
}

function DocumentRow({
  document,
  onPreview,
  onDownload,
}: {
  document: VaultItem;
  onPreview: () => void;
  onDownload: () => void;
}) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-fill)]/15 text-[var(--accent)]">
          <FileText size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[var(--foreground)]">{document.title}</h3>
          <p className="mt-1 text-[10px] text-[var(--muted)]">
            {document.category} · {new Date(`${document.issuedAt.slice(0, 10)}T00:00:00`).toLocaleDateString("en-ZA")}
            {document.storagePath ? " · Secure account file" : " · Demo sample"}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)]"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--accent-fill)] px-3 text-xs font-bold text-[var(--button-text)] hover:brightness-110"
        >
          <ArrowDownToLine size={14} /> Download PDF
        </button>
      </div>
    </article>
  );
}

export function AuthenticatedClientPortal({ user }: { user: PortalUser }) {
  const router = useRouter();
  const chartRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [chartInView, setChartInView] = useState(() => reduceMotion);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [client] = useState<SupabaseClient<PortalDatabase> | null>(() =>
    typeof window === "undefined" ? null : getPortalSupabaseClient(),
  );
  const [portfolioRows, setPortfolioRows] = useState<PortfolioRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [accountDocuments, setAccountDocuments] = useState<DocumentRow[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [managerUpdates, setManagerUpdates] = useState<VisibleManagerUpdate[]>([]);
  const [managerUpdatesError, setManagerUpdatesError] = useState("");
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalError, setGoalError] = useState("");
  const [goalNotice, setGoalNotice] = useState("");
  const [goalBusy, setGoalBusy] = useState(false);
  const [dataError, setDataError] = useState("");
  const [requestTableError, setRequestTableError] = useState("");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"3M" | "6M" | "1Y" | "3Y" | "All">("1Y");
  const [monthlyContribution, setMonthlyContribution] = useState(5000);
  const [lumpSum, setLumpSum] = useState(25000);
  const [horizon, setHorizon] = useState(10);
  const [annualGrowthPercent, setAnnualGrowthPercent] = useState("");
  const [documentCategory, setDocumentCategory] = useState<VaultCategory>("Select");
  const [documentQuery, setDocumentQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<VaultItem | null>(null);
  const [requestType, setRequestType] = useState<RequestType>("Lump Sum Top-Up");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDate, setReviewDate] = useState("");
  const [reviewTime, setReviewTime] = useState("09:00");
  const [actionError, setActionError] = useState("");
  const [adviser, setAdviser] = useState<AdviserDetails | null>(null);
  const [adviserError, setAdviserError] = useState("");
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);

  useEffect(() => {
    if (reduceMotion) return;
    const element = chartRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setChartInView(true);
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (!client) return;
    const supabase = client;

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/portal/dashboard");
    });
    let active = true;

    async function loadData() {
      setLoading(true);
      setDataError("");
      try {
        const adviserResponse = await fetch("/api/portal/adviser", { cache: "no-store" });
        const notificationsResponse = await fetch("/api/portal/notifications", { cache: "no-store" });
        if (!active) return;
        if (adviserResponse.ok) {
          const adviserData = await adviserResponse.json();
          setAdviser(adviserData.adviser ?? null);
          setAdviserError("");
        } else if (adviserResponse.status === 401) {
          setAdviser(null);
          setAdviserError("Sign in again to view your assigned adviser.");
        } else {
          setAdviser(null);
          setAdviserError("Assigned adviser details are unavailable right now.");
        }
        if (notificationsResponse.ok) {
          const notificationData = await notificationsResponse.json();
          setNotifications(Array.isArray(notificationData.notifications) ? notificationData.notifications : []);
        } else {
          setNotifications([]);
        }
      } catch (adviserLoadError) {
        console.error("Assigned adviser details could not be loaded.", adviserLoadError);
        if (active) {
          setAdviser(null);
          setAdviserError("Assigned adviser details are unavailable right now.");
        }
      }
      const [portfolioResult, transactionResult, documentResult, requestResult] = await Promise.all([
        supabase.from("client_portfolios").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("client_transactions").select("*").eq("user_id", user.id).order("transacted_at", { ascending: false }).limit(50),
        supabase.from("client_documents").select("*").eq("user_id", user.id).order("issued_at", { ascending: false }),
        supabase.from("client_portal_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (!active) return;

      const dataErrors = [
        portfolioResult.error,
        transactionResult.error,
        documentResult.error,
      ].filter((error) => error !== null);
      dataErrors.forEach((error) => console.error("Portal account data could not be loaded.", error));
      setDataError(
        dataErrors.length
          ? "We couldn't load your account details right now. Please try again or contact placeholder."
          : "",
      );
      setPortfolioRows(portfolioResult.data ?? []);
      setTransactions(transactionResult.data ?? []);
      setAccountDocuments(documentResult.data ?? []);
      setRequests(requestResult.data ?? []);
      if (requestResult.error) {
        console.error("Portal request history could not be loaded.", requestResult.error);
      }
      setRequestTableError(
        requestResult.error
          ? "Request history is unavailable right now. Please try again later."
          : "",
      );

      if (features.managerUpdates) {
        const { data: updateRows, error: updatesError } = await supabase
          .from("manager_updates")
          .select("*")
          .eq("status", "published")
          .order("published_at", { ascending: false });
        if (!active) return;
        if (updatesError) {
          console.error("Manager updates could not be loaded.", updatesError);
          setManagerUpdatesError("Manager updates are unavailable right now. Please try again later.");
          setManagerUpdates([]);
        } else {
          const visibleUpdates = await Promise.all((updateRows ?? []).map(async (update) => {
            if (!update.media_path) return { ...update, mediaUrl: null };
            const { data: signedUrl, error: signedUrlError } = await supabase.storage
              .from("manager-updates")
              .createSignedUrl(update.media_path, 300);
            if (signedUrlError) {
              console.error("Manager update media URL could not be created.", signedUrlError);
              return { ...update, mediaUrl: null };
            }

            return { ...update, mediaUrl: signedUrl.signedUrl };
          }));
          if (!active) return;
          setManagerUpdates(visibleUpdates);
          setManagerUpdatesError("");
        }
      }

      if (features.goals) {
        const { data: goalRows, error: goalsError } = await supabase
          .from("client_goals")
          .select("*")
          .eq("user_id", user.id)
          .order("target_date", { ascending: true });
        if (!active) return;
        if (goalsError) {
          console.error("Client goals could not be loaded.", goalsError);
          setGoalError("Goals are unavailable right now. Please try again later.");
          setGoals([]);
        } else {
          setGoals(goalRows ?? []);
          setGoalError("");
        }
      }

      const rows = portfolioResult.data ?? [];
      if (rows.length) {
        const allocationResult = await supabase
          .from("client_allocations")
          .select("*")
          .in("portfolio_id", rows.map((portfolio) => portfolio.id));
        if (!active) return;
        if (allocationResult.error) {
          console.error("Portal asset allocation could not be loaded.", allocationResult.error);
          setDataError("We couldn't load your account details right now. Please try again or contact placeholder.");
        } else {
          setAllocations(allocationResult.data ?? []);
        }
      } else {
        setAllocations([]);
      }
      setLoading(false);
    }

    void loadData().catch((error: unknown) => {
      if (!active) return;
      console.error("Portal account data could not be loaded.", error);
      setDataError("We couldn't load your account details right now. Please try again or contact placeholder.");
      setLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [client, router, user.id]);

  const isDemo = isDemoAccount(user.email);
  const hasCompleteValuation =
    isDemo ||
    (portfolioRows.length > 0 && portfolioRows.every((portfolio) => portfolio.valuation_zar !== null));
  const totalValue = isDemo
    ? demoPortfolio.value
    : portfolioRows.reduce((total, row) => total + Number(row.valuation_zar ?? 0), 0);
  const netContributions = isDemo
    ? demoPortfolio.contributions
    : null;
  const investmentGrowth =
    netContributions === null || !hasCompleteValuation ? null : totalValue - netContributions;
  const accountReturn = isDemo
    ? demoPortfolio.returnPercent
    : hasCompleteValuation && totalValue > 0 && portfolioRows.every((row) => row.performance_percent !== null)
      ? portfolioRows.reduce(
          (weighted, row) => weighted + Number(row.valuation_zar ?? 0) * Number(row.performance_percent ?? 0),
          0,
        ) / totalValue
      : null;

  const liveDocuments: VaultItem[] = accountDocuments.map((document) => {
    const category: DocumentCategory = /tax|it3|11f/i.test(document.document_type)
      ? "Tax Certificates"
      : /fact|strategy/i.test(document.document_type)
        ? "Strategy Fact Sheets"
        : "Quarterly Statements";
    return {
      id: document.id,
      title: document.title,
      category,
      issuedAt: document.issued_at ?? document.created_at,
      description: `${document.document_type} assigned to your authenticated client account.`,
      storagePath: document.object_path,
    };
  });
  const documents = isDemo ? [...liveDocuments, ...demoDocuments] : liveDocuments;
  const visibleDocuments = documents.filter((document) => {
    const matchesCategory =
      documentCategory === "All" ||
      documentCategory === "Select" ||
      document.category === documentCategory;
    const matchesSearch = `${document.title} ${document.category} ${document.description}`
      .toLowerCase()
      .includes(documentQuery.trim().toLowerCase());
    return (documentQuery.trim() !== "" || matchesCategory) && matchesSearch;
  });
  const taxCertificateDocuments = documents.filter((document) => document.category === "Tax Certificates");

  const filteredHistory = useMemo(() => {
    const count = range === "3M" ? 4 : range === "6M" ? 7 : range === "1Y" ? 13 : range === "3Y" ? 36 : demoHistory.length;
    return isDemo ? demoHistory.slice(-count) : [];
  }, [isDemo, range]);
  const actualAssets = allocations.reduce((totals, allocation) => {
    const portfolio = portfolioRows.find((row) => row.id === allocation.portfolio_id);
    if (!portfolio || !hasCompleteValuation || !totalValue) return totals;
    const amount = Number(portfolio.valuation_zar ?? 0) * Number(allocation.allocation_percent) / 100;
    totals.set(allocation.asset_class, (totals.get(allocation.asset_class) ?? 0) + amount / totalValue * 100);
    return totals;
  }, new Map<string, number>());
  const assetValues = isDemo
    ? demoAssets
    : actualAssets.size
      ? [...actualAssets].map(([name, value]) => ({ name, value }))
      : [];
  const strategyValues = isDemo
    ? demoStrategies.map((strategy) => ({
        ...strategy,
        value: totalValue * strategy.allocation / 100,
      }))
    : portfolioRows.map((portfolio, index) => ({
        name: portfolio.label,
        allocation: hasCompleteValuation && totalValue && portfolio.valuation_zar !== null
          ? Number(portfolio.valuation_zar) / totalValue * 100
          : null,
        value: portfolio.valuation_zar === null ? null : Number(portfolio.valuation_zar),
        ytd: portfolio.performance_period?.toLowerCase().includes("ytd")
          ? portfolio.performance_percent
          : null,
        risk: index === 0 ? "Mandate profile" : "See mandate",
      }));
  const annualGrowth = annualGrowthPercent.trim() ? Number(annualGrowthPercent) : null;
  const projectedValue = useMemo(() => {
    if (annualGrowth === null) return null;
    return projectGoalValue(
      (hasCompleteValuation ? totalValue : 0) + lumpSum,
      monthlyContribution,
      annualGrowth,
      horizon * 12,
    );
  }, [annualGrowth, horizon, lumpSum, monthlyContribution, totalValue, hasCompleteValuation]);

  function editGoal(goal: GoalRow) {
    setEditingGoalId(goal.id);
    setGoalForm({
      name: goal.name,
      targetAmount: String(goal.target_amount),
      targetDate: goal.target_date,
      monthlyContribution: String(goal.monthly_contribution),
      growthPercent: String(goal.assumed_annual_growth_percent),
    });
    setGoalError("");
    setGoalNotice("");
  }

  function cancelGoalEdit() {
    setEditingGoalId(null);
    setGoalForm(emptyGoalForm);
    setGoalError("");
    setGoalNotice("");
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (goalBusy) return;
    const goalInput = parseGoalInput({
      name: goalForm.name,
      target_amount: goalForm.targetAmount.trim() ? Number(goalForm.targetAmount) : Number.NaN,
      target_date: goalForm.targetDate,
      monthly_contribution: goalForm.monthlyContribution.trim()
        ? Number(goalForm.monthlyContribution)
        : Number.NaN,
      assumed_annual_growth_percent: goalForm.growthPercent.trim()
        ? Number(goalForm.growthPercent)
        : Number.NaN,
    });
    if (!goalInput) {
      setGoalError("Enter a name, non-negative amounts, a future target date and an annual growth rate from 0% to 30%.");
      setGoalNotice("");
      return;
    }
    if (!client || !features.goals) {
      setGoalError("Goals are unavailable right now. Please try again later.");
      return;
    }

    setGoalBusy(true);
    setGoalError("");
    setGoalNotice("");
    try {
      if (editingGoalId) {
        const { data, error } = await client
          .from("client_goals")
          .update(goalInput)
          .eq("id", editingGoalId)
          .eq("user_id", user.id)
          .select("*")
          .single();
        if (error || !data) throw error ?? new Error("Goal update returned no row.");
        setGoals((current) => current.map((goal) => goal.id === data.id ? data : goal));
        setGoalNotice("Goal updated.");
      } else {
        const { data, error } = await client
          .from("client_goals")
          .insert({ ...goalInput, user_id: user.id })
          .select("*")
          .single();
        if (error || !data) throw error ?? new Error("Goal creation returned no row.");
        setGoals((current) => [...current, data].sort((a, b) => a.target_date.localeCompare(b.target_date)));
        setGoalNotice("Goal saved.");
      }
      setEditingGoalId(null);
      setGoalForm(emptyGoalForm);
    } catch (error) {
      console.error("Client goal could not be saved.", error);
      setGoalError("We couldn't save this goal right now. Please try again later.");
    } finally {
      setGoalBusy(false);
    }
  }

  async function deleteGoal(goalId: string) {
    if (!client || !features.goals || goalBusy) return;
    setGoalBusy(true);
    setGoalError("");
    setGoalNotice("");
    try {
      const { error } = await client
        .from("client_goals")
        .delete()
        .eq("id", goalId)
        .eq("user_id", user.id);
      if (error) throw error;
      setGoals((current) => current.filter((goal) => goal.id !== goalId));
      if (editingGoalId === goalId) {
        setEditingGoalId(null);
        setGoalForm(emptyGoalForm);
      }
      setGoalNotice("Goal deleted.");
    } catch (error) {
      console.error("Client goal could not be deleted.", error);
      setGoalError("We couldn't delete this goal right now. Please try again later.");
    } finally {
      setGoalBusy(false);
    }
  }

  async function archiveGoal(goalId: string, archived: boolean) {
    if (!client || !features.goals || goalBusy) return;
    setGoalBusy(true);
    setGoalError("");
    setGoalNotice("");
    try {
      const { data, error } = await client
        .from("client_goals")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", goalId)
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error || !data) throw error ?? new Error("Goal archive returned no row.");
      setGoals((current) => current.map((goal) => goal.id === data.id ? data : goal));
      setGoalNotice(archived ? "Goal archived." : "Goal restored.");
    } catch (error) {
      console.error("Client goal could not be archived.", error);
      setGoalError("We couldn't update this goal right now. Please try again later.");
    } finally {
      setGoalBusy(false);
    }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestDetails.trim() || requestBusy) return;
    const profileRequest = isProfileRequestType(requestType)
      ? features.profileRequests
        ? parseProfileRequest(requestType, requestDetails)
        : null
      : null;
    if (isProfileRequestType(requestType) && !profileRequest) {
      setRequestMessage(
        features.profileRequests
          ? "Please add valid details for this request."
          : "This request type is unavailable right now.",
      );
      return;
    }
    setRequestBusy(true);
    setRequestMessage("");
    const amount = !isProfileRequestType(requestType) && requestAmount.trim()
      ? `${requestType === "Strategy Switch" ? "Switch to" : "Amount"}: ${requestAmount.trim()}\n`
      : "";
    const details =
      requestType === "Personal Data Deletion"
        ? `POPIA personal-data deletion request.\n${requestDetails.trim()}`
        : `${amount}${profileRequest?.details ?? requestDetails.trim()}`;
    const requestClient = client;

    try {
      if (requestClient) {
        const { data, error } = await requestClient
          .from("client_portal_requests")
          .insert({ user_id: user.id, request_type: requestType, details, status: "Submitted" })
          .select("*")
          .single();
        if (!error && data) {
          setRequests((current) => [data, ...current]);
          setRequestDetails("");
          setRequestAmount("");
          setRequestMessage("Your request was submitted securely. You can track its status below.");
          setRequestBusy(false);
          return;
        }
        if (error) console.error("Portal request could not be submitted.", error);
        setRequestTableError("Request history is unavailable right now. Please try again later.");
      }
    } catch (error) {
      console.error("Portal request could not be submitted.", error);
      setRequestTableError("Request history is unavailable right now. Please try again later.");
    }

    setRequests((current) => [
      {
        id: `local-${Date.now()}`,
        user_id: user.id,
        request_type: requestType,
        details,
        status: "Submitted",
        created_at: new Date().toISOString(),
        localOnly: true,
      },
      ...current,
    ]);
    setRequestDetails("");
    setRequestAmount("");
    setRequestMessage(`We couldn't submit this request right now. Please try again or contact ${company.legalName}.`);
    setRequestBusy(false);
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestBusy(true);
    const details = `Preferred review: ${reviewDate} at ${reviewTime}. Please contact me to confirm the appointment.`;
    try {
      if (client) {
        const { data, error } = await client
          .from("client_portal_requests")
          .insert({ user_id: user.id, request_type: "Portfolio Review", details, status: "Submitted" })
          .select("*")
          .single();
        if (!error && data) {
          setRequests((current) => [data, ...current]);
          setReviewOpen(false);
          setRequestMessage("Portfolio review request submitted. The adviser team will confirm your preferred time.");
          setRequestBusy(false);
          return;
        }
        if (error) console.error("Portfolio review request could not be submitted.", error);
        setRequestTableError("Request history is unavailable right now. Please try again later.");
      }
    } catch (error) {
      console.error("Portfolio review request could not be submitted.", error);
      setRequestTableError("Request history is unavailable right now. Please try again later.");
    }
    setRequests((current) => [{
      id: `local-${Date.now()}`,
      user_id: user.id,
      request_type: "Portfolio Review",
      details,
      status: "Submitted",
      created_at: new Date().toISOString(),
      localOnly: true,
    }, ...current]);
    setReviewOpen(false);
    setRequestMessage("The booking service is unavailable. Your request is shown in this session only and has not been sent.");
    setRequestBusy(false);
  }

  async function downloadDocument(document: VaultItem) {
    setActionError("");
    try {
      if (document.storagePath) {
        if (!client) throw new Error("The document service is unavailable.");
        const { data, error } = await client.storage
          .from("client-documents")
          .createSignedUrl(document.storagePath, 300, { download: downloadName(document.title) });
        if (error || !data?.signedUrl) throw error ?? new Error("A secure download URL could not be created.");
        const link = window.document.createElement("a");
        link.href = data.signedUrl;
        link.rel = "noopener noreferrer";
        link.click();
        return;
      }
      if (!isDemo) {
        setActionError("This document is not available for download. Please contact PLACEHOLDER BRAND for help.");
        return;
      }
      const pdf = await createClientPdf(document.title, [
        `Prepared for: ${user.name || user.email}`,
        `Issue date: ${new Date(`${document.issuedAt}T00:00:00`).toLocaleDateString("en-ZA")}`,
        `Category: ${document.category}`,
        "",
        document.description,
        "",
        "Illustrative portal document generated for demonstration. It is not an official tax certificate, valuation statement, or investment instruction.",
        "Please use the secure client vault for official account documents.",
        `Contact: ${company.email} · ${company.phone}`,
      ]);
      downloadBlob(pdf, downloadName(document.title));
    } catch (error) {
      console.error("Portal document could not be downloaded.", error);
      setActionError("Unable to download this document right now. Please try again or contact placeholder.");
    }
  }

  const availableRequestTypes: RequestType[] = [
    ...requestTypes,
    ...(features.profileRequests ? [...profileRequestTypes] : []),
  ];
  const greetingName = user.name || user.email.split("@")[0] || "Client";

  useEffect(() => {
    function selectPortalSection(event: Event) {
      const key = (event as CustomEvent<string>).detail;
      const available: TabKey[] = [
        "overview",
        "holdings",
        "documents",
        "requests",
        ...(features.managerUpdates ? ["managerUpdates" as const] : []),
        ...(features.taxYearCard ? ["taxCentre" as const] : []),
      ];
      if (available.includes(key as TabKey)) setActiveTab(key as TabKey);
    }
    window.addEventListener("placeholder-portal-navigate", selectPortalSection);
    return () => window.removeEventListener("placeholder-portal-navigate", selectPortalSection);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("placeholder-section-change", { detail: activeTab }));
  }, [activeTab]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <header className={`${panelClass} mb-0 flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--accent)]">PRIVATE CLIENT PORTAL</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Welcome, {greetingName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-600/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={14} /> {isDemo ? "Demo profile · FICA not verified" : "Active · FICA status unavailable"}
          </span>
        </div>
      </header>

      {dataError ? (
        <p role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-[var(--foreground)]">
          {dataError}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-[var(--foreground)]">
          {actionError}
        </p>
      ) : null}

      {activeTab === "overview" ? (
        <section id="overview" aria-label="Overview">
          <SectionTitle
            eyebrow="WEALTH SNAPSHOT"
            title="Your consolidated portfolio"
            detail={isDemo ? "Illustrative demo portfolio · not account-specific or financial advice" : "Based on the latest records assigned to your authenticated account"}
          />
          {!isDemo && !loading && portfolioRows.length === 0 ? (
            <AccountEmptyState message="Your portfolio details will appear here once your account is linked." />
          ) : (
            <>
          {loading ? <p role="status" className="mb-4 text-xs text-[var(--muted)]">Refreshing secure account data…</p> : null}
          {isDemo ? (
            <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5 text-xs leading-5 text-[var(--muted)]">
              Demonstration figures are illustrative only. Live portfolio and platform data will replace them when assigned to this account.
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className={`${panelClass}`}>
              <p className="text-xs text-[var(--muted)]">Total portfolio value</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                {hasCompleteValuation ? zar(totalValue, 2) : "Not reported"}
              </p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">Consolidated across available accounts</p>
            </article>
            <article className={panelClass}>
              <p className="text-xs text-[var(--muted)]">Net contributions</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                {netContributions === null ? "Not reported" : zar(netContributions, 2)}
              </p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">{isDemo ? "Illustrative demo contribution total" : "Contribution history total not available"}</p>
            </article>
            <article className={panelClass}>
              <p className="text-xs text-[var(--muted)]">Investment growth</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--accent)]">
                {investmentGrowth === null ? "Not reported" : `${investmentGrowth >= 0 ? "+" : ""}${zar(investmentGrowth, 2)}`}
              </p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">
                {accountReturn === null ? "Return data unavailable" : `${accountReturn >= 0 ? "+" : ""}${percentage(accountReturn)} reported return`}
              </p>
            </article>
            <article className={panelClass}>
              <p className="text-xs text-[var(--muted)]">Personalised return · CPI+5%</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--accent)]">
                {accountReturn === null ? "Not reported" : `${accountReturn >= 0 ? "+" : ""}${percentage(accountReturn)}`}
              </p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">
                {isDemo
                  ? "Illustrative return vs benchmark · not date-specific"
                  : "Weighted from account records · reporting date not supplied"}
              </p>
            </article>
          </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className={panelClass}>
                <p className="text-xs text-[var(--muted)]">Assigned adviser</p>
                {adviser ? (
                  <>
                    <p className="mt-2 font-semibold text-[var(--foreground)]">{adviser.name || "PLACEHOLDER BRAND adviser"}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{adviser.email || adviser.phone || "Use the PLACEHOLDER BRAND adviser team contact."}</p>
                    {adviser.phone ? (
                      <a href={`tel:${adviser.phone.replaceAll(" ", "")}`} className="mt-3 inline-flex min-h-10 items-center rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold">
                        Call adviser
                      </a>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {adviserError || "No active adviser relationship is currently assigned."}
                  </p>
                )}
              </article>
              <article className={panelClass}>
                <p className="text-xs text-[var(--muted)]">Notifications</p>
                {notifications.length ? (
                  <ul className="mt-2 space-y-2">
                    {notifications.slice(0, 3).map((notification) => (
                      <li key={notification.id} className="rounded-xl border border-[var(--border)] p-3">
                        <p className="text-xs font-semibold">{notification.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{notification.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted)]">No notifications are currently available.</p>
                )}
              </article>
            </div>
          <p className="mt-3 text-[10px] leading-5 text-[var(--muted)]">
            {isDemo
              ? "As at: Not date-specific · Source: illustrative demo data; not actual client performance."
              : "As at: Not supplied · Source: authenticated account portfolio records."}
          </p>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Portfolio performance</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">Compared with CPI+5% benchmark</p>
                </div>
                <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--background)] p-1">
                  {(["3M", "6M", "1Y", "3Y", "All"] as const).map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setRange(item)}
                      aria-pressed={range === item}
                      className={`min-h-8 rounded-full px-2.5 text-[10px] font-semibold transition ${
                        range === item ? "bg-[var(--accent-fill)] text-[var(--button-text)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              {isDemo ? (
                <div ref={chartRef} className="mt-5 h-64 w-full" role="img" aria-label="Portfolio performance compared with benchmark">
                  <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredHistory} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="client-portfolio-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-fund)" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="var(--chart-fund)" stopOpacity={0.015} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis hide domain={["dataMin - 50000", "dataMax + 50000"]} />
                    <Legend
                      verticalAlign="top"
                      height={26}
                      wrapperStyle={{ color: "var(--foreground)", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => zar(Number(value))}
                      contentStyle={{ background: "var(--chart-tooltip)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", borderRadius: 14, color: "var(--foreground)", boxShadow: "0 18px 48px rgba(10,17,36,.18)" }}
                      labelStyle={{ color: "var(--muted)" }}
                    />
                    <Area type="monotone" dataKey="portfolio" name="Portfolio" stroke="var(--chart-fund)" strokeWidth={2.5} fill="url(#client-portfolio-fill)" activeDot={{ r: 5 }} isAnimationActive={Boolean(chartInView && !reduceMotion)} animationDuration={950} />
                    <Area type="monotone" dataKey="benchmark" name="CPI+5% benchmark" stroke="var(--chart-benchmark)" strokeWidth={1.8} strokeDasharray="5 4" fill="transparent" activeDot={{ r: 4 }} isAnimationActive={Boolean(chartInView && !reduceMotion)} animationDuration={950} />
                  </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState>Portfolio history will appear here when it is available.</EmptyState>
                </div>
              )}
              <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">
                {isDemo
                  ? "As at: Not date-specific · Source: illustrative demo simulation; not actual client performance."
                  : "As at: Not reported · Source: no historical performance data is available."}
              </p>
            </section>

            {isDemo ? (
            <section className={panelClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">LISP platform split</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">Illustrative platform distribution</p>
                </div>
                <Wallet size={18} className="text-[var(--accent)]" />
              </div>
              <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[var(--border)]">
                {demoPlatforms.map((platform, index) => (
                  <span
                    key={platform.name}
                    className="h-full"
                    style={{ width: `${platform.value / demoPortfolio.value * 100}%`, backgroundColor: chartColors[index] }}
                    title={`${platform.name}: ${zar(platform.value)} (${percentage(platform.value / demoPortfolio.value * 100)})`}
                  />
                ))}
              </div>
              <ul className="mt-5 space-y-4">
                {demoPlatforms.map((platform, index) => (
                  <li key={platform.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-[var(--muted)]">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index] }} />
                      <span className="truncate">{platform.name}</span>
                    </span>
                    <span className="shrink-0 text-right font-semibold text-[var(--foreground)]">
                      {zar(platform.value)} <span className="font-normal text-[var(--muted)]">· {percentage(platform.value / demoPortfolio.value * 100)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-[var(--border)] pt-4 text-xs">
                <span className="text-[var(--muted)]">Illustrative total</span>
                <strong className="float-right text-[var(--foreground)]">{zar(demoPortfolio.value)}</strong>
              </div>
            </section>
            ) : null}
          </div>

          {!isDemo && transactions.length ? (
            <section className={`${panelClass} mt-5`}>
              <h3 className="font-semibold text-[var(--foreground)]">Recent account activity</h3>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {transactions.slice(0, 5).map((transaction) => (
                  <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                    <span>
                      <span className="block font-semibold text-[var(--foreground)]">{transaction.description}</span>
                      <time className="mt-1 block text-[10px] text-[var(--muted)]">{new Date(transaction.transacted_at).toLocaleDateString("en-ZA")}</time>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums text-[var(--foreground)]">{zar(Number(transaction.amount), 2)}</span>
                      <span className="mt-1 block text-[10px] text-[var(--muted)]">{transaction.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <aside className={`${panelClass} mt-5 border-l-4 border-l-[var(--accent)]`}>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--accent)]">PLACEHOLDER BRAND INVESTMENT COMMITTEE · POSITIONING NOTE</p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
              Portfolios remain diversified across growth and defensive assets. The committee continues to balance long-term return objectives with liquidity and valuation discipline as market conditions evolve.
            </p>
            <p className="mt-2 text-[10px] text-[var(--muted)]">General information only; not a personal recommendation.</p>
          </aside>
            </>
          )}
        </section>
      ) : null}

      {activeTab === "holdings" ? (
        <section id="holdings" aria-label="Holdings and simulator">
          <SectionTitle
            eyebrow="HOLDINGS & PLANNING"
            title="Strategies and goal simulator"
            detail={isDemo ? "Illustrative strategy holdings · simulator output is not a forecast" : "Assigned holdings where available · projections are illustrative only"}
          />
          {!isDemo && portfolioRows.length === 0 ? (
            <AccountEmptyState message="Your strategy details will appear here once your account is linked." />
          ) : (
            <>
          {isDemo ? (
            <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5 text-xs leading-5 text-[var(--muted)]">
              Demo allocation, return and risk values are examples only and are not recommendations or actual account holdings.
            </p>
          ) : null}
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className={panelClass}>
              <h3 className="font-semibold text-[var(--foreground)]">Strategy breakdown</h3>
              <div className="mt-4 space-y-3">
                {strategyValues.map((strategy) => (
                  <article key={strategy.name} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--foreground)]">{strategy.name}</h4>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">{strategy.risk}</p>
                      </div>
                      <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">{strategy.allocation === null ? "Not reported" : percentage(strategy.allocation)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                      <div><p className="text-[var(--muted)]">Value</p><p className="mt-1 font-semibold text-[var(--foreground)]">{strategy.value === null ? "Not reported" : zar(strategy.value)}</p></div>
                      <div><p className="text-[var(--muted)]">{isDemo ? "Illustrative YTD return" : "Reported YTD return"}</p><p className="mt-1 font-semibold text-[var(--foreground)]">{strategy.ytd === null ? "Not reported" : `${strategy.ytd}%`}</p></div>
                      <div><p className="text-[var(--muted)]">Risk profile</p><p className="mt-1 font-semibold text-[var(--foreground)]">{strategy.risk}</p></div>
                    </div>
                  </article>
                ))}
                {!isDemo && !strategyValues.length ? <EmptyState>No strategy holdings have been assigned to this account.</EmptyState> : null}
              </div>
            </section>
            <section className={panelClass}>
              <h3 className="font-semibold text-[var(--foreground)]">Look-through asset allocation</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">{actualAssets.size ? "Underlying allocation data on file" : isDemo ? "Illustrative underlying exposure" : "No allocation data is reported"}</p>
              <div className="mt-3 h-56">
                {assetValues.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetValues} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                      {assetValues.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} contentStyle={{ background: "var(--chart-tooltip)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", borderRadius: 14, color: "var(--foreground)" }} />
                  </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState>Asset allocation details are not reported for this account.</EmptyState>
                )}
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {assetValues.map((asset, index) => (
                  <li key={asset.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-[var(--muted)]">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                      <span className="truncate">{asset.name}</span>
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">{percentage(asset.value)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className={`${panelClass} mt-5`}>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-fill)]/15 text-[var(--accent)]"><SlidersHorizontal size={18} /></span>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">What-if wealth & contribution simulator</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Enter an annual growth rate to calculate a hypothetical result.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div className="space-y-5">
                <SliderField label="Monthly contribution" value={monthlyContribution} min={500} max={50000} step={500} display={zar(monthlyContribution)} onChange={setMonthlyContribution} />
                <SliderField label="Lump sum top-up" value={lumpSum} min={0} max={500000} step={5000} display={zar(lumpSum)} onChange={setLumpSum} />
                <SliderField label="Investment horizon" value={horizon} min={1} max={20} step={1} display={`${horizon} ${horizon === 1 ? "year" : "years"}`} onChange={setHorizon} />
                <label className="block text-xs font-medium text-[var(--muted)]">
                  Annual growth rate (%) — required, no default
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    required
                    value={annualGrowthPercent}
                    onChange={(event) => setAnnualGrowthPercent(event.target.value)}
                    className={fieldClass}
                    aria-label="Annual growth rate for the simulator"
                  />
                </label>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
                {projectedValue === null ? (
                  <p className="text-xs text-[var(--muted)]">Enter a growth rate from 0% to 30% to see a hypothetical illustration.</p>
                ) : (
                  <>
                    <p className="text-xs text-[var(--muted)]">Hypothetical future portfolio value</p>
                    <p key={projectedValue} className="mt-2 text-3xl font-semibold tabular-nums text-[var(--accent)] motion-safe:animate-[placeholder-rise-in_350ms_ease-out]">
                      {zar(projectedValue)}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Starting from {hasCompleteValuation ? zar(totalValue) : "an unavailable current value"} with {zar(monthlyContribution)} monthly and {zar(lumpSum)} upfront.
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Hypothetical illustration based on the rate you entered. Not a projection or a guarantee.</p>
                  </>
                )}
              </div>
            </div>
          </section>
            </>
          )}
          {features.goals ? (
            <section className={`${panelClass} mt-5`}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-fill)]/15 text-[var(--accent)]"><CalendarDays size={18} /></span>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Savings goals</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Save goals and explore hypothetical outcomes using the rate you choose.</p>
                </div>
              </div>
              <form onSubmit={saveGoal} className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-[var(--muted)]">
                  Goal name
                  <input
                    type="text"
                    maxLength={120}
                    required
                    value={goalForm.name}
                    onChange={(event) => setGoalForm((current) => ({ ...current, name: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs font-medium text-[var(--muted)]">
                  Target amount (ZAR)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={goalForm.targetAmount}
                    onChange={(event) => setGoalForm((current) => ({ ...current, targetAmount: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs font-medium text-[var(--muted)]">
                  Target date
                  <input
                    type="date"
                    required
                    value={goalForm.targetDate}
                    onChange={(event) => setGoalForm((current) => ({ ...current, targetDate: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs font-medium text-[var(--muted)]">
                  Monthly contribution (ZAR)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={goalForm.monthlyContribution}
                    onChange={(event) => setGoalForm((current) => ({ ...current, monthlyContribution: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs font-medium text-[var(--muted)] sm:col-span-2">
                  Annual growth rate (%) — required, no default
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    required
                    value={goalForm.growthPercent}
                    onChange={(event) => setGoalForm((current) => ({ ...current, growthPercent: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={goalBusy}
                    className="min-h-10 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)] hover:brightness-110 disabled:opacity-60"
                  >
                    {goalBusy ? "Saving…" : editingGoalId ? "Update goal" : "Save goal"}
                  </button>
                  {editingGoalId ? (
                    <button
                      type="button"
                      onClick={cancelGoalEdit}
                      disabled={goalBusy}
                      className="min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)]"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
              {goalError ? <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-300">{goalError}</p> : null}
              {goalNotice ? <p role="status" className="mt-3 text-xs text-[var(--muted)]">{goalNotice}</p> : null}
              <div className="mt-5 space-y-3">
                {loading ? (
                  <EmptyState>Loading saved goals…</EmptyState>
                ) : goals.length ? goals.map((goal) => {
                  const progress = calculateGoalProgress(
                    hasCompleteValuation ? totalValue : null,
                    Number(goal.target_amount),
                  );
                  const months = monthsUntilGoalDate(goal.target_date);
                  const projection = projectGoalValue(
                    hasCompleteValuation ? totalValue : 0,
                    Number(goal.monthly_contribution),
                    Number(goal.assumed_annual_growth_percent),
                    months,
                  );
                  return (
                    <article key={goal.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-[var(--foreground)]">{goal.name}</h4>
                          {goal.archived_at ? (
                            <p className="mt-1 text-[10px] font-bold tracking-[0.12em] text-[var(--muted)]">ARCHIVED</p>
                          ) : null}
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Target {zar(Number(goal.target_amount))} by {goal.target_date}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => editGoal(goal)} disabled={goalBusy} className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)]">Edit</button>
                          <button
                            type="button"
                            onClick={() => void archiveGoal(goal.id, goal.archived_at === null)}
                            disabled={goalBusy}
                            className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)]"
                          >
                            {goal.archived_at === null ? "Archive" : "Restore"}
                          </button>
                          <button type="button" onClick={() => void deleteGoal(goal.id)} disabled={goalBusy} className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)]">Delete</button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                        <div>
                          <p className="text-[var(--muted)]">Progress against current valuation</p>
                          <p className="mt-1 font-semibold text-[var(--foreground)]">{progress === null ? "Not reported" : percentage(progress)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted)]">Hypothetical value at target date</p>
                          <p className="mt-1 font-semibold text-[var(--foreground)]">{projection === null ? "Not available" : zar(projection)}</p>
                        </div>
                      </div>
                      {!hasCompleteValuation ? <p className="mt-2 text-xs text-[var(--muted)]">Current valuation is not reported; this illustration starts at zero.</p> : null}
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Hypothetical illustration based on the rate you entered. Not a projection or a guarantee.</p>
                    </article>
                  );
                }) : (
                  <EmptyState>{goalError ? "Saved goals could not be loaded." : "No savings goals have been saved yet."}</EmptyState>
                )}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section id="documents" aria-label="Document Vault">
          <SectionTitle
            eyebrow="SECURE DOCUMENTS"
            title="Document vault"
            detail={isDemo ? "Preview illustrative account summaries or download a generated PDF copy." : "View documents assigned to your account."}
          />
          {isDemo ? (
            <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5 text-xs leading-5 text-[var(--muted)]">
              Demo certificates and statements are illustrative generated samples, not official tax or valuation documents. Live assigned documents are marked as account files.
            </p>
          ) : null}
          <div className={panelClass}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Search documents</span>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input value={documentQuery} onChange={(event) => setDocumentQuery(event.target.value)} placeholder="Search documents…" className={`${fieldClass} mt-0 pl-9`} />
              </label>
              <label>
                <span className="sr-only">Filter document category</span>
                <select value={documentCategory} onChange={(event) => setDocumentCategory(event.target.value as VaultCategory)} className={`${fieldClass} mt-0 min-w-52`}>
                  {vaultCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
            </div>
            {documentCategory === "Select" && !documentQuery.trim() ? (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Choose a category to view your documents
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {vaultCategories.filter((category): category is DocumentCategory => category !== "Select" && category !== "All").map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setDocumentCategory(category)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-left transition hover:border-[var(--accent)]"
                    >
                      <span className="block text-sm font-semibold text-[var(--foreground)]">{category}</span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        {documents.filter((document) => document.category === category).length} documents
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : documentCategory === "All" ? (
              <div className="mt-4 space-y-4">
                {vaultCategories.filter((category): category is DocumentCategory => category !== "Select" && category !== "All").map((category) => {
                  const categoryDocuments = visibleDocuments.filter((document) => document.category === category);
                  if (categoryDocuments.length === 0) return null;
                  return (
                    <section key={category} className="overflow-hidden rounded-xl border border-[var(--border)]">
                      <h3 className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
                        {category}
                      </h3>
                      <div className="divide-y divide-[var(--border)]">
                        {categoryDocuments.map((document) => (
                          <DocumentRow
                            key={document.id}
                            document={document}
                            onPreview={() => setSelectedDocument(document)}
                            onDownload={() => void downloadDocument(document)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
                {visibleDocuments.length === 0 ? <EmptyState>No documents match your search.</EmptyState> : null}
              </div>
            ) : (
            <div className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {visibleDocuments.length ? visibleDocuments.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  onPreview={() => setSelectedDocument(document)}
                  onDownload={() => void downloadDocument(document)}
                />
              )) : <EmptyState>No documents match your search.</EmptyState>}
            </div>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "requests" ? (
        <section id="requests" aria-label="Requests and Adviser">
          <SectionTitle
            eyebrow="CLIENT SERVICE"
            title="Requests, fees & adviser"
            detail="Submit a secure instruction request or get in touch with the PLACEHOLDER BRAND team."
          />
          {requestTableError ? (
            <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5 text-[var(--muted)]">
              {requestTableError}
            </p>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className={panelClass}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-fill)]/15 text-[var(--accent)]"><MessageSquareText size={18} /></span>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Instruction request</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">Your request is subject to adviser review and confirmation.</p>
                </div>
              </div>
              <form onSubmit={(event) => void submitRequest(event)} className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-[var(--foreground)]">
                  Request type
                  <select value={requestType} onChange={(event) => { setRequestType(event.target.value as RequestType); setRequestAmount(""); }} className={fieldClass}>
                    {availableRequestTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                {requestType !== "Strategy Switch" &&
                requestType !== "Personal Data Deletion" &&
                !isProfileRequestType(requestType) ? (
                  <label className="block text-xs font-semibold text-[var(--foreground)]">
                    Amount (ZAR), if applicable
                    <input type="number" min={0} step={100} value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} placeholder="e.g. 5,000" className={fieldClass} />
                  </label>
                ) : null}
                {requestType === "Strategy Switch" ? (
                  <label className="block text-xs font-semibold text-[var(--foreground)]">
                    Switch to
                    <select required value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} className={fieldClass}>
                      <option value="">Select a strategy</option>
                      {strategies.map((strategy) => (
                        <option key={strategy.id}>{strategy.title}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="block text-xs font-semibold text-[var(--foreground)]">
                  Details
                  <textarea required maxLength={1500} value={requestDetails} onChange={(event) => setRequestDetails(event.target.value)} rows={3} placeholder={requestType === "Personal Data Deletion" ? "Describe the personal information you are requesting to have deleted." : isProfileRequestType(requestType) ? "Briefly describe the change requested. Do not include bank details." : "Add any details the adviser should know. Do not include passwords or bank details."} className={fieldClass} />
                </label>
                {features.profileRequests && isProfileRequestType(requestType) ? (
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    We will verify this with you by phone before changing anything.
                  </p>
                ) : null}
                {requestType === "Personal Data Deletion" ? (
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    {company.legalName} will review this request under POPIA. Information that must be retained for legal or regulatory reasons may not be eligible for deletion.
                  </p>
                ) : null}
                {requestMessage ? <p role="status" className="rounded-lg bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)]">{requestMessage}</p> : null}
                <button type="submit" disabled={requestBusy || !requestDetails.trim()} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-xs font-bold text-[var(--button-text)] disabled:opacity-50">
                  {requestBusy ? "Submitting…" : "Submit request"}
                </button>
              </form>

              <div className="mt-7 border-t border-[var(--border)] pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">Recent requests</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">Status updates appear when the request table is connected.</p>
                  </div>
                  <button type="button" onClick={() => setReviewOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)]">
                    <CalendarDays size={14} /> Request portfolio review
                  </button>
                </div>
                <ul className="mt-4 space-y-2">
                  {requests.length ? requests.map((request) => (
                    <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                      <div>
                        <p className="text-xs font-semibold text-[var(--foreground)]">{request.request_type}</p>
                        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[var(--muted)]">{request.details}</p>
                        {features.profileRequests && isProfileRequestType(request.request_type) ? (
                          <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                            We will verify this with you by phone before changing anything.
                          </p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-[var(--muted)]">{new Date(request.created_at).toLocaleString("en-ZA")}{request.localOnly ? " · this session only" : ""}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${requestStatus(request.status)}`}>{request.status}</span>
                    </li>
                  )) : <EmptyState>No recent requests are on file.</EmptyState>}
                </ul>
              </div>
            </section>

            <div className="space-y-5">
              <section className={panelClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">Fee transparency</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {isDemo ? "Illustrative annual fee components" : "Fee information"}
                    </p>
                  </div>
                  <CircleHelp size={17} className="text-[var(--muted)]" aria-label="Illustrative, confirm your personal fee schedule" />
                </div>
                <dl className="mt-4 divide-y divide-[var(--border)] text-xs">
                  {feeInformation.managementFee !== null ? <FeeRow label="Management fee" value={`${feeInformation.managementFee.toFixed(2)}%`} /> : null}
                  {feeInformation.performanceFee !== null ? <FeeRow label="Performance fee" value={`${feeInformation.performanceFee.toFixed(2)}%`} /> : null}
                  {feeInformation.initialFee !== null ? <FeeRow label="Initial fee" value={`${feeInformation.initialFee.toFixed(2)}%`} /> : null}
                </dl>
                {feeInformation.managementFee === null &&
                feeInformation.performanceFee === null &&
                feeInformation.initialFee === null ? (
                  <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
                    Your fees are set out in your signed mandate and fee schedule. Contact the PLACEHOLDER BRAND team for a copy.
                  </p>
                ) : null}
              </section>

              <section className={panelClass}>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-fill)]/15 text-[var(--accent)]"><ShieldCheck size={18} /></span>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">Adviser & support</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">{company.legalName} Client Service</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-[var(--muted)]">For your assigned financial adviser’s direct details, contact the team using the verified channels below.</p>
                <p className="mt-3 rounded-lg bg-[var(--background)] p-3 text-xs font-semibold text-[var(--foreground)]">
                  {company.regulatoryNotice}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`tel:${company.phone.replaceAll(" ", "")}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold text-[var(--foreground)]"><ArrowUpRight size={14} /> Call adviser team</a>
                  <a href="https://wa.me/27213001582" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold text-[var(--foreground)]"><ArrowUpRight size={14} /> WhatsApp</a>
                </div>
                <button type="button" onClick={() => setReviewOpen(true)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)]">
                  Book a portfolio review <ChevronRight size={15} />
                </button>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      {features.managerUpdates && activeTab === "managerUpdates" ? (
        <section id="managerUpdates" aria-label="Manager Updates">
          <SectionTitle
            eyebrow="FUND MANAGER NOTES"
            title="Manager Updates"
            detail="Published updates from the PLACEHOLDER BRAND investment team."
          />
          {managerUpdatesError ? (
            <p role="status" className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5 text-[var(--muted)]">
              {managerUpdatesError}
            </p>
          ) : managerUpdates.length === 0 ? (
            <EmptyState>No manager updates are available yet.</EmptyState>
          ) : (
            <div className="grid gap-4">
              {managerUpdates.map((update) => (
                <article key={update.id} className={panelClass}>
                  <p className="text-xs font-semibold text-[var(--muted)]">
                    {update.published_at ? new Date(update.published_at).toLocaleDateString("en-ZA") : ""}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{update.title}</h2>
                  <a href={`/insights/${update.public_slug}`} className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline">
                    Open canonical research
                  </a>
                  <p className="mt-2 text-xs text-[var(--muted)]">{update.category} · {update.author_name ?? "PLACEHOLDER BRAND Investment Team"}</p>
                  {update.pdf_object_path ? (
                    <a href={`/api/insights/${update.public_slug}/pdf?branding=clean`} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline">
                      <ArrowDownToLine size={14} aria-hidden="true" /> Download attached PDF
                    </a>
                  ) : null}
                  {update.mediaUrl && update.kind === "audio" ? (
                    <audio className="mt-4 w-full" controls src={update.mediaUrl}>Audio playback is not supported in this browser.</audio>
                  ) : null}

                  {update.mediaUrl && update.kind === "video" ? (
                    <video className="mt-4 max-h-[28rem] w-full rounded-xl" controls src={update.mediaUrl}>Video playback is not supported in this browser.</video>
                  ) : null}
                  <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted)]">
                    {performanceDisclosures.pastPerformance}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {features.taxYearCard && activeTab === "taxCentre" ? (
        <section id="taxCentre" aria-label="Tax Centre">
          <SectionTitle
            eyebrow="TAX INFORMATION"
            title="Tax Centre"
            detail="Tax-year limits and certificates assigned to your account."
          />
          <div className="mb-5">
            <TaxAllowanceTracker />
          </div>
          <section className={`${panelClass} mt-5`} aria-labelledby="tax-certificates-heading">
            <h2 id="tax-certificates-heading" className="font-semibold">Tax certificates</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Certificates currently available in your Document Vault.</p>
            {taxCertificateDocuments.length ? (
              <div className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {taxCertificateDocuments.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    onPreview={() => setSelectedDocument(document)}
                    onDownload={() => void downloadDocument(document)}
                  />
                ))}
              </div>
            ) : <div className="mt-3"><EmptyState>No tax certificates are currently assigned to your account.</EmptyState></div>}
          </section>
        </section>
      ) : null}

      {selectedDocument ? (
        <Modal title={selectedDocument.title} onClose={() => setSelectedDocument(null)}>
          <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">{selectedDocument.category}</p>
            <p>{selectedDocument.description}</p>
            <p>Prepared for {user.name || user.email}. Issued {new Date(`${selectedDocument.issuedAt.slice(0, 10)}T00:00:00`).toLocaleDateString("en-ZA")}.</p>
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs">
              {selectedDocument.storagePath ? "This is an account-assigned document. Use Download PDF to retrieve the secure file." : "Illustrative preview only. This generated sample is not an official tax certificate or valuation statement."}
            </p>
          </div>
          <button type="button" onClick={() => void downloadDocument(selectedDocument)} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)]"><ArrowDownToLine size={14} /> Download PDF</button>
        </Modal>
      ) : null}

      {reviewOpen ? (
        <Modal title="Request a portfolio review" onClose={() => setReviewOpen(false)}>
          <p className="text-sm leading-6 text-[var(--muted)]">Choose a preferred time. The adviser team will contact you to confirm availability; this is a request, not a confirmed booking.</p>
          <form onSubmit={(event) => void submitReview(event)} className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Preferred date
              <input type="date" required min={new Date().toISOString().slice(0, 10)} value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} className={fieldClass} />
            </label>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Preferred time
              <select value={reviewTime} onChange={(event) => setReviewTime(event.target.value)} className={fieldClass}>
                {["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"].map((time) => <option key={time}>{time}</option>)}
              </select>
            </label>
            <button type="submit" disabled={requestBusy} className="min-h-10 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)] disabled:opacity-50">
              {requestBusy ? "Submitting…" : "Send review request"}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-[var(--foreground)]">
      <span className="flex justify-between gap-3"><span>{label}</span><span className="tabular-nums text-[var(--accent)]">{display}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-[var(--accent-fill)]" />
      <span className="flex justify-between text-[10px] font-normal text-[var(--muted)]"><span>{zar(min)}</span><span>{zar(max)}</span></span>
    </label>
  );
}

function FeeRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 py-3 text-[var(--muted)]"><dt>{label}</dt><dd className="font-semibold text-[var(--foreground)]">{value}</dd></div>;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--background)] p-5 text-[var(--foreground)] shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)]"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
