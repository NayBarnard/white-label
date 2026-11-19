"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const FundComparison = dynamic(
  () =>
    import("@/components/FundComparison").then((module) => module.FundComparison),
  {
    loading: () => (
      <div
        role="status"
        aria-label="Loading fund comparison"
        className="min-h-[560px] rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
      />
    ),
  },
);

export function DeferredFundComparison() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (!("IntersectionObserver" in window)) {
      const timeout = globalThis.setTimeout(() => setShouldLoad(true), 0);
      return () => globalThis.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="min-h-[560px]">
      {shouldLoad ? (
        <FundComparison />
      ) : (
        <div
          role="region"
          aria-label="Fund comparison"
          className="min-h-[560px] rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        />
      )}
    </div>
  );
}
