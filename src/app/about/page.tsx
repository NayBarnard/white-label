import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { beliefs, company, leadership } from "@/data/firmData";
import { FirmStats } from "@/components/FirmStats";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ScrollPopOut } from "@/components/ScrollPopOut";
import { LargeTitle } from "@/components/IOSKit";

export const metadata: Metadata = {
  title: "About PLACEHOLDER BRAND",
  description: "Learn about PLACEHOLDER BRAND' independent, owner-managed investment approach and leadership team.",
  openGraph: {
    title: "About PLACEHOLDER BRAND",
    description: "Learn about PLACEHOLDER BRAND' independent, owner-managed investment approach and leadership team.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <LargeTitle
        eyebrow="ABOUT placeholder"
        title="Independent fund management, built around partnership."
        description={company.tagline}
      />

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">OUR STORY</p>
          <h2 className="mt-3 text-3xl font-semibold">Independent thinking, built around partnership.</h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[var(--muted)]">
            <p>
              PLACEHOLDER BRAND is an independent boutique investment management company, catering to investors&apos; needs through a focused range of investment portfolios. Our approach is to compound investor wealth over the long term by blending internal and external fund management skills in a well-considered, coordinated and active manner, while seeking to avoid significant loss of capital in times of market turbulence.
            </p>
            <p>
              This approach gives investors diversified access to some of the country&apos;s and globe&apos;s most talented managers within the funds, at a reasonable cost. It reduces complexity and offers a comprehensive financial and estate planning solution.
            </p>
          </div>
        </div>
        <div className="self-center">
          <FirmStats className="grid-cols-1" />
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">OUR LEADERSHIP TEAM</p>
            <h2 className="mt-3 text-3xl font-semibold">Leadership team</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Our experienced team serves on various investment committees alongside other investment professionals of prominent Assurers and Fund Managers.
            </p>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {leadership.map((person, index) => (
              <ScrollPopOut key={person.name}>
                <article className="glass h-full rounded-3xl p-6">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--background)] text-lg font-semibold text-[var(--accent)]">
                    {person.photo ? (
                      <Image src={person.photo} alt={person.name} width={64} height={64} className="h-full w-full object-cover" />
                    ) : (
                      person.name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <ScrollReveal className="mt-5" delayMs={index * 1100}>
                    <div>
                      <h3 className="text-lg font-semibold">{person.name}</h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{person.role}</p>
                    </div>
                  </ScrollReveal>
                  <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{person.credentials}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{person.bio}</p>
                </article>
              </ScrollPopOut>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">OUR INVESTMENT PHILOSOPHY</p>
          <h2 className="mt-3 text-3xl font-semibold">What We Believe</h2>
          <blockquote className="glass mt-6 p-6 text-base leading-7">
            <span className="block border-l-2 border-l-[#C5A880] pl-4">
              Genuinely diversified, cost-conscious fund management, so you can focus on relations, and not portfolio construction.
            </span>
          </blockquote>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {beliefs.map((belief, index) => (
            <li key={belief} className="glass flex gap-5 p-6">
              <span className="text-3xl font-light text-[var(--accent)]">0{index + 1}</span>
              <p className="pt-1 text-base leading-7">{belief}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass border-y border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold tracking-[0.16em]">WORK WITH placeholder</p>
            <h2 className="mt-2 text-2xl font-semibold">Become an PLACEHOLDER BRAND Partner</h2>
            <p className="mt-2 max-w-xl text-sm leading-6">Let&apos;s build a considered, client-first partnership with your financial advice practice.</p>
          </div>
          <Link href="/contact#enquiry" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">
            START A CONVEplaceholderTION <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
