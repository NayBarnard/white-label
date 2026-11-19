import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PLACEHOLDER BRAND",
    short_name: "placeholder",
    start_url: "/",
    display: "standalone",
    background_color: "#0A1124",
    theme_color: "#0A1124",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Client Portal", short_name: "Portal", url: "/portal" },
      { name: "Funds", short_name: "Funds", url: "/portfolios" },
    ],
  };
}
