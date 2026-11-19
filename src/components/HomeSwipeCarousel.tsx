"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ScrollPopOut } from "@/components/ScrollPopOut";

export type HomeSwipeSlide = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  date?: string;
  pulse?: boolean;
};

type Props = {
  label: string;
  slides: HomeSwipeSlide[];
};

export function HomeSwipeCarousel({ label, slides }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  function updateActiveSlide() {
    const track = trackRef.current;
    if (!track) return;
    const trackLeft = track.getBoundingClientRect().left;
    const children = Array.from(track.children);
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, index) => {
      const distance = Math.abs(child.getBoundingClientRect().left - trackLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setActiveIndex(nearestIndex);
  }

  function showSlide(index: number) {
    const slide = trackRef.current?.children[index];
    if (!(slide instanceof HTMLElement)) return;
    setActiveIndex(index);
    slide.scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  return (
    <div className="home-swipe-carousel" role="region" aria-label={label} aria-roledescription="carousel">
      <div
        ref={trackRef}
        className="home-swipe-track"
        onScroll={updateActiveSlide}
        aria-label={`${label} slides`}
      >
        {slides.map((slide, index) => (
          <ScrollPopOut className="home-swipe-item" key={slide.title}>
            <article
              className="home-swipe-card placeholder-glass-card rounded-3xl p-6 sm:p-8"
              data-pulse={slide.pulse ? "true" : undefined}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            >
              <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">
                {slide.eyebrow}
              </p>
              {slide.date && <p className="mt-4 text-xs text-[var(--muted)]">{slide.date}</p>}
              <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
                {slide.title}
              </h3>
              <p className="mt-3 min-h-16 text-sm leading-6 text-[var(--muted)]">
                {slide.description}
              </p>
              <Link
                href={slide.href}
                className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-bold tracking-wide text-[var(--accent)] hover:underline"
              >
                {slide.linkLabel} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </article>
          </ScrollPopOut>
        ))}
      </div>
      <div className="home-swipe-indicators" aria-label={`${label} slide controls`}>
        {slides.map((slide, index) => (
          <button
            type="button"
            key={slide.title}
            className="home-swipe-indicator"
            aria-label={`Show ${slide.title}`}
            aria-current={activeIndex === index}
            onClick={() => showSlide(index)}
          />
        ))}
        <span className="sr-only" aria-live="polite">
          Showing slide {activeIndex + 1} of {slides.length}
        </span>
      </div>
    </div>
  );
}
