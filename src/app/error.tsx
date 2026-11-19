"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(
      "A page error boundary was triggered.",
      error instanceof Error && "digest" in error && typeof error.digest === "string"
        ? error.digest
        : undefined,
    );
  }, [error]);

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-24 text-center sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Temporary error
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        We couldn’t load this page
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Please try again. Your account information remains protected.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-7 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-xs font-bold text-[var(--button-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        Try again
      </button>
    </section>
  );
}
