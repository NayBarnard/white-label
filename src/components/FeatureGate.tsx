import Link from "next/link";
import type { ReactNode } from "react";
import type { FeatureName } from "@/config/features";
import { features } from "@/config/features";

export function FeatureGate({
  feature,
  children,
}: {
  feature: FeatureName;
  children: ReactNode;
}) {
  return features[feature] ? children : null;
}

export function FeatureLink({
  feature,
  href,
  children,
  className,
}: {
  feature: FeatureName;
  href: string;
  children: ReactNode;
  className?: string;
}) {
  if (!features[feature]) return null;
  return <Link href={href} className={className}>{children}</Link>;
}
