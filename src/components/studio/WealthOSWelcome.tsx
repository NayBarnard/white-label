"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { themes } from "@/lib/studio/universal-schema";

const onboardingKey = "wealth-os.product.onboarding.v1";

export function WealthOSWelcome() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Independent financial adviser");
  const [themeId, setThemeId] = useState("private");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedConfig = JSON.parse(localStorage.getItem(onboardingKey) ?? "null");
        if (!savedConfig) return;
        setBusinessName(typeof savedConfig.businessName === "string" ? savedConfig.businessName : "");
        setBusinessType(typeof savedConfig.businessType === "string" ? savedConfig.businessType : "Independent financial adviser");
        setThemeId(themes.some((theme) => theme.id === savedConfig.themeId) ? savedConfig.themeId : "private");
      } catch {
        setError("Saved onboarding details could not be read. You can continue with new details.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function continueToStudio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = businessName.trim().slice(0, 120);
    if (!name) {
      setError("Enter a business name to continue.");
      return;
    }
    try {
      localStorage.setItem(onboardingKey, JSON.stringify({
        businessName: name,
        businessType,
        themeId,
        completedAt: new Date().toISOString(),
      }));
      setError("");
      router.push("/studio");
    } catch {
      setError("Browser storage is unavailable. You can open the Studio directly and create a project there.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-16 sm:pt-24 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-bold tracking-[0.2em] text-[var(--accent)]">WEALTH OS · LOCAL SETUP</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Start with your business identity.</h1>
        <p className="mt-5 text-base leading-7 text-[var(--muted)]">Set up a separate local website project, then customise its pages and export it from Studio. No account or external service is required for this demonstration.</p>
      </header>

      <form onSubmit={continueToStudio} className="glass-strong mt-9 grid gap-8 rounded-3xl p-6 sm:p-9 md:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <label className="block text-sm font-semibold">Business or trading name
            <input autoComplete="organization" required maxLength={120} value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="e.g. Northshore Wealth" className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm" />
          </label>
          <label className="block text-sm font-semibold">Business type
            <select value={businessType} onChange={(event) => setBusinessType(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm">
              <option>Independent financial adviser</option>
              <option>Private wealth practice</option>
              <option>Investment business</option>
              <option>Family office</option>
              <option>Other financial business</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">Starting design
            <select value={themeId} onChange={(event) => setThemeId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm">
              {themes.map((theme) => <option value={theme.id} key={theme.id}>{theme.name}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-6 text-sm font-bold text-[var(--button-text)]">Create local website project <ArrowRight size={16} /></button>
        </div>
        <aside className="rounded-2xl border border-[var(--border)] bg-white/40 p-5">
          <p className="text-sm font-semibold">Before you begin</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
            <li>Projects and uploaded files are stored in this browser.</li>
            <li>Export a ZIP regularly to keep an independent backup.</li>
            <li>Do not add real client, account or sensitive financial data.</li>
            <li>Production login and secure multi-user hosting are not included.</li>
          </ul>
          <Link href="/licensing" className="mt-5 inline-flex min-h-10 items-center text-xs font-semibold text-[var(--accent)] hover:underline">Review product boundaries</Link>
        </aside>
      </form>
    </div>
  );
}
