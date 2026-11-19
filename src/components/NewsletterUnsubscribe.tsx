"use client";

import { FormEvent, useState } from "react";

export function NewsletterUnsubscribe({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result: { message?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to unsubscribe right now.");
      setMessage(result.message ?? "You have been unsubscribed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to unsubscribe right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <p role="alert" className="text-sm text-[var(--muted)]">
        This unsubscribe link is incomplete. Please use the link from your subscription confirmation.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm leading-6 text-[var(--muted)]">
        Confirm that you want to stop receiving PLACEHOLDER BRAND email updates.
      </p>
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-xs font-bold text-[var(--button-text)] disabled:opacity-60"
      >
        {submitting ? "PROCESSING..." : "UNSUBSCRIBE"}
      </button>
      {message && (
        <p role="status" aria-live="polite" className="text-sm text-[var(--accent)]">
          {message}
        </p>
      )}
    </form>
  );
}
