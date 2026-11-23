import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import type { PortalDatabase } from "@/lib/supabase/portal";

export async function GET() {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "The adviser client directory is not configured." },
      { status: 503 },
    );
  }

  try {
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { data: relationships, error: relationshipError } = await supabase
      .from("adviser_client_relationships")
      .select("client_user_id,status")
      .eq("adviser_user_id", access.user.id)
      .eq("status", "active");
    if (relationshipError) {
      console.error("Adviser client relationships could not be loaded.", relationshipError);
      return NextResponse.json({ error: "Client records could not be loaded." }, { status: 502 });
    }

    const clientIds = Array.from(new Set(
      (relationships ?? []).map((relationship) => relationship.client_user_id),
    ));
    if (clientIds.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    const users: User[] = [];
    let page = 1;
    while (true) {
      const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) {
        console.error("Adviser client users could not be loaded.", result.error);
        return NextResponse.json({ error: "Client records could not be loaded." }, { status: 502 });
      }
      users.push(...result.data.users);
      if (result.data.users.length < 1000) break;
      page += 1;
    }

    const authorisedUsers = users.filter((user) => clientIds.includes(user.id));
    const chunks = Array.from(
      { length: Math.ceil(authorisedUsers.length / 200) },
      (_, index) => authorisedUsers.slice(index * 200, (index + 1) * 200).map((user) => user.id),
    );
    const portfolioResults = await Promise.all(
      chunks.map((ids) =>
        supabase
          .from("client_portfolios")
          .select("id,tenant_id,user_id,label,valuation_zar,valuation_as_of,performance_percent,performance_period")
          .in("user_id", ids)
          .order("created_at", { ascending: false }),
      ),
    );
    const portfolioError = portfolioResults.find((result) => result.error)?.error;
    if (portfolioError) {
      console.error("Adviser client portfolios could not be loaded.", portfolioError);
      return NextResponse.json({ error: "Client portfolio records could not be loaded." }, { status: 502 });
    }

    const portfoliosByUser = new Map<string, Array<Record<string, unknown>>>();
    for (const result of portfolioResults) {
      for (const portfolio of result.data ?? []) {
        const existing = portfoliosByUser.get(portfolio.user_id) ?? [];
        existing.push(portfolio);
        portfoliosByUser.set(portfolio.user_id, existing);
      }
    }

    return NextResponse.json({
      clients: authorisedUsers.map((user) => ({
        id: user.id,
        email: user.email ?? "",
        name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "",
        isActive: !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
        portfolios: portfoliosByUser.get(user.id) ?? [],
      })),
    });
  } catch (error) {
    console.error("Adviser client directory failed.", error);
    return NextResponse.json({ error: "Client records could not be loaded." }, { status: 500 });
  }
}
