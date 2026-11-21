import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, Database, Globe2, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Platform and licensing information",
  description: "Understand WEALTH OS demonstration capabilities and production requirements.",
};

const boundaries = [
  { icon: Database, title: "Local-first demonstration", description: "Projects, settings and media are stored in the browser. JSON backups and static website exports are downloadable by the user." },
  { icon: Globe2, title: "Static website exports", description: "Exported HTML and CSS can be uploaded to ordinary static hosting. Hosting, domains, forms, client portals and server-side integrations are not bundled." },
  { icon: KeyRound, title: "Production security", description: "Commercial multi-user deployment requires independently configured authentication, tenant isolation, secure storage, monitoring and operational controls." },
  { icon: CircleHelp, title: "Licensing terms", description: "No commercial pricing, service-level commitments or licence terms are represented in this demonstration. Contact the product team to discuss evaluation." },
];

export default function LicensingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-16 sm:pt-24 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-bold tracking-[0.2em] text-[var(--accent)]">PRODUCT INFORMATION</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">A clear view of what is included.</h1>
        <p className="mt-5 text-base leading-7 text-[var(--muted)]">WEALTH OS is an independently runnable product demonstration and local website-building foundation. It is not presented as a production financial-data service.</p>
      </header>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {boundaries.map(({ icon: Icon, title, description }) => (
          <article key={title} className="glass rounded-2xl p-6">
            <Icon size={20} className="text-[var(--accent)]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
          </article>
        ))}
      </div>
      <div className="glass mt-10 rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Evaluate the product</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Try a local onboarding flow, create a separate website project, or open the Studio directly. Do not enter real client or account information in browser-only demonstration mode.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/welcome" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Start onboarding <ArrowRight size={15} /></Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-strong)] px-5 text-sm font-semibold">Discuss evaluation</Link>
        </div>
      </div>
    </div>
  );
}
