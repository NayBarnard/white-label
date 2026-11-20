"use client";

import { FormEvent, useState } from "react";

export function EnquiryForm({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const submissions = JSON.parse(window.localStorage.getItem("example-wealth.enquiries") ?? "[]") as unknown[];
      window.localStorage.setItem("example-wealth.enquiries", JSON.stringify([
        ...submissions,
        {
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          company: data.get("company"),
          inquiryType: data.get("inquiryType"),
          message,
          createdAt: new Date().toISOString(),
        },
      ]));
      setStatus("Your demo enquiry was saved locally. No message was sent.");
      form.reset();
      setMessage("");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to submit your enquiry.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="enquiry"
      onSubmit={handleSubmit}
      className={`space-y-5 ${compact ? "" : "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8"}`}
    >
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="enquiry-website">Leave this field empty</label>
        <input id="enquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" maxLength={160} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="enquiry-name" className="mb-2 block text-sm font-medium">
            Name *
          </label>
          <input
            id="enquiry-name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className="w-full rounded-sm border border-[var(--border-strong)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="enquiry-email" className="mb-2 block text-sm font-medium">
            Email *
          </label>
          <input
            id="enquiry-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className="w-full rounded-sm border border-[var(--border-strong)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="enquiry-phone" className="mb-2 block text-sm font-medium">
            Phone *
          </label>
          <input
            id="enquiry-phone"
            name="phone"
            type="tel"
            required
            minLength={5}
            maxLength={40}
            autoComplete="tel"
            className="w-full rounded-sm border border-[var(--border-strong)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="enquiry-company" className="mb-2 block text-sm font-medium">
            Company / Firm
          </label>
          <input
            id="enquiry-company"
            name="company"
            maxLength={160}
            autoComplete="organization"
            className="w-full rounded-sm border border-[var(--border-strong)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="enquiry-type" className="mb-2 block text-sm font-medium">
          Inquiry Type *
        </label>
        <select
          id="enquiry-type"
          name="inquiryType"
          required
          defaultValue="General"
          className="w-full rounded-sm border border-[var(--border-strong)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          <option>General</option>
          <option>PLACEHOLDER BRAND Balanced</option>
          <option>PLACEHOLDER BRAND Cautious</option>
          <option>Partnership</option>
          <option>Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="enquiry-message" className="mb-2 block text-sm font-medium">
          Message *
        </label>
        <textarea
          id="enquiry-message"
          required
          rows={4}
          maxLength={500}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full resize-y rounded-sm border border-[var(--border-strong)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
        <p className="mt-1 text-right text-xs text-[var(--muted)]">{message.length}/500</p>
      </div>

      <label className="flex items-start gap-3 text-xs leading-5 text-[var(--muted)]">
        <input
          name="popiConsent"
          type="checkbox"
          required
          className="mt-1 accent-[var(--accent)]"
        />
        I consent to PLACEHOLDER BRAND processing my personal information to respond to this enquiry.
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-12 items-center justify-center rounded-sm bg-[var(--accent-fill)] px-6 text-sm font-bold text-[var(--button-text)] transition hover:brightness-110 disabled:opacity-60"
      >
        {submitting ? "SENDING..." : "SEND ENQUIRY"}
      </button>
      {status && (
        <p role="status" aria-live="polite" className="text-sm text-[var(--accent)]">
          {status}
        </p>
      )}
    </form>
  );
}
