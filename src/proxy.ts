import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppMode, getRouteDisposition } from "@/lib/deployment/routing";
import type { PortalDatabase } from "@/lib/supabase/portal";

function addStaffSecurityHeaders(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const mode = getAppMode(process.env.APP_MODE);
  const disposition = getRouteDisposition(mode, request.nextUrl.pathname);

  if (disposition === "not-found") {
    const response = request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Not found." }, { status: 404 })
      : new NextResponse(null, { status: 404 });
    if (mode === "staff") {
      const nonce = btoa(crypto.randomUUID());
      const csp = createStaffContentSecurityPolicy(nonce);
      return addStaffSecurityHeaders(response, csp);
    }
    return response;
  }

  if (disposition === "redirect-to-login") {
    const response = NextResponse.redirect(new URL("/advisor/login", request.url));
    if (mode === "staff") {
      const nonce = btoa(crypto.randomUUID());
      const csp = createStaffContentSecurityPolicy(nonce);
      return addStaffSecurityHeaders(response, csp);
    }
    return response;
  }

  if (mode === "staff") {
    const nonce = btoa(crypto.randomUUID());
    const csp = createStaffContentSecurityPolicy(nonce);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addStaffSecurityHeaders(response, csp);
  }

  if (!request.nextUrl.pathname.startsWith("/portal")) return NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient<PortalDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

function createStaffContentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
