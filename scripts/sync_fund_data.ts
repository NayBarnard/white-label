import { loadEnvConfig } from "@next/env";
import { fundMetricsSnapshot } from "../src/data/firmData";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before syncing fund data.",
  );
}

const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/fund_metrics?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify({
    id: "latest",
    updated_at: new Date().toISOString(),
    metrics: fundMetricsSnapshot,
  }),
  signal: AbortSignal.timeout(15000),
});

if (!response.ok) {
  const detail = await response.text();
  throw new Error(`Fund metrics sync failed (${response.status}): ${detail}`);
}

console.info("Fund metrics synced successfully.");
