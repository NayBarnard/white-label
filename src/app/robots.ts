import type { MetadataRoute } from "next";
import { APP_MODE } from "@/config/deployment";

export default function robots(): MetadataRoute.Robots {
  if (APP_MODE === "staff") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.placeholder-am.co.za").replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
