"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_TENANT_BRANDING, type TenantBranding } from "@/lib/branding/config";

const TenantBrandContext = createContext<TenantBranding>(DEFAULT_TENANT_BRANDING);

export function TenantBrandProvider({
  branding,
  children,
}: {
  branding: TenantBranding;
  children: ReactNode;
}) {
  return (
    <TenantBrandContext.Provider value={branding}>
      {children}
    </TenantBrandContext.Provider>
  );
}

export function useTenantBranding() {
  return useContext(TenantBrandContext);
}
