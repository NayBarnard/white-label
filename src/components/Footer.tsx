"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { company } from "@/data/firmData";

export function Footer() {
  const pathname = usePathname();
  const isWorkspaceRoute =
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/studio" ||
    pathname.startsWith("/studio/") ||
    pathname === "/advisor" ||
    pathname.startsWith("/advisor/");

  if (isWorkspaceRoute) {
    return (
      <footer className="workspace-footer mt-auto">
        <p>
          <span>© your firm | {company.workspaceFooterNotice}</span>
        </p>
      </footer>
    );
  }

  return (
    <footer className="public-footer mt-auto">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="space-y-2 text-sm leading-6 text-white/90">
          <p className="text-base font-semibold text-white">your firm</p>
          <p>Independent Investment Management</p>
          <p>{company.publicFooterNotice}</p>
          <p>Category: Discretionary Investment Management</p>
          <Link href="/insights" className="inline-flex min-h-11 items-center text-white underline-offset-4 hover:underline">
            Updates
          </Link>
        </div>

        <div>
          <h2 className="text-xs font-bold tracking-[0.16em] text-white">CONTACT</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-white/90">
            <li className="flex items-start gap-3">
              <Phone size={16} className="mt-1 shrink-0 text-white" aria-hidden="true" />
              <a href={`tel:${company.phone.replaceAll(" ", "")}`}>{company.phone}</a>
            </li>
            <li className="flex items-start gap-3">
              <Mail size={16} className="mt-1 shrink-0 text-white" aria-hidden="true" />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={16} className="mt-1 shrink-0 text-white" aria-hidden="true" />
              <span>{company.address}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-white/20 px-5 py-5 text-xs text-white/85 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span>© 2026 your firm. All rights reserved.</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal links">
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <Link href="/api/documents/popi-act-statement" className="hover:text-white">POPIA Compliance</Link>
        </nav>
      </div>
    </footer>
  );
}
