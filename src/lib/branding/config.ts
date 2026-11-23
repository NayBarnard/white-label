export type TenantBranding = {
  name: string;
  tradingName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  typography: Record<string, unknown>;
  contactDetails: Record<string, unknown>;
  websiteUrl: string | null;
  loginBranding: Record<string, unknown>;
  emailBranding: Record<string, unknown>;
  documentBranding: Record<string, unknown>;
};

export type TenantBrandingRow = {
  name: string;
  trading_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  typography: unknown;
  contact_details: unknown;
  website_url: string | null;
  login_branding: unknown;
  email_branding: unknown;
  document_branding: unknown;
};

export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  name: "WEALTH OS",
  tradingName: "WEALTH OS",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#0A1124",
  secondaryColor: "#D4AF37",
  accentColor: "#805C0A",
  typography: {},
  contactDetails: {},
  websiteUrl: null,
  loginBranding: {},
  emailBranding: {},
  documentBranding: {},
};

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function resolveTenantBranding(row: TenantBrandingRow): TenantBranding {
  return {
    name: row.name.trim() || DEFAULT_TENANT_BRANDING.name,
    tradingName: row.trading_name.trim() || DEFAULT_TENANT_BRANDING.tradingName,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    primaryColor: isHexColor(row.primary_color) ? row.primary_color : DEFAULT_TENANT_BRANDING.primaryColor,
    secondaryColor: isHexColor(row.secondary_color) ? row.secondary_color : DEFAULT_TENANT_BRANDING.secondaryColor,
    accentColor: isHexColor(row.accent_color) ? row.accent_color : DEFAULT_TENANT_BRANDING.accentColor,
    typography: isObject(row.typography) ? row.typography : {},
    contactDetails: isObject(row.contact_details) ? row.contact_details : {},
    websiteUrl: row.website_url,
    loginBranding: isObject(row.login_branding) ? row.login_branding : {},
    emailBranding: isObject(row.email_branding) ? row.email_branding : {},
    documentBranding: isObject(row.document_branding) ? row.document_branding : {},
  };
}
