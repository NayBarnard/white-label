import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  try {
    const { data, error } = await access.supabase
      .from("client_portal_requests")
      .select("id,user_id,request_type,details,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Admin request list failed.", error);
      return NextResponse.json({ error: "Client requests could not be loaded." }, { status: 502 });
    }
    return NextResponse.json({ requests: data });
  } catch (error) {
    console.error("Admin request list failed.", error);
    return NextResponse.json({ error: "Client requests could not be loaded." }, { status: 502 });
  }
}
