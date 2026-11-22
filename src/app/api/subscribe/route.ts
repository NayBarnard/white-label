import { NextResponse } from "next/server";
import {
  saveSubmission,
  submissionErrorResponse,
} from "@/lib/server/submissions";
import { createNewsletterUnsubscribeToken } from "@/lib/server/newsletter-unsubscribe";
import { enforcePublicRateLimit, readJsonBody } from "@/lib/server/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rateLimit = await enforcePublicRateLimit(request, "subscribe");
  if (!rateLimit.ok) return rateLimit.response;

  const parsedBody = await readJsonBody(request, 4 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json(
      {
        status: "error",
        error:
          parsedBody.reason === "too_large"
            ? "Request body exceeds the allowed size."
            : "Request body must be valid JSON.",
      },
      { status: parsedBody.reason === "too_large" ? 413 : 400 },
    );
  }
  const body = parsedBody.value;

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof body.email !== "string" ||
    !emailPattern.test(body.email) ||
    body.email.length > 254 ||
    ("website" in body &&
      (typeof body.website !== "string" ||
        body.website.length > 160 ||
        body.website.trim().length > 0)) ||
    !("consent" in body) ||
    body.consent !== true
  ) {
    return NextResponse.json(
      { status: "error", error: "Provide a valid email address and consent to receive updates." },
      { status: 400 },
    );
  }

  try {
    const subscriptionId = await saveSubmission("newsletter_subscribers", {
      email: body.email.trim().toLowerCase(),
      consent: true,
      consented_at: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        status: "subscribed",
        message: "Thank you for subscribing to your firm updates.",
        unsubscribeUrl: `/unsubscribe?token=${encodeURIComponent(createNewsletterUnsubscribeToken(subscriptionId))}`,
      },
      { status: 201 },
    );
  } catch (error) {
    return submissionErrorResponse(error);
  }
}
