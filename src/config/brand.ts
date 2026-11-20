export const brand = {
  companyName: "Example Wealth",
  legalName: "Example Wealth",
  tagline: "A considered approach to long-term wealth.",
  websiteTitle: "Example Wealth",
  logo: "/icons/apple-touch-icon.png",
  favicon: "/app/favicon.ico",
  colors: {
    primary: "#D4AF37",
    accent: "#805C0A",
    background: "#F8F9FC",
  },
  contact: {
    phone: "+27 10 000 0000",
    email: "hello@examplewealth.example",
    address: "100 Demonstration Avenue, Example City",
  },
  currency: "ZAR",
  locale: "en-ZA",
  navigation: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Investment Solutions", href: "/portfolios" },
    { label: "Insights", href: "/insights" },
    { label: "Resources", href: "/resources" },
    { label: "Contact", href: "/contact" },
  ],
  footer: "Illustrative platform. Not a regulated service or investment offer.",
} as const;
