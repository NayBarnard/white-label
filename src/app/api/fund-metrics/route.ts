import { connection, NextResponse } from "next/server";
import { fundMetricsSnapshot } from "@/data/firmData";

export async function GET() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url && !key) {
    return NextResponse.json({
      source: "Published factual data",
      updatedAt: null,
      metrics: fundMetricsSnapshot,
    });
  }
  if (!url || !key) {
    return NextResponse.json(
      { error: "Fund metrics storage is only partially configured." },
      { status: 503 },
    );
  }

  const endpoint = new URL("/rest/v1/fund_metrics", url);
  endpoint.search = new URLSearchParams({
    select: "updated_at,metrics",
    id: "eq.latest",
    limit: "1",
  }).toString();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json(
      { error: "The fund metrics service could not be reached." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "The fund metrics service returned an error." },
      { status: 502 },
    );
  }

  let rows: {
    updated_at: string;
    metrics: typeof fundMetricsSnapshot;
  }[];
  try {
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error("Invalid fund metrics response.");
    rows = body as {
      updated_at: string;
      metrics: typeof fundMetricsSnapshot;
    }[];
  } catch {
    return NextResponse.json(
      { error: "The fund metrics service returned an invalid response." },
      { status: 502 },
    );
  }
  const latest = rows[0];
  return NextResponse.json({
    source: "PLACEHOLDER BRAND fund data",
    updatedAt: latest?.updated_at ?? null,
    metrics: latest?.metrics ?? fundMetricsSnapshot,
  });
}
