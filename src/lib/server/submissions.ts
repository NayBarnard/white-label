import {
  MissingServerEnvironmentError,
  requireServerEnv,
} from "@/lib/server/env";

type SubmissionTable = "enquiries" | "newsletter_subscribers";

export class SubmissionStorageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SubmissionStorageError";
  }
}

export function saveSubmission(
  table: "newsletter_subscribers",
  values: Record<string, string | boolean>,
): Promise<number>;
export function saveSubmission(
  table: "enquiries",
  values: Record<string, string | boolean>,
): Promise<void>;
export async function saveSubmission(
  table: SubmissionTable,
  values: Record<string, string | boolean>,
): Promise<number | void> {
  let url: string;
  let key: string;
  try {
    const env = requireServerEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
    url = env.NEXT_PUBLIC_SUPABASE_URL;
    key = env.SUPABASE_SERVICE_ROLE_KEY;
  } catch (error) {
    if (!(error instanceof MissingServerEnvironmentError)) throw error;
    console.error(error.message);
    throw new SubmissionStorageError(
      "Online form delivery is not configured. Please contact PLACEHOLDER BRAND directly.",
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: table === "newsletter_subscribers" ? "return=representation" : "return=minimal",
      },
      body: JSON.stringify(values),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new SubmissionStorageError(
      "The submission service could not be reached. Please try again.",
      502,
    );
  }

  if (!response.ok) {
    throw new SubmissionStorageError(
      "The submission could not be stored. Please try again or contact PLACEHOLDER BRAND directly.",
      502,
    );
  }

  if (table === "newsletter_subscribers") {
    let rows: unknown;
    try {
      rows = await response.json();
    } catch {
      throw new SubmissionStorageError(
        "The subscription was saved, but its unsubscribe link could not be created.",
        502,
      );
    }
    if (
      !Array.isArray(rows) ||
      typeof rows[0] !== "object" ||
      rows[0] === null ||
      !("id" in rows[0]) ||
      typeof rows[0].id !== "number" ||
      !Number.isSafeInteger(rows[0].id) ||
      rows[0].id < 1
    ) {
      throw new SubmissionStorageError(
        "The subscription was saved, but its unsubscribe link could not be created.",
        502,
      );
    }
    return rows[0].id;
  }
}

export function submissionErrorResponse(error: unknown) {
  if (error instanceof SubmissionStorageError) {
    return Response.json({ status: "error", error: error.message }, { status: error.status });
  }
  return Response.json(
    { status: "error", error: "An unexpected submission error occurred." },
    { status: 500 },
  );
}
