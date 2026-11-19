import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";

const policies = {
  enquiry: { limit: 5, windowSeconds: 15 * 60 },
  subscribe: { limit: 3, windowSeconds: 60 * 60 },
  unsubscribe: { limit: 20, windowSeconds: 60 * 60 },
  chat: { limit: 30, windowSeconds: 60 },
  staffSignin: { limit: 5, windowSeconds: 15 * 60 },
} as const;

type PublicRoute = keyof typeof policies;
type Bucket = { count: number; resetAt: number };

const localBuckets = new Map<string, Bucket>();

function getClientIp(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  const forwardedIp = forwarded?.split(",")[0]?.trim();
  if (forwardedIp) return forwardedIp;
  return process.env.NODE_ENV === "development" ? "127.0.0.1" : null;
}

function consumeLocalLimit(route: PublicRoute, ip: string) {
  const policy = policies[route];
  const key = `${route}:${ip}`;
  const now = Date.now();
  const bucket = localBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (localBuckets.size >= 10000) {
      for (const [bucketKey, entry] of localBuckets) {
        if (entry.resetAt <= now) localBuckets.delete(bucketKey);
        if (localBuckets.size < 5000) break;
      }
      if (localBuckets.size >= 10000) {
        const oldestKey = localBuckets.keys().next().value;
        if (oldestKey) localBuckets.delete(oldestKey);
      }
    }
    localBuckets.set(key, {
      count: 1,
      resetAt: now + policy.windowSeconds * 1000,
    });
    return { allowed: true, retryAfter: policy.windowSeconds };
  }

  bucket.count += 1;
  return {
    allowed: bucket.count <= policy.limit,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function rateLimitResponse(status: 429 | 503, retryAfter?: number) {
  const headers = retryAfter ? { "Retry-After": String(retryAfter) } : undefined;
  return NextResponse.json(
    {
      status: "error",
      error:
        status === 429
          ? "Too many requests. Please try again later."
          : "The request service is temporarily unavailable.",
    },
    { status, headers },
  );
}

export async function enforcePublicRateLimit(request: Request, route: PublicRoute) {
  const ip = getClientIp(request);
  if (!ip) return { ok: false as const, response: rateLimitResponse(503) };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("Public API rate limiting is unavailable because Supabase is not configured.");
      return { ok: false as const, response: rateLimitResponse(503) };
    }
    const result = consumeLocalLimit(route, ip);
    return result.allowed
      ? { ok: true as const }
      : { ok: false as const, response: rateLimitResponse(429, result.retryAfter) };
  }

  try {
    const ipHash = createHmac("sha256", serviceRoleKey).update(ip).digest("hex");
    const policy = policies[route];
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await supabase.rpc("consume_api_rate_limit", {
      p_route_key: route,
      p_ip_hash: ipHash,
      p_limit: policy.limit,
      p_window_seconds: policy.windowSeconds,
    });
    if (error || !data?.[0]) {
      if (error) console.error("Public API rate limit check failed.", error);
      return { ok: false as const, response: rateLimitResponse(503) };
    }
    return data[0].allowed
      ? { ok: true as const }
      : { ok: false as const, response: rateLimitResponse(429, data[0].retry_after) };
  } catch (error) {
    console.error("Public API rate limit check failed.", error);
    return { ok: false as const, response: rateLimitResponse(503) };
  }
}

export async function enforceAuthenticatedRateLimit(
  identity: string,
  route: string,
  limit: number,
  windowSeconds: number,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Authenticated API rate limiting is unavailable because Supabase is not configured.");
    return { ok: false as const, response: rateLimitResponse(503) };
  }
  try {
    const identityHash = createHmac("sha256", serviceRoleKey).update(identity).digest("hex");
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await supabase.rpc("consume_api_rate_limit", {
      p_route_key: route,
      p_ip_hash: identityHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error || !data?.[0]) {
      if (error) console.error("Authenticated API rate limit check failed.", error);
      return { ok: false as const, response: rateLimitResponse(503) };
    }
    return data[0].allowed
      ? { ok: true as const }
      : { ok: false as const, response: rateLimitResponse(429, data[0].retry_after) };
  } catch (error) {
    console.error("Authenticated API rate limit check failed.", error);
    return { ok: false as const, response: rateLimitResponse(503) };
  }
}

export async function readJsonBody(request: Request, maxBytes: number) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false as const, reason: "too_large" as const };
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false as const, reason: "invalid" as const };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false as const, reason: "too_large" as const };
      }
      chunks.push(value);
    }
    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true as const, value: JSON.parse(new TextDecoder().decode(body)) as unknown };
  } catch {
    return { ok: false as const, reason: "invalid" as const };
  }
}
