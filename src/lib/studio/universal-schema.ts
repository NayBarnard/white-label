export type StudioAlignment = "left" | "center" | "right";
export type StudioLayout = "stack" | "columns" | "split" | "grid";

export type StudioSection = {
  id: string;
  type: "hero" | "about" | "services" | "stats" | "cta" | "faq" | "team" | "testimonials" | "disclaimer";
  title: string;
  body: string;
  eyebrow: string;
  image: string;
  hidden: boolean;
  layout: StudioLayout;
  alignment: StudioAlignment;
  background: string;
  textColor: string;
  accent: string;
  padding: number;
  radius: number;
  height: number;
  mobilePadding: number;
  mobileLayout: StudioLayout;
};

export type StudioAsset = {
  id: string;
  blobKey?: string;
  name: string;
  type: "image" | "document";
  dataUrl: string;
  size: number;
  createdAt: string;
};

export type StudioPage = {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  sections: StudioSection[];
};

export type StudioTokens = {
  name: string;
  mode: "light" | "dark" | "auto";
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  font: "Georgia" | "Inter" | "Arial";
  radius: number;
  shadow: "subtle" | "medium" | "strong";
};

export type StudioProject = {
  schemaVersion: 1;
  id: string;
  organization: string;
  tradingName: string;
  logo: string;
  contact: { phone: string; email: string; address: string };
  navigation: { label: string; href: string }[];
  tokens: StudioTokens;
  pages: StudioPage[];
  activePageId: string;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
  header: { visible: boolean; style: "standard" | "floating" | "minimal"; transparent: boolean };
  footer: { visible: boolean; text: string; disclosure: string };
  assets: StudioAsset[];
};

export type StudioVersion = {
  id: string;
  savedAt: string;
  label: string;
  project: StudioProject;
};

export const themes: { id: string; name: string; tokens: StudioTokens }[] = [
  { id: "private", name: "Private Wealth", tokens: { name: "Private Wealth", mode: "light", primary: "#d4af37", accent: "#805c0a", background: "#f8f9fc", foreground: "#0a1124", muted: "#475569", font: "Georgia", radius: 18, shadow: "medium" } },
  { id: "institutional", name: "Institutional Investment", tokens: { name: "Institutional Investment", mode: "light", primary: "#1d4ed8", accent: "#1e3a8a", background: "#f8fafc", foreground: "#172033", muted: "#64748b", font: "Arial", radius: 10, shadow: "subtle" } },
  { id: "fintech", name: "Modern Fintech", tokens: { name: "Modern Fintech", mode: "light", primary: "#14b8a6", accent: "#0f766e", background: "#f7fffe", foreground: "#102a2a", muted: "#52706f", font: "Inter", radius: 22, shadow: "medium" } },
  { id: "luxury", name: "Luxury Financial Advisory", tokens: { name: "Luxury Financial Advisory", mode: "dark", primary: "#b99a5b", accent: "#d7c08a", background: "#111827", foreground: "#f8fafc", muted: "#cbd5e1", font: "Georgia", radius: 12, shadow: "strong" } },
  { id: "corporate", name: "Minimal Corporate", tokens: { name: "Minimal Corporate", mode: "light", primary: "#334155", accent: "#0f172a", background: "#ffffff", foreground: "#0f172a", muted: "#64748b", font: "Arial", radius: 6, shadow: "subtle" } },
  { id: "executive", name: "Dark Executive", tokens: { name: "Dark Executive", mode: "dark", primary: "#38bdf8", accent: "#bae6fd", background: "#090f1d", foreground: "#e2e8f0", muted: "#94a3b8", font: "Inter", radius: 14, shadow: "strong" } },
];

export function makeId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeSection(type: StudioSection["type"] = "hero"): StudioSection {
  const copy: Record<StudioSection["type"], [string, string, string]> = {
    hero: ["WEALTH, CONSIDERED", "A clearer path to lasting financial confidence.", "Personalised guidance, disciplined investing and a long-term partnership."],
    about: ["OUR APPROACH", "Built around your life.", "We combine independent thinking with a rigorous understanding of your circumstances."],
    services: ["SERVICES", "Advice for every stage.", "Planning, portfolio management and governance designed around measurable outcomes."],
    stats: ["AT A GLANCE", "Your wealth, in perspective.", "Add approved figures and reporting dates here."],
    cta: ["START A CONVERSATION", "Plan your next chapter.", "Speak with our team about your objectives."],
    faq: ["COMMON QUESTIONS", "Clear answers, without jargon.", "Add approved answers to the questions clients ask most."],
    team: ["OUR TEAM", "Experienced people, accessible advice.", "Introduce your advisers and areas of expertise."],
    testimonials: ["CLIENT STORIES", "Partnership over the long term.", "Add consented, approved client feedback."],
    disclaimer: ["IMPORTANT INFORMATION", "Illustrative information.", "This is a demonstration and does not constitute financial advice or a guarantee of outcomes."],
  };
  const [eyebrow, title, body] = copy[type];
  return {
    id: makeId("section"), type, eyebrow, title, body,
    image: "", hidden: false, layout: type === "services" || type === "stats" ? "grid" : type === "hero" ? "split" : "stack",
    alignment: "left", background: "", textColor: "", accent: "", padding: 72, radius: 18,
    height: type === "hero" ? 420 : 220, mobilePadding: 24, mobileLayout: "stack",
  };
}

export function makeProject(): StudioProject {
  const home: StudioPage = {
    id: "home", name: "Home", slug: "/", title: "WEALTH OS | Considered wealth management",
    description: "A premium, configurable financial business website.",
    sections: [makeSection("hero"), makeSection("stats"), makeSection("services"), makeSection("cta"), makeSection("disclaimer")],
  };
  return {
    schemaVersion: 1, id: "default", organization: "WEALTH OS",
    tradingName: "WEALTH OS", logo: "",
    contact: { phone: "+27 10 000 0000", email: "hello@example.test", address: "Demonstration address" },
    navigation: [{ label: "Home", href: "/" }, { label: "About", href: "/about" }, { label: "Services", href: "/services" }, { label: "Insights", href: "/insights" }, { label: "Contact", href: "/contact" }],
    tokens: themes[0].tokens,
    pages: [home, { id: "about", name: "About", slug: "/about", title: "About | WEALTH OS", description: "About our wealth management approach.", sections: [makeSection("about"), makeSection("team")] }],
    activePageId: "home", published: false, publishedAt: null, updatedAt: new Date().toISOString(),
    header: { visible: true, style: "standard", transparent: false },
    footer: { visible: true, text: "WEALTH OS", disclosure: "Illustrative local demonstration. No financial advice or guarantee is provided." },
    assets: [],
  };
}

export function validateProject(value: unknown): StudioProject {
  if (!value || typeof value !== "object") throw new Error("The configuration is not an object.");
  const candidate = value as Partial<StudioProject>;
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.pages) || !candidate.tokens || !Array.isArray(candidate.navigation)) {
    throw new Error("Unsupported or incomplete WEALTH OS configuration.");
  }
  if (candidate.pages.length > 100) throw new Error("The project exceeds the 100-page limit.");
  if (JSON.stringify(candidate).length > 70 * 1024 * 1024) throw new Error("The project exceeds the 70 MB import limit.");
  const normalized = JSON.parse(JSON.stringify(candidate)) as StudioProject;
  normalized.id = String(normalized.id ?? "default").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100) || "default";
  normalized.organization = String(normalized.organization ?? "WEALTH OS").slice(0, 160);
  normalized.tradingName = String(normalized.tradingName ?? "WEALTH OS").slice(0, 160);
  normalized.logo = String(normalized.logo ?? "").slice(0, 500000);
  normalized.pages = normalized.pages.map((page) => ({
    ...page,
    name: String(page.name ?? "Untitled").slice(0, 120),
    slug: String(page.slug ?? "/").replace(/[^a-zA-Z0-9/_-]/g, "-").slice(0, 160),
    title: String(page.title ?? "").slice(0, 180),
    description: String(page.description ?? "").slice(0, 320),
    sections: (Array.isArray(page.sections) ? page.sections : []).slice(0, 200).map((section) => ({
      ...makeSection(section.type),
      ...section,
      title: String(section.title ?? "").slice(0, 500),
      body: String(section.body ?? "").slice(0, 3000),
      eyebrow: String(section.eyebrow ?? "").slice(0, 200),
      image: String(section.image ?? "").slice(0, 500000),
      height: Math.min(1200, Math.max(120, Number(section.height) || 220)),
      mobilePadding: Math.min(160, Math.max(8, Number(section.mobilePadding) || 24)),
      mobileLayout: ["stack", "columns", "split", "grid"].includes(section.mobileLayout) ? section.mobileLayout : "stack",
    })),
  }));
  normalized.navigation = normalized.navigation.slice(0, 30).map((item) => ({
    label: String(item.label ?? "").slice(0, 80),
    href: String(item.href ?? "/").replace(/[\r\n]/g, "").slice(0, 240),
  }));
  if (Array.isArray(normalized.assets) && normalized.assets.length > 100) throw new Error("The project exceeds the 100-file media limit.");
  const assetIds = new Set<string>();
  normalized.assets = Array.isArray(normalized.assets) ? normalized.assets.map((value) => {
    if (!value || typeof value !== "object") throw new Error("The project contains an invalid media record.");
    const asset = value as Partial<StudioAsset>;
    const id = String(asset.id ?? "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100);
    const dataUrl = String(asset.dataUrl ?? "");
    if (!id || assetIds.has(id) || dataUrl.length > 68 * 1024 * 1024) throw new Error("A media record is invalid, duplicated or too large.");
    assetIds.add(id);
    if (asset.type !== "image" && asset.type !== "document") throw new Error("A media record has an unsupported type.");
    return {
      id,
      ...(asset.blobKey ? { blobKey: String(asset.blobKey).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120) } : {}),
      name: String(asset.name ?? "asset").replace(/[^\w.-]/g, "-").slice(0, 120),
      type: asset.type,
      dataUrl,
      size: Math.max(0, Math.min(50 * 1024 * 1024, Number(asset.size) || 0)),
      createdAt: String(asset.createdAt ?? new Date().toISOString()).slice(0, 50),
    };
  }) : [];
  normalized.header = normalized.header ?? { visible: true, style: "standard", transparent: false };
  normalized.footer = normalized.footer ?? { visible: true, text: normalized.tradingName, disclosure: "Illustrative local demonstration." };
  return normalized;
}
