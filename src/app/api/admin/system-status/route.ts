import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const envNames = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ];
  const missing = envNames.filter((name) => !process.env[name]);
  const storage = await access.supabase.storage.listBuckets();
  if (storage.error) {
    console.error("Storage connectivity check failed.", storage.error);
  }
  const buckets = storage.data?.map((bucket) => bucket.id) ?? [];
  return NextResponse.json({
    database: "connected",
    storage: storage.error ? "unavailable" : "connected",
    email: "not-verified",
    deployedVersion: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.npm_package_version ?? "not-reported",
    missingEnvironmentNames: missing,
    buckets,
  });
}
