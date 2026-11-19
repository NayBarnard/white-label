import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/data/firmData";

export const metadata: Metadata = {
  title: "Website terms",
  description: `Draft website terms for ${company.legalName}, pending legal review.`,
  openGraph: {
    title: `Website terms | ${company.legalName}`,
    description: `Draft website terms for ${company.legalName}, pending legal review.`,
    url: "/terms",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Website information
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        Website terms
      </h1>
      <div className="glass-panel mt-8 rounded-[var(--radius-card)] p-6 sm:p-9">
        <p className="font-semibold text-[var(--accent)]">
          Draft placeholder — legal review and approval required before these terms are relied on.
        </p>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Website information is general and does not constitute personal financial advice or a recommendation. Past performance is not necessarily a guide to future performance. Investment values may fluctuate, and investors may not get back the amount invested.
        </p>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          This website is operated by {company.legalName}.
        </p>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          The complete terms, permitted use, intellectual-property provisions, liability language, and governing-law terms must be supplied and approved by the firm’s legal adviser. See the existing{" "}
          <Link
            href="/api/documents/popi-act-statement"
            className="font-semibold text-[var(--foreground)] underline underline-offset-4 focus-visible:outline-2"
          >
            POPI Act Statement
          </Link>{" "}
          for published privacy information.
        </p>
      </div>
    </section>
  );
}
