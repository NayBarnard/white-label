import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";

export async function GET(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  let query = access.supabase
    .from("admin_audit_logs")
    .select("id,actor_user_id,action,target_type,target_id,details,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  const person = url.searchParams.get("person");
  const action = url.searchParams.get("action");
  const area = url.searchParams.get("area");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (person) query = query.eq("actor_user_id", person);
  if (action) query = query.ilike("action", `%${action}%`);
  if (area) query = query.ilike("target_type", `%${area}%`);
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  const result = await query;
  if (result.error) {
    console.error("Audit log could not be loaded.", result.error);
    return NextResponse.json({ error: "The audit log could not be loaded." }, { status: 502 });
  }
  if (url.searchParams.get("format") === "csv") {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
    const rows = [
      ["id", "actor_user_id", "action", "target_type", "target_id", "details", "created_at"].join(","),
      ...result.data.map((entry) =>
        [
          entry.id,
          entry.actor_user_id,
          entry.action,
          entry.target_type,
          entry.target_id,
          JSON.stringify(entry.details),
          entry.created_at,
        ].map(escape).join(","),
      ),
    ].join("\n");
    return new Response(rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="placeholder-audit-log.csv"',
      },
    });
  }
  return NextResponse.json({ entries: result.data });
}
