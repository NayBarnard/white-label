import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { parseSupportReply } from "@/lib/admin/validation";

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  try {
    const { data, error } = await access.supabase
      .from("client_support_messages")
      .select("id,user_id,sender_role,message,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Admin support inbox load failed.", error);
      return NextResponse.json({ error: "Support messages could not be loaded." }, { status: 502 });
    }
    return NextResponse.json({ messages: data });
  } catch (error) {
    console.error("Admin support inbox load failed.", error);
    return NextResponse.json({ error: "Support messages could not be loaded." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "The support reply is not valid JSON." }, { status: 400 });
  }
  const reply = parseSupportReply(input);
  if (!reply) {
    return NextResponse.json({ error: "Provide a valid client ID and a message of up to 2,000 characters." }, { status: 400 });
  }

  try {
    const { data: userResult, error: userError } = await access.supabase.auth.admin.getUserById(
      reply.userId,
    );
    if (userError) {
      console.error("Admin support client lookup failed.", userError);
      return NextResponse.json({ error: "The selected client could not be verified." }, { status: 502 });
    }
    if (!userResult.user || userResult.user.app_metadata.role === "admin") {
      return NextResponse.json({ error: "Select a valid client account." }, { status: 400 });
    }

    const { data: message, error } = await access.supabase
      .from("client_support_messages")
      .insert({
        user_id: reply.userId,
        sender_role: "manager",
        message: reply.message,
      })
      .select("id")
      .single();
    if (error) {
      console.error("Admin support reply failed.", error);
      return NextResponse.json({ error: "The support reply could not be saved." }, { status: 502 });
    }

    const audited = await writeAdminAudit(
      access.supabase,
      access.user.id,
      "support.reply_sent",
      "client_support_messages",
      message.id,
      { client_user_id: reply.userId },
    );
    if (!audited) {
      const { error: rollbackError } = await access.supabase
        .from("client_support_messages")
        .delete()
        .eq("id", message.id)
        .eq("user_id", reply.userId);
      if (rollbackError) console.error("Admin support reply rollback failed.", rollbackError);
      return NextResponse.json(
        {
          error: rollbackError
            ? "The reply was saved but its audit record could not be saved or reverted. Contact support."
            : "The reply was reverted because its audit record could not be saved.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ id: message.id });
  } catch (error) {
    console.error("Admin support reply failed.", error);
    return NextResponse.json({ error: "The support reply could not be saved." }, { status: 502 });
  }
}
