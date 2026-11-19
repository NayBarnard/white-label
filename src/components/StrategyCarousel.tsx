"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  labels: string[];
};

export function StrategyCarousel({ children, labels }: Props) {
  const cards = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cardElements = Array.from(track.children);
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (!mostVisible) return;
        const index = cardElements.findIndex((card) => card === mostVisible.target);
        if (index >= 0) setActiveIndex(index);
      },
      { root: track, threshold: [0.35, 0.6, 0.85] },
    );

    cardElements.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  function showCard(index: number) {
    const card = trackRef.current?.children.item(index);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  return (
    <div className="w-full max-w-full">
      <div
        ref={trackRef}
        aria-label="Fund strategies"
        className="flex w-full max-w-full snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-smooth px-8 pb-3"
      >
        {cards.map((card, index) => (
          <div
            key={labels[index] ?? index}
            className="flex w-[88vw] max-w-full shrink-0 snap-center sm:w-[480px]"
          >
            {card}
          </div>
        ))}
      </div>
      {cards.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label="Choose a fund strategy">
          {cards.map((_, index) => (
            <button
              key={labels[index] ?? index}
              type="button"
              onClick={() => showCard(index)}
              aria-label={`Show ${labels[index] ?? `strategy ${index + 1}`}`}
              aria-current={activeIndex === index ? "true" : undefined}
              className={`h-2.5 rounded-full transition-[width,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-strong)] ${
                activeIndex === index
                  ? "w-8 bg-[var(--accent-fill)]"
                  : "w-2.5 bg-[var(--border-strong)]/50 hover:bg-[var(--border-strong)]"
              }`}
            />
          ))}
          <span className="sr-only" aria-live="polite">
            Strategy {activeIndex + 1} of {cards.length}: {labels[activeIndex]}
          </span>
        </div>
      )}
    </div>
  );
}
