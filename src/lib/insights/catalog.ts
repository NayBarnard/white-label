import { articles, company } from "@/data/firmData";

export const researchCategories = [
  "Market Commentary",
  "Investment Strategy",
  "Economic Insights",
  "Fund Updates",
  "Adviser Insights",
  "Investor Education",
] as const;

export type ResearchCategory = (typeof researchCategories)[number];
export type ResearchStrategy = "PLACEHOLDER BRAND Balanced" | "PLACEHOLDER BRAND Cautious";

export type ResearchArticle = {
  slug: string;
  title: string;
  category: ResearchCategory;
  date: string;
  excerpt: string;
  body: string;
  author: string;
  designation: string;
  authorBio: string;
  executiveSummary: string;
  readingTime: number;
  strategy: ResearchStrategy | "Both";
  documentType: "Research";
  keyTakeaways: string[];
  perspective: string;
  relatedSlugs: string[];
  source: string;
  featured: boolean;
};

const profiles: Record<string, Omit<ResearchArticle, "slug" | "title" | "date" | "excerpt" | "body">> = {
  "building-resilient-portfolios": {
    category: "Investment Strategy",
    author: "PLACEHOLDER BRAND Investment Team",
    designation: "Investment research",
    authorBio: "The team responsible for PLACEHOLDER BRAND' investment research and portfolio perspectives.",
    executiveSummary:
      "Diversification across asset classes can help manage portfolio volatility over time. Asset allocation and an investor's time horizon remain important considerations when assessing portfolio outcomes.",
    readingTime: 2,
    strategy: "Both",
    documentType: "Research",
    keyTakeaways: [
      "Diversification can help manage portfolio volatility.",
      "Asset allocation is a key driver of long-term portfolio returns and risk.",
      "Investment decisions should reflect an investor's objectives and time horizon.",
    ],
    perspective:
      "PLACEHOLDER BRAND believes real diversification is an effective way to manage portfolio volatility. This general perspective is not a recommendation to change an investment.",
    relatedSlugs: ["market-context-and-time-horizons", "understanding-investment-costs"],
    source: company.legalName,
    featured: true,
  },
  "advisor-partnership": {
    category: "Adviser Insights",
    author: "PLACEHOLDER BRAND Investment Team",
    designation: "Adviser relationships",
    authorBio: "The team responsible for PLACEHOLDER BRAND' investment research and portfolio perspectives.",
    executiveSummary:
      "Financial advisers play an important role in helping investors connect their objectives with investment decisions. PLACEHOLDER BRAND' independent approach is intended to support long-term collaboration between clients, advisers and investment managers.",
    readingTime: 2,
    strategy: "Both",
    documentType: "Research",
    keyTakeaways: [
      "Advisers help investors relate investment choices to their circumstances.",
      "Long-term relationships support clearer communication.",
      "Investment outcomes are not guaranteed.",
    ],
    perspective:
      "PLACEHOLDER BRAND values adviser partnerships as part of a considered investment process and does not replace an adviser's role.",
    relatedSlugs: ["building-resilient-portfolios", "market-context-and-time-horizons"],
    source: company.legalName,
    featured: false,
  },
  "understanding-investment-costs": {
    category: "Investor Education",
    author: "PLACEHOLDER BRAND Investment Team",
    designation: "Investment research",
    authorBio: "The team responsible for PLACEHOLDER BRAND' investment research and portfolio perspectives.",
    executiveSummary:
      "Investment costs are one factor to consider when assessing a portfolio. Investors should review costs alongside objectives, risk tolerance and time horizon rather than in isolation.",
    readingTime: 2,
    strategy: "Both",
    documentType: "Research",
    keyTakeaways: [
      "Review investment costs as part of a broader portfolio assessment.",
      "Costs are only one of several factors relevant to an investment decision.",
      "Consider objectives, risk tolerance and investment time horizon.",
    ],
    perspective:
      "PLACEHOLDER BRAND' investment belief is that reducing costs is a dependable way to improve the potential for investor outcomes; it does not assure positive returns.",
    relatedSlugs: ["building-resilient-portfolios", "advisor-partnership"],
    source: company.legalName,
    featured: false,
  },
  "market-context-and-time-horizons": {
    category: "Market Commentary",
    author: "PLACEHOLDER BRAND Investment Team",
    designation: "Investment research",
    authorBio: "The team responsible for PLACEHOLDER BRAND' investment research and portfolio perspectives.",
    executiveSummary:
      "Market movements vary over short periods and should be considered in context. An investor's objectives and time horizon are important when deciding whether a portfolio remains appropriate.",
    readingTime: 2,
    strategy: "Both",
    documentType: "Research",
    keyTakeaways: [
      "Short-term market movements can vary materially.",
      "Interpret performance alongside the stated measurement period.",
      "Consult an authorised financial adviser before making investment changes.",
    ],
    perspective:
      "PLACEHOLDER BRAND focuses on portfolio construction and risk across investment horizons; market commentary is not a forecast or investment recommendation.",
    relatedSlugs: ["building-resilient-portfolios", "understanding-investment-costs"],
    source: company.legalName,
    featured: false,
  },
};

export const researchCatalog: ResearchArticle[] = articles.map((article) => {
  const profile = profiles[article.slug];
  if (!profile) throw new Error(`Missing research profile for ${article.slug}.`);
  return { ...article, ...profile };
});

export function getResearchArticle(slug: string) {
  return researchCatalog.find((article) => article.slug === slug);
}
