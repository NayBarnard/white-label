"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { Sheet } from "@/components/IOSKit";
import { InstallAppControl } from "@/components/InstallAppControl";
import { usePortalSession } from "@/components/PortalSessionProvider";
import { getPortalSupabaseClient } from "@/lib/supabase/portal";
import { features } from "@/config/features";

const subscribeToNothing = () => () => {};
const subscribeToViewport = (callback: () => void) => {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getMobileSnapshot = () => window.matchMedia("(max-width: 767px)").matches;
const getMobileServerSnapshot = () => false;

function getDefaultSection(pathname: string) {
  if (pathname.startsWith("/advisor")) return pathname.includes("/platforms") ? "platforms" : "dashboard";
  if (pathname.startsWith("/admin") || pathname.startsWith("/studio")) {
    return pathname.includes("/setup") ? "setup" :
      pathname.includes("/manager-updates") ? "managerUpdates" :
        pathname.includes("/platforms") ? "platforms" : "clients";
  }
  return "overview";
}

type PortalLink = {
  label: string;
  href: string;
  section?: string;
  disabled?: boolean;
  badge?: string;
};

function getPortalLinks(pathname: string): PortalLink[] {
  if (pathname.startsWith("/portal")) {
    return [
      { label: "Overview", href: "/portal#overview", section: "overview" },
      { label: "Holdings & Simulator", href: "/portal#holdings", section: "holdings" },
      { label: "Document Vault", href: "/portal#documents", section: "documents" },
      { label: "Requests & Adviser", href: "/portal#requests", section: "requests" },
      ...(features.managerUpdates
        ? [{ label: "Manager Updates", href: "/portal#managerUpdates", section: "managerUpdates" }]
        : []),
      ...(features.taxYearCard
        ? [{ label: "Tax Centre", href: "/portal#taxCentre", section: "taxCentre" }]
        : []),
      { label: "Statements", href: "", disabled: true, badge: "Soon" },
      { label: "Performance Reports", href: "", disabled: true, badge: "Soon" },
      ...(!features.taxYearCard ? [{ label: "Tax Centre", href: "", disabled: true, badge: "Soon" }] : []),
      { label: "Messages", href: "", disabled: true, badge: "Soon" },
    ];
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/studio")) {
    return [
      { label: "Clients", href: "/admin#clients", section: "clients" },
      { label: "Portfolios", href: "/admin#portfolios", section: "portfolios" },
      { label: "Documents", href: "/admin#documents", section: "documents" },
      { label: "Support", href: "/admin#support", section: "support" },
      { label: "People", href: "/admin/people", section: "people" },
      { label: "Manager updates", href: "/admin/manager-updates", section: "managerUpdates" },
      { label: "Platforms & codes", href: "/admin/platforms", section: "platforms" },
      { label: "Setup", href: "/admin/setup", section: "setup" },
    ];
  }
  return [
    { label: "Dashboard", href: "/advisor#dashboard", section: "dashboard" },
    { label: "My Clients", href: "/advisor/clients", section: "clients" },
    { label: "Fund Centre", href: "/advisor#fund-centre", section: "fund-centre" },
    { label: "LISP Availability", href: "/advisor#lisp-availability", section: "lisp-availability" },
    { label: "Platform Matrix", href: "/advisor/platforms", section: "platforms" },
    { label: "Document Centre", href: "/advisor#document-centre", section: "document-centre" },
    { label: "Investment Tools", href: "/advisor#investment-tools", section: "investment-tools" },
    { label: "Client Management", href: "/advisor#client-management", section: "client-management" },
    { label: "Advisor Resources", href: "/advisor#advisor-resources", section: "advisor-resources" },
  ];
}

export function PortalNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const id = useId();
  const { resolvedTheme, setTheme } = useTheme();
  const session = usePortalSession();
  const [open, setOpen] = useState(false);
  const [activeSectionByPath, setActiveSectionByPath] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const isMobile = useSyncExternalStore(subscribeToViewport, getMobileSnapshot, getMobileServerSnapshot);
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";
  const role = session.status === "signed-in" ? session.role : null;
  const isAdmin = role === "admin";
  const isClient = role === "client";
  const links = getPortalLinks(pathname);
  const activeSection = activeSectionByPath[pathname] ?? getDefaultSection(pathname);

  const focusMenuTrigger = useCallback(() => {
    document.getElementById(id)?.querySelector<HTMLButtonElement>(".portal-navigation-trigger")?.focus();
  }, [id]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      focusMenuTrigger();
    }
  }, [focusMenuTrigger, open]);

  useEffect(() => {
    function syncActiveSection(event: Event) {
      const value = (event as CustomEvent<string>).detail;
      if (value) setActiveSectionByPath((current) => ({ ...current, [pathname]: value }));
    }
    window.addEventListener("placeholder-section-change", syncActiveSection);
    return () => window.removeEventListener("placeholder-section-change", syncActiveSection);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target)) setOpen(false);
    }
    window.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointerDown, true);
  }, [open]);

  async function signOut() {
    const supabase = getPortalSupabaseClient();
    if (supabase) await supabase.auth.signOut({ scope: "global" });
    setOpen(false);
    router.replace(isClient ? "/portal/dashboard" : "/advisor/login");
  }

  function chooseLink(link: PortalLink) {
    const section = link.section;
    if (section) {
      setActiveSectionByPath((current) => ({ ...current, [pathname]: section }));
      if (pathname.startsWith("/portal")) {
        window.dispatchEvent(new CustomEvent("placeholder-portal-navigate", { detail: section }));
      }
    }
    setOpen(false);
  }

  function closeMenu() {
    setOpen(false);
    window.setTimeout(focusMenuTrigger, 0);
  }

  function menuContents() {
    return (
      <>
        {isAdmin ? <p className="portal-menu-group">Admin</p> : null}
        <nav aria-label={`${role ?? "Portal"} sections`} className="portal-menu-sections">
          {links.map((link) =>
            link.disabled ? (
              <span key={link.label} aria-disabled="true" className="portal-menu-link portal-menu-disabled">
                {link.label}
                {link.badge ? <span className="portal-menu-badge">{link.badge}</span> : null}
              </span>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => chooseLink(link)}
                aria-current={link.section === activeSection ? "page" : undefined}
                className="portal-menu-link"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
        <div className="portal-menu-utilities">
          <button
            type="button"
            className="portal-menu-link"
            onClick={() => {
              window.dispatchEvent(new Event("placeholder-open-assistant"));
              setOpen(false);
            }}
          >
            Chat with PLACEHOLDER BRAND AI Assistant
          </button>
          <div className="portal-menu-install"><InstallAppControl showUnavailable /></div>
          <button
            type="button"
            className="portal-menu-link"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            Theme: {isDark ? "Dark" : "Light"}
          </button>
          <details className="portal-menu-account">
            <summary className="portal-menu-link">Account</summary>
            <div className="portal-menu-account-details">
              <strong>{session.status === "signed-in" ? session.fullName : ""}</strong>
              <span>{session.status === "signed-in" ? session.email : ""}</span>
              {isClient && session.status === "signed-in" ? (
                <span className="portal-menu-account-values">
                  Total Investments: {session.totalInvested === null ? "Not reported" : session.totalInvested.toLocaleString("en-ZA")}
                  <br />
                  Accurate Asset Value: {session.assetValue === null ? "Not reported" : session.assetValue.toLocaleString("en-ZA")}
                </span>
              ) : null}
            </div>
          </details>
          <button type="button" className="portal-menu-link portal-menu-signout" onClick={() => void signOut()}>
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </>
    );
  }

  if (!role || (pathname.startsWith("/admin") && role !== "admin") ||
    (pathname.startsWith("/advisor") && role === "client") ||
    (pathname.startsWith("/portal") && role !== "client")) return null;

  return (
    <div ref={menuRef} id={id} className="portal-navigation">
      <button
        type="button"
        className="portal-navigation-trigger"
        aria-label={open ? "Close portal menu" : "Open portal menu"}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        <span>Menu</span>
        {isAdmin ? <span className="portal-menu-admin-badge">Admin</span> : null}
      </button>
      <div className="portal-navigation-dropdown" hidden={!open || isMobile}>
        {menuContents()}
      </div>
      <Sheet
        open={open && isMobile}
        onClose={closeMenu}
        title={`${isAdmin ? "Admin" : isClient ? "Client" : "Advisor"} menu`}
        className="portal-navigation-sheet"
        backdropClassName="portal-navigation-backdrop"
      >
        {menuContents()}
      </Sheet>
    </div>
  );
}
