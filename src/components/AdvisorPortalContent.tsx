"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, FileText, Search } from "lucide-react";
import {
  company,
  documents,
  fundFacts,
  performanceDisclosures,
  strategies,
} from "@/data/firmData";
import { PublishedResearchFeed } from "@/components/PublishedResearchFeed";
import {
  searchAdvisorFunds,
  searchAdvisorPlatformListings,
  type AdvisorFundSearchRecord,
  type AdvisorPlatformListing,
} from "@/lib/adviser/model";

const cardClass = "placeholder-glass-card rounded-2xl p-5 sm:p-6";
const quietClass = "text-sm leading-6 text-[var(--muted)]";

const publishedFunds: AdvisorFundSearchRecord[] = strategies.map((strategy) => ({
  id: strategy.id,
  name: strategy.name,
  strategy: strategy.title,
  jseCode: fundFacts[strategy.id].jseCode,
  isin: fundFacts[strategy.id].isin,
}));
const verifiedPlatformListings: AdvisorPlatformListing[] = [];

function SectionHeading({ id, title, description }: { id: string; title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-2xl font-semibold">{title}</h2>
      {description && <p className={`mt-2 ${quietClass}`}>{description}</p>}
    </div>
  );
}

function SearchField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3">
        <Search size={16} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
        <input
          className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}

export function AdvisorPortalContent() {
  const [fundQuery, setFundQuery] = useState("");
  const [platformQuery, setPlatformQuery] = useState("");
  const [documentQuery, setDocumentQuery] = useState("");
  const [documentCategory, setDocumentCategory] = useState("All");
  const [selectedFunds, setSelectedFunds] = useState<string[]>([]);
  const [recentFunds, setRecentFunds] = useState<string[]>([]);
  const [linkedClientCount, setLinkedClientCount] = useState<number | null>(null);
  const [linkedClientsError, setLinkedClientsError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadClients() {
      try {
        const response = await fetch("/api/advisor/clients", { cache: "no-store" });
        if (!response.ok) throw new Error("Client records could not be loaded.");
        const data = await response.json();
        if (!active) return;
        setLinkedClientCount(Array.isArray(data.clients) ? data.clients.length : 0);
      } catch (error) {
        console.error("Adviser client directory could not load.", error);
        if (active) {
          setLinkedClientCount(null);
          setLinkedClientsError("Authorised client records could not be loaded.");
        }
      }
    }
    void loadClients();
    return () => {
      active = false;
    };
  }, []);

  const matchingFunds = useMemo(
    () => searchAdvisorFunds(publishedFunds, fundQuery),
    [fundQuery],
  );
  const filteredDocuments = useMemo(() => documents.filter((document) => {
    const matchesQuery = `${document.name} ${document.category}`.toLocaleLowerCase().includes(documentQuery.trim().toLocaleLowerCase());
    const matchesCategory = documentCategory === "All" || document.category === documentCategory;
    return matchesQuery && matchesCategory;
  }), [documentCategory, documentQuery]);
  const documentCategories = useMemo(
    () => ["All", ...new Set(documents.map((document) => document.category))],
    [],
  );
  const publishedMddDates = strategies.flatMap((strategy) => {
    const date = fundFacts[strategy.id].mddDate;
    return date ? [{ strategy: strategy.name, date }] : [];
  });
  const recentlyAccessed = recentFunds
    .map((id) => publishedFunds.find((fund) => fund.id === id))
    .filter((fund): fund is AdvisorFundSearchRecord => Boolean(fund));
  const platformResults = searchAdvisorPlatformListings(verifiedPlatformListings, platformQuery);

  function recordRecentFund(fundId: string) {
    setRecentFunds((current) => {
      return [fundId, ...current.filter((id) => id !== fundId)].slice(0, 5);
    });
  }

  function toggleFund(id: string) {
    setSelectedFunds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-12 px-5 py-12 lg:px-8 lg:py-16">
      <header className="max-w-3xl">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">PROFESSIONAL EXPERIENCE</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Advisor Portal</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          Published PLACEHOLDER BRAND fund information and resources for financial advisors.
        </p>
      </header>

      <section id="dashboard" aria-labelledby="advisor-dashboard-heading" className="scroll-mt-24">
        <SectionHeading
          id="advisor-dashboard-heading"
          title="Advisor Dashboard"
          description="A quick view of published PLACEHOLDER BRAND resources and adviser access."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={cardClass}>
            <BriefcaseBusiness className="text-[var(--accent)]" size={20} aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Linked clients</h3>
            <p className={`mt-2 ${quietClass}`}>
              {linkedClientsError
                ? linkedClientsError
                : linkedClientCount === null
                  ? "Loading authorised client links…"
                  : linkedClientCount === 0
                    ? "No client relationships are currently authorised."
                    : `${linkedClientCount} authorised client ${linkedClientCount === 1 ? "relationship" : "relationships"}.`}
            </p>
          </div>
          <div className={cardClass}>
            <Search className="text-[var(--accent)]" size={20} aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Recently accessed funds</h3>
            {recentlyAccessed.length ? (
              <ul className={`mt-2 space-y-2 ${quietClass}`}>
                {recentlyAccessed.map((fund) => (
                  <li key={fund.id}>
                    <a className="font-semibold text-[var(--accent)] hover:underline" href={`/portfolios#${fund.id}`}>
                      {fund.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-2 ${quietClass}`}>Your fund history will appear here as you explore the Fund Centre.</p>
            )}
          </div>
          <div className={cardClass}>
            <FileText className="text-[var(--accent)]" size={20} aria-hidden="true" />
            <h3 className="mt-3 font-semibold">New MDD releases</h3>
            {publishedMddDates.length ? (
              <ul className={`mt-2 space-y-1 ${quietClass}`}>
                {publishedMddDates.map(({ strategy, date }) => <li key={strategy}>{strategy} · {date}</li>)}
              </ul>
            ) : (
              <p className={`mt-2 ${quietClass}`}>No MDD release dates are currently published.</p>
            )}
          </div>
          <div className={cardClass}>
            <BookOpen className="text-[var(--accent)]" size={20} aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Platform availability</h3>
            <p className={`mt-2 ${quietClass}`}>Verified platform availability updates are not currently published.</p>
          </div>
        </div>
        <p className={`mt-4 ${quietClass}`}>
          <Link className="font-semibold text-[var(--accent)] hover:underline" href="/insights">
            View PLACEHOLDER BRAND announcements and insights <ArrowRight className="inline" size={14} />
          </Link>
        </p>
      </section>

      <section id="fund-centre" aria-labelledby="fund-centre-heading" className="scroll-mt-24">
        <SectionHeading
          id="fund-centre-heading"
          title="Fund Centre"
          description="Search published PLACEHOLDER BRAND strategies by fund name, strategy, JSE code, or ISIN."
        />
        <SearchField
          label="Search funds"
          value={fundQuery}
          onChange={setFundQuery}
          placeholder="Fund name, JSE code, or ISIN"
        />
        {matchingFunds.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {matchingFunds.map((fund) => {
              const strategy = strategies.find(({ id }) => id === fund.id);
              if (!strategy) return null;
              const facts = fundFacts[strategy.id];
              const identifiers = [
                facts.isin && ["ISIN", facts.isin],
                facts.jseCode && ["JSE code", facts.jseCode],
                facts.asisaCategory && ["ASISA category", facts.asisaCategory],
              ].filter((item): item is [string, string] => Boolean(item));

              return (
                <article key={fund.id} className={cardClass}>
                  <p className="text-xs font-bold tracking-[0.14em] text-[var(--accent)]">{strategy.profile}</p>
                  <h3 className="mt-2 text-xl font-semibold">{strategy.title}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-[var(--muted)]">Benchmark</dt><dd className="mt-1 font-medium">{strategy.benchmark}</dd></div>
                    <div><dt className="text-[var(--muted)]">Performance as at</dt><dd className="mt-1 font-medium">{strategy.performanceDate}</dd></div>
                    {identifiers.map(([label, value]) => (
                      <div key={label}><dt className="text-[var(--muted)]">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>
                    ))}
                  </dl>
                  <button
                    type="button"
                    onClick={() => recordRecentFund(fund.id)}
                    className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline"
                  >
                    Record as recently accessed <ArrowRight size={14} />
                  </button>
                  <Link className="ml-4 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--accent)] hover:underline" href={`/portfolios#${strategy.id}`}>
                    Full fund details
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={`mt-5 ${quietClass}`}>No published PLACEHOLDER BRAND funds match that search.</p>
        )}
      </section>

      <section id="lisp-availability" aria-labelledby="lisp-heading" className="scroll-mt-24">
        <SectionHeading
          id="lisp-heading"
          title="LISP Availability"
          description="Search platform listings by fund, JSE code, ISIN, or platform."
        />
        <div className={cardClass}>
          <SearchField
            label="Search platform listings"
            value={platformQuery}
            onChange={setPlatformQuery}
            placeholder="Fund, identifier, or platform"
          />
          {platformResults.length ? (
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {platformResults.map((listing) => (
                <li key={`${listing.fundId}-${listing.platformName}`} className="py-3">
                  <p className="font-semibold">{listing.fundName} · {listing.platformName}</p>
                  <dl className={`mt-2 grid gap-2 sm:grid-cols-2 ${quietClass}`}>
                    {listing.platformFundCode && <div><dt>Platform code</dt><dd>{listing.platformFundCode}</dd></div>}
                    {listing.jseCode && <div><dt>JSE code</dt><dd>{listing.jseCode}</dd></div>}
                    {listing.isin && <div><dt>ISIN</dt><dd>{listing.isin}</dd></div>}
                    <div><dt>Availability</dt><dd>{listing.availability.replaceAll("_", " ")}</dd></div>
                    {listing.verifiedAt && <div><dt>Verified on</dt><dd>{listing.verifiedAt}</dd></div>}
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-4 ${quietClass}`}>
              No verified platform listings match. Platform-specific fund codes, availability status, and verification dates are not currently published.
            </p>
          )}
        </div>
      </section>

      <section id="document-centre" aria-labelledby="documents-heading" className="scroll-mt-24">
        <SectionHeading
          id="documents-heading"
          title="Document Centre"
          description="Search and filter public PLACEHOLDER BRAND documents. Client-specific documents are not included here."
        />
        <div className={`${cardClass} space-y-5`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchField label="Search documents" value={documentQuery} onChange={setDocumentQuery} placeholder="Document name" />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Category</span>
              <select
                className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                value={documentCategory}
                onChange={(event) => setDocumentCategory(event.target.value)}
              >
                {documentCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </div>
          {filteredDocuments.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {filteredDocuments.map((document) => {
                const href = "file" in document && document.file
                  ? document.file
                  : `/api/documents/${document.slug}`;
                const requestCopy = document.category === "Compliance & Regulatory";
                return (
                  <li key={document.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold">{document.name}</p>
                      <p className={quietClass}>{document.category} · {requestCopy ? "Request copy" : document.size}</p>
                    </div>
                    <a
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open document <ArrowRight size={14} />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={quietClass}>No public documents match the selected filters.</p>
          )}
          <p className={`border-t border-[var(--border)] pt-4 ${quietClass}`}>
            Historical MDD archives, approved adviser-only packs, and bulk downloads are not yet configured.
          </p>
        </div>
      </section>

      <section id="investment-tools" aria-labelledby="tools-heading" className="scroll-mt-24">
        <SectionHeading
          id="tools-heading"
          title="Investment Tools"
          description="Compare published strategy information. All figures remain subject to their stated dates and disclosures."
        />
        <div className={cardClass}>
          <h3 className="font-semibold">Select strategies to compare</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {strategies.map((strategy) => (
              <label key={strategy.id} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm">
                <input type="checkbox" checked={selectedFunds.includes(strategy.id)} onChange={() => toggleFund(strategy.id)} />
                {strategy.title}
              </label>
            ))}
          </div>
          {selectedFunds.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr><th className="py-3 pr-4">Published measure</th>{selectedFunds.map((id) => {
                    const strategy = strategies.find((item) => item.id === id);
                    return <th className="px-3 py-3" key={id}>{strategy?.name}</th>;
                  })}</tr>
                </thead>
                <tbody>
                  {[
                    ["Cumulative return · 1 year", (id: string) => strategies.find((item) => item.id === id)?.cumulative.oneYear],
                    ["Cumulative return · 3 years", (id: string) => strategies.find((item) => item.id === id)?.cumulative.threeYear],
                    ["Annualised return · 3 years", (id: string) => strategies.find((item) => item.id === id)?.annualised.threeYear],
                    ["Annualised return · 5 years", (id: string) => strategies.find((item) => item.id === id)?.annualised.fiveYear],
                  ].map(([label, getValue]) => (
                    <tr key={label as string} className="border-t border-[var(--border)]">
                      <th className="py-3 pr-4 font-medium">{label as string}</th>
                      {selectedFunds.map((id) => (
                        <td className="px-3 py-3 font-semibold" key={id}>
                          {(getValue as (id: string) => string | undefined)(id) ?? "Not published"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={`mt-3 ${quietClass}`}>Strategy performance is reported as at {strategies[0].performanceDate}.</p>
            </div>
          ) : (
            <p className={`mt-4 ${quietClass}`}>Select one or more strategies to compare published performance.</p>
          )}
          <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Fees and charges</h3>
              <p className={`mt-2 ${quietClass}`}>
                Fee comparisons will appear when approved, dated fee data is published.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Proposal generator</h3>
              <p className={`mt-2 ${quietClass}`}>
                Proposal generation requires an approved methodology and adviser-entered client information; it is not enabled.
              </p>
            </div>
            <p className={`md:col-span-2 ${quietClass}`}>
              {performanceDisclosures.pastPerformance} Asset-allocation and Regulation 28 information will appear when approved data is available.
            </p>
          </div>
        </div>
      </section>

      <section id="client-management" aria-labelledby="client-management-heading" className="scroll-mt-24">
        <SectionHeading id="client-management-heading" title="Client Management" />
        <div className={cardClass}>
          <p className="font-semibold">Client information is not shown to adviser accounts by default.</p>
          <p className={`mt-2 ${quietClass}`}>
            Adviser access requires client authorization, PLACEHOLDER BRAND approval, a defined access scope, and an auditable active link. No client profiles, investments, reports, or documents are available until that workflow is configured.
          </p>
          <a
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline"
            href={`mailto:${company.email}?subject=Advisor%20portal%20access`}
          >
            Contact PLACEHOLDER BRAND about adviser access <ArrowRight size={14} />
          </a>
        </div>
      </section>

      <section id="advisor-resources" aria-labelledby="resources-heading" className="scroll-mt-24">
        <SectionHeading
          id="resources-heading"
          title="Advisor Resources"
          description="Published PLACEHOLDER BRAND commentary and general information."
        />
        <PublishedResearchFeed />
      </section>

      <p className="glass-inset rounded-xl p-4 text-xs leading-5 text-[var(--muted)]">
        {performanceDisclosures.advice} {performanceDisclosures.pastPerformance}
      </p>
    </main>
  );
}
