import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const tenantId = access.user.app_metadata.tenant_id;
  if (typeof tenantId !== "string") {
    return NextResponse.json({ error: "Organisation access could not be verified." }, { status: 403 });
  }

  const [people, relationships, tasks, onboarding] = await Promise.all([
    access.supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    access.supabase
      .from("adviser_client_relationships")
      .select("client_user_id,adviser_user_id,status")
      .eq("tenant_id", tenantId),
    access.supabase
      .from("wealth_os_tasks")
      .select("id,completed_at")
      .eq("tenant_id", tenantId),
    access.supabase
      .from("wealth_os_firm_onboarding")
      .select("status")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  if (people.error || relationships.error || tasks.error || onboarding.error) {
    return NextResponse.json({ error: "Firm overview could not be loaded." }, { status: 502 });
  }

  const tenantPeople = people.data.users.filter((user) => user.app_metadata.tenant_id === tenantId);
  const advisers = tenantPeople.filter((user) => user.app_metadata.role === "adviser");
  const clients = tenantPeople.filter((user) => user.app_metadata.role === "client");
  const tenantUserIds = tenantPeople.map((user) => user.id);
  const notifications = tenantUserIds.length
    ? await access.supabase
        .from("portal_notifications")
        .select("id,read_at")
        .in("user_id", tenantUserIds)
    : { data: [], error: null };
  if (notifications.error) {
    return NextResponse.json({ error: "Firm notifications could not be loaded." }, { status: 502 });
  }
  const relationshipClientIds = new Set(
    (relationships.data ?? [])
      .filter((relationship) => relationship.status === "active")
      .map((relationship) => relationship.client_user_id),
  );

  return NextResponse.json({
    overview: {
      clients: clients.length,
      assignedClients: relationshipClientIds.size,
      advisers: advisers.length,
      openTasks: (tasks.data ?? []).filter((task) => task.completed_at === null).length,
      unreadNotifications: (notifications.data ?? []).filter((notification) => notification.read_at === null).length,
      onboardingStatus: onboarding.data?.status ?? "created",
    },
  });
}
