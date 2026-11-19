"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConnectionStatus = "connecting" | "connected" | "error";

type ConnectionContextValue = {
  status: ConnectionStatus;
  showInitialSplash: boolean;
  dismissInitialSplash: () => void;
};

const SESSION_KEY = "placeholder-initial-connection-splash";
let splashShownThisTab = false;

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [showInitialSplash, setShowInitialSplash] = useState(false);
  const startedInThisMount = useRef(false);
  const dismissInitialSplash = useCallback(
    () => setShowInitialSplash(false),
    [],
  );

  useEffect(() => {
    let alreadyShown = splashShownThisTab;
    try {
      alreadyShown ||= window.sessionStorage.getItem(SESSION_KEY) === "shown";
    } catch {
      alreadyShown = splashShownThisTab;
    }

    if (alreadyShown && !startedInThisMount.current) {
      setStatus("connected");
      return;
    }

    startedInThisMount.current = true;
    splashShownThisTab = true;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "shown");
    } catch {
      splashShownThisTab = true;
    }

    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    setShowInitialSplash(true);

    void fetch("/api/fund-metrics", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Connection check failed.");
        if (active) setStatus("connected");
      })
      .catch(() => {
        if (active) setStatus("error");
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        status,
        showInitialSplash,
        dismissInitialSplash,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) throw new Error("useConnection must be used within ConnectionProvider.");
  return context;
}
