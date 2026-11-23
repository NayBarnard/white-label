"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";
import { readWorkspaceValue, writeWorkspaceValue } from "@/lib/local-workspace";

export function useLocalWorkspaceValue<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => fallback);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const valueRef = useRef(value);
  const statusRef = useRef(status);

  useEffect(() => {
    let active = true;
    void readWorkspaceValue<T>(key).then((stored) => {
      if (!active) return;
      if (stored !== null) {
        valueRef.current = stored;
        setValue(stored);
      }
      statusRef.current = "ready";
      setStatus("ready");
    }).catch((cause: unknown) => {
      if (!active) return;
      statusRef.current = "error";
      setError(cause instanceof Error ? cause.message : "Local workspace data could not be opened.");
      setStatus("error");
    });
    return () => { active = false; };
  }, [key]);

  const updateValue = (next: SetStateAction<T>) => {
    const updated = typeof next === "function"
      ? (next as (current: T) => T)(valueRef.current)
      : next;
    valueRef.current = updated;
    setValue(updated);
    if (statusRef.current !== "ready") return;
    void writeWorkspaceValue(key, updated).then(() => setError("")).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Local workspace data could not be saved.");
    });
  };

  return { value, setValue: updateValue, status, error };
}
