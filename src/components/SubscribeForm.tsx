"use client";

import { FormEvent, useState } from "react";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [unsubscribeUrl, setUnsubscribeUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage("");
    setUnsubscribeUrl("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          website: formData.get("website"),
        }),
      });
      const result: { message?: string; error?: string; unsubscribeUrl?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to subscribe right now.");
      setMessage(result.message ?? "You’re subscribed.");
      setUnsubscribeUrl(result.unsubscribeUrl ?? "");
      setEmail("");
      setConsent(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to subscribe right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-3">
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="newsletter-website">Leave this field empty</label>
        <input id="newsletter-website" name="website" type="text" tabIndex={-1} autoComplete="off" maxLength={160} />
      </div>
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <div className="flex">
        <input
          id="footer-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          className="min-w-0 flex-1 border border-[var(--border-strong)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-[#1d2b4d] px-4 text-xs font-bold text-white disabled:opacity-60"
        >
          {submitting ? "..." : "JOIN"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs leading-5 text-white/85">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 accent-[var(--accent)]"
        />
        I agree to receive PLACEHOLDER BRAND updates by email.
      </label>
      {message && (
        <div role="status" aria-live="polite" className="space-y-1 text-xs text-[var(--accent)]">
          <p>{message}</p>
          {unsubscribeUrl && (
            <p>
              You can{" "}
              <a href={unsubscribeUrl} className="underline underline-offset-2 focus-visible:outline-2">
                unsubscribe at any time
              </a>
              .
            </p>
          )}
        </div>
      )}
    </form>
  );
}
