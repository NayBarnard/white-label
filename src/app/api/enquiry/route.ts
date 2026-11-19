import { NextResponse } from "next/server";
import {
  saveSubmission,
  submissionErrorResponse,
} from "@/lib/server/submissions";
import { enforcePublicRateLimit, readJsonBody } from "@/lib/server/rate-limit";
import { features } from "@/config/features";

const inquiryTypes = [
  "General",
  "PLACEHOLDER BRAND Balanced",
  "PLACEHOLDER BRAND Cautious",
  "Partnership",
  "Other",
  "Onboarding questionnaire",
];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rateLimit = await enforcePublicRateLimit(request, "enquiry");
  if (!rateLimit.ok) return rateLimit.response;

  const parsedBody = await readJsonBody(request, 8 * 1024);
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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ status: "error", error: "Provide enquiry details." }, { status: 400 });
  }

  const fields = body as Record<string, unknown>;
  const { name, email, phone, company, inquiryType, message, popiConsent, website } = fields;
  if (inquiryType === "Onboarding questionnaire" && !features.onboardingSubmit) {
    return new Response(null, { status: 404 });
  }
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.length > 120 ||
    typeof email !== "string" ||
    !emailPattern.test(email) ||
    email.length > 254 ||
    typeof phone !== "string" ||
    phone.trim().length < 5 ||
    phone.length > 40 ||
    (company !== undefined && (typeof company !== "string" || company.length > 160)) ||
    (website !== undefined && (typeof website !== "string" || website.length > 160)) ||
    (typeof website === "string" && website.trim().length > 0) ||
    typeof inquiryType !== "string" ||
    !inquiryTypes.includes(inquiryType) ||
    typeof message !== "string" ||
    message.trim().length < 1 ||
    message.length > 500 ||
    popiConsent !== true
  ) {
    return NextResponse.json(
      {
        status: "error",
        error: "Check the required fields, message length (maximum 500 characters), and POPI Act consent.",
      },
      { status: 400 },
    );
  }

  try {
    await saveSubmission("enquiries", {
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      company: typeof company === "string" ? company.trim() : "",
      inquiry_type: inquiryType,
      message: message.trim(),
      popi_consent: true,
      consented_at: new Date().toISOString(),
    });
    return NextResponse.json(
      { status: "received", message: "Your enquiry has been received. Our team will respond within 2 business days." },
      { status: 201 },
    );
  } catch (error) {
    return submissionErrorResponse(error);
  }
}
