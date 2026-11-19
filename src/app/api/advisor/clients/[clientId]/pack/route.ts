import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import { writeAdminAudit } from "@/lib/admin/server";
import { isUuid } from "@/lib/admin/validation";
import { readJsonBody } from "@/lib/server/rate-limit";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { company, strategies, fundFacts } from "@/data/firmData";

function wrappedText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, width: number, size: number) {
  const words = text.replace(/[^\x20-\x7E]/g, "-").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId } = await context.params;
  if (!isUuid(clientId)) {
    return NextResponse.json({ error: "The client reference is invalid." }, { status: 400 });
  }
  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The pack selection could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  const fundIds = Array.isArray(record.fundIds)
    ? record.fundIds.filter((value): value is string => typeof value === "string").slice(0, 4)
    : [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Adviser pack generation is not configured." }, { status: 503 });
  }

  try {
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const relationship = await supabase
      .from("adviser_client_relationships")
      .select("id")
      .eq("adviser_user_id", access.user.id)
      .eq("client_user_id", clientId)
      .eq("status", "active")
      .maybeSingle();
    if (relationship.error) {
      console.error("Adviser pack relationship check failed.", relationship.error);
      return NextResponse.json({ error: "The client relationship could not be verified." }, { status: 502 });
    }
    if (!relationship.data) {
      return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });
    }

    const [target, portfolios] = await Promise.all([
      supabase.auth.admin.getUserById(clientId),
      supabase.from("client_portfolios").select("id,label,valuation_zar,valuation_as_of").eq("user_id", clientId),
    ]);
    if (target.error || !target.data.user) {
      return NextResponse.json({ error: "The client could not be found." }, { status: 404 });
    }
    if (portfolios.error) {
      console.error("Adviser pack portfolio lookup failed.", portfolios.error);
      return NextResponse.json({ error: "The client portfolio could not be loaded." }, { status: 502 });
    }

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]);
    let y = 790;
    page.drawText(company.legalName.toUpperCase(), { x: 48, y, size: 12, font: bold, color: rgb(0.75, 0.55, 0.18) });
    y -= 38;
    page.drawText("CLIENT ADVISER PACK", { x: 48, y, size: 22, font: bold, color: rgb(0.06, 0.11, 0.22) });
    y -= 24;
    page.drawText(`Client reference: ${clientId}`, { x: 48, y, size: 9, font: regular, color: rgb(0.25, 0.32, 0.42) });
    y -= 18;
    page.drawText(`Generated: ${new Date().toISOString().slice(0, 10)}`, { x: 48, y, size: 9, font: regular, color: rgb(0.25, 0.32, 0.42) });

    y -= 36;
    page.drawText("Document index", { x: 48, y, size: 14, font: bold, color: rgb(0.06, 0.11, 0.22) });
    y -= 24;

    const portfolioLines = [
      `Client: ${typeof target.data.user.user_metadata.full_name === "string" ? target.data.user.user_metadata.full_name : target.data.user.email ?? "Not reported"}`,
      `${portfolios.data.length} investment account(s) linked.`,
    ];
    for (const portfolio of portfolios.data) {
      const value = portfolio.valuation_zar === null
        ? "Value not reported"
        : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(portfolio.valuation_zar);
      portfolioLines.push(`${portfolio.label}: ${value}${portfolio.valuation_as_of ? ` (as at ${portfolio.valuation_as_of})` : ""}`);
    }
    const fundLines = fundIds.length
      ? fundIds.flatMap((fundId) => {
          const strategy = strategies.find((item) => item.id === fundId);
          if (!strategy) return [];
          if (fundId !== "balanced" && fundId !== "cautious") return [];
          const facts = fundFacts[fundId];
          return [
            `${strategy.title}`,
            `Benchmark: ${facts.benchmark ?? "Not published"}`,
            `ISIN: ${facts.isin ?? "Not published"} | JSE code: ${facts.jseCode ?? "Not published"}`,
            `Source/as-at: ${facts.source ?? "Not published"} / ${facts.assetAllocationAsAt ?? "Not published"}`,
          ];
        })
      : ["No funds were selected."];

    for (const section of [
      ["Portfolio summary", portfolioLines],
      ["Selected funds", fundLines],
      ["Unavailable sections", ["Any missing client values, fund facts, performance, fees or allocation information is intentionally omitted."]],
      ["Important disclosure", ["This document is for authorised adviser use and does not guarantee investment outcomes."]],
    ] as const) {
      y -= 24;
      page.drawText(section[0], { x: 48, y, size: 12, font: bold, color: rgb(0.06, 0.11, 0.22) });
      y -= 16;
      for (const line of section[1]) {
        for (const wrapped of wrappedText(line, regular, 499, 9)) {
          if (y < 70) {
            page = pdf.addPage([595, 842]);
            y = 790;
          }
          page.drawText(wrapped, { x: 48, y, size: 9, font: regular, color: rgb(0.25, 0.32, 0.42) });
          y -= 14;
        }
      }
    }

    const bytes = await pdf.save();
    await writeAdminAudit(
      supabase,
      access.user.id,
      "adviser_pack.generated",
      "client",
      clientId,
      { fundIds },
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="placeholder-adviser-pack-${clientId}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Adviser pack could not be generated.", error);
    return NextResponse.json({ error: "The adviser pack could not be generated." }, { status: 500 });
  }
}
