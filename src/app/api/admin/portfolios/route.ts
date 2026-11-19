import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { parsePortfolioAssignment } from "@/lib/admin/validation";
import type { PortalDatabase } from "@/lib/supabase/portal";

type ClientPortfolio = PortalDatabase["public"]["Tables"]["client_portfolios"]["Row"];

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "The portfolio assignment is not valid JSON." }, { status: 400 });
  }
  const assignment = parsePortfolioAssignment(input);
  if (!assignment) {
    return NextResponse.json({ error: "Complete the required fields with valid values." }, { status: 400 });
  }

  try {
    const { data: userResult, error: userError } = await access.supabase.auth.admin.getUserById(
      assignment.userId,
    );
    if (userError) {
      console.error("Admin portfolio client lookup failed.", userError);
      return NextResponse.json({ error: "The selected client could not be verified." }, { status: 502 });
    }
    if (!userResult.user || userResult.user.app_metadata.role === "admin") {
      return NextResponse.json({ error: "Select a valid client account." }, { status: 400 });
    }

    let existingPortfolio: ClientPortfolio | null = null;
    if (assignment.portfolioId) {
      const { data, error: existingError } = await access.supabase
        .from("client_portfolios")
        .select("*")
        .eq("id", assignment.portfolioId)
        .eq("user_id", assignment.userId)
        .maybeSingle();
      if (existingError) {
        console.error("Admin portfolio lookup failed.", existingError);
        return NextResponse.json({ error: "The selected portfolio could not be loaded." }, { status: 502 });
      }
      if (!data) {
        return NextResponse.json({ error: "The selected portfolio assignment was not found." }, { status: 404 });
      }
      existingPortfolio = data;
    }

    const portfolioValues = {
      label: assignment.label,
      valuation_zar: assignment.valuationZar,
      valuation_as_of: assignment.valuationAsOf,
      performance_percent: assignment.performancePercent,
      performance_period: assignment.performancePeriod,
    };
    const { data: portfolio, error } = existingPortfolio
      ? await access.supabase
          .from("client_portfolios")
          .update(portfolioValues)
          .eq("id", existingPortfolio.id)
          .eq("user_id", assignment.userId)
          .select("id")
          .single()
      : await access.supabase
          .from("client_portfolios")
          .insert({ user_id: assignment.userId, ...portfolioValues })
          .select("id")
          .single();
    if (error) {
      console.error("Admin portfolio assignment mutation failed.", error);
      return NextResponse.json({ error: "The portfolio could not be assigned." }, { status: 502 });
    }

    const audited = await writeAdminAudit(
      access.supabase,
      access.user.id,
      existingPortfolio ? "portfolio.updated" : "portfolio.assigned",
      "client_portfolios",
      portfolio.id,
      {
        client_user_id: assignment.userId,
        label: assignment.label,
        ...(existingPortfolio ? { previous_label: existingPortfolio.label } : {}),
      },
    );
    if (!audited) {
      const rollback = existingPortfolio
        ? await access.supabase
            .from("client_portfolios")
            .update({
              label: existingPortfolio.label,
              valuation_zar: existingPortfolio.valuation_zar,
              valuation_as_of: existingPortfolio.valuation_as_of,
              performance_percent: existingPortfolio.performance_percent,
              performance_period: existingPortfolio.performance_period,
            })
            .eq("id", existingPortfolio.id)
            .eq("user_id", assignment.userId)
        : await access.supabase
            .from("client_portfolios")
            .delete()
            .eq("id", portfolio.id)
            .eq("user_id", assignment.userId);
      if (rollback.error) {
        console.error("Admin portfolio rollback failed.", rollback.error);
      }
      return NextResponse.json(
        {
          error: rollback.error
            ? "The portfolio changed but its audit record could not be saved or reverted. Contact support."
            : "The portfolio change was reverted because its audit record could not be saved.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ id: portfolio.id });
  } catch (error) {
    console.error("Admin portfolio assignment failed.", error);
    return NextResponse.json({ error: "The portfolio could not be assigned." }, { status: 502 });
  }
}
