import {
  articles,
  beliefs,
  company,
  documents,
  faqs,
  fundFacts,
  insightCategories,
  leadership,
  performanceDisclosures,
  returnSummary,
  strategies,
} from "@/data/firmData";

export type ChatLink = {
  label: string;
  href: string;
  download?: boolean;
};

export type ChatHistoryMessage = {
  role: "assistant" | "user";
  content: string;
};

type KnowledgeIntent = {
  id: string;
  patterns: RegExp[];
  answer: string | ((message: string) => string);
  links: ChatLink[];
};

const resourceLinks: ChatLink[] = [
  { label: "Browse published resources", href: "/resources" },
  { label: `Contact ${company.legalName}`, href: "/contact" },
];
const portalLink: ChatLink = { label: "Open the secure client portal", href: "/portal/dashboard" };
const portfolioLink: ChatLink = { label: "View published portfolio information", href: "/portfolios" };
const insightLink: ChatLink = { label: "Browse insights", href: "/insights" };
const onboardingLink: ChatLink = { label: "Open the preliminary onboarding questionnaire", href: "/onboarding" };
const documentLinks: ChatLink[] = documents.map((document) => {
  const href = "file" in document && typeof document.file === "string"
    ? document.file
    : `/api/documents/${document.slug}`;
  return { label: document.name, href, download: true };
});

const supportAnswer = () =>
  `${company.legalName} is a self-service website assistant, not a live-agent service. You can contact the team at ${company.phone}, ${company.email}, or ${company.address}. The team aims to respond within ${company.responseTime}.`;
const contactAnswer = () =>
  `Phone: ${company.phone}\nEmail: ${company.email}\nAddress: ${company.address}\nThe team aims to respond within ${company.responseTime}.`;
const performanceAnswer = () => {
  const strategyDetails = strategies.map((strategy) =>
    `${strategy.name}: ${strategy.profile}; benchmark ${strategy.benchmark}; inception ${strategy.inceptionDate}; performance as at ${strategy.performanceDate}. Cumulative returns: 1 month ${strategy.cumulative.oneMonth}, 1 year ${strategy.cumulative.oneYear} (benchmark ${strategy.cumulative.oneYearBenchmark}), 3 years ${strategy.cumulative.threeYear} (benchmark ${strategy.cumulative.threeYearBenchmark}). Annualised returns: 3 years ${strategy.annualised.threeYear} (benchmark ${strategy.annualised.threeYearBenchmark}), 5 years ${strategy.annualised.fiveYear} (benchmark ${strategy.annualised.fiveYearBenchmark}). Risk statistics: 1-year ${strategy.risk.oneYear}, 3-year ${strategy.risk.threeYears}. The since-inception 1-year high is ${strategy.sinceInceptionOneYear.high} and low is ${strategy.sinceInceptionOneYear.low}.`,
  );
  const returnComparisons = returnSummary.rows
    .map((row) => `${row.name}: ${row.label}`)
    .join("; ");

  return [
    `Published performance information: ${strategyDetails.join(" ")}`,
    `FE Analytics / FE fundinfo total-return comparison for ${returnSummary.period} (as at ${returnSummary.asAt}): ${returnComparisons}.`,
    performanceDisclosures.advice,
    performanceDisclosures.pastPerformance,
    performanceDisclosures.factualInformation,
  ].join("\n\n");
};

export function fundFactsAnswer(message: string, factsByStrategy = fundFacts): string {
  const requestedStrategies = strategies.filter((strategy) =>
    new RegExp(`\\b${strategy.id}\\b|\\b${strategy.name.replace(/^your firm /, "")}\\b`, "i").test(message),
  );
  const selectedStrategies = requestedStrategies.length ? requestedStrategies : strategies;
  const wantsMinimum = /\b(minimum|min\.?)\b/i.test(message);
  const wantsCosts = /\b(fee|fees|cost|costs|ter|transaction|charge|charges)\b/i.test(message);
  const wantsAllocation = /\b(allocation|asset mix)\b/i.test(message);
  const wantsHoldings = /\b(holding|holdings)\b/i.test(message);
  const wantsCompany = /\b(manager|management[- ]company)\b/i.test(message);
  const output: string[] = [];

  for (const strategy of selectedStrategies) {
    const facts = factsByStrategy[strategy.id];
    const prefix = `${strategy.title}: `;
    const addValue = (label: string, value: string | number | null | undefined) => {
      output.push(`${prefix}${label}: ${value === null || value === undefined || value === "" ? "not published" : value}.`);
    };

    if (wantsMinimum) {
      const minimum = facts.minimumInvestment;
      addValue(
        "Minimum investment",
        minimum?.amount === null || minimum?.amount === undefined
          ? null
          : `${minimum.currency ?? ""} ${minimum.amount}${minimum.asAt ? ` (as at ${minimum.asAt})` : ""}`.trim(),
      );
    }

    if (wantsCosts) {
      const costs = facts.tradingCosts;
      for (const [label, amount] of [
        ["TER", costs?.ter],
        ["Transaction costs", costs?.transactionCosts],
        ["Total investment charge", costs?.totalInvestmentCharge],
      ] as const) {
        addValue(label, amount === null || amount === undefined
          ? null
          : `${new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 2 }).format(amount)}%${costs?.asAt ? ` (as at ${costs.asAt})` : ""}`);
      }
    }

    if (wantsAllocation) {
      const allocation = facts.assetAllocation?.filter((item) => item.name.trim() && Number.isFinite(item.percent)) ?? [];
      if (!allocation.length) {
        addValue("Asset allocation", null);
      } else {
        const values = allocation.map((item) => `${item.name}: ${item.percent}%`).join(", ");
        const date = facts.assetAllocationAsAt ? ` (as at ${facts.assetAllocationAsAt})` : "";
        const source = facts.source ? ` Source: ${facts.source}.` : "";
        output.push(`${prefix}Asset allocation: ${values}${date}.${source}`);
      }
    }

    if (wantsHoldings) {
      const holdings = facts.topHoldings?.filter((holding) => holding.trim()) ?? [];
      addValue("Top holdings", holdings.length ? holdings.join(", ") : null);
    }

    if (wantsCompany) {
      const companyData = facts.managementCompany;
      const mentionsContact = /\b(phone|telephone|email|contact)\b/i.test(message);
      const mentionsEmail = /\bemail\b/i.test(message);
      const mentionsPhone = /\b(phone|telephone)\b/i.test(message);
      if (mentionsContact) {
        if (mentionsPhone) addValue("Management company phone", companyData?.phone);
        if (mentionsEmail) addValue("Management company email", companyData?.email);
        if (!mentionsPhone && !mentionsEmail) {
          addValue("Management company phone", companyData?.phone);
          addValue("Management company email", companyData?.email);
        }
      } else {
        addValue("Management company", companyData?.name);
      }
    }

    if (/\bisin\b/i.test(message)) addValue("ISIN", facts.isin);
    if (/\bjse\b/i.test(message)) addValue("JSE code", facts.jseCode);
    if (/\basisa\b/i.test(message)) addValue("ASISA category", facts.asisaCategory);
    if (/\blaunch\b/i.test(message)) addValue("Launch date", facts.launchDate);
    if (/\bbenchmark\b/i.test(message)) addValue("Benchmark", facts.benchmark ?? strategy.benchmark);
    if (/\b(maximum drawdown|mdd)\b/i.test(message)) addValue("Maximum drawdown date", facts.mddDate);
    if (/\bsource\b/i.test(message)) addValue("Source", facts.source);
  }

  if (!output.length) {
    return selectedStrategies
      .map((strategy) => `${strategy.title}: ${strategy.profile}; benchmark ${strategy.benchmark}; performance as at ${strategy.performanceDate}.`)
      .join("\n");
  }

  return output.join("\n");
}

const intents: KnowledgeIntent[] = [
  {
    id: "fund-facts",
    patterns: [
      /\b(isin|jse|asisa|launch|benchmark|manager|management[- ]company|holding|holdings|mdd|source|minimum|fee|fees|cost|costs|ter|transaction|charge|charges|allocation|asset mix)\b/i,
      /\b(balanced|cautious)\b/i,
    ],
    answer: fundFactsAnswer,
    links: [portfolioLink],
  },
  {
    id: "greeting",
    patterns: [/\b(hello|hi|hey|good morning|good afternoon|good evening|how are you)\b/i],
    answer: () => `Hello! I’m doing well, thanks for asking. I can help with published ${company.legalName} information, forms, and website navigation. What would you like to know?`,
    links: [],
  },
  {
    id: "thanks",
    patterns: [/\b(thanks|thank you|much appreciated)\b/i],
    answer: "You’re welcome. Let me know if you need help finding other published information or documents.",
    links: [],
  },
  {
    id: "who-am-i",
    patterns: [/\b(who are you|what are you|are you a person|are you human)\b/i],
    answer: () => `I’m ${company.legalName}’s self-service website assistant. I can help find published information and website documents, but I’m not a person and don’t provide personalized financial advice.`,
    links: resourceLinks,
  },
  {
    id: "speak-to-a-person",
    patterns: [/\b(speak|talk|chat|connect|person|human|agent|someone)\b/i, /\b(live|real)\s+(person|agent|human)\b/i],
    answer: supportAnswer,
    links: [{ label: "Contact details", href: "/contact" }],
  },
  {
    id: "contact-details",
    patterns: [/\b(contact|phone|telephone|email|address|location|response time|respond|business days)\b/i],
    answer: contactAnswer,
    links: [{ label: `Contact ${company.legalName}`, href: "/contact" }],
  },
  {
    id: "regulatory-status",
    patterns: [/\b(fsp|fais|authori[sz]ed|regulat|license|licence|financial services provider)\b/i],
    answer: () => company.regulatoryNotice,
    links: [{ label: "Compliance and regulatory resources", href: "/resources" }],
  },
  {
    id: "company",
    patterns: [/\b(about placeholder|what is placeholder|what does placeholder|company|business|tagline|mission|purpose|who are placeholder)\b/i],
    answer: () => `${company.legalName} is an independent, owner-managed fund management business. Its stated purpose is: “${company.tagline}”`,
    links: [{ label: `About ${company.legalName}`, href: "/about" }],
  },
  {
    id: "strategies-performance",
    patterns: [
      /\b(performance|return|benchmark|risk statistics|risk measure|inception|high|low|total return)\b/i,
      /\b(balanced|cautious|strategy|strategies|fund)\b/i,
      /\b(fe analytics|fe fundinfo|cumulative|annualised|annualized)\b/i,
    ],
    answer: performanceAnswer,
    links: [portfolioLink],
  },
  {
    id: "minimum-investment",
    patterns: [/\b(minimum|min\.?)\b/i, /\b(investment|invest|amount|deposit)\b/i],
    answer: fundFactsAnswer,
    links: resourceLinks,
  },
  {
    id: "fees",
    patterns: [/\b(fee|fees|cost|costs|eac|charge|charges|fee table)\b/i],
    answer: fundFactsAnswer,
    links: [resourceLinks[0], portalLink],
  },
  {
    id: "beliefs",
    patterns: [/\b(investment|belief|beliefs|philosophy|approach|principles)\b/i, /\b(beliefs|philosophy|investment principles)\b/i],
    answer: () => `${company.legalName}’ investment beliefs are: ${beliefs.join(" ")}`,
    links: [{ label: "Read about placeholder’s approach", href: "/about" }],
  },
  {
    id: "leadership",
    patterns: [/\b(leadership|team|managing director|portfolio manager|fund manager|economist|credentials|biograph|who is)\b/i],
    answer: () =>
      `Leadership team: ${leadership.map((person) => `${person.name} — ${person.role}. Credentials: ${person.credentials}. ${person.bio}`).join(" ")}`,
    links: [{ label: "Meet the team", href: "/about" }],
  },
  {
    id: "faqs",
    patterns: [/\b(faq|frequently asked|common question|how often.*review|access.*performance)\b/i],
    answer: () =>
      faqs
        .map((faq) => {
          return `${faq.question} ${faq.answer}`;
        })
        .join("\n\n"),
    links: [portfolioLink, onboardingLink, resourceLinks[1]],
  },
  {
    id: "insights",
    patterns: [/\b(insight|article|articles|market commentary|client updates|industry news)\b/i],
    answer: () =>
      `The published insight categories are ${insightCategories.join(", ")}. Articles: ${articles.map((article) => `${article.title} (${article.category}, ${article.date}) — ${article.excerpt} ${article.body}`).join(" ")}`,
    links: [insightLink],
  },
  {
    id: "all-documents",
    patterns: [/\b(?:(?:all|every|list|available|which)\b.*\b(?:files?|forms?|documents?|downloads?|pdfs?)\b|what(?:\s+are)?\s+(?:the\s+)?(?:available\s+)?(?:files?|forms?|documents?|downloads?|pdfs?)\b)/i],
    answer: () => `These are the ${documents.length} public downloads listed on the website. Account-specific files, if assigned, are in the secure client portal.`,
    links: [...documentLinks, portalLink],
  },
  {
    id: "open-account",
    patterns: [/\b(open|start|apply|application|onboarding|questionnaire|kyc|aml)\b/i, /\b(account|invest|tfsa)\b/i],
    answer: "To open an account, speak with your financial advisor and use the relevant Individual, Legal Entity, or TFSA application form. The preliminary onboarding questionnaire helps prepare an initial application summary; it is not KYC/AML, identity verification, a completed application, or an application submission.",
    links: [
      ...documentLinks.filter((link) => /application form/i.test(link.label)),
      onboardingLink,
    ],
  },
  {
    id: "portal-overview",
    patterns: [/\b(client portal|portal|sign in|sign-in|log in|login)\b/i, /\b(holdings|simulator|document vault|requests and adviser)\b/i],
    answer: "The secure client portal contains Overview, Holdings & Simulator, Document Vault, and Requests & Adviser. Sign in from the client portal dashboard. When no account records are linked, the portal shows empty states; illustrative demonstration content is available only to configured demo accounts. The Requests section lets signed-in clients submit instructions for adviser review.",
    links: [portalLink],
  },
  {
    id: "portal-requests",
    patterns: [/\b(request|submit|make|ask for)\b/i, /\b(top.?up|switch|withdraw(?:al)?|debit[- ]order|portfolio review|review|deletion|personal data deletion|delete personal data)\b/i],
    answer: "Sign in to the secure client portal, open Requests & Adviser, select the relevant instruction type, enter the requested details, and submit it for adviser review. Available requests include a lump-sum top-up, strategy switch, withdrawal, debit-order update, portfolio review, and personal-data deletion. State the amount where applicable; a switch lets you select a strategy. A personal-data deletion request is reviewed under POPIA and information required for legal or regulatory retention may not be deleted.",
    links: [portalLink],
  },
  {
    id: "privacy-and-terms",
    patterns: [/\b(privacy|popia|popi|personal information|terms|website terms|data protection)\b/i],
    answer: "The website links to a privacy notice and website terms, both marked as draft placeholders pending legal review; they are not complete approved legal notices. The published POPI Act Statement is available in Resources. The portal also supports personal-data deletion requests under POPIA, subject to legal or regulatory retention requirements.",
    links: [
      { label: "Privacy notice", href: "/privacy" },
      { label: "Website terms", href: "/terms" },
      ...documentLinks.filter((link) => /POPI/i.test(link.label)),
      portalLink,
    ],
  },
  {
    id: "compliance-documents",
    patterns: [/\b(complaint|complaints|conflict of interest|paia|access to information|regulatory policy)\b/i],
    answer: () => `The website lists these compliance resources: ${documents.filter((document) => /Compliance/i.test(document.category)).map((document) => document.name).join(", ")}.`,
    links: documentLinks.filter((link) =>
      /Complaints|Conflict|PAIA/i.test(link.label),
    ),
  },
];

const documentIntents: KnowledgeIntent[] = documents.map((document) => {
  const link = documentLinks.find((item) => item.label === document.name);
  const words = document.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const patterns = [
    new RegExp(document.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    new RegExp(`\\b${words.join("[\\\\s-]+")}\\b`, "i"),
  ];

  if (/TFSA/i.test(document.name)) patterns.push(/\btfsa\b/i);
  if (/Withdrawal/i.test(document.name)) patterns.push(/\b(withdraw|withdrawal|cash out|redeem)\b/i);
  if (/Debit Order/i.test(document.name)) patterns.push(/\b(monthly contribution|debit[- ]order)\b/i);
  if (/Fact Sheet/i.test(document.name)) patterns.push(/\b(fact sheet|factsheet|mdd)\b/i);

  return {
    id: `document-${document.slug}`,
    patterns,
    answer: () => `The ${document.name} is listed as a public website download.`,
    links: link ? [link] : resourceLinks,
  };
});

export function answerLocally(
  message: string,
  history: ChatHistoryMessage[] = [],
): { answer: string; links: ChatLink[] } {
  const isFollowUp = /^(and|also|what about|how about|tell me more|why|which one|that|those|it)\b/i.test(message.trim());
  const context = isFollowUp
    ? history.filter((item) => item.role === "user").slice(-2).map((item) => item.content).join(" ")
    : "";
  const searchableMessage = context ? `${context} ${message}` : message;
  let bestIntent: KnowledgeIntent | undefined;
  let bestScore = 0;

  for (const intent of [...intents, ...documentIntents]) {
    const score = intent.patterns.reduce(
      (total, pattern) => total + (pattern.test(searchableMessage) ? 1 : 0),
      0,
    );
    if (
      score > bestScore ||
      (score === bestScore && bestIntent?.id === "greeting" && intent.id !== "greeting")
    ) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  if (!bestIntent) {
    return {
      answer: `I can’t find that in the published information from ${company.legalName}. I can help with published ${company.legalName} information, or you can browse Resources and Contact for more.`,
      links: resourceLinks,
    };
  }

  return {
    answer: typeof bestIntent.answer === "function"
      ? bestIntent.answer(searchableMessage)
      : bestIntent.answer,
    links: bestIntent.links,
  };
}
