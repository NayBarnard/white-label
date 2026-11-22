import { connection, NextResponse } from "next/server";

type FundRow = {
  id: string;
  name: string;
  benchmark: string;
  inception_date: string | null;
};

type MetricRow = {
  fund_id: string;
  metric_date: string;
  nav: number | string;
  benchmark_nav: number | string;
  benchmark_name: string | null;
  updated_at: string;
};

function numericValue(value: number | string): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url && !key) {
    return NextResponse.json({
      source: "Published performance data",
      updatedAt: null,
      funds: [],
      observations: [],
    });
  }
  if (!url || !key) {
    return NextResponse.json(
      { error: "Fund comparison storage is only partially configured." },
      { status: 503 },
    );
  }

  try {
    const baseUrl = url.replace(/\/$/, "");
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const fundsUrl = new URL("/rest/v1/funds", baseUrl);
    fundsUrl.search = new URLSearchParams({
      select: "id,name,benchmark,inception_date",
      is_active: "eq.true",
      order: "id.asc",
    }).toString();
    const metricsUrl = new URL("/rest/v1/fund_metrics", baseUrl);
    metricsUrl.search = new URLSearchParams({
      select: "fund_id,metric_date,nav,benchmark_nav,benchmark_name,updated_at",
      fund_id: "not.is.null",
      metric_date: "not.is.null",
      nav: "not.is.null",
      benchmark_nav: "not.is.null",
      order: "metric_date.asc",
      limit: "5000",
    }).toString();

    const [fundsResponse, metricsResponse] = await Promise.all([
      fetch(fundsUrl, {
        headers,
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(metricsUrl, {
        headers,
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10_000),
      }),
    ]);
    if (!fundsResponse.ok || !metricsResponse.ok) {
      return NextResponse.json(
        { error: "Fund comparison data could not be loaded." },
        { status: 502 },
      );
    }

    const [fundRows, metricRows] = (await Promise.all([
      fundsResponse.json(),
      metricsResponse.json(),
    ])) as [FundRow[], MetricRow[]];
    const funds = fundRows.map((fund) => ({
      id: fund.id,
      name: fund.name,
      benchmark: fund.benchmark,
      inceptionDate: fund.inception_date,
    }));
    const observations = metricRows.flatMap((row) => {
      const nav = numericValue(row.nav);
      const benchmarkNav = numericValue(row.benchmark_nav);
      if (
        nav === null ||
        nav <= 0 ||
        benchmarkNav === null ||
        benchmarkNav <= 0 ||
        !row.metric_date
      ) {
        return [];
      }
      return [{
        fundId: row.fund_id,
        date: row.metric_date,
        nav,
        benchmarkNav,
        benchmarkName: row.benchmark_name,
      }];
    });
    const updatedAt = metricRows.reduce<string | null>((latest, row) => {
      if (!latest || row.updated_at > latest) return row.updated_at;
      return latest;
    }, null);

    return NextResponse.json({
      source: "your firm fund data",
      updatedAt,
      funds,
      observations,
    });
  } catch {
    return NextResponse.json(
      { error: "The fund comparison service could not be reached." },
      { status: 502 },
    );
  }
}
