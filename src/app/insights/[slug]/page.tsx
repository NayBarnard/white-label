import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResearchArticleLayout } from "@/components/ResearchArticleLayout";
import { getCanonicalResearchArticle } from "@/lib/insights/server";
import { researchCatalog } from "@/lib/insights/catalog";

export function generateStaticParams() {
  return researchCatalog.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getCanonicalResearchArticle(slug);
  if (!article) return { title: "Research not found" };
  return {
    title: article.title,
    description: article.executiveSummary,
    alternates: { canonical: `/insights/${article.slug}` },
    openGraph: { title: article.title, description: article.executiveSummary, url: `/insights/${article.slug}` },
  };
}

async function InsightArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getCanonicalResearchArticle(slug);
  if (!article) notFound();
  return <ResearchArticleLayout article={article} />;
}

export default function InsightArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-5 py-16 text-sm text-[var(--muted)]" role="status">Loading research…</div>}>
      <InsightArticle params={params} />
    </Suspense>
  );
}
