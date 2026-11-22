import { NextResponse } from "next/server";
import { verifyNewsletterUnsubscribeToken } from "@/lib/server/newsletter-unsubscribe";
import { enforcePublicRateLimit, readJsonBody } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const rateLimit = await enforcePublicRateLimit(request, "unsubscribe");
  if (!rateLimit.ok) return rateLimit.response;

  const parsedBody = await readJsonBody(request, 2 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { status: "error", error: "Provide a valid unsubscribe request." },
      { status: parsedBody.reason === "too_large" ? 413 : 400 },
    );
  }

  const body = parsedBody.value;
  const subscriptionId =
    typeof body === "object" && body !== null && "token" in body
      ? verifyNewsletterUnsubscribeToken(body.token)
      : null;
  if (subscriptionId === null) {
    return NextResponse.json(
      { status: "error", error: "This unsubscribe link is invalid. Please use the link from your subscription confirmation." },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { status: "error", error: "The unsubscribe service is temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/newsletter_subscribers?id=eq.${subscriptionId}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ unsubscribed_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", error: "The unsubscribe request could not be completed. Please try again later." },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json(
      { status: "error", error: "The unsubscribe service is temporarily unavailable." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: "unsubscribed",
    message: "Your email has been unsubscribed from your firm updates.",
  });
}
