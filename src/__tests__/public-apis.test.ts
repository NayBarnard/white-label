import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST as postChat } from "@/app/api/chat/route";
import { POST as postEnquiry } from "@/app/api/enquiry/route";
import { POST as postSubscribe } from "@/app/api/subscribe/route";
import { POST as postUnsubscribe } from "@/app/api/unsubscribe/route";
import { enforcePublicRateLimit } from "@/lib/server/rate-limit";
import { createNewsletterUnsubscribeToken } from "@/lib/server/newsletter-unsubscribe";

vi.mock("@/lib/server/rate-limit", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/server/rate-limit")>("@/lib/server/rate-limit");
  return {
    ...actual,
    enforcePublicRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  };
});

function request(path: string, value: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

function successfulResponse(body?: string, status = 201) {
  return new Response(body ?? null, { status });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("public API validation", () => {
  it("returns a sanitized rate-limit response before processing a request", async () => {
    vi.mocked(enforcePublicRateLimit).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json(
        { status: "error", error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    });
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(request("/api/chat", { message: "hello" }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(body.error).toBe("Too many requests. Please try again later.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid enquiry without contacting Supabase", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = await postEnquiry(
      request("/api/enquiry", { name: "A", email: "not-an-email" }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects newsletter signup without explicit consent", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = await postSubscribe(
      request("/api/subscribe", { email: "investor@example.com", consent: false }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records the ISO timestamp for enquiry consent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(successfulResponse(undefined));
    vi.stubGlobal("fetch", fetchMock);

    const response = await postEnquiry(
      request("/api/enquiry", {
        name: "Investor",
        email: "investor@example.com",
        phone: "0213001582",
        company: "",
        inquiryType: "General",
        message: "Please contact me.",
        popiConsent: true,
        website: "",
      }),
    );
    const submission = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      popi_consent: boolean;
      consented_at: string;
    };

    expect(response.status).toBe(201);
    expect(submission.popi_consent).toBe(true);
    expect(Number.isFinite(Date.parse(submission.consented_at))).toBe(true);
    expect(new Date(submission.consented_at).toISOString()).toBe(submission.consented_at);
  });

  it("rejects a chat message that exceeds the server limit", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = await postChat(request("/api/chat", { message: "x".repeat(1001) }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the chat knowledge-base fallback available without an AI key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(request("/api/chat", { message: "What is the FSP number?" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toContain("622");
    expect(body.disclaimer).toContain("does not provide personalized financial advice");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses conveplaceholdertion context to answer a follow-up when AI is unavailable", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(request("/api/chat", {
      message: "And what about Cautious?",
      history: [
        { role: "user", content: "What are the fees for Balanced?" },
        { role: "assistant", content: "Balanced fees are not published." },
      ],
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toContain("PLACEHOLDER BRAND Cautious Strategy");
    expect(body.answer).toContain("TER: not published");
  });

  it("rejects malformed or oversized chat history", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(request("/api/chat", {
      message: "What are the fees?",
      history: Array.from({ length: 5 }, () => ({ role: "user", content: "Earlier question" })),
    }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends validated conveplaceholdertion history to the AI service", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "PLACEHOLDER BRAND Cautious Strategy fees are not published." } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(request("/api/chat", {
      message: "And what about Cautious?",
      history: [{ role: "user", content: "What are the fees for Balanced?" }],
    }));
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      messages: { role: string; content: string }[];
    };

    expect(response.status).toBe(200);
    expect(body.messages).toEqual(expect.arrayContaining([
      { role: "user", content: "What are the fees for Balanced?" },
      { role: "user", content: "And what about Cautious?" },
    ]));
  });

  it("replaces AI answers that claim access to all data", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "I have access to all the data." } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await postChat(request("/api/chat", { message: "What can you help me with?" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).not.toContain("access to all the data");
    expect(body.answer).toContain("published PLACEHOLDER BRAND information");
  });

  it("rejects oversized JSON before parsing or persistence", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = await postSubscribe(
      new Request("http://localhost/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "5000",
        },
        body: JSON.stringify({ email: "investor@example.com", consent: true }),
      }),
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("newsletter unsubscribe", () => {
  it("returns an unsubscribe link after recording a consented signup", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successfulResponse(JSON.stringify([{ id: 17 }])),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await postSubscribe(
      request("/api/subscribe", {
        email: "investor@example.com",
        consent: true,
        website: "",
      }),
    );
    const body = await response.json();
    const token = new URL(body.unsubscribeUrl, "http://localhost").searchParams.get("token");

    expect(response.status).toBe(201);
    expect(body.status).toBe("subscribed");
    expect(token).toBe(createNewsletterUnsubscribeToken(17));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      consent: true,
      email: "investor@example.com",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).consented_at).toBeTruthy();
  });

  it("does not update a subscription when the signed link is invalid", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = await postUnsubscribe(
      request("/api/unsubscribe", { token: "12.invalid" }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records an unsubscribe for a valid signed link", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(successfulResponse(undefined, 204));
    vi.stubGlobal("fetch", fetchMock);
    const token = createNewsletterUnsubscribeToken(17);

    const response = await postUnsubscribe(request("/api/unsubscribe", { token }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unsubscribed");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/newsletter_subscribers?id=eq.17",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
