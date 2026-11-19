import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { parsePeopleAction } from "@/lib/people/validation";

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  try {
    const users: User[] = [];
    let page = 1;
    while (true) {
      const result = await access.supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) {
        console.error("People records could not be loaded.", result.error);
        return NextResponse.json({ error: "People records could not be loaded." }, { status: 502 });
      }
      users.push(...result.data.users);
      if (result.data.users.length < 1000) break;
      page += 1;
    }
    return NextResponse.json({
      people: users.map((user) => ({
        id: user.id,
        email: user.email ?? "",
        fullName: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "",
        role: typeof user.app_metadata.role === "string" ? user.app_metadata.role : "client",
        isActive: !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: user.created_at,
      })),
    });
  } catch (error) {
    console.error("People records could not be loaded.", error);
    return NextResponse.json({ error: "People records could not be loaded." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const body = await readJsonBody(request, 32 * 1024);
  if (!body.ok) {
    return NextResponse.json({ error: "The People request could not be read." }, { status: 400 });
  }
  const action = parsePeopleAction(body.value);
  if (!action) {
    return NextResponse.json({ error: "The People request is invalid." }, { status: 400 });
  }

  try {
    if (action.action === "invite") {
      if (action.role === "admin") {
        const confirm = body.value as Record<string, unknown>;
        if (typeof confirm.confirmEmail !== "string" ||
          confirm.confirmEmail.trim().toLowerCase() !== action.email) {
          return NextResponse.json({ error: "The new admin email must be typed to confirm." }, { status: 400 });
        }
      }
      const invited = await access.supabase.auth.admin.inviteUserByEmail(action.email, {
        redirectTo: new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.placeholder-am.co.za").toString(),
        data: { full_name: action.fullName },
      });
      if (invited.error || !invited.data.user) {
        console.error("Person invitation failed.", invited.error);
        return NextResponse.json({ error: "The invitation could not be sent." }, { status: 502 });
      }
      const updated = await access.supabase.auth.admin.updateUserById(invited.data.user.id, {
        app_metadata: { role: action.role },
      });
      if (updated.error) {
        await access.supabase.auth.admin.updateUserById(invited.data.user.id, {
          ban_duration: "876000h",
        });
        return NextResponse.json({ error: "The invitation could not be configured." }, { status: 502 });
      }
      const audited = await writeAdminAudit(
        access.supabase,
        access.user.id,
        "people.invite",
        "person",
        invited.data.user.id,
        { email: action.email, role: action.role, fullName: action.fullName },
      );
      if (!audited) {
        await access.supabase.auth.admin.updateUserById(invited.data.user.id, {
          ban_duration: "876000h",
        });
        return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, userId: invited.data.user.id });
    }

    if (action.action === "role") {
      const target = await access.supabase.auth.admin.getUserById(action.userId);
      if (target.error || !target.data.user) {
        return NextResponse.json({ error: "The person could not be found." }, { status: 404 });
      }
      const beforeRole = typeof target.data.user.app_metadata.role === "string"
        ? target.data.user.app_metadata.role
        : "client";
      if (beforeRole === "admin" && action.role !== "admin") {
        const users = await access.supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const activeAdmins = users.data?.users.filter((user) =>
          user.app_metadata.role === "admin" &&
          (!user.banned_until || new Date(user.banned_until).getTime() <= Date.now())
        ) ?? [];
        if (activeAdmins.length <= 1) {
          return NextResponse.json({ error: "At least one active administrator is required." }, { status: 409 });
        }
      }
      if (action.role === "admin") {
        const confirm = body.value as Record<string, unknown>;
        if (typeof confirm.confirmEmail !== "string" ||
          confirm.confirmEmail.trim().toLowerCase() !== (target.data.user.email ?? "").toLowerCase()) {
          return NextResponse.json({ error: "The target email must be typed to confirm." }, { status: 400 });
        }
      }
      const changed = await access.supabase.auth.admin.updateUserById(action.userId, {
        app_metadata: { role: action.role },
      });
      if (changed.error) {
        console.error("Person role could not be changed.", changed.error);
        return NextResponse.json({ error: "The role could not be changed." }, { status: 502 });
      }
      const audited = await writeAdminAudit(
        access.supabase,
        access.user.id,
        "people.role.change",
        "person",
        action.userId,
        { beforeRole, afterRole: action.role },
      );
      if (!audited) {
        await access.supabase.auth.admin.updateUserById(action.userId, {
          app_metadata: { role: beforeRole },
        });
        return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, role: action.role });
    }

    const target = await access.supabase.auth.admin.getUserById(action.userId);
    if (target.error || !target.data.user) {
      return NextResponse.json({ error: "The person could not be found." }, { status: 404 });
    }

    if (action.action === "deactivate") {
      if (target.data.user.app_metadata.role === "admin") {
        const users = await access.supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const activeAdmins = users.data?.users.filter((user) =>
          user.app_metadata.role === "admin" &&
          (!user.banned_until || new Date(user.banned_until).getTime() <= Date.now())
        ) ?? [];
        if (activeAdmins.length <= 1) {
          return NextResponse.json({ error: "At least one active administrator is required." }, { status: 409 });
        }
      }
      const changed = await access.supabase.auth.admin.updateUserById(action.userId, {
        ban_duration: "876000h",
      });
      if (changed.error) {
        return NextResponse.json({ error: "The account could not be deactivated." }, { status: 502 });
      }
      const audited = await writeAdminAudit(
        access.supabase, access.user.id, "people.deactivate", "person", action.userId, {},
      );
      if (!audited) {
        await access.supabase.auth.admin.updateUserById(action.userId, { ban_duration: "none" });
        return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action.action === "reactivate") {
      const changed = await access.supabase.auth.admin.updateUserById(action.userId, {
        ban_duration: "none",
      });
      if (changed.error) {
        return NextResponse.json({ error: "The account could not be reactivated." }, { status: 502 });
      }
      const audited = await writeAdminAudit(
        access.supabase, access.user.id, "people.reactivate", "person", action.userId, {},
      );
      if (!audited) {
        await access.supabase.auth.admin.updateUserById(action.userId, { ban_duration: "876000h" });
        return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action.action === "reset_password") {
      const email = target.data.user.email;
      if (!email) return NextResponse.json({ error: "The person has no email address." }, { status: 400 });
      const sent = await access.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/auth/callback?flow=recovery", process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.placeholder-am.co.za").toString(),
      });
      if (sent.error) {
        console.error("Password reset email could not be sent.", sent.error);
        return NextResponse.json({ error: "Password reset could not be initiated." }, { status: 502 });
      }
      const audited = await writeAdminAudit(
        access.supabase, access.user.id, "people.password_reset", "person", action.userId, { email },
      );
      if (!audited) return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const factors = await access.supabase.auth.admin.mfa.listFactors({ userId: action.userId });
    if (factors.error) {
      return NextResponse.json({ error: "MFA factors could not be listed." }, { status: 502 });
    }
    for (const factor of factors.data.factors) {
      const deleted = await access.supabase.auth.admin.mfa.deleteFactor({
        userId: action.userId,
        id: factor.id,
      });
      if (deleted.error) {
        console.error("MFA factor could not be reset.", deleted.error);
        return NextResponse.json({ error: "MFA could not be reset." }, { status: 502 });
      }
    }
    const audited = await writeAdminAudit(
      access.supabase, access.user.id, "people.mfa_reset", "person", action.userId,
      { factorCount: factors.data.factors.length },
    );
    if (!audited) {
      return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, factorCount: factors.data.factors.length });
  } catch (error) {
    console.error("People action failed.", error);
    return NextResponse.json({ error: "The People action could not be completed." }, { status: 502 });
  }
}
