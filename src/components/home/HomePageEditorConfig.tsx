import type { Config, Data } from "@puckeditor/core";
import {
  ArrowRight,
  Coins,
  GitCompareArrows,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { AnimatedLogo } from "@/components/AnimatedLogo";

type PillarIcon = "diversified" | "cost" | "relationships";

type HomePageComponents = {
  Hero: {
    eyebrow: string;
    title: string;
    emphasis: string;
    intro: string;
    motto: string;
    callLabel: string;
    exploreLabel: string;
    phone: string;
    email: string;
    highlights: { value: string; label: string }[];
  };
  Performance: {
    eyebrow: string;
    title: string;
    period: string;
    source: string;
    items: { name: string; label: string }[];
  };
  Pillars: {
    eyebrow: string;
    title: string;
    items: { icon: PillarIcon; title: string; body: string }[];
  };
  Strategies: {
    eyebrow: string;
    title: string;
    linkLabel: string;
    items: { profile: string; title: string; benchmark: string; returnValue: string }[];
  };
  Contact: {
    insightEyebrow: string;
    insightTitle: string;
    insightLink: string;
    contactEyebrow: string;
    contactTitle: string;
    phone: string;
    email: string;
  };
};

const pillarIcons = {
  diversified: GitCompareArrows,
  cost: Coins,
  relationships: Users,
} satisfies Record<PillarIcon, typeof GitCompareArrows>;

const heroDefaults: HomePageComponents["Hero"] = {
  eyebrow: "YOUR INDUSTRY OR COMPANY TYPE",
  title: "Your company name",
  emphasis: "Your brand promise",
  intro: "Add a short introduction to your organisation and what it offers.",
  motto: "Add a mission statement or a short message for your visitors.",
  callLabel: "Add a primary action",
  exploreLabel: "Explore your services",
  phone: "",
  email: "",
  highlights: [
    { value: "00", label: "Add a verified metric" },
    { value: "00", label: "Add a verified metric" },
    { value: "00", label: "Add a verified metric" },
  ],
};

const placeholderPerformanceRows = [
  { name: "Example item one", label: "Add verified figure" },
  { name: "Example item two", label: "Add verified figure" },
  { name: "Example item three", label: "Add verified figure" },
  { name: "Example item four", label: "Add verified figure" },
];

const placeholderStrategies = [
  {
    profile: "Add a short descriptor",
    title: "Example offering one",
    benchmark: "Add verified details",
    returnValue: "Add verified figure",
  },
  {
    profile: "Add a short descriptor",
    title: "Example offering two",
    benchmark: "Add verified details",
    returnValue: "Add verified figure",
  },
];

const performanceDefaults: HomePageComponents["Performance"] = {
  eyebrow: "YOUR RESULTS",
  title: "Add a results section title",
  period: "Add a verified date range",
  source: "Add an approved source or remove this section",
  items: placeholderPerformanceRows,
};

const pillarDefaults: HomePageComponents["Pillars"] = {
  eyebrow: "YOUR APPROACH",
  title: "Add a title for your key benefits",
  items: [
    {
      icon: "diversified",
      title: "Example benefit one",
      body: "Describe a benefit of your service or organisation.",
    },
    {
      icon: "cost",
      title: "Example benefit two",
      body: "Describe a benefit of your service or organisation.",
    },
    {
      icon: "relationships",
      title: "Example benefit three",
      body: "Describe a benefit of your service or organisation.",
    },
  ],
};

const strategyDefaults: HomePageComponents["Strategies"] = {
  eyebrow: "YOUR OFFERINGS",
  title: "Add a title for your offerings",
  linkLabel: "Explore offerings",
  items: placeholderStrategies,
};

const contactDefaults: HomePageComponents["Contact"] = {
  insightEyebrow: "NEWS AND UPDATES",
  insightTitle: "Add a featured update",
  insightLink: "Read more",
  contactEyebrow: "CONTACT",
  contactTitle: "Tell visitors how to reach you",
  phone: "",
  email: "",
};

const homePageConfig: Config<HomePageComponents> = {
  categories: {
    sections: {
      title: "PLACEHOLDER BRAND homepage sections",
      components: ["Hero", "Performance", "Pillars", "Strategies", "Contact"],
    },
  },
  components: {
    Hero: {
      label: "Hero",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        emphasis: { type: "text" },
        intro: { type: "textarea" },
        motto: { type: "textarea" },
        callLabel: { type: "text" },
        exploreLabel: { type: "text" },
        phone: { type: "text" },
        email: { type: "text" },
        highlights: {
          type: "array",
          arrayFields: {
            value: { type: "text" },
            label: { type: "text" },
          },
          defaultItemProps: { value: "01", label: "Highlight" },
          getItemSummary: (item) => item.label || "Highlight",
          max: 3,
          min: 3,
        },
      },
      defaultProps: heroDefaults,
      render: ({
        eyebrow,
        title,
        emphasis,
        intro,
        motto,
        callLabel,
        exploreLabel,
        phone,
        email,
        highlights,
      }) => (
        <section className="relative isolate overflow-hidden border-b border-[var(--border)]/70">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_77%_35%,rgba(18,52,91,0.08),transparent_48%),radial-gradient(ellipse_at_88%_70%,rgba(197,168,128,0.12),transparent_36%),radial-gradient(ellipse_at_12%_82%,rgba(48,67,101,0.035),transparent_44%)]" />
          <div className="pointer-events-none absolute -right-36 top-12 size-[34rem] rounded-full border border-[#C5A880]/15" />
          <div className="pointer-events-none absolute -right-20 top-28 size-[25rem] rounded-full border border-[#C5A880]/20" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 sm:py-20 lg:min-h-[590px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 lg:px-8 lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-[var(--accent)] backdrop-blur sm:text-[11px]">
                <span className="size-1.5 rounded-full bg-[var(--accent-fill)]" />
                {eyebrow}
              </p>
              <h1 className="mt-7 max-w-3xl text-[2.8rem] font-semibold leading-[1.04] tracking-[-0.055em] text-[var(--foreground)] sm:text-6xl lg:text-[4.65rem]">
                {title}
                <span className="mt-1 block font-serif font-normal italic tracking-[-0.045em] text-[var(--accent)]">
                  {emphasis}
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                {intro}
              </p>
              <blockquote className="mt-6 max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-7 text-[var(--foreground)] backdrop-blur-md sm:text-base">
                <span className="block border-l-2 border-l-[#C5A880] pl-4">{motto}</span>
              </blockquote>
              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href={phone ? `tel:${phone.replaceAll(" ", "")}` : "#contact"}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-6 text-xs font-bold tracking-[0.08em] text-[var(--button-text)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                >
                  <Phone size={15} /> {callLabel}
                </a>
                <Link
                  href="#funds"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-6 text-xs font-bold tracking-[0.08em] text-[var(--foreground)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]"
                >
                  {exploreLabel} <ArrowRight size={16} />
                </Link>
              </div>
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
                >
                  <Mail size={14} /> Email: {email}
                </a>
              )}
              <div className="mt-11 flex flex-wrap gap-x-8 gap-y-4 border-t border-[var(--border)] pt-5">
                {highlights.map((item, index) => (
                  <div key={`${item.label}-${index}`}>
                    <p className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{item.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium tracking-wide text-[var(--muted)]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex min-h-64 items-center justify-center lg:min-h-[430px] lg:justify-end">
              <div className="pointer-events-none absolute right-[8%] top-1/2 aspect-square w-[min(82%,390px)] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_36%_34%,rgba(197,168,128,0.14),rgba(18,52,91,0.06)_42%,transparent_73%)]" />
              <AnimatedLogo prominent />
            </div>
          </div>
        </section>
      ),
    },
    Performance: {
      label: "Performance summary",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        period: { type: "text" },
        source: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            label: { type: "text" },
          },
          defaultItemProps: { name: "Example item", label: "Add verified figure" },
          getItemSummary: (item) => item.name || "Example item",
          max: 8,
          min: 1,
        },
      },
      defaultProps: performanceDefaults,
      render: ({ eyebrow, title, period, source, items }) => (
        <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            </div>
            <p className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)]">
              {period}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((row, index) => (
              <article
                key={`${row.name}-${index}`}
                className="placeholder-glass-card group relative h-full overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(2,6,23,0.24)] sm:p-6"
              >
                <div className="pointer-events-none absolute -right-8 -top-14 size-36 rounded-full bg-[radial-gradient(circle,rgba(197,168,128,0.12),transparent_70%)]" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{row.name}</p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">{row.label}</p>
                  </div>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[9px] font-semibold tracking-wide text-[var(--muted)]">
                    {index < 2 ? "EXAMPLE ITEM" : "EXAMPLE"}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
            Source: {source}. Past performance is not necessarily a guide to future performance.
          </p>
        </section>
      ),
    },
    Pillars: {
      label: "Core pillars",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            icon: {
              type: "select",
              options: [
                { label: "Diversification", value: "diversified" },
                { label: "Cost-conscious", value: "cost" },
                { label: "Relationships", value: "relationships" },
              ],
            },
            title: { type: "text" },
            body: { type: "textarea" },
          },
          defaultItemProps: {
            icon: "diversified",
            title: "A core pillar",
            body: "Describe this investment principle.",
          },
          getItemSummary: (item) => item.title || "Pillar",
          max: 3,
          min: 3,
        },
      },
      defaultProps: pillarDefaults,
      render: ({ eyebrow, title, items }) => (
        <section className="mx-auto w-full max-w-7xl px-5 py-20 lg:px-8">
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ icon, title: itemTitle, body }, index) => {
              const Icon = pillarIcons[icon];
              return (
                <article key={`${itemTitle}-${index}`} className="placeholder-glass-card h-full rounded-2xl p-6">
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-5 text-base font-semibold leading-6">{itemTitle}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{body}</p>
                </article>
              );
            })}
          </div>
        </section>
      ),
    },
    Strategies: {
      label: "Managed strategies",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        linkLabel: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            profile: { type: "text" },
            title: { type: "text" },
            benchmark: { type: "text" },
            returnValue: { type: "text" },
          },
          defaultItemProps: {
            profile: "Add a short descriptor",
            title: "Example offering",
            benchmark: "Add verified details",
            returnValue: "Add verified figure",
          },
          getItemSummary: (item) => item.title || "Example offering",
          max: 6,
          min: 1,
        },
      },
      defaultProps: strategyDefaults,
      render: ({ eyebrow, title, linkLabel, items }) => (
        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
              </div>
              <Link
                href="/portfolios"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold tracking-wide text-[var(--accent)] transition hover:translate-x-1 hover:border-[var(--accent)]"
              >
                {linkLabel} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {items.map((strategy, index) => (
                <article key={`${strategy.title}-${index}`} className="placeholder-glass-card relative h-full overflow-hidden rounded-2xl p-7">
                  <div className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(197,168,128,0.12),transparent_70%)]" />
                  <p className="relative inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-[var(--accent)]">
                    {strategy.profile}
                  </p>
                  <h3 className="relative mt-4 text-2xl font-semibold tracking-tight">{strategy.title}</h3>
                  <p className="relative mt-2 text-sm text-[var(--muted)]">Benchmark: {strategy.benchmark}</p>
                  <div className="relative mt-6 flex items-end justify-between gap-3 border-t border-[var(--border)]/80 pt-5">
                    <div>
                      <p className="text-xs text-[var(--muted)]">{index === 0 ? "Example value" : "Example detail"}</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-[var(--accent)]">
                        {strategy.returnValue}
                      </p>
                    </div>
                    <Link
                      href="/portfolios"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--foreground)] transition hover:translate-x-1 hover:text-[var(--accent)]"
                    >
                      Explore strategy <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ),
    },
    Contact: {
      label: "Insights and contact",
      fields: {
        insightEyebrow: { type: "text" },
        insightTitle: { type: "text" },
        insightLink: { type: "text" },
        contactEyebrow: { type: "text" },
        contactTitle: { type: "text" },
        phone: { type: "text" },
        email: { type: "text" },
      },
      defaultProps: contactDefaults,
      render: ({
        insightEyebrow,
        insightTitle,
        insightLink,
        contactEyebrow,
        contactTitle,
        phone,
        email,
      }) => (
        <section className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
          <div className="grid gap-4 border-t border-[var(--border)] pt-10 md:grid-cols-2">
            <Link
              href="/insights"
              className="placeholder-glass-card group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-[#C5A880]/55"
            >
              <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">{insightEyebrow}</p>
              <h2 className="mt-3 text-xl font-semibold">{insightTitle}</h2>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition group-hover:text-[var(--accent)]">
                {insightLink} <ArrowRight size={16} />
              </span>
            </Link>
            <section className="placeholder-glass-card rounded-2xl p-6">
              <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">{contactEyebrow}</p>
              <h2 className="mt-3 text-xl font-semibold">{contactTitle}</h2>
              <div id="contact" className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {phone
                  ? <a href={`tel:${phone.replaceAll(" ", "")}`} className="inline-flex items-center gap-2 font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"><Phone size={15} /> {phone}</a>
                  : <span className="text-[var(--muted)]">Add a phone number</span>}
                {email
                  ? <a href={`mailto:${email}`} className="inline-flex items-center gap-2 font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"><Mail size={15} /> {email}</a>
                  : <span className="text-[var(--muted)]">Add an email address</span>}
              </div>
            </section>
          </div>
        </section>
      ),
    },
  },
};

const defaultHomePageData: Data<HomePageComponents> = {
  content: [
    { type: "Hero", props: { id: "home-hero", ...heroDefaults } },
    { type: "Performance", props: { id: "home-performance", ...performanceDefaults } },
    { type: "Pillars", props: { id: "home-pillars", ...pillarDefaults } },
    { type: "Strategies", props: { id: "home-strategies", ...strategyDefaults } },
    { type: "Contact", props: { id: "home-contact", ...contactDefaults } },
  ],
  root: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStringFields(value: unknown, fields: string[]) {
  return isRecord(value) && fields.every((field) => typeof value[field] === "string");
}

function isPillarIcon(value: unknown): value is PillarIcon {
  return value === "diversified" || value === "cost" || value === "relationships";
}

function isValidComponent(type: string, props: unknown) {
  if (!isRecord(props)) return false;
  switch (type) {
    case "Hero":
      return (
        hasStringFields(props, [
          "id", "eyebrow", "title", "emphasis", "intro", "motto", "callLabel",
          "exploreLabel", "phone", "email",
        ]) &&
        Array.isArray(props.highlights) &&
        props.highlights.length === 3 &&
        props.highlights.every((item) => hasStringFields(item, ["value", "label"]))
      );
    case "Performance":
      return (
        hasStringFields(props, ["id", "eyebrow", "title", "period", "source"]) &&
        Array.isArray(props.items) &&
        props.items.length >= 1 &&
        props.items.length <= 8 &&
        props.items.every((item) => hasStringFields(item, ["name", "label"]))
      );
    case "Pillars":
      return (
        hasStringFields(props, ["id", "eyebrow", "title"]) &&
        Array.isArray(props.items) &&
        props.items.length === 3 &&
        props.items.every(
          (item) =>
            isRecord(item) &&
            isPillarIcon(item.icon) &&
            hasStringFields(item, ["title", "body"]),
        )
      );
    case "Strategies":
      return (
        hasStringFields(props, ["id", "eyebrow", "title", "linkLabel"]) &&
        Array.isArray(props.items) &&
        props.items.length >= 1 &&
        props.items.length <= 6 &&
        props.items.every((item) =>
          hasStringFields(item, ["profile", "title", "benchmark", "returnValue"]),
        )
      );
    case "Contact":
      return hasStringFields(props, [
        "id", "insightEyebrow", "insightTitle", "insightLink", "contactEyebrow",
        "contactTitle", "phone", "email",
      ]);
    default:
      return false;
  }
}

function isHomePageData(value: unknown): value is Data<HomePageComponents> {
  return (
    isRecord(value) &&
    isRecord(value.root) &&
    Array.isArray(value.content) &&
    value.content.length > 0 &&
    value.content.length <= 50 &&
    value.content.every(
      (item) =>
        isRecord(item) &&
        typeof item.type === "string" &&
        isValidComponent(item.type, item.props),
    ) &&
    new Set(
      value.content.map((item) =>
        isRecord(item) && isRecord(item.props) ? item.props.id : null,
      ),
    ).size === value.content.length
  );
}

export { defaultHomePageData, homePageConfig, isHomePageData };
export type { HomePageComponents };
