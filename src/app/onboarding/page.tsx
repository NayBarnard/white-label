import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { LargeTitle } from "@/components/IOSKit";

export const metadata: Metadata = {
  title: "Investor onboarding",
  description: "Begin your PLACEHOLDER BRAND onboarding journey with a simple investor services workflow.",
  openGraph: {
    title: "Investor onboarding",
    description: "Begin your PLACEHOLDER BRAND onboarding journey with a simple investor services workflow.",
    url: "/onboarding",
  },
};

export default function OnboardingPage() {
  return (
    <div className="flex-1">
      <LargeTitle
        eyebrow="INVESTOR SERVICES"
        title="Start a conveplaceholdertion about investing."
        description={
          <>
            Prepare a local, preliminary investor summary to review with your financial
            advisor. Official application and identity-verification steps are completed
            separately.
          </>
        }
      />
      <OnboardingWizard />
    </div>
  );
}
