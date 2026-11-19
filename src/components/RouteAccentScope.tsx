"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

function getAccentScope(pathname: string) {
  if (pathname === "/insights" || pathname.startsWith("/insights/")) {
    return "research";
  }
  if (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  ) {
    return "client";
  }
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/studio" ||
    pathname.startsWith("/studio/") ||
    pathname === "/advisor" ||
    pathname.startsWith("/advisor/")
  ) {
    return "workspace";
  }
  return undefined;
}

export function RouteAccentScope({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="contents" data-accent-scope={pathname ? getAccentScope(pathname) : undefined}>
      {children}
    </div>
  );
}
