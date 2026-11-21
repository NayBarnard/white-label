import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Blocks, Building2, Download, Palette, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "WEALTH OS platform",
  description: "Explore the standalone white-label website and wealth business studio.",
};

const capabilities = [
  { icon: Palette, title: "Shape your brand", description: "Configure identity, colours, typography, navigation, pages and disclosures visually." },
  { icon: Blocks, title: "Build without code", description: "Arrange page sections, edit content, preview responsive layouts and save reusable starter templates." },
  { icon: Download, title: "Take your website with you", description: "Export independent static HTML, responsive CSS, media and an editable project backup as a ZIP." },
  { icon: ShieldCheck, title: "Keep boundaries clear", description: "Studio data stays in your browser. Local demo storage is not secure multi-user hosting or authentication." },
];

export default function WealthOsProductPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-16 sm:pt-24 lg:px-8">
      <section className="glass-strong relative overflow-hidden rounded-[2rem] p-7 sm:p-12 lg:p-16">
        <div className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full bg-[var(--accent-fill)]/15 blur-3xl" />
        <p className="text-xs font-bold tracking-[0.2em] text-[var(--accent)]">WEALTH OS · WHITE-LABEL BUSINESS STUDIO</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">A considered digital home for your wealth business.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)]">Create and customise a branded website in a visual editor, manage local demonstration projects, and export a static site without depending on a proprietary publishing service.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/welcome" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Start locally <ArrowRight size={16} /></Link>
          <Link href="/studio" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-strong)] px-5 text-sm font-semibold">Open demonstration Studio</Link>
        </div>
        <p className="mt-6 text-xs text-[var(--muted)]">No account or external AI service is needed for the local demonstration.</p>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2" aria-label="Platform capabilities">
        {capabilities.map(({ icon: Icon, title, description }) => (
          <article key={title} className="glass rounded-2xl p-6">
            <Icon size={20} className="text-[var(--accent)]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
          </article>
        ))}
      </section>

      <section className="glass mt-12 flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div><p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">DEMONSTRATION MODE</p><h2 className="mt-2 text-xl font-semibold">Explore with fictional sample content.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">The product does not include regulated advice, verified holdings, production authentication or hosted tenant isolation.</p></div>
        <Link href="/licensing" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--border-strong)] px-5 text-sm font-semibold">Product and licensing details <Building2 size={15} /></Link>
      </section>
    </div>
  );
}
