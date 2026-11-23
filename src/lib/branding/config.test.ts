import { describe, expect, it } from "vitest";
import { isHexColor, resolveTenantBranding } from "./config";

describe("tenant branding", () => {
  it("uses validated tenant values and safe defaults", () => {
    expect(resolveTenantBranding({
      name: "North Wealth",
      trading_name: "North",
      logo_url: "/tenant-logo.svg",
      favicon_url: "/tenant.ico",
      primary_color: "#123ABC",
      secondary_color: "red",
      accent_color: null,
      typography: { family: "Inter" },
      contact_details: { email: "hello@north.example" },
      website_url: "https://north.example",
      login_branding: { headline: "Welcome" },
      email_branding: {},
      document_branding: {},
    })).toMatchObject({
      name: "North Wealth",
      tradingName: "North",
      primaryColor: "#123ABC",
      secondaryColor: "#D4AF37",
      accentColor: "#805C0A",
      typography: { family: "Inter" },
      contactDetails: { email: "hello@north.example" },
    });
  });

  it("only accepts six-digit hex colours", () => {
    expect(isHexColor("#a1b2c3")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("rgb(1,2,3)")).toBe(false);
  });
});
