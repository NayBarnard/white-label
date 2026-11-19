export const APP_MODE: "public" | "staff" =
  process.env.NEXT_PUBLIC_APP_MODE === "staff" ? "staff" : "public";
