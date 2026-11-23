import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";
import type { PortalDatabase } from "@/lib/supabase/portal";

type ClientPortfolio = PortalDatabase["public"]["Tables"]["client_portfolios"]["Row"];

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const tenantId = access.user.app_metadata.tenant_id;
  if (typeof tenantId !== "string") {
    return NextResponse.json({ error: "Organisation access could not be verified." }, { status: 403 });
  }

  try {
    const users: User[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await access.supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) {
        console.error("Admin client list failed.", error);
        return NextResponse.json({ error: "Client records could not be loaded." }, { status: 502 });
      }
      users.push(...data.users);
      if (data.users.length < 1000) break;
      page += 1;
    }

    const clients = users
      .filter((user) =>
        user.app_metadata.tenant_id === tenantId &&
        (user.app_metadata.role === "client" || user.app_metadata.role === undefined)
      )
      .map((user) => ({
        id: user.id,
        email: user.email ?? "",
        name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "",
      }));
    const clientIds = clients.map((client) => client.id);
    const chunks = Array.from({ length: Math.ceil(clientIds.length / 200) }, (_, index) =>
      clientIds.slice(index * 200, (index + 1) * 200),
    );
    const portfolioResults = await Promise.all(
      chunks.map((ids) =>
        access.supabase
          .from("client_portfolios")
          .select("id,user_id,label,created_at,valuation_zar,valuation_as_of,performance_percent,performance_period")
          .in("user_id", ids)
          .order("created_at", { ascending: false }),
      ),
    );
    const portfolioError = portfolioResults.find((result) => result.error)?.error;
    if (portfolioError) {
      console.error("Admin client portfolios could not be loaded.", portfolioError);
      return NextResponse.json({ error: "Client portfolio assignments could not be loaded." }, { status: 502 });
    }

    const portfoliosByUserId = new Map<string, ClientPortfolio[]>();
    for (const result of portfolioResults) {
      for (const portfolio of result.data ?? []) {
        const existing = portfoliosByUserId.get(portfolio.user_id) ?? [];
        existing.push(portfolio);
        portfoliosByUserId.set(portfolio.user_id, existing);
      }
    }

    return NextResponse.json({
      clients: clients.map((client) => ({
        ...client,
        portfolios: portfoliosByUserId.get(client.id) ?? [],
      })),
    });
  } catch (error) {
    console.error("Admin client list failed.", error);
    return NextResponse.json({ error: "Client records could not be loaded." }, { status: 502 });
  }
}
