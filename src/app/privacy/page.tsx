import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/data/firmData";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `Privacy information and the existing POPIA statement for ${company.legalName}.`,
  openGraph: {
    title: `Privacy notice | ${company.legalName}`,
    description: `Privacy information and the existing POPIA statement for ${company.legalName}.`,
    url: "/privacy",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Privacy and information
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        Privacy notice
      </h1>
      <div className="glass-panel mt-8 rounded-[var(--radius-card)] p-6 sm:p-9">
        <p className="font-semibold text-[var(--accent)]">
          Draft placeholder — legal review and approval required before publication as a complete privacy notice.
        </p>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          This placeholder is not a substitute for the firm’s approved privacy notice. For the existing POPIA information, read the{" "}
          <Link
            href="/api/documents/popi-act-statement"
            className="font-semibold text-[var(--foreground)] underline underline-offset-4 focus-visible:outline-2"
          >
            POPI Act Statement
          </Link>
          .
        </p>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          The responsible party for this website is {company.legalName}.
        </p>
        <h2 className="mt-7 text-lg font-semibold">Details to be approved</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">
          <li>Responsible-party and Information Officer contact details.</li>
          <li>Personal-information categories, purposes, lawful basis, and recipients.</li>
          <li>Retention periods, cross-border processing, and security practices.</li>
          <li>How data-subject access, correction, objection, and deletion requests are handled.</li>
        </ul>
      </div>
    </section>
  );
}
