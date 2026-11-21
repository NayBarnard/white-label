import { makeId, makeProject, makeSection, themes, validateProject, type StudioProject } from "@/lib/studio/universal-schema";

export type WebsiteTemplate = {
  id: string;
  name: string;
  description: string;
  project: StudioProject;
  builtIn?: boolean;
};

const templateStorageKey = "wealth-os.studio.templates.v1";

function section(type: Parameters<typeof makeSection>[0], eyebrow: string, title: string, body: string) {
  return { ...makeSection(type), eyebrow, title, body };
}

function createTemplate(id: string, name: string, description: string, themeId: string, pageData: { name: string; slug: string; title: string; description: string; sections: ReturnType<typeof section>[] }[]) {
  const project = makeProject();
  const theme = themes.find((item) => item.id === themeId);
  if (!theme) throw new Error(`Unknown website template theme: ${themeId}`);
  project.id = `template-${id}`;
  project.organization = "Your Business";
  project.tradingName = "Your Business";
  project.tokens = theme.tokens;
  project.header.style = theme.tokens.mode === "dark" ? "floating" : "standard";
  project.pages = pageData.map((page, index) => ({
    id: `template-page-${id}-${index + 1}`,
    name: page.name,
    slug: page.slug,
    title: page.title,
    description: page.description,
    sections: page.sections,
  }));
  project.activePageId = project.pages[0].id;
  project.navigation = project.pages.map((page) => ({ label: page.name, href: page.slug }));
  project.footer.text = "Your Business";
  project.footer.disclosure = "Add your approved regulatory and financial disclosures before publishing.";
  project.logo = "";
  project.assets = [];
  return { id, name, description, project, builtIn: true } satisfies WebsiteTemplate;
}

export function createBuiltInWebsiteTemplates(): WebsiteTemplate[] {
  return [
    createTemplate("private-office", "Private Office", "A considered, editorial site for private wealth and family office practices.", "luxury", [
      { name: "Home", slug: "/", title: "Private Office | Your Business", description: "A thoughtful approach to private wealth.", sections: [
        section("hero", "PRIVATE WEALTH", "A considered approach to your financial future.", "Independent perspective and a trusted long-term partnership, shaped around your priorities."),
        section("about", "OUR PHILOSOPHY", "Advice built around your life.", "Begin with your goals, values and circumstances. Our team helps bring clarity to complex financial decisions."),
        section("services", "OUR CAPABILITIES", "A coordinated view of wealth.", "Explore planning, investment oversight and family wealth services."),
        section("cta", "START A CONVERSATION", "Let’s discuss what matters to you.", "Speak with our team about your priorities."),
        section("disclaimer", "IMPORTANT INFORMATION", "Information for consideration.", "This website is for general information only and does not constitute personal financial advice."),
      ] },
      { name: "Our approach", slug: "/approach", title: "Our approach | Your Business", description: "Learn about our private wealth approach.", sections: [
        section("about", "OUR APPROACH", "A partnership grounded in understanding.", "We listen first, then help you make informed decisions with a clear view of trade-offs and risks."),
        section("team", "YOUR ADVISERS", "Experienced people, accessible advice.", "Introduce your team, qualifications and areas of expertise."),
      ] },
    ]),
    createTemplate("modern-advisory", "Modern Advisory", "A bright, approachable digital presence for independent financial advisers.", "fintech", [
      { name: "Home", slug: "/", title: "Modern Advisory | Your Business", description: "Financial guidance for life's next steps.", sections: [
        section("hero", "FINANCIAL CLARITY", "Make your next move with confidence.", "Personal advice and practical planning for the decisions that matter to you."),
        section("services", "HOW WE HELP", "Support for every chapter.", "Explore financial planning, retirement guidance and investment reviews."),
        section("stats", "A CLEARER PICTURE", "Understand your financial priorities.", "Use verified business credentials and approved information here; do not imply guaranteed results."),
        section("testimonials", "CLIENT EXPERIENCES", "Trusted through changing times.", "Add client feedback only where you have permission and appropriate approval."),
        section("cta", "LET’S TALK", "A first conversation starts with listening.", "Share what you are planning and we will explain how we may be able to help."),
        section("disclaimer", "IMPORTANT INFORMATION", "General information only.", "This website does not constitute financial advice or a recommendation to invest."),
      ] },
    ]),
    createTemplate("institutional", "Institutional", "A structured, information-led site for investment and advice businesses.", "institutional", [
      { name: "Home", slug: "/", title: "Institutional | Your Business", description: "Disciplined advice and investment oversight.", sections: [
        section("hero", "INDEPENDENT PERSPECTIVE", "Clarity, discipline and accountability.", "A structured approach to financial planning and investment decision-making."),
        section("about", "OUR BUSINESS", "A clear mandate. A considered process.", "Describe your firm, governance and the clients you serve."),
        section("services", "SERVICES", "Designed around your requirements.", "Set out service scope, responsibilities and the relevant client journey."),
        section("faq", "COMMON QUESTIONS", "Straightforward answers.", "Add approved responses about your process, fees and disclosures."),
        section("disclaimer", "IMPORTANT INFORMATION", "Risk and regulatory information.", "Investments can fall as well as rise. Past performance is not a reliable indicator of future results."),
      ] },
    ]),
  ];
}

export function applyWebsiteTemplate(current: StudioProject, template: WebsiteTemplate): StudioProject {
  const pages = template.project.pages.map((page) => {
    const id = makeId("page");
    return {
      ...page,
      id,
      title: page.title.replaceAll("Your Business", current.tradingName),
      sections: page.sections.map((item) => ({ ...item, id: makeId("section"), image: "" })),
    };
  });
  return {
    ...current,
    tokens: { ...template.project.tokens },
    pages,
    activePageId: pages[0]?.id ?? current.activePageId,
    navigation: template.project.navigation.map((item) => ({ ...item })),
    header: { ...template.project.header },
    footer: { ...template.project.footer, text: current.tradingName },
    published: false,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function makeCustomTemplate(project: StudioProject, name: string, description: string): WebsiteTemplate {
  const snapshot = JSON.parse(JSON.stringify(project)) as StudioProject;
  snapshot.id = `template-${makeId("custom")}`;
  snapshot.logo = "";
  snapshot.assets = [];
  snapshot.pages = snapshot.pages.map((page) => ({
    ...page,
    sections: page.sections.map((item) => ({ ...item, image: "" })),
  }));
  return { id: snapshot.id, name: name.slice(0, 100), description: description.slice(0, 240), project: snapshot };
}

export function validateWebsiteTemplate(value: unknown): WebsiteTemplate {
  if (!value || typeof value !== "object") throw new Error("The template file is invalid.");
  const candidate = value as Partial<WebsiteTemplate>;
  if (typeof candidate.name !== "string" || typeof candidate.description !== "string" || !candidate.project) {
    throw new Error("The template file is incomplete.");
  }
  return {
    id: String(candidate.id ?? makeId("template")).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120),
    name: candidate.name.slice(0, 100),
    description: candidate.description.slice(0, 240),
    project: validateProject(candidate.project),
  };
}

export function readCustomTemplates() {
  const raw = localStorage.getItem(templateStorageKey);
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Saved template data is corrupted. Exported templates can be re-imported.");
  }
  if (!Array.isArray(value)) throw new Error("Saved template data has an invalid format.");
  return value.map(validateWebsiteTemplate);
}

export function saveCustomTemplates(templates: WebsiteTemplate[]) {
  localStorage.setItem(templateStorageKey, JSON.stringify(templates));
}
