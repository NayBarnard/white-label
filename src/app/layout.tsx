import ConditionalTabBar from "@/components/ConditionalTabBar";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/IOSKit";
import { RouteAccentScope } from "@/components/RouteAccentScope";
import { PortalSessionProvider } from "@/components/PortalSessionProvider";
import { PortalInactivityGuard } from "@/components/PortalInactivityGuard";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { APP_MODE } from "@/config/deployment";
import { headers } from "next/headers";
import { loadTenantBranding } from "@/lib/branding/server";
import { TenantBrandProvider } from "@/components/TenantBrandProvider";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const branding = await loadTenantBranding(requestHeaders.get("host"));
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
      default: branding.tradingName,
      template: `%s | ${branding.tradingName}`,
    },
    description: "Secure wealth management platform.",
    ...(APP_MODE === "staff" ? { robots: { index: false, follow: false } } : {}),
    applicationName: branding.tradingName,
    icons: branding.faviconUrl
      ? { icon: branding.faviconUrl, apple: branding.logoUrl ?? undefined }
      : { icon: "/placeholder-logo.svg", apple: "/placeholder-logo.svg" },
    openGraph: {
      title: branding.tradingName,
      description: "Secure wealth management platform.",
      url: "/",
      siteName: branding.tradingName,
      type: "website",
      locale: "en_ZA",
    },
  };
}

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0A1124",
};

export const instant = false;

type LayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: LayoutProps) {
  const requestHeaders = await headers();
  const branding = await loadTenantBranding(requestHeaders.get("host"));
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col"
        style={{
          "--tenant-primary": branding.primaryColor,
          "--tenant-secondary": branding.secondaryColor,
          "--tenant-accent": branding.accentColor,
        } as React.CSSProperties}
      >
        <TenantBrandProvider branding={branding}>
        {APP_MODE === "public" && <ServiceWorkerRegistration />}
        <ThemeProvider>
          <PortalSessionProvider>
            <Navbar />
            <RouteAccentScope>
              <PortalInactivityGuard />
              <main className="flex flex-1 flex-col">
                <PageTransition>{children}</PageTransition>
              </main>
              <Footer />
              <ConditionalTabBar />
            </RouteAccentScope>
          </PortalSessionProvider>
        </ThemeProvider>
        </TenantBrandProvider>
      </body>
    </html>
  );
}
