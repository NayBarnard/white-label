import { LargeTitle } from "@/components/IOSKit";
import { company } from "@/data/firmData";

export default function OfflinePage() {
  return (
    <div className="flex-1">
      <LargeTitle
        eyebrow="CONNECTION STATUS"
        title="You're offline"
        description="Reconnect to the internet to continue browsing. You can still ask the PLACEHOLDER BRAND AI Assistant about published site information."
      />
      <section className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <div className="placeholder-glass-card rounded-2xl p-5 text-sm leading-6 text-[var(--muted)] sm:p-7">
          <p>For assistance, contact PLACEHOLDER BRAND:</p>
          <ul className="mt-3 space-y-2">
            <li>
              <a className="font-semibold text-[var(--foreground)] underline" href={`tel:${company.phone.replaceAll(" ", "")}`}>
                {company.phone}
              </a>
            </li>
            <li>
              <a className="font-semibold text-[var(--foreground)] underline" href={`mailto:${company.email}`}>
                {company.email}
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
