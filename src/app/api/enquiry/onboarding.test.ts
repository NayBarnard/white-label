import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  onboardingSubmit: false,
  saveSubmission: vi.fn(),
}));

vi.mock("@/config/features", () => ({
  features: {
    get onboardingSubmit() {
      return mocks.onboardingSubmit;
    },
  },
}));

vi.mock("@/lib/server/submissions", () => ({
  saveSubmission: mocks.saveSubmission,
  submissionErrorResponse: () => Response.json(
    { status: "error", error: "The enquiry could not be saved." },
    { status: 500 },
  ),
}));

vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/rate-limit")>(
    "@/lib/server/rate-limit",
  );
  return {
    ...actual,
    enforcePublicRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  };
});

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/enquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validQuestionnaire = {
  name: "Investor",
  email: "investor@example.com",
  phone: "+27213001582",
  company: "",
  website: "",
  inquiryType: "Onboarding questionnaire",
  message: "Risk tolerance: Moderate\nTime horizon: 3 to 5 years",
  popiConsent: true,
};

afterEach(() => {
  mocks.onboardingSubmit = false;
  mocks.saveSubmission.mockReset();
});

describe("onboarding enquiry submission", () => {
  it("returns 404 when the onboarding submission flag is off", async () => {
    const response = await POST(request(validQuestionnaire));
    expect(response.status).toBe(404);
    expect(mocks.saveSubmission).not.toHaveBeenCalled();
  });

  it("reuses enquiry validation, consent and persistence when enabled", async () => {
    mocks.onboardingSubmit = true;
    mocks.saveSubmission.mockResolvedValue(undefined);
    const response = await POST(request(validQuestionnaire));

    expect(response.status).toBe(201);
    expect(mocks.saveSubmission).toHaveBeenCalledWith(
      "enquiries",
      expect.objectContaining({
        inquiry_type: "Onboarding questionnaire",
        message: validQuestionnaire.message,
        popi_consent: true,
        email: "investor@example.com",
      }),
    );
    const stored = mocks.saveSubmission.mock.calls[0]?.[1] as { consented_at: string };
    expect(Number.isFinite(Date.parse(stored.consented_at))).toBe(true);
  });

  it("rejects missing consent, invalid phone details, and a filled honeypot", async () => {
    mocks.onboardingSubmit = true;
    for (const body of [
      { ...validQuestionnaire, popiConsent: false },
      { ...validQuestionnaire, phone: "1" },
      { ...validQuestionnaire, website: "spam" },
    ]) {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
    }
    expect(mocks.saveSubmission).not.toHaveBeenCalled();
  });
});
