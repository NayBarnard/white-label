"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useConnection } from "@/components/ConnectionContext";

const MINIMUM_DISPLAY_MS = 800;
const FADE_DURATION_MS = 350;

export function SplashGate() {
  const { status, showInitialSplash, dismissInitialSplash } = useConnection();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [removed, setRemoved] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!showInitialSplash || status === "connecting") return;
    let fadeTimeout: number | undefined;
    const minimumRemaining = Math.max(
      0,
      MINIMUM_DISPLAY_MS - (Date.now() - startedAt.current),
    );
    const removeTimeout = window.setTimeout(() => {
      setVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setRemoved(true);
        dismissInitialSplash();
      }, reduceMotion ? 0 : FADE_DURATION_MS);
    }, minimumRemaining);
    return () => {
      window.clearTimeout(removeTimeout);
      if (fadeTimeout !== undefined) window.clearTimeout(fadeTimeout);
    };
  }, [dismissInitialSplash, reduceMotion, showInitialSplash, status]);

  if (!showInitialSplash || removed) return null;

  return (
    <div
      className="connection-splash"
      role="status"
      aria-label="Connecting securely"
      aria-live="polite"
      style={{
        opacity: visible ? 1 : 0,
        transition: reduceMotion ? "none" : `opacity ${FADE_DURATION_MS}ms ease`,
      }}
    >
      <div className="connection-splash-panel">
        <div className="connection-splash-logo">
          <Image
            src="/logo-splash-last.png"
            alt="PLACEHOLDER BRAND logo"
            width={1370}
            height={752}
            sizes="(max-width: 657px) 70vw, 460px"
            fetchPriority="high"
          />
        </div>
        {!reduceMotion && (
          <span className="connection-splash-progress" aria-hidden="true">
            <span />
          </span>
        )}
      </div>
      <span className="sr-only">Connecting securely.</span>
    </div>
  );
}
