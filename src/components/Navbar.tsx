"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  ChevronDown,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IOS_SPRING } from "@/components/IOSKit";
import { usePortalSession } from "@/components/PortalSessionProvider";
import { getPortalSupabaseClient } from "@/lib/supabase/portal";
import { company } from "@/data/firmData";
import { PortalNavigation } from "@/components/PortalNavigation";
import { APP_MODE } from "@/config/deployment";

const links = [
  { label: "HOME", href: "/" },
  { label: "ABOUT", href: "/about" },
  { label: "PORTFOLIOS", href: "/portfolios" },
  { label: "INSIGHTS", href: "/insights" },
  { label: "CONTACT", href: "/contact" },
  { label: "RESOURCES", href: "/resources" },
  { label: "ONBOARDING", href: "/onboarding" },
];

const subscribeToNothing = () => () => {};

function formatZar(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle color theme"}
      title={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle color theme"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--foreground)] transition hover:bg-[var(--surface)] hover:text-[var(--accent)]"
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

function formatReportedAmount(value: number | null) {
  return value === null ? "Not reported" : formatZar(value);
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isWorkspaceRoute =
    pathname.startsWith("/portal") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/advisor");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [portalMenuOpen, setPortalMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const portalSessionState = usePortalSession();
  const portalSession =
    portalSessionState.status === "signed-in" &&
    (APP_MODE === "staff" || portalSessionState.role === "client")
      ? portalSessionState
      : null;
  const accentScope =
    pathname.startsWith("/portal") || pathname.startsWith("/onboarding")
      ? "client"
      : isWorkspaceRoute || portalSession?.role === "admin" || portalSession?.role === "adviser"
        ? "workspace"
        : undefined;
  const showBrandStatement = APP_MODE === "public" && !isWorkspaceRoute;

  useEffect(() => {
    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (portalMenuRef.current && !portalMenuRef.current.contains(target)) {
        setPortalMenuOpen(false);
      }
      if (!menuButtonRef.current?.contains(target) && !mobileMenuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPortalMenuOpen(false);
    }
    window.addEventListener("pointerdown", handleOutsidePointerDown, true);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) < 4) return;

      const movingUp = currentScrollY < lastScrollY.current;
      lastScrollY.current = currentScrollY;
      setHeaderVisible(currentScrollY < 96 || movingUp || menuOpen || userMenuOpen);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen, userMenuOpen]);

  async function handleSignOut() {
    const supabase = getPortalSupabaseClient();
    setUserMenuOpen(false);
    setMenuOpen(false);
    if (supabase) {
      await supabase.auth.signOut({ scope: "global" });
    }
    router.replace(portalSession?.role === "client" ? "/portal/dashboard" : "/");
  }

  return (
    <motion.header
      onFocusCapture={() => setHeaderVisible(true)}
      animate={{ y: headerVisible ? 0 : "-100%" }}
      transition={reduceMotion ? { duration: 0 } : IOS_SPRING}
      className="site-header sticky top-0 z-40"
      data-accent-scope={accentScope}
    >
      <div className="mx-auto flex h-[80px] max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        {isWorkspaceRoute ? (
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-bold tracking-[0.1em] text-[var(--accent)] transition hover:bg-[var(--surface)]"
          >
            <Home size={16} aria-hidden="true" />
            HOME
          </Link>
        ) : (
          <Link
            href="/"
            className="shrink-0 transition-opacity hover:opacity-80"
            aria-label="your firm home"
          >
            <AnimatedLogo compact />
          </Link>
        )}

        {!isWorkspaceRoute && (
          <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
            {links.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full px-3 py-2 text-[10px] font-semibold tracking-[0.1em] transition hover:bg-[var(--surface)] hover:text-[var(--accent)] ${
                  pathname === href
                    ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm"
                    : "text-[var(--muted)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {isWorkspaceRoute && portalSession ? <PortalNavigation /> : <ThemeToggle />}

          {portalSession && !isWorkspaceRoute ? (
            isWorkspaceRoute ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--surface)]"
              >
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            ) : (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-[var(--accent-fill)] text-[var(--button-text)]">
                  <User size={13} />
                </span>
                <span className="hidden max-w-[140px] truncate sm:inline">{portalSession.fullName}</span>
                <ChevronDown size={14} className={`text-[var(--muted)] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: -6 }}
                    transition={reduceMotion ? { duration: 0 } : IOS_SPRING}
                    role="menu"
                    className="glass-midnight-menu absolute right-0 top-12 z-50 w-72 rounded-2xl p-4"
                    data-account-role={portalSession.role}
                  >
                    <div className="border-b border-white/15 pb-3">
                      <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--account-accent)]">
                        {portalSession.role === "client"
                          ? "CLIENT ACCOUNT"
                          : portalSession.role === "admin"
                            ? "ADMIN ACCOUNT"
                            : "ADVISOR ACCOUNT"}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-white">
                        {portalSession.fullName}
                      </p>
                      <p className="truncate text-[11px] text-slate-200/75">
                        {portalSession.email || "Not reported"}
                      </p>
                    </div>

                    {portalSession.role === "client" && (
                      <div className="my-3 space-y-2.5 rounded-xl border border-white/15 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-200/75">Total Investments</span>
                          <span className="font-semibold tabular-nums text-white">
                            {formatReportedAmount(portalSession.totalInvested)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-200/75">Accurate Asset Value</span>
                          <span className="font-bold tabular-nums text-[var(--account-accent)]">
                            {formatReportedAmount(portalSession.assetValue)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 pt-1">
                      <Link
                        href="/"
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-[var(--account-accent)]"
                      >
                        Home
                      </Link>
                      <Link
                        href={portalSession.role === "client" ? "/portal" : portalSession.role === "admin" ? "/admin" : "/advisor"}
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-[var(--account-accent)]"
                      >
                        {portalSession.role === "client"
                          ? "Client Portal"
                          : portalSession.role === "admin"
                            ? "Admin Dashboard"
                            : "Advisor Portal"}
                      </Link>
                      {portalSession.role === "admin" && (
                        <Link
                          href="/studio"
                          onClick={() => setUserMenuOpen(false)}
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-[var(--account-accent)]"
                        >
                          Website Studio
                        </Link>
                      )}
                      {portalSession.role === "client" && (
                        <a
                          href={`mailto:${company.email}?subject=Client%20Portal%20Support`}
                          onClick={() => setUserMenuOpen(false)}
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-[var(--account-accent)]"
                        >
                          <LifeBuoy size={15} className="text-[var(--account-accent)]" />
                          Support
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10"
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )
          ) : !isWorkspaceRoute ? (
            <div
              ref={portalMenuRef}
              className="portal-access hidden xl:block"
              onMouseEnter={() => setPortalMenuOpen(true)}
              onMouseLeave={() => setPortalMenuOpen(false)}
              onBlur={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                ) {
                  setPortalMenuOpen(false);
                }
              }}
            >
              <button
                type="button"
                className="portal-access-trigger"
                aria-haspopup="true"
                aria-expanded={portalMenuOpen}
                aria-controls="portal-access-menu"
                onClick={() => setPortalMenuOpen(true)}
              >
                PORTALS
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={`transition-transform ${portalMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {portalMenuOpen && (
                  <motion.nav
                    id="portal-access-menu"
                    className="portal-access-menu"
                    aria-label="Portal access"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: -6 }}
                    transition={reduceMotion ? { duration: 0 } : IOS_SPRING}
                  >
                    <Link
                      href="/portal/dashboard"
                      aria-label="CLIENT PORTAL"
                      className="portal-access-link"
                      onClick={() => setPortalMenuOpen(false)}
                    >
                      <span className="portal-access-icon"><UserRound size={18} aria-hidden="true" /></span>
                      <span>
                        <span className="portal-access-title">Client Portal</span>
                        <span className="portal-access-description">Open the client workspace</span>
                      </span>
                    </Link>
                    <Link
                      href="/advisor/login"
                      aria-label="ADVISOR PORTAL"
                      className="portal-access-link"
                      onClick={() => setPortalMenuOpen(false)}
                    >
                      <span className="portal-access-icon"><BriefcaseBusiness size={18} aria-hidden="true" /></span>
                      <span>
                        <span className="portal-access-title">Advisor Portal</span>
                        <span className="portal-access-description">Open the adviser workspace</span>
                      </span>
                    </Link>
                  </motion.nav>
                )}
              </AnimatePresence>
            </div>
          ) : null}

          {!isWorkspaceRoute && <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--foreground)] xl:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>}
        </div>
      </div>

      {showBrandStatement && (
        <div className="brand-statement-banner" role="region" aria-label="Firm statement">
          <span className="sr-only">Independent. Owner-Managed. Client-First</span>
          <div className="brand-statement-track" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <span className="brand-statement-copy" key={item}>
                Independent. Owner-Managed. Client-First
              </span>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {menuOpen && !isWorkspaceRoute && (
          <motion.nav
            ref={mobileMenuRef}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: -8 }}
            transition={reduceMotion ? { duration: 0 } : IOS_SPRING}
            className="glass-midnight-menu mobile-navigation absolute left-3 right-3 top-full px-4 py-4 xl:hidden"
            aria-label="Mobile navigation"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {links.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname === href ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 py-3 text-xs font-semibold tracking-[0.12em] text-white/80 hover:bg-white/10 hover:text-[#F3D889]"
                >
                  {label}
                </Link>
              ))}
              <div className="mobile-portal-access mt-2 border-t border-white/20 pt-3">
                <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.14em] text-white/65">PORTALS</p>
                <Link
                  href="/portal/dashboard"
                  onClick={() => setMenuOpen(false)}
                  aria-label="CLIENT PORTAL"
                  className="mobile-portal-link"
                >
                  <UserRound size={18} aria-hidden="true" />
                  <span>
                    <span className="portal-access-title">Client Portal</span>
                    <span className="portal-access-description">Open the client workspace</span>
                  </span>
                </Link>
                <Link
                  href="/advisor/login"
                  onClick={() => setMenuOpen(false)}
                  aria-label="ADVISOR PORTAL"
                  className="mobile-portal-link"
                >
                  <BriefcaseBusiness size={18} aria-hidden="true" />
                  <span>
                    <span className="portal-access-title">Advisor Portal</span>
                    <span className="portal-access-description">Open the adviser workspace</span>
                  </span>
                </Link>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
