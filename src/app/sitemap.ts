import type { MetadataRoute } from "next";
import { APP_MODE } from "@/config/deployment";

export default function sitemap(): MetadataRoute.Sitemap {
  if (APP_MODE === "staff") return [];

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.placeholder-am.co.za").replace(/\/$/, "");

  return [
    "",
    "/about",
    "/contact",
    "/insights",
    "/onboarding",
    "/portfolios",
    "/privacy",
    "/resources",
    "/terms",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
