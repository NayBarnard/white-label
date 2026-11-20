import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Staff sign-in",
  description: "Secure sign-in for authorised PLACEHOLDER BRAND staff.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function AdvisorLoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">LOCAL DEMONSTRATION</p>
      <h1 className="mt-3 text-4xl font-semibold">Staff access</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Choose a demonstration workspace. This local role selection is not authentication
        and must not be used with real or sensitive data.
      </p>
      <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
        <Link href="/advisor" className="min-h-12 rounded-xl bg-[var(--accent-fill)] px-5 py-3 text-sm font-bold text-[var(--button-text)]">Open adviser demo</Link>
        <Link href="/admin" className="min-h-12 rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold">Open admin demo</Link>
      </div>
    </main>
  );
}
