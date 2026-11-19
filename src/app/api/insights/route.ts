import { cacheLife } from "next/cache";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { NextResponse } from "next/server";
import { getCanonicalResearchArticle } from "@/lib/insights/server";
import { researchCatalog } from "@/lib/insights/catalog";
import { getPublishedResearchCatalog } from "@/lib/insights/server";

type InsightCategory = "INDUSTRY NEWS" | "MARKET COMMENTARY";
type FeedArticle = {
  slug: string;
  title: string;
  category: InsightCategory;
  date: string;
  source: string;
  excerpt: string;
  url: string;
};

const feeds = [
  { source: "Moneyweb", url: "https://www.moneyweb.co.za/feed/" },
  { source: "BusinessTech", url: "https://businesstech.co.za/news/finance/feed/" },
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
] as const;

const parser = new XMLParser({
  ignoreAttributes: true,
  processEntities: false,
  trimValues: true,
});

const marketTerms =
  /\b(markets?|rand|jse|stocks?|shares?|bonds?|econom(?:y|ic)|inflation|interest rates?|rate cuts?|rate hikes?|central banks?|currenc(?:y|ies)|commodit(?:y|ies)|oil prices?|gold prices?|gdp|recession|investors?|global outlook|market outlook|trading)\b/gi;
const industryTerms =
  /\b(compan(?:y|ies)|business(?:es)?|funds?|asset managers?|investment managers?|banks?|insurers?|acquisitions?|mergers?|deal(?:s)?|earnings|results|regulation|regulatory|policy|appointment|ceo|launch(?:es|ed)?|product(?:s)?|industry|executive)\b/gi;

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) {
    return text((value as { "#text": unknown })["#text"]);
  }
  return "";
}

function plainText(value: unknown) {
  return text(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const point = Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => {
      const point = Number.parseInt(code, 16);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value: unknown) {
  const content = plainText(value);
  if (content.length <= 240) return content;
  return `${content.slice(0, 237).trimEnd()}…`;
}

function classify(title: string, summary: string): InsightCategory {
  const content = `${title} ${summary}`;
  const marketScore = [...content.matchAll(marketTerms)].length;
  const industryScore = [...content.matchAll(industryTerms)].length;
  return marketScore > industryScore ? "MARKET COMMENTARY" : "INDUSTRY NEWS";
}

function readItems(feed: unknown): unknown[] {
  if (!feed || typeof feed !== "object") return [];
  const root = feed as Record<string, unknown>;
  const channel = root.rss && typeof root.rss === "object"
    ? (root.rss as Record<string, unknown>).channel
    : root.feed;
  if (!channel || typeof channel !== "object") return [];
  const channelObject = channel as Record<string, unknown>;
  const items = channelObject.item ?? channelObject.entry;
  if (Array.isArray(items)) return items;
  return items ? [items] : [];
}

async function getFeedArticles(): Promise<{ articles: FeedArticle[]; sources: string[]; fetchedAt: string }> {
  "use cache";
  cacheLife({ stale: 900, revalidate: 900, expire: 3600 });

  const parserOptions = { signal: AbortSignal.timeout(8000) };
  const responses = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const response = await fetch(feed.url, {
          ...parserOptions,
          headers: {
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
            "User-Agent": "placeholder-brand-Insights/1.0",
          },
        });
        if (!response.ok) {
          console.warn(`Insights RSS source ${feed.source} returned HTTP ${response.status}.`);
          return null;
        }
        const xml = await response.text();
        if (xml.length > 2_000_000) {
          console.warn(`Insights RSS source ${feed.source} exceeded the feed size limit.`);
          return null;
        }
        if (XMLValidator.validate(xml) !== true) {
          console.warn(`Insights RSS source ${feed.source} returned invalid XML.`);
          return null;
        }
        const document: unknown = parser.parse(xml);
        const feedArticles = readItems(document).flatMap((rawItem): FeedArticle[] => {
          if (!rawItem || typeof rawItem !== "object") return [];
          const item = rawItem as Record<string, unknown>;
          const title = plainText(item.title);
          const rawLink = text(item.link);
          const linkValue =
            rawLink ||
            (Array.isArray(item.link) && item.link[0] && typeof item.link[0] === "object"
              ? text((item.link[0] as Record<string, unknown>)["@_href"])
              : "");
          let articleUrl: URL;
          try {
            articleUrl = new URL(linkValue, feed.url);
          } catch {
            return [];
          }
          if (articleUrl.protocol !== "https:" && articleUrl.protocol !== "http:") return [];
          const dateValue = text(item.pubDate ?? item.published ?? item.updated ?? item["dc:date"]);
          const publishedAt = new Date(dateValue);
          if (!title || !dateValue || Number.isNaN(publishedAt.getTime())) return [];
          const summary = excerpt(item.description ?? item.summary ?? item["content:encoded"]);
          const guid = text(item.guid) || articleUrl.href;
          const slug = `${feed.source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${guid}`
            .replace(/[^a-zA-Z0-9-]+/g, "-")
            .slice(0, 180);
          return [{
            slug,
            title,
            category: classify(title, summary),
            date: publishedAt.toISOString(),
            source: feed.source,
            excerpt: summary,
            url: articleUrl.href,
          }];
        });
        return { source: feed.source, articles: feedArticles };
      } catch {
        console.warn(`Insights RSS source ${feed.source} could not be fetched or parsed.`);
        return null;
      }
    }),
  );

  const availableFeeds = responses.filter(
    (response): response is NonNullable<typeof response> => response !== null,
  );
  const byUrl = new Map<string, FeedArticle>();
  for (const result of availableFeeds) {
    for (const article of result.articles) {
      if (!byUrl.has(article.url)) byUrl.set(article.url, article);
    }
  }
  return {
    articles: [...byUrl.values()]
      .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
      .slice(0, 100),
    sources: availableFeeds.map(({ source }) => source),
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const slug = searchParams.get("slug")?.trim();
  if (slug) {
    if (slug.length > 180 || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: "The research reference is invalid." }, { status: 400 });
    }
    const article = await getCanonicalResearchArticle(slug);
    return article
      ? NextResponse.json({ article, canonicalUrl: `/insights/${article.slug}` })
      : NextResponse.json({ error: "Research article not found." }, { status: 404 });
  }

  const mode = searchParams.get("type");
  if (mode === "research") {
    const managedResearch = await getPublishedResearchCatalog();
    const articles = [...managedResearch, ...researchCatalog].sort((left, right) =>
      Date.parse(right.date) - Date.parse(left.date),
    );
    return NextResponse.json({
      count: articles.length,
      articles,
    });
  }
  const category = searchParams.get("category")?.trim().toUpperCase() ?? "ALL";
  const query = searchParams.get("q")?.trim() ?? "";

  if (category !== "ALL" && category !== "INDUSTRY NEWS" && category !== "MARKET COMMENTARY") {
    return NextResponse.json(
      { error: "Unsupported category.", categories: ["ALL", "INDUSTRY NEWS", "MARKET COMMENTARY"] },
      { status: 400 },
    );
  }
  if (query.length > 100) {
    return NextResponse.json({ error: "Search query must be 100 characters or fewer." }, { status: 400 });
  }

  const feed = await getFeedArticles();
  if (!feed.sources.length) {
    return NextResponse.json(
      { error: "Live news feeds are temporarily unavailable. Please try again shortly." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const normalizedQuery = query.toLowerCase();
  const matchingArticles = feed.articles.filter((article) => {
    const categoryMatches = category === "ALL" || article.category === category;
    const queryMatches =
      !normalizedQuery ||
      `${article.title} ${article.excerpt} ${article.source} ${article.category}`
        .toLowerCase()
        .includes(normalizedQuery);
    return categoryMatches && queryMatches;
  });
  const articles =
    category === "INDUSTRY NEWS" ? matchingArticles.slice(0, 5) : matchingArticles;

  return NextResponse.json(
    {
      category,
      query,
      count: articles.length,
      sources: feed.sources,
      fetchedAt: feed.fetchedAt,
      articles,
    },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=900" } },
  );
}
