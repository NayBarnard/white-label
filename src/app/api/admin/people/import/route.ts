import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { parseEmail } from "@/lib/people/validation";
import { writeAdminAudit } from "@/lib/admin/server";

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const body = await readJsonBody(request, 128 * 1024);
  if (!body.ok) {
    return NextResponse.json({ error: "The CSV preview could not be read." }, { status: 400 });
  }
  const record = body.value as Record<string, unknown>;
  if (!record || typeof record.csv !== "string") {
    return NextResponse.json({ error: "The CSV preview could not be read." }, { status: 400 });
  }
  const lines = record.csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 501) {
    return NextResponse.json({ error: "CSV imports are limited to 500 clients plus a header." }, { status: 400 });
  }
  const rows = lines.slice(1).slice(0, 500).map((line, index) => {
    const [emailCell, fullNameCell, adviserEmailCell] = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    const email = parseEmail(emailCell);
    return {
      row: index + 2,
      email: email ?? "",
      fullName: (fullNameCell ?? "").slice(0, 160),
      adviserEmail: (adviserEmailCell ?? "").slice(0, 254),
      errors: email ? [] : ["Email address is missing or invalid"],
    };
  });
  if (record.confirmed === true) {
    const valid = rows.filter((row) => row.errors.length === 0);
    if (valid.length === 0) {
      return NextResponse.json({ preview: false, confirmed: false, rows, error: "No valid client rows can be imported." }, { status: 400 });
    }
    let invitedCount = 0;
    for (const row of valid) {
      const invited = await access.supabase.auth.admin.inviteUserByEmail(row.email, {
        redirectTo: new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.placeholder-am.co.za").toString(),
        data: { full_name: row.fullName || row.email.split("@")[0] },
      });
      if (invited.error || !invited.data.user) {
        return NextResponse.json({
          preview: false,
          confirmed: false,
          rows,
          error: "The import stopped before all rows were written.",
        }, { status: 502 });
      }
      const updated = await access.supabase.auth.admin.updateUserById(invited.data.user.id, {
        app_metadata: { role: "client" },
      });
      if (updated.error) {
        await access.supabase.auth.admin.updateUserById(invited.data.user.id, { ban_duration: "876000h" });
        return NextResponse.json({ preview: false, confirmed: false, rows, error: "The import could not assign client roles." }, { status: 502 });
      }
      const audited = await writeAdminAudit(
        access.supabase,
        access.user.id,
        "people.import.client",
        "person",
        invited.data.user.id,
        { email: row.email, row: row.row },
      );
      if (!audited) {
        await access.supabase.auth.admin.updateUserById(invited.data.user.id, { ban_duration: "876000h" });
        return NextResponse.json({ preview: false, confirmed: false, rows, error: "The import stopped because audit logging failed." }, { status: 500 });
      }
      invitedCount += 1;
    }
    return NextResponse.json({ preview: false, confirmed: true, invitedCount, rows });
  }
  return NextResponse.json({ preview: true, confirmed: false, rows });
}
