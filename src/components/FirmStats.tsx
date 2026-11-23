import { BriefcaseBusiness, ChartNoAxesCombined, UsersRound } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { firmStats } from "@/data/firmData";

const statItems = [
  ...(typeof firmStats.yearsExperience === "number"
    ? [{ value: firmStats.yearsExperience, label: "Years combined investment experience", icon: BriefcaseBusiness }]
    : []),
  ...(typeof firmStats.investmentStrategies === "number"
    ? [{ value: firmStats.investmentStrategies, label: "Investment strategies", icon: ChartNoAxesCombined }]
    : []),
  ...(typeof firmStats.satisfiedClients === "number"
    ? [{ value: firmStats.satisfiedClients, label: "Satisfied clients", icon: UsersRound }]
    : []),
  ...(typeof firmStats.distributionPlatforms === "number"
    ? [{ value: firmStats.distributionPlatforms, label: "Distribution platforms", icon: ChartNoAxesCombined }]
    : []),
];

export function FirmStats({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {statItems.map(({ value, label, icon: Icon }) => (
        <div key={label} className="glass flex items-center gap-5 rounded-3xl p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-[var(--accent)]">
            <Icon size={22} />
          </span>
          <div>
            <p className="text-2xl font-semibold">
              <CountUp value={value} suffix={label === "Satisfied clients" ? "+" : ""} />
            </p>
            <p className="text-sm text-[var(--muted)]">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
