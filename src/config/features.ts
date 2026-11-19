function enabled(value: string | undefined): boolean {
  return value === "true";
}

export const features = {
  managerUpdates: enabled(process.env.NEXT_PUBLIC_FEATURE_MANAGER_UPDATES),
  taxYearCard: enabled(process.env.NEXT_PUBLIC_FEATURE_TAX_YEAR_CARD),
  goals: enabled(process.env.NEXT_PUBLIC_FEATURE_GOALS),
  profileRequests: enabled(process.env.NEXT_PUBLIC_FEATURE_PROFILE_REQUESTS),
  onlineTopUps: enabled(process.env.NEXT_PUBLIC_FEATURE_ONLINE_TOP_UPS),
  eFica: enabled(process.env.NEXT_PUBLIC_FEATURE_E_FICA),
  churnAlerts: enabled(process.env.NEXT_PUBLIC_FEATURE_CHURN_ALERTS),
  pushNotifications: enabled(process.env.NEXT_PUBLIC_FEATURE_PUSH_NOTIFICATIONS),
  onboardingSubmit: enabled(process.env.NEXT_PUBLIC_FEATURE_ONBOARDING_SUBMIT),
} as const satisfies Readonly<Record<string, boolean>>;

export type FeatureName = keyof typeof features;
