"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "@/components/IOSKit";
import { usePortalSession } from "@/components/PortalSessionProvider";
import { FloatingChatbot } from "@/components/FloatingChatbot";

export default function ConditionalTabBar() {
  const pathname = usePathname();
  const { status } = usePortalSession();

  if (pathname === "/offline") return <FloatingChatbot standalone />;
  if (pathname?.startsWith("/portal") || pathname?.startsWith("/advisor") || pathname?.startsWith("/admin") || pathname?.startsWith("/studio")) {
    if (status !== "signed-in") return null;
    return <FloatingChatbot standalone hideLauncher />;
  }
  if (status === "loading") return null;
  if (status === "signed-out") return <TabBar />;

  return <FloatingChatbot standalone />;
}
