"use client";

import { useEffect, useState } from "react";

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, fallback));

  useEffect(() => {
    writeLocal(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

export function resetLocalDemo() {
  if (typeof window === "undefined") return;
  const keys = Object.keys(window.localStorage).filter((key) => key.startsWith("example-wealth."));
  keys.forEach((key) => window.localStorage.removeItem(key));
}
