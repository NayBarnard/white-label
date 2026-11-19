import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { enforcePublicRateLimit, readJsonBody } from "@/lib/server/rate-limit";

function isEmail(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const rateLimit = await enforcePublicRateLimit(request, "staffSignin");
  if (!rateLimit.ok) return rateLimit.response;

  const body = await readJsonBody(request, 4096);
  if (!body.ok) {
    return NextResponse.json(
      { error: "Sign-in information could not be read." },
      { status: body.reason === "too_large" ? 413 : 400 },
    );
  }

  const payload = body.value;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Sign-in information could not be read." }, { status: 400 });
  }
  const record = payload as Record<string, unknown>;
  if (!isEmail(record.email) || typeof record.password !== "string" || record.password.length < 1 || record.password.length > 256) {
    return NextResponse.json({ error: "We couldn't verify those details." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Staff sign-in is temporarily unavailable." }, { status: 503 });
  }

  try {
    const supabase = createClient<PortalDatabase>(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const result = await supabase.auth.signInWithPassword({
      email: record.email,
      password: record.password,
    });
    if (result.error || !result.data.user) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    if (!["adviser", "admin"].includes(String(result.data.user.app_metadata.role))) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Staff sign-in preflight failed.", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
