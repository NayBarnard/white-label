import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isUuid } from "@/lib/admin/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const { userId } = await context.params;
  if (!isUuid(userId)) {
    return NextResponse.json({ error: "The staff account is invalid." }, { status: 400 });
  }
  if (userId === access.user.id) {
    return NextResponse.json({ error: "Use My account to manage your own MFA devices." }, { status: 400 });
  }

  const body = await readJsonBody(request, 4096);
  if (!body.ok) {
    return NextResponse.json({ error: "The confirmation could not be read." }, { status: 400 });
  }
  const payload = body.value;
  const record = payload as Record<string, unknown>;
  if (typeof record.confirmEmail !== "string") {
    return NextResponse.json({ error: "The staff email is required." }, { status: 400 });
  }

  try {
    const target = await access.supabase.auth.admin.getUserById(userId);
    if (target.error || !target.data.user) {
      return NextResponse.json({ error: "The staff account could not be found." }, { status: 404 });
    }
    const targetEmail = target.data.user.email?.trim();
    if (!targetEmail || record.confirmEmail.trim().toLowerCase() !== targetEmail.toLowerCase()) {
      return NextResponse.json({ error: "The staff email does not match." }, { status: 400 });
    }

    const factors = await access.supabase.auth.admin.mfa.listFactors({ userId });
    if (factors.error) {
      console.error("Staff MFA factors could not be listed.", factors.error);
      return NextResponse.json({ error: "MFA could not be reset right now." }, { status: 502 });
    }
    for (const factor of factors.data.factors) {
      const deleted = await access.supabase.auth.admin.mfa.deleteFactor({ userId, id: factor.id });
      if (deleted.error) {
        console.error("A staff MFA factor could not be deleted.", deleted.error);
        return NextResponse.json({ error: "MFA could not be reset right now." }, { status: 502 });
      }
    }

    const audited = await writeAdminAudit(
      access.supabase,
      access.user.id,
      "staff.mfa.reset",
      "staff",
      userId,
      { targetEmail, factorCount: factors.data.factors.length },
    );
    if (!audited) {
      return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, resetFactorCount: factors.data.factors.length });
  } catch (error) {
    console.error("Staff MFA reset failed.", error);
    return NextResponse.json({ error: "MFA could not be reset right now." }, { status: 502 });
  }
}
