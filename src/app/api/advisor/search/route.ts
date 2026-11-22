import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import { getStudioTenantId } from "@/lib/studio/tenant";
import type { PortalDatabase } from "@/lib/supabase/portal";

type SearchRow = {
  id: string;
  category: string;
  title: string;
  description: string;
  entity_type: string;
  entity_id: string | null;
  client_user_id: string | null;
  internal_path: string;
};

const permittedPrefixes = [
  "/advisor",
  "/advisor/clients/",
  "/advisor/platforms",
  "/insights",
  "/resources",
  "/portfolios",
  "/portal",
];

function isPermittedDestination(path: string): boolean {
  if (!path.startsWith("/") || path.includes("://") || path.includes("..")) return false;
  return permittedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

export async function GET(request: Request) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;

  const tenantId = getStudioTenantId(access.user.app_metadata);
  if (!tenantId) {
    return NextResponse.json({ error: "Your organisation access could not be verified." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (!query) return NextResponse.json({ results: [] });
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ error: "Search text must be between 2 and 100 characters." }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "12"), 1), 20);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Search is not configured." }, { status: 503 });
  }

  try {
    const supabase = createClient<PortalDatabase>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const search = await supabase
      .from("universal_search_records")
      .select("id,category,title,description,entity_type,entity_id,client_user_id,internal_path")
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .textSearch("search_vector", query, { type: "websearch", config: "english" })
      .limit(limit);

    if (search.error) {
      console.error("Universal adviser search failed.", search.error);
      return NextResponse.json({ error: "Search could not be completed." }, { status: 502 });
    }

    const rows = (search.data ?? []) as SearchRow[];
    const clientIds = Array.from(
      new Set(rows.map((row) => row.client_user_id).filter((id): id is string => Boolean(id))),
    );

    let authorisedClientIds = new Set<string>();
    if (access.user.app_metadata.role === "adviser" && clientIds.length > 0) {
      const relationships = await supabase
        .from("adviser_client_relationships")
        .select("client_user_id")
        .eq("tenant_id", tenantId)
        .eq("adviser_user_id", access.user.id)
        .eq("status", "active")
        .in("client_user_id", clientIds);
      if (relationships.error) {
        console.error("Adviser search relationships could not be verified.", relationships.error);
        return NextResponse.json({ error: "Search permissions could not be verified." }, { status: 502 });
      }
      authorisedClientIds = new Set(
        (relationships.data ?? []).map((relationship) => relationship.client_user_id),
      );
    }

    const results = rows
      .filter((row) => {
        if (!isPermittedDestination(row.internal_path)) return false;
        if (!row.client_user_id) return true;
        return access.user.app_metadata.role === "admin" || authorisedClientIds.has(row.client_user_id);
      })
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        category: row.category,
        title: row.title,
        description: row.description,
        href: row.internal_path,
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Universal adviser search failed.", error);
    return NextResponse.json({ error: "Search could not be completed." }, { status: 500 });
  }
}
