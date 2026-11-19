export const company = {
  legalName: "PLACEHOLDER BRAND",
  tagline:
    "Genuinely diversified, cost-conscious fund management, so you can focus on relations, and not portfolio construction.",
  regulatoryNotice:
    "PLACEHOLDER BRAND is an authorised FSP in terms of the FAIS Act of South Africa | FSP No. 622 | Category: Discretionary Investment Management",
  publicFooterNotice:
    "Authorised FSP in terms of the FAIS Act of South Africa - FSP No. 622",
  workspaceFooterNotice: "Authorised FSP No. 622 (Discretionary Investment Management)",
  phone: "021 300 1582",
  email: "info@placeholder-am.co.za",
  responseTime: "2 business days",
  address:
    "Clubhouse, Golf Village Somerset West, 2 De Beers Ave, Firgrove Rural, Cape Town, 7130",
};

export const returnSummary = {
  period: "31 Dec 2008 – 30 Jun 2026",
  asAt: "30 June 2026",
  source: "FE Analytics / FE fundinfo 2026",
  rows: [
    { name: "PLACEHOLDER BRAND Balanced", value: 569.7, label: "569.70%" },
    { name: "PLACEHOLDER BRAND Cautious", value: 416.63, label: "416.63%" },
    {
      name: "SA MA High Equity (Benchmark)",
      value: 399.97,
      label: "399.97%",
    },
    {
      name: "SA MA Low Equity (Benchmark)",
      value: 309.17,
      label: "309.17%",
    },
  ],
};

export const strategies = [
  {
    id: "balanced",
    name: "PLACEHOLDER BRAND Balanced",
    title: "PLACEHOLDER BRAND Balanced Strategy",
    profile: "Moderate to Aggressive",
    benchmark: "CPI+5%",
    source: company.legalName,
    performanceDate: "30 September 2026",
    inceptionDate: "02 May 2018",
    cumulative: {
      oneMonth: "-2.1%",
      oneYear: "6.7%",
      oneYearBenchmark: "8.8%",
      threeYear: "43.6%",
      threeYearBenchmark: "28.9%",
    },
    annualised: {
      threeYear: "12.8%",
      threeYearBenchmark: "8.8%",
      fiveYear: "10.2%",
      fiveYearBenchmark: "10.0%",
    },
    risk: { oneYear: "3.73%", threeYears: "12.83%" },
    sinceInceptionOneYear: { high: "35.9%", low: "-11.4%" },
  },
  {
    id: "cautious",
    name: "PLACEHOLDER BRAND Cautious",
    title: "PLACEHOLDER BRAND Cautious Strategy",
    profile: "Conservative to Cautious",
    benchmark: "CPI+3%",
    source: company.legalName,
    performanceDate: "30 September 2026",
    inceptionDate: "18 June 2020",
    cumulative: {
      oneMonth: "-1.1%",
      oneYear: "7.3%",
      oneYearBenchmark: "7.0%",
      threeYear: "39.1%",
      threeYearBenchmark: "21.9%",
    },
    annualised: {
      threeYear: "11.6%",
      threeYearBenchmark: "6.8%",
      fiveYear: "9.0%",
      fiveYearBenchmark: "7.9%",
    },
    risk: { oneYear: "2.80%", threeYears: "6.42%" },
    sinceInceptionOneYear: { high: "17.2%", low: "-1.0%" },
  },
] as const;

export const reportedPerformanceChartData = {
  balanced: [
    { period: "1M", return: -2.1, benchmark: null, metric: "Cumulative" },
    { period: "1Y", return: 6.7, benchmark: 8.8, metric: "Cumulative" },
    { period: "3Y", return: 43.6, benchmark: 28.9, metric: "Cumulative" },
    { period: "5Y", return: 10.2, benchmark: 10, metric: "Annualised" },
  ],
  cautious: [
    { period: "1M", return: -1.1, benchmark: null, metric: "Cumulative" },
    { period: "1Y", return: 7.3, benchmark: 7, metric: "Cumulative" },
    { period: "3Y", return: 39.1, benchmark: 21.9, metric: "Cumulative" },
    { period: "5Y", return: 9, benchmark: 7.9, metric: "Annualised" },
  ],
  totalReturn: returnSummary.rows.map(({ name, value }) => ({ name, value })),
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

export const leadership: LeadershipMember[] = [
  {
    name: "Hermann Labuschagne",
    role: "Managing Director",
    credentials: "CFP, MBA, BCom (Management Accounting), Post Grad Diploma in Taxation Law",
    bio: "Over 20 years of investment management experience across multiple asset classes.",
  },
  {
    name: "Hendrik Vos",
    role: "Portfolio Manager, Director",
    credentials: "ICMQ (London), HCWM, MIFM",
    bio: "Extensive experience in financial adviser relationships and fund distribution.",
  },
  {
    name: "Simon Morrison",
    role: "Fund Manager",
    credentials: "BCom (Financial Management), CFA",
    bio: "Specializes in diversified portfolio construction and risk management.",
  },
  {
    name: "Johann Van Tonder",
    role: "Independent Economist",
    credentials: "MCom (Economics)",
    bio: "Provides expert economic analysis and market insights to the investment committee.",
  },
];

export const firmStats = {
  yearsExperience: 65,
  investmentStrategies: strategies.length,
  satisfiedClients: null as number | null,
  distributionPlatforms: 8,
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
      "Your financial advisor or investment platform can provide account-specific information. Our portfolio page also displays the performance figures published here.",
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
    name: "PLACEHOLDER BRAND Balanced Fact Sheet",
    category: "Product Resources",
    size: "PDF · 1 page",
  },
  {
    slug: "placeholder-cautious-fact-sheet",
    name: "PLACEHOLDER BRAND Cautious Fact Sheet",
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
  performanceDate: strategies[0].performanceDate,
  returnSummary,
  strategies,
};
