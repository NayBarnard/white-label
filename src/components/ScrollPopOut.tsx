"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScrollPopOut({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [inFocusZone, setInFocusZone] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const element = elementRef.current;
    if (
      !element ||
      reduceMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInFocusZone(entry.isIntersecting),
      { rootMargin: "-35% 0px -35% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <motion.div
      ref={elementRef}
      className={`relative rounded-xl ${className} ${
        inFocusZone
          ? "z-30 overflow-visible border border-[var(--border-strong)] shadow-[0_18px_48px_rgba(2,6,23,0.3)]"
          : "z-0 border border-transparent"
      }`}
      initial={false}
      animate={{ scale: inFocusZone && !reduceMotion ? 1.06 : 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 300, damping: 30 }
      }
    >
      {children}
    </motion.div>
  );
}
