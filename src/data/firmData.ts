export const company = {
  legalName: "Example Wealth",
  tagline:
    "Genuinely diversified, cost-conscious fund management, so you can focus on relations, and not portfolio construction.",
  regulatoryNotice:
    "Example Wealth is an illustrative brand with no regulatory licence or FSP authorisation.",
  publicFooterNotice:
    "Illustrative demonstration only - no financial service is offered.",
  workspaceFooterNotice: "Illustrative local demonstration.",
  phone: "+27 10 000 0000",
  email: "hello@examplewealth.example",
  responseTime: "2 business days",
  address:
    "100 Demonstration Avenue, Example City",
};

export const returnSummary = {
  period: null as string | null,
  asAt: null as string | null,
  source: null as string | null,
  rows: [] as { name: string; value: number; label: string }[],
};

export const strategies = [
  {
    id: "balanced",
    name: "Example Balanced",
    title: "Example Balanced Strategy",
    profile: "Not reported",
    benchmark: "Not reported",
    source: "Not reported",
    performanceDate: "Not reported",
    inceptionDate: "Not reported",
    cumulative: {
      oneMonth: "Not reported",
      oneYear: "Not reported",
      oneYearBenchmark: "Not reported",
      threeYear: "Not reported",
      threeYearBenchmark: "Not reported",
    },
    annualised: {
      threeYear: "Not reported",
      threeYearBenchmark: "Not reported",
      fiveYear: "Not reported",
      fiveYearBenchmark: "Not reported",
    },
    risk: { oneYear: "Not reported", threeYears: "Not reported" },
    sinceInceptionOneYear: { high: "Not reported", low: "Not reported" },
  },
  {
    id: "cautious",
    name: "Example Cautious",
    title: "Example Cautious Strategy",
    profile: "Not reported",
    benchmark: "Not reported",
    source: "Not reported",
    performanceDate: "Not reported",
    inceptionDate: "Not reported",
    cumulative: {
      oneMonth: "Not reported",
      oneYear: "Not reported",
      oneYearBenchmark: "Not reported",
      threeYear: "Not reported",
      threeYearBenchmark: "Not reported",
    },
    annualised: {
      threeYear: "Not reported",
      threeYearBenchmark: "Not reported",
      fiveYear: "Not reported",
      fiveYearBenchmark: "Not reported",
    },
    risk: { oneYear: "Not reported", threeYears: "Not reported" },
    sinceInceptionOneYear: { high: "Not reported", low: "Not reported" },
  },
] as const;

export const reportedPerformanceChartData = {
  balanced: [],
  cautious: [],
  totalReturn: [],
};

export const beliefs = [
  "Financial advisors are crucial to the success of fund management businesses.",
  "Real diversification is the most effective method to control portfolio volatility.",
  "Asset allocation is responsible for the majority of investment portfolio returns and risk.",
  "Real asset classes provide investors a premium over inflation and cash over time.",
  "The only guaranteed way of creating alpha is by reducing costs.",
];

export type LeadershipMember = {
  name: string;
  role: string;
  credentials: string;
  bio: string;
  photo?: string;
};

export const leadership: LeadershipMember[] = [];

export const firmStats = {
  yearsExperience: null as number | null,
  investmentStrategies: null as number | null,
  satisfiedClients: null as number | null,
  distributionPlatforms: null as number | null,
};

export const faqs = [
  {
    question: "How do I open an investment account?",
    answer:
      "Speak with your financial advisor, who can guide you through the application process and the appropriate investment documentation.",
  },
  {
    question: "What is the minimum investment amount?",
    answer:
      "Minimums may depend on the investment product and platform. Please contact your financial advisor or our team to confirm the applicable minimum.",
  },
  {
    question: "How often are the portfolios reviewed?",
    answer:
      "Portfolios are monitored and reviewed by the investment team as part of the ongoing investment process.",
  },
  {
    question: "How can I access my fund performance information?",
    answer:
      "Your financial advisor or investment platform can provide account-specific information. Current portfolio performance is not published on this demonstration website.",
  },
];

export const insightCategories = [
  "CLIENT UPDATES",
  "INDUSTRY NEWS",
  "MARKET COMMENTARY",
] as const;

export const articles = [
  {
    slug: "building-resilient-portfolios",
    title: "Building resilient portfolios through diversification",
    category: "MARKET COMMENTARY",
    date: "2026-09-30",
    excerpt:
      "Why diversification across real asset classes can help manage portfolio volatility over time.",
    body:
      "Diversification is a core part of our investment beliefs. Combining exposures across asset classes can help manage portfolio volatility, while asset allocation remains a key driver of long-term portfolio returns and risk. Investors should discuss their objectives and time horizon with a financial advisor.",
  },
  {
    slug: "advisor-partnership",
    title: "A client-first approach to advisor partnerships",
    category: "CLIENT UPDATES",
    date: "2026-08-15",
    excerpt:
      "Financial advisors are central to the success of fund management businesses.",
    body:
      "We believe financial advisors are crucial to the success of fund management businesses. Our owner-managed, independent approach is designed to support productive long-term partnerships between clients, advisors, and investment managers.",
  },
  {
    slug: "understanding-investment-costs",
    title: "Understanding the role of investment costs",
    category: "INDUSTRY NEWS",
    date: "2026-07-20",
    excerpt:
      "A look at why costs deserve attention when evaluating an investment portfolio.",
    body:
      "Costs are one of the factors investors can assess when considering a portfolio. Our investment belief is that the only guaranteed way of creating alpha is by reducing costs. Investment decisions should also take account of an investor's objectives, risk tolerance, and time horizon.",
  },
  {
    slug: "market-context-and-time-horizons",
    title: "Market context and investment time horizons",
    category: "MARKET COMMENTARY",
    date: "2026-06-30",
    excerpt:
      "How to keep short-term market movements in perspective when investing for the long term.",
    body:
      "Market movements can vary over short periods. Investors should interpret performance in the context of the stated measurement period and their own investment horizon, and should consult a financial advisor before making changes.",
  },
];

export const documents = [
  {
    slug: "placeholder-balanced-fact-sheet",
    name: "your firm Balanced Fact Sheet",
    category: "Product Resources",
    size: "PDF · 1 page",
  },
  {
    slug: "placeholder-cautious-fact-sheet",
    name: "your firm Cautious Fact Sheet",
    category: "Product Resources",
    size: "PDF · 1 page",
  },
  ...[
    "Conflict of Interest Policy",
    "Complaints Resolution Policy",
    "POPI Act Statement",
    "PAIA Manual",
  ].map((name) => ({
    slug: name.toLowerCase().replaceAll(" ", "-"),
    name,
    category: "Compliance & Regulatory",
    size: "PDF · 1 page",
  })),
];

export const performanceDisclosures = {
  importantDisclosure: "",
  advice: `${company.regulatoryNotice}. The FAIS Act is the Financial Advisory and Intermediary Services Act 37 of 2002. Information on this website is general in nature and is not personal financial advice, an offer, or a recommendation to invest. Please consult an authorised financial advisor and read the current product disclosure documents before making an investment decision.`,
  pastPerformance:
    "Past performance is not necessarily a guide to future performance. Investment values may fluctuate, and investors may not get back the amount invested.",
  factualInformation:
    "This assistant provides website information only. It does not provide personalized financial advice, investment recommendations, or access to private client records.",
};

export type FundFactsRecord = {
  isin?: string | null;
  jseCode?: string | null;
  asisaCategory?: string | null;
  launchDate?: string | null;
  benchmark?: string | null;
  managementCompany?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  tradingCosts?: {
    ter?: number | null;
    transactionCosts?: number | null;
    totalInvestmentCharge?: number | null;
    asAt?: string | null;
  } | null;
  assetAllocation?: { name: string; percent: number }[] | null;
  assetAllocationAsAt?: string | null;
  topHoldings?: string[] | null;
  mddDate?: string | null;
  source?: string | null;
  minimumInvestment?: {
    amount?: number | null;
    currency?: string | null;
    asAt?: string | null;
  } | null;
};

type FundStrategyId = (typeof strategies)[number]["id"];

export const fundFacts: Record<FundStrategyId, FundFactsRecord> = {
  balanced: {
    isin: null,
    jseCode: null,
    asisaCategory: null,
    launchDate: null,
    benchmark: null,
    managementCompany: { name: null, phone: null, email: null },
    tradingCosts: { ter: null, transactionCosts: null, totalInvestmentCharge: null, asAt: null },
    assetAllocation: [],
    assetAllocationAsAt: null,
    topHoldings: [],
    mddDate: null,
    source: null,
    minimumInvestment: { amount: null, currency: null, asAt: null },
  },
  cautious: {
    isin: null,
    jseCode: null,
    asisaCategory: null,
    launchDate: null,
    benchmark: null,
    managementCompany: { name: null, phone: null, email: null },
    tradingCosts: { ter: null, transactionCosts: null, totalInvestmentCharge: null, asAt: null },
    assetAllocation: [],
    assetAllocationAsAt: null,
    topHoldings: [],
    mddDate: null,
    source: null,
    minimumInvestment: { amount: null, currency: null, asAt: null },
  },
};

export const taxYearLimits = {
  taxYearLabel: "2027 (1 Mar 2026 to 28 Feb 2027)",
  tfsaAnnual: 46000,
  tfsaLifetime: 500000,
  tfsaPenaltyPercent: 40,
  source: "https://www.sars.gov.za/types-of-tax/personal-income-tax/tax-free-investments/",
  verifiedOn: "2026-11-17",
  raDeductionPercent: 27.5,
  raDeductionCap: 350000,
  raVerified: false,
};
export type TaxYearLimits = typeof taxYearLimits;

export const feeInformation: {
  managementFee: number | null;
  performanceFee: number | null;
  initialFee: number | null;
  notes: string;
} = {
  managementFee: null,
  performanceFee: null,
  initialFee: null,
  notes: "Client to confirm onboarding, management and performance fee schedule.",
};

export const fundMetricsSnapshot = {
  performanceDate: null,
  returnSummary,
  strategies,
};
