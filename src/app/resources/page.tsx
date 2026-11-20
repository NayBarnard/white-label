import type { Metadata } from "next";
import { ArrowDownToLine, FileText } from "lucide-react";
import { documents } from "@/data/firmData";
import { FactSheetModal } from "@/components/FactSheetModal";
import Link from "next/link";
import { LargeTitle } from "@/components/IOSKit";

export const metadata: Metadata = {
  title: "Investment resources",
  description: "Access product resources, operating forms and compliance documents available from PLACEHOLDER BRAND.",
  openGraph: {
    title: "Investment resources",
    description: "Access product resources, operating forms and compliance documents available from PLACEHOLDER BRAND.",
    url: "/resources",
  },
};

const categories = ["Product Resources", "Investment Forms", "Compliance & Regulatory"] as const;

export default function ResourcesPage() {
  return (
    <>
      <LargeTitle
        eyebrow="DOCUMENT LIBRARY"
        title="Resources for your investment journey."
        description="Browse product information, investment forms, and compliance resources."
      />

      <section className="mx-auto w-full max-w-7xl space-y-14 px-5 py-16 lg:px-8">
        {categories.map((category) => {
          const categoryDocuments = documents.filter((document) => document.category === category);
          return (
            <section key={category} aria-labelledby={`category-${category.replaceAll(" ", "-")}`}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">RESOURCES</p>
                  <h2 id={`category-${category.replaceAll(" ", "-")}`} className="mt-2 text-2xl font-semibold">{category}</h2>
                </div>
                <span className="text-xs text-[var(--muted)]">{categoryDocuments.length} documents</span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryDocuments.map((document) => (
                  <article key={document.slug} className="glass flex min-h-[190px] flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--background)] text-[var(--accent)]">
                        <FileText size={21} />
                      </span>
                      <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">{document.size}</span>
                    </div>
                    <h3 className="mt-5 flex-1 text-base font-semibold">{document.name}</h3>
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {document.category === "Product Resources" ? (
                        <FactSheetModal
                          title={document.name}
                          href={`/api/documents/${document.slug}`}
                        />
                      ) : null}
                      <a
                        href={"file" in document && typeof document.file === "string" ? document.file : `/api/documents/${document.slug}`}
                        download={`${document.slug}.pdf`}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--accent)] hover:underline"
                      >
                        <ArrowDownToLine size={16} /> DOWNLOAD
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
        <p className="glass p-5 text-sm leading-6 text-[var(--muted)]">
          The investment application forms are official PDF documents. Compliance resources are generated request copies, not official policies; please contact your financial advisor or PLACEHOLDER BRAND for current official policy documents. Product fact sheets contain the published performance figures shown on this site.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Begin a preliminary investor questionnaire on the{" "}
          <Link href="/onboarding" className="font-semibold text-[var(--accent)] hover:underline">
            investor onboarding page
          </Link>
          .
        </p>
      </section>
    </>
  );
}
