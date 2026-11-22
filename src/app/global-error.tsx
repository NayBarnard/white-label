"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(
      "The root error boundary was triggered.",
      error instanceof Error && "digest" in error && typeof error.digest === "string"
        ? error.digest
        : undefined,
    );
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Temporary error
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            your firm
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">
            We couldn’t load the website. Please try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-7 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-xs font-bold text-[var(--button-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
