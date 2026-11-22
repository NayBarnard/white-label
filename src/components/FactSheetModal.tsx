"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Maximize2, X } from "lucide-react";

type Props = {
  title: string;
  href: string;
};

export function FactSheetModal({ title, href }: Props) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Maximize2 size={16} /> PREVIEW FACT SHEET
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="factsheet-dialog-title"
            className="flex h-[min(900px,94dvh)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-2xl backdrop-blur-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--accent)]">
                  your firm · PRODUCT RESOURCE
                </p>
                <h2 id="factsheet-dialog-title" className="mt-1 text-sm font-semibold sm:text-base">
                  {title}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={href}
                  download={`${title.toLowerCase().replaceAll(" ", "-")}.pdf`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)] transition hover:-translate-y-0.5 hover:brightness-110 sm:text-sm"
                >
                  <ArrowDownToLine size={16} /> <span className="hidden sm:inline">DOWNLOAD PDF</span>
                  <span className="sm:hidden">DOWNLOAD</span>
                </a>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close fact sheet preview"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)]"
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 bg-[var(--surface)] p-2 sm:p-4">
              <iframe
                title={`${title} PDF preview`}
                src={`${href}?preview=1`}
                className="h-full w-full rounded-lg border border-[var(--border)] bg-[var(--background)]"
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
