import type { Metadata } from "next";
import { WealthOSWelcome } from "@/components/studio/WealthOSWelcome";

export const metadata: Metadata = {
  title: "Start a WEALTH OS project",
  description: "Create a local white-label website project.",
};

export default function WealthOSWelcomePage() {
  return <WealthOSWelcome />;
}
