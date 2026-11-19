import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-24 text-center sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Page not found
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        This page isn’t available
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">
        The page may have moved or the address may be incorrect.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 text-xs font-bold text-[var(--button-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        Return to home
      </Link>
    </section>
  );
}
