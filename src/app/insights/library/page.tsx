import type { Metadata } from "next";
import Link from "next/link";
import { LargeTitle } from "@/components/IOSKit";
import { ResearchLibrary } from "@/components/ResearchLibrary";

export const metadata: Metadata = {
  title: "Versioned research library",
  description: "Browse published PLACEHOLDER BRAND research and document versions with publication and audit metadata.",
  alternates: { canonical: "/insights/library" },
};

export default function InsightsLibraryPage() {
  return (
    <>
      <LargeTitle
        eyebrow="VERSIONED DOCUMENT LIBRARY"
        title="Research, with its version history."
        description="Find published outlooks, fund documents, manager updates, presentations, educational material and investor notices."
      />
      <section className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
        <p className="mb-5 text-sm text-[var(--muted)]">
          This library reads the published document register. For articles, return to{" "}
          <Link href="/insights" className="font-semibold text-[var(--accent)] hover:underline">Insights</Link>.
          The existing <Link href="/resources" className="font-semibold text-[var(--accent)] hover:underline">Resources</Link> page remains available.
        </p>
        <ResearchLibrary />
      </section>
    </>
  );
}
