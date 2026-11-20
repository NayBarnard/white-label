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
import { company } from "@/data/firmData";
import { APP_MODE } from "@/config/deployment";
import { headers } from "next/headers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${company.legalName} | Independent Fund Management`,
    template: `%s | ${company.legalName}`,
  },
  description:
    "Genuinely diversified, cost-conscious fund management, so you can focus on relations, and not portfolio construction.",
  ...(APP_MODE === "staff" ? { robots: { index: false, follow: false } } : {}),
  applicationName: company.legalName,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "placeholder",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  keywords: [
    company.legalName,
    "discretionary investment management",
    "South African fund management",
    "diversified investment",
    "FAIS compliant",
  ],
  openGraph: {
    title: company.legalName,
    description:
      "Independent discretionary investment management with a client-first, cost-conscious approach.",
    url: "/",
    siteName: company.legalName,
    type: "website",
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title: company.legalName,
    description:
      "Independent discretionary investment management with a client-first, cost-conscious approach.",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0A1124",
};

export const instant = false;

type LayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: LayoutProps) {
  if (APP_MODE === "staff") await headers();
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
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
      </body>
    </html>
  );
}
