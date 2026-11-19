export type SetupStatus = "green" | "amber" | "red";

export type SetupCheck = {
  id: string;
  title: string;
  status: SetupStatus;
  detail: string;
  nextStep: string;
};

export type EnvironmentCheck = SetupCheck & {
  variableName: string;
};

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export function getEnvironmentChecks(
  env: NodeJS.ProcessEnv = process.env,
): EnvironmentCheck[] {
  return requiredEnvironment.map((variableName) => {
    const present = Boolean(env[variableName]?.trim());
    return {
      id: variableName,
      variableName,
      title: variableName,
      status: present ? "green" : "red",
      detail: present ? "Present" : "Missing",
      nextStep: present ? "No action needed." : `Add ${variableName} to the deployment environment.`,
    };
  });
}

export const migrationChecks = [
  {
    id: "202611160001_admin_audit_log",
    migration: "202611160001_admin_audit_log.sql",
    table: "admin_audit_log",
    columns: ["id", "actor_user_id", "action", "target_type", "details", "created_at"],
  },
  {
    id: "202611160002_api_rate_limits",
    migration: "202611160002_api_rate_limits.sql",
    table: "api_rate_limits",
    columns: ["route_key", "ip_hash", "window_started_at", "request_count"],
  },
  {
    id: "202611160003_newsletter_consent_timestamps",
    migration: "202611160003_newsletter_consent_timestamps.sql",
    table: "newsletter_subscribers",
    columns: ["consented_at", "unsubscribed_at"],
  },
  {
    id: "202611160004_portal_data_deletion_request",
    migration: "202611160004_portal_data_deletion_request.sql",
    table: "client_portal_requests",
    columns: ["request_type"],
    constraintOnly: true,
  },
  {
    id: "202611160005_admin_audit_logs",
    migration: "202611160005_admin_audit_logs.sql",
    table: "admin_audit_logs",
    columns: ["id", "actor_user_id", "action", "target_type", "details", "created_at"],
  },
  {
    id: "202611160006_enquiry_consent_timestamps",
    migration: "202611160006_enquiry_consent_timestamps.sql",
    table: "enquiries",
    columns: ["consented_at"],
  },
  {
    id: "202611170001_manager_updates",
    migration: "202611170001_manager_updates.sql",
    table: "manager_updates",
    columns: ["id", "title", "body", "kind", "media_path", "status", "approved_by", "approved_at", "published_at", "created_at"],
  },
  {
    id: "202611170002_client_transaction_account_type",
    migration: "202611170002_client_transaction_account_type.sql",
    table: "client_transactions",
    columns: ["account_type"],
  },
  {
    id: "202611170003_client_goals",
    migration: "202611170003_client_goals.sql",
    table: "client_goals",
    columns: ["id", "user_id", "name", "target_amount", "target_date", "monthly_contribution", "assumed_annual_growth_percent", "created_at"],
  },
  {
    id: "202611170004_profile_mandate_requests",
    migration: "202611170004_profile_mandate_requests.sql",
    table: "client_portal_requests",
    columns: ["request_type"],
    constraintOnly: true,
  },
  {
    id: "202611180001_platform_availability",
    migration: "202611180001_platform_availability.sql",
    table: "platform_availability",
    columns: ["id", "share_class_id", "platform_id", "status", "platform_fund_code", "source", "verified_by", "verified_on"],
  },
] as const;

export const featureRequirements = [
  { key: "managerUpdates", envName: "NEXT_PUBLIC_FEATURE_MANAGER_UPDATES", needs: "Published, compliance-approved updates and private media storage." },
  { key: "taxYearCard", envName: "NEXT_PUBLIC_FEATURE_TAX_YEAR_CARD", needs: "Verified tax limits, the transaction account-type migration, and tax certificates." },
  { key: "goals", envName: "NEXT_PUBLIC_FEATURE_GOALS", needs: "The client goals migration and a tested client workflow." },
  { key: "profileRequests", envName: "NEXT_PUBLIC_FEATURE_PROFILE_REQUESTS", needs: "Staff verification and a process for completing requests." },
  { key: "onlineTopUps", envName: "NEXT_PUBLIC_FEATURE_ONLINE_TOP_UPS", needs: "A configured payment provider and reconciliation process." },
  { key: "eFica", envName: "NEXT_PUBLIC_FEATURE_E_FICA", needs: "Configured identity-verification providers and compliance review." },
  { key: "churnAlerts", envName: "NEXT_PUBLIC_FEATURE_CHURN_ALERTS", needs: "Approved alert rules and a restricted admin workflow." },
  { key: "pushNotifications", envName: "NEXT_PUBLIC_FEATURE_PUSH_NOTIFICATIONS", needs: "A notification-delivery provider and client consent workflow." },
  { key: "onboardingSubmit", envName: "NEXT_PUBLIC_FEATURE_ONBOARDING_SUBMIT", needs: "Staff handling for submitted questionnaires and consent checks." },
] as const;

export function statusClass(status: SetupStatus) {
  if (status === "green") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "red") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
}
