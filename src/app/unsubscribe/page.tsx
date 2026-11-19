import type { Metadata } from "next";
import { NewsletterUnsubscribe } from "@/components/NewsletterUnsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe from email updates",
  description: "Manage your PLACEHOLDER BRAND email update preferences.",
  openGraph: {
    title: "Unsubscribe from email updates | PLACEHOLDER BRAND",
    description: "Manage your PLACEHOLDER BRAND email update preferences.",
    url: "/unsubscribe",
    siteName: "PLACEHOLDER BRAND",
    type: "website",
  },
  robots: { index: false, follow: false },
};

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8">
      <div className="glass-panel rounded-[var(--radius-card)] p-6 sm:p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Email preferences
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Unsubscribe from updates
        </h1>
        <NewsletterUnsubscribe token={token ?? ""} />
      </div>
    </section>
  );
}
