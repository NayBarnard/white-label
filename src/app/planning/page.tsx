import type { Metadata } from "next";
import { WealthPlanningLab } from "@/components/WealthPlanningLab";

export const metadata: Metadata = {
  title: "Wealth planning lab",
  description: "Transparent local financial planning illustrations.",
};

export default function PlanningPage() {
  return <WealthPlanningLab />;
}
