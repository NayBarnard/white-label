import { NextResponse } from "next/server";
import { enforcePublicRateLimit, readJsonBody } from "@/lib/server/rate-limit";
import {
  articles,
  beliefs,
  company,
  documents,
  faqs,
  fundFacts,
  leadership,
  performanceDisclosures,
  returnSummary,
  strategies,
} from "@/data/firmData";
import { answerLocally, type ChatHistoryMessage } from "@/lib/chat/knowledge";

type ChatLink = {
  label: string;
  href: string;
  download?: boolean;
};

const downloadableFiles: ChatLink[] = documents.map((document) => {
  const href = "file" in document && typeof document.file === "string"
    ? document.file
    : `/api/documents/${document.slug}`;
  return { label: document.name, href, download: true };
});

const resourcePageLink: ChatLink = { label: "Browse all website resources", href: "/resources" };
const portalLink: ChatLink = { label: "Open the secure client portal", href: "/portal" };

function isChatHistoryMessage(value: unknown): value is ChatHistoryMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    (value.role === "user" || value.role === "assistant") &&
    "content" in value &&
    typeof value.content === "string" &&
    value.content.trim().length > 0 &&
    value.content.length <= 800
  );
}

const documentAliases: { pattern: RegExp; slugs: string[] }[] = [
  { pattern: /\b(tfsa|tax.free savings)\b/i, slugs: ["tfsa-application-form", "transfer-tfsa-form"] },
  { pattern: /\b(company|corporate|business|legal entity)\b/i, slugs: ["legal-entity-application-form"] },
  { pattern: /\b(individual|personal|open an account|opening an account|application)\b/i, slugs: ["individual-application-form"] },
  { pattern: /\b(change|update).{0,24}\b(details|bank|address|personal)\b|\bbank details\b/i, slugs: ["change-of-details-form"] },
  { pattern: /\b(add|addition|contribut|top.?up|invest more)\b/i, slugs: ["add-to-investment-form"] },
  { pattern: /\bswitch\b/i, slugs: ["switch-fund-form"] },
  { pattern: /\btransfer\b/i, slugs: ["transfer-form", "transfer-tfsa-form"] },
  { pattern: /\b(withdraw|withdrawal|cash out|redeem)\b/i, slugs: ["withdrawal-form"] },
  { pattern: /\bdebit order|monthly debit|monthly contribution\b/i, slugs: ["debit-order-change-form"] },
  { pattern: /\bbalanced\b/i, slugs: ["placeholder-balanced-fact-sheet"] },
  { pattern: /\bcautious\b/i, slugs: ["placeholder-cautious-fact-sheet"] },
  { pattern: /\bfact sheet|factsheet|mdd|minimum disclosure\b/i, slugs: ["placeholder-balanced-fact-sheet", "placeholder-cautious-fact-sheet"] },
  { pattern: /\bconflict\b/i, slugs: ["conflict-of-interest-policy"] },
  { pattern: /\bcomplaint|complaints\b/i, slugs: ["complaints-resolution-policy"] },
  { pattern: /\bpopi|privacy|personal information\b/i, slugs: ["popi-act-statement"] },
  { pattern: /\bpaia|access to information\b/i, slugs: ["paia-manual"] },
];

function isAllFilesRequest(prompt: string) {
  return (
    /\b(all|every|list|available|any|which|what)\b/i.test(prompt) &&
    /\b(file|form|document|pdf|download|resource)s?\b/i.test(prompt)
  );
}

function isDocumentRequest(prompt: string) {
  return /\b(download|file|form|document|pdf|fact.?sheet|mdd|policy|manual|statement|certificate|application|tfsa|transfer|withdraw|debit order|switch)\b/i.test(prompt);
}

function isPrivateDocumentRequest(prompt: string) {
  return (
    /\btax certificate\b|\b(account|portfolio|investment|my)\s+(document|statement|certificate)\b|\bprivate\b.*\b(documents?|docs?)\b/i.test(prompt)
  );
}

function findRelevantFiles(prompt: string) {
  if (isAllFilesRequest(prompt)) return downloadableFiles;

  const slugs = new Set<string>();
  for (const alias of documentAliases) {
    if (alias.pattern.test(prompt)) {
      for (const slug of alias.slugs) slugs.add(slug);
    }
  }

  const terms = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !["the", "and", "for", "from", "can", "you", "get", "download", "file", "form", "document", "pdf"].includes(term));

  const scored = downloadableFiles.map((file) => {
    const document = documents.find((item) => item.name === file.label);
    const searchableText = `${file.label} ${document?.slug ?? ""} ${document?.category ?? ""}`.toLowerCase().replaceAll("-", " ");
    const score = terms.reduce((total, term) => total + (searchableText.includes(term) ? 1 : 0), 0);
    return { file, score, slug: document?.slug };
  });

  const matched = scored.filter(({ score, slug }) => score > 0 || (slug && slugs.has(slug)));
  const seen = new Set<string>();
  return matched
    .sort((left, right) => right.score - left.score)
    .filter(({ file }) => {
      if (seen.has(file.href)) return false;
      seen.add(file.href);
      return true;
    })
    .map(({ file }) => file);
}

function linksForPrompt(prompt: string): ChatLink[] {
  if (isPrivateDocumentRequest(prompt)) return [portalLink];

  const links: ChatLink[] = [];

  const files = findRelevantFiles(prompt);
  if (files.length) links.push(...files);
  else if (isDocumentRequest(prompt)) links.push(resourcePageLink);

  if (/\b(performance|return|benchmark|portfolio|fund)\b/i.test(prompt)) {
    links.push({ label: "View portfolio performance", href: "/portfolios" });
  }
  if (/\b(onboard|application|open an account|risk profile)\b/i.test(prompt)) {
    links.push({ label: "Open the preliminary onboarding questionnaire", href: "/onboarding" });
  }
  if (/\binsight|article|investment belief\b/i.test(prompt)) {
    links.push({ label: "Browse insights", href: "/insights" });
  }

  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function claimsBroadDataAccess(answer: string) {
  return /\b(?:i|we)\s+(?:(?:have|claim|possess)\s+(?:(?:full|complete|unrestricted)\s+)?access\s+to|can\s+access)\s+(?:all\b|everything\b|the entirety of\b|the full\b)/i.test(answer);
}

export async function POST(request: Request) {
  const rateLimit = await enforcePublicRateLimit(request, "chat");
  if (!rateLimit.ok) return rateLimit.response;

  const parsedBody = await readJsonBody(request, 16 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json(
      {
        error:
          parsedBody.reason === "too_large"
            ? "Request body exceeds the allowed size."
            : "Request body must be valid JSON.",
      },
      { status: parsedBody.reason === "too_large" ? 413 : 400 },
    );
  }
  const body = parsedBody.value;

  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof body.message !== "string" ||
    body.message.trim().length === 0 ||
    body.message.length > 1000
  ) {
    return NextResponse.json(
      { error: "Provide a message between 1 and 1000 characters." },
      { status: 400 },
    );
  }

  const prompt = body.message.trim();
  let history: ChatHistoryMessage[] = [];
  if ("history" in body) {
    if (!Array.isArray(body.history) || body.history.length > 4) {
      return NextResponse.json(
        { error: "Conveplaceholdertion history must contain up to 4 valid messages." },
        { status: 400 },
      );
    }
    history = body.history.filter(isChatHistoryMessage);
    if (history.length !== body.history.length) {
      return NextResponse.json(
        { error: "Conveplaceholdertion history must contain up to 4 valid messages." },
        { status: 400 },
      );
    }
  }

  const fallback = answerLocally(prompt, history);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ...fallback,
      disclaimer: performanceDisclosures.factualInformation,
    });
  }

  const downloadableKnowledge = downloadableFiles.map(({ label, href }) => ({ label, href }));
  const siteKnowledge = {
    company: {
      name: company.legalName,
      tagline: company.tagline,
      regulatoryNotice: company.regulatoryNotice,
    },
    contactDetails: {
      phone: company.phone,
      email: company.email,
      address: company.address,
      responseTime: company.responseTime,
    },
    strategies,
    beliefs,
    leadership,
    faqs,
    returnSummary,
    articles,
    downloadableFiles: downloadableKnowledge,
    fundFacts,
    portalDescription: {
      sections: ["Overview", "Holdings & Simulator", "Document Vault", "Requests & Adviser"],
      signIn: "Sign in from the client portal dashboard.",
      requests: ["Lump Sum Top-Up", "Strategy Switch", "Withdrawal", "Debit Order Update", "Portfolio Review", "Personal Data Deletion"],
      figures: "When no account records are linked, the portal shows empty states; illustrative demonstration content is available only to configured demo accounts.",
      feeTable: "The portal fee table is a sample only and is not an actual client fee schedule.",
    },
    pages: [
      { name: "About", href: "/about" },
      { name: "Portfolios and published performance", href: "/portfolios" },
      { name: "Insights", href: "/insights" },
      { name: "Public resources and downloads", href: "/resources" },
      { name: "Preliminary onboarding questionnaire", href: "/onboarding" },
      { name: "Secure client portal", href: "/portal" },
    ],
  };
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are ${company.legalName}'s website information and document assistant. Answer clearly and helpfully using only the supplied website knowledge, while using recent conveplaceholdertion messages to understand follow-up questions. Prior assistant messages are conveplaceholdertion context, not a source of facts; correct any prior unsupported claim using only website knowledge. Answer the user's actual question, including when a message starts with small talk. You can explain the site's published information, navigate users to relevant pages, and identify downloadable files. Do not say or imply that you have access to all data, all company information, internal systems, or private client records; your knowledge is limited to the supplied published website information. Never say or imply that a live agent, helpline, customer-service representative, or human handoff is available; this is a self-service assistant. For private/account-specific files, direct users to sign in at /portal/dashboard. For public files, use their exact relative href from downloadableFiles; the interface will attach matching clickable downloads to your answer. Do not invent documents, file URLs, fees, minimums, or performance data. For fund facts, fees, minimums, allocations, holdings, identifiers, and management-company details, answer only from fundFacts; say "not published" only for the specific requested field that is empty, and include its supplied as-at date and source. Do not give personalized financial advice or investment recommendations. The onboarding questionnaire is preliminary and does not complete KYC/AML or submit an application. If a fact is not available, say so and offer relevant internal website pages rather than a human contact. Website knowledge: ${JSON.stringify(siteKnowledge)}`,
          },
          ...history,
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    return NextResponse.json(
      { error: "The AI service is temporarily unavailable. Please try again later." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "The AI service is temporarily unavailable. Please try again later." },
      { status: 502 },
    );
  }

  let result: { choices?: { message?: { content?: string | null } }[] };
  try {
    result = (await response.json()) as typeof result;
  } catch {
    return NextResponse.json(
      { error: "The AI service returned an invalid response. Please try again." },
      { status: 502 },
    );
  }
  const answer = result.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    return NextResponse.json(
      { error: "The AI service returned an empty response. Please try again." },
      { status: 502 },
    );
  }

  const useFallback = claimsBroadDataAccess(answer);
  return NextResponse.json({
    answer: useFallback ? fallback.answer : answer,
    links: useFallback ? fallback.links : linksForPrompt(prompt),
    disclaimer: performanceDisclosures.factualInformation,
  });
}
