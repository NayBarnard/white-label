"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getPortalSupabaseClient } from "@/lib/supabase/portal";

export type PortalSessionState = {
  status: "loading" | "signed-out" | "signed-in";
  role: "client" | "adviser" | "admin" | null;
  fullName: string;
  email: string;
  totalInvested: number | null;
  assetValue: number | null;
};

const initialState: PortalSessionState = {
  status: "loading",
  role: null,
  fullName: "",
  email: "",
  totalInvested: null,
  assetValue: null,
};

const PortalSessionContext = createContext<PortalSessionState>(initialState);

export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(initialState);

  useEffect(() => {
    let active = true;
    let requestId = 0;
    let supabase: ReturnType<typeof getPortalSupabaseClient>;

    try {
      supabase = getPortalSupabaseClient();
    } catch (error) {
      console.error("Portal session could not be initialized.", error);
      queueMicrotask(() => {
        if (active) setSession({ ...initialState, status: "signed-out" });
      });
      return;
    }

    async function syncUser(user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]) {
      const currentRequestId = ++requestId;
      if (!user) {
        if (active && currentRequestId === requestId) {
          setSession({ ...initialState, status: "signed-out" });
        }
        return;
      }

      setSession((current) =>
        current.status === "signed-in" ? current : { ...current, status: "loading" },
      );
      const [portfolioResult, transactionResult] = await Promise.all([
        supabase
          .from("client_portfolios")
          .select("valuation_zar")
          .eq("user_id", user.id),
        supabase
          .from("client_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("status", "Completed")
          .gt("amount", 0),
      ]);

      if (!active || currentRequestId !== requestId) return;
      if (portfolioResult.error) {
        console.error("Portal asset value could not be loaded.", portfolioResult.error);
      }
      if (transactionResult.error) {
        console.error("Portal investment total could not be loaded.", transactionResult.error);
      }

      const reportedValues = (portfolioResult.data ?? [])
        .map((row) => row.valuation_zar)
        .filter((value): value is number => value !== null);
      const completedInvestments = transactionResult.data ?? [];
      const fullName =
        typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim()
          : user.email?.split("@")[0] ?? "";
      const appRole: unknown = user.app_metadata?.role;
      const role =
        appRole === "admin" || appRole === "adviser"
          ? appRole
          : appRole === "client" || appRole === undefined || appRole === null
            ? "client"
            : null;
      if (role === null) {
        setSession({
          status: "signed-in",
          role: null,
          fullName,
          email: user.email ?? "",
          assetValue: null,
          totalInvested: null,
        });
        return;
      }

      setSession({
        status: "signed-in",
        role,
        fullName,
        email: user.email ?? "",
        assetValue:
          portfolioResult.error || reportedValues.length === 0
            ? null
            : reportedValues.reduce((total, value) => total + value, 0),
        totalInvested:
          transactionResult.error || completedInvestments.length === 0
            ? null
            : completedInvestments.reduce((total, row) => total + row.amount, 0),
      });
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      queueMicrotask(() => {
        void syncUser(authSession?.user ?? null).catch((error: unknown) => {
          if (!active) return;
          console.error("Portal session data could not be loaded.", error);
          setSession((current) => ({ ...current, status: "signed-in" }));
        });
      });
    });

    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("Portal user could not be loaded.", error);
        if (active) setSession({ ...initialState, status: "signed-out" });
        return;
      }
      return syncUser(data.user);
    }).catch((error: unknown) => {
      if (!active) return;
      console.error("Portal user could not be loaded.", error);
      setSession({ ...initialState, status: "signed-out" });
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <PortalSessionContext.Provider value={session}>
      {children}
    </PortalSessionContext.Provider>
  );
}

export function usePortalSession() {
  return useContext(PortalSessionContext);
}
