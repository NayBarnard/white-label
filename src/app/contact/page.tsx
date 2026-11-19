import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/EnquiryForm";
import { company, faqs } from "@/data/firmData";
import { LargeTitle } from "@/components/IOSKit";

export const metadata: Metadata = {
  title: "Contact PLACEHOLDER BRAND",
  description: "Speak to PLACEHOLDER BRAND about investment strategies, client enquiries and advisory partnerships.",
  openGraph: {
    title: "Contact PLACEHOLDER BRAND",
    description: "Speak to PLACEHOLDER BRAND about investment strategies, client enquiries and advisory partnerships.",
    url: "/contact",
  },
};

const contactCards = [
  { icon: Phone, label: "Call our team", value: company.phone, href: `tel:${company.phone.replaceAll(" ", "")}` },
  { icon: Mail, label: "Email us", value: company.email, href: `mailto:${company.email}` },
  { icon: MapPin, label: "Visit us", value: company.address, href: null },
];

export default function ContactPage() {
  return (
    <>
      <LargeTitle
        eyebrow="CONTACT placeholder"
        title="Let’s talk."
        description="Get in touch with PLACEHOLDER BRAND for information about our investment strategies and resources."
      />

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div className="scroll-mt-24">
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">SEND AN ENQUIRY</p>
          <h2 className="mb-6 mt-2 text-2xl font-semibold">How can we help?</h2>
          <EnquiryForm />
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
            By submitting this form, you consent to the processing of your personal information for the purpose of responding to your enquiry.
          </p>
        </div>

        <aside className="space-y-5">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">DIRECT CONTACT</p>
            <h2 className="mt-2 text-2xl font-semibold">We&apos;re here to help</h2>
          </div>
          {contactCards.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="glass flex gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-[var(--accent)]">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{label}</p>
                {href ? (
                  <a href={href} className="mt-1 block text-sm font-medium hover:text-[var(--accent)]">{value}</a>
                ) : (
                  <p className="mt-1 text-sm leading-6">{value}</p>
                )}
              </div>
            </div>
          ))}
          <p className="glass-inset px-5 py-4 text-sm leading-6 text-[var(--muted)]">
            Our team aims to respond to enquiries within 2 business days.
          </p>
        </aside>
      </section>

      <section className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-5 py-16 lg:px-8">
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">FREQUENTLY ASKED QUESTIONS</p>
          <h2 className="mt-2 text-3xl font-semibold">How can we help?</h2>
          <div className="glass mt-8 divide-y divide-[var(--border)] px-5">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold">
                  {faq.question}
                  <span className="text-xl text-[var(--accent)] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
