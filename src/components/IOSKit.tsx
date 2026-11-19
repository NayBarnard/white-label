"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { usePathname } from "next/navigation";
import { Home, LineChart, Newspaper, X } from "lucide-react";
import { FloatingChatbot } from "@/components/FloatingChatbot";

export const IOS_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export function GlassCard({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={`glass-card ${className}`} {...props}>
      {children}
    </section>
  );
}

export function GlassInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`glass-input ${className}`} {...props} />;
}

export function GlassSelect({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`glass-input glass-select ${className}`} {...props}>
      {children}
    </select>
  );
}

type GlassDropdownProps = {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
};

export function GlassDropdown({ label, value, options, onChange }: GlassDropdownProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointerDown, true);
  }, [open]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div ref={dropdownRef} className="glass-dropdown">
      <button
        type="button"
        className="glass-input glass-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? label}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            id={id}
            className="glass-popover"
            role="listbox"
            aria-label={label}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: -4 }}
            transition={reduceMotion ? { duration: 0 } : IOS_SPRING}
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  className="glass-option"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LargeTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const springScroll = useSpring(scrollY, IOS_SPRING);
  const scale = useTransform(springScroll, [0, 180], [1, reduceMotion ? 1 : 0.88]);
  const y = useTransform(springScroll, [0, 180], [0, reduceMotion ? 0 : -16]);

  return (
    <header className="large-title-wrap">
      <motion.div className="large-title-inner" style={{ scale, y }}>
        <p className="large-title-eyebrow">{eyebrow}</p>
        <h1 className="large-title-heading">{title}</h1>
        {description ? <p className="large-title-description">{description}</p> : null}
        {children}
      </motion.div>
    </header>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [firstPathname] = useState(pathname);
  return (
    <motion.div
      key={pathname}
      initial={
        reduceMotion || firstPathname === pathname
          ? false
          : { opacity: 0, y: 8 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : IOS_SPRING}
    >
      {children}
    </motion.div>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const chatOpenRef = useRef(false);
  const isStudio = pathname.startsWith("/studio");

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    function showIsland() {
      setVisible(true);
    }

    function handleScroll() {
      setVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!chatOpenRef.current) setVisible(false);
      }, 5000);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchstart", showIsland, { passive: true });
    window.addEventListener("pointerdown", showIsland, { passive: true });
    window.addEventListener("keydown", showIsland);

    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", showIsland);
      window.removeEventListener("pointerdown", showIsland);
      window.removeEventListener("keydown", showIsland);
    };
  }, []);

  function handleChatOpenChange(open: boolean) {
    chatOpenRef.current = open;
    setChatOpen(open);
    if (open) setVisible(true);
  }

  const tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/portfolios", label: "Funds", icon: LineChart },
    { href: "/insights", label: "Insights", icon: Newspaper },
  ];

  return (
    <div className={`floating-island${visible || chatOpen ? "" : " island-hidden"}`}>
      <nav
        className={`ios-tabbar gold-glass-dock${isStudio ? " ios-tabbar-chat-only" : ""}`}
        aria-label={isStudio ? "Assistant" : "Primary"}
        aria-hidden={!visible && !chatOpen}
        inert={!visible && !chatOpen}
      >
        {!isStudio &&
          tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={active ? "ios-tab ios-tab-active" : "ios-tab"}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        <FloatingChatbot onOpenChange={handleChatOpenChange} />
      </nav>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  className = "",
  id,
  backdropClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  id?: string;
  backdropClassName?: string;
}) {
  const reduceMotion = useReducedMotion();
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("button, a, input, select, textarea")?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        sheetRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      if (openerRef.current && openerRef.current !== document.body) {
        openerRef.current.focus();
      }
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`sheet-backdrop ${backdropClassName}`}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : IOS_SPRING}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            className={`glass-strong ios-sheet ${className}`}
            ref={sheetRef}
            id={id}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduceMotion ? undefined : { y: "100%" }}
            transition={reduceMotion ? { duration: 0 } : IOS_SPRING}
            drag={reduceMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="sheet-heading">
              <span className="sheet-handle" aria-hidden="true" />
              <h2>{title}</h2>
              <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            <div className="sheet-content">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ChartCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`glass chart-card ${className}`}>{children}</section>;
}

export function ChartSkeleton({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`chart-skeleton ${className}`}
      role="status"
      aria-label="Loading chart"
      animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { ...IOS_SPRING, repeat: Infinity, repeatDelay: 0.8 }
      }
    />
  );
}
