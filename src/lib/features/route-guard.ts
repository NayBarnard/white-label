import { features, type FeatureName } from "@/config/features";

export function disabledFeatureResponse(feature: FeatureName): Response | null {
  return features[feature] ? null : new Response(null, { status: 404 });
}
