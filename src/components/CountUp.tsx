"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  suffix?: string;
};

const numberFormatter = new Intl.NumberFormat("en-ZA");
const countSpring = { stiffness: 300, damping: 30 };

export function CountUp({ value, suffix = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const source = useMotionValue(0);
  const spring = useSpring(source, countSpring);
  const [hasEntered, setHasEntered] = useState(false);
  const label = useTransform(spring, (current) => `${numberFormatter.format(Math.floor(current))}${suffix}`);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setHasEntered(true);
        source.set(value);
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [source, value]);

  return (
    <span ref={ref} aria-label={`${numberFormatter.format(value)}${suffix}`}>
      {hasEntered ? <motion.span>{label}</motion.span> : `${numberFormatter.format(value)}${suffix}`}
    </span>
  );
}
