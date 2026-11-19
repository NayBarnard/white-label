import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PortalDatabase } from "@/lib/supabase/portal";
import {
  company,
  documents,
  performanceDisclosures,
  strategies,
} from "@/data/firmData";

const publishedPdfFiles: Record<string, string> = {
  "placeholder-balanced-fact-sheet": "placeholder-balanced-fact-sheet.pdf",
  "placeholder-cautious-fact-sheet": "placeholder-cautious-fact-sheet.pdf",
  "conflict-of-interest-policy": "conflict-of-interest-policy.pdf",
  "complaints-resolution-policy": "complaints-resolution-policy.pdf",
  "popi-act-statement": "popi-act-statement.pdf",
  "paia-manual": "paia-manual.pdf",
};

function documentLines(slug: string, name: string) {
  const strategy = strategies.find((item) => `${item.id === "balanced" ? "placeholder-balanced" : "placeholder-cautious"}-fact-sheet` === slug);
  if (!strategy) {
    return [
      "This generated request copy is not an official application form or compliance policy.",
      `Please contact your financial advisor or ${company.legalName} to obtain the current official document.`,
      "",
      `Phone: ${company.phone}`,
      `Email: ${company.email}`,
      `Address: ${company.address}`,
    ];
  }

  return [
    `Investor profile: ${strategy.profile}`,
    `Benchmark: ${strategy.benchmark}`,
    `Performance as at: ${strategy.performanceDate}`,
    `Source: ${strategy.source}`,
    `Inception date: ${strategy.inceptionDate}`,
    "",
    "Cumulative performance:",
    `1 month: ${strategy.cumulative.oneMonth}`,
    `1 year: ${strategy.cumulative.oneYear} (benchmark: ${strategy.cumulative.oneYearBenchmark})`,
    `3 years: ${strategy.cumulative.threeYear} (benchmark: ${strategy.cumulative.threeYearBenchmark})`,
    "",
    "Annualised performance:",
    `3 years: ${strategy.annualised.threeYear} (benchmark: ${strategy.annualised.threeYearBenchmark})`,
    `5 years: ${strategy.annualised.fiveYear} (benchmark: ${strategy.annualised.fiveYearBenchmark})`,
    "",
    "Risk statistics (standard deviation):",
    `1 year: ${strategy.risk.oneYear}`,
    `3 years: ${strategy.risk.threeYears}`,
    `1-year performance since inception - high: ${strategy.sinceInceptionOneYear.high}; low: ${strategy.sinceInceptionOneYear.low}`,
    "",
    "Past performance is not necessarily a guide to future performance.",
    "Investment values may fluctuate, and investors may not get back the amount invested.",
    "",
    `For further information contact ${company.email} or ${company.phone}.`,
    `Document: ${name}`,
    performanceDisclosures.pastPerformance,
  ];
}

function ascii(text: string) {
  return text.replace(/[^\x20-\x7E]/g, "-");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const document = documents.find((item) => item.slug === slug);
  const searchParams = new URL(request.url).searchParams;
  const requestedVersion = searchParams.get("version");
  if (requestedVersion !== null && (!/^\d+$/.test(requestedVersion) || Number(requestedVersion) < 1)) {
    return NextResponse.json({ error: "The document version is invalid." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const publishedQuery = supabase
      .from("site_documents")
      .select("object_path,version")
      .eq("slug", slug)
      .eq("status", "published")
      .order("version", { ascending: false })
      .order("effective_date", { ascending: false })
      .limit(1);
    const published = await publishedQuery.maybeSingle();
    if (published.error) {
      console.error("Published site document could not be loaded.", published.error);
      return NextResponse.json({ error: "The document could not be opened." }, { status: 502 });
    }
    if (published.data?.object_path) {
      if (requestedVersion !== null && published.data.version !== Number(requestedVersion)) {
        return NextResponse.json(
          { error: "This document version is archived and is not available for current use." },
          { status: 409 },
        );
      }
      const signed = await supabase.storage
        .from("firm-documents")
        .createSignedUrl(published.data.object_path, 60, { download: true });
      if (signed.error || !signed.data?.signedUrl) {
        console.error("Published site document could not be signed.", signed.error);
        return NextResponse.json({ error: "The document could not be opened." }, { status: 502 });
      }
      return NextResponse.redirect(signed.data.signedUrl, { status: 302 });
    }
  }

  if (!document || requestedVersion !== null) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const publishedFile = publishedPdfFiles[slug];
  if (publishedFile) {
    try {
      const file = await readFile(path.join(process.cwd(), "public", "documents", publishedFile));
      const preview = searchParams.get("preview") === "1";
      return new Response(new Uint8Array(file), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${publishedFile}"`,
          "Cache-Control": preview ? "private, no-store" : "public, max-age=3600",
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        return NextResponse.json({ error: "The document could not be opened." }, { status: 500 });
      }
    }
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText(ascii(company.legalName.toUpperCase()), {
    x: 48,
    y: 742,
    size: 12,
    font: bold,
    color: rgb(0.83, 0.69, 0.22),
  });
  page.drawText(ascii(document.name), {
    x: 48,
    y: 700,
    size: 22,
    font: bold,
    color: rgb(0.04, 0.07, 0.14),
  });
  page.drawLine({
    start: { x: 48, y: 682 },
    end: { x: 564, y: 682 },
    thickness: 1,
    color: rgb(0.83, 0.69, 0.22),
  });

  let y = 654;
  for (const rawLine of documentLines(slug, document.name)) {
    const line = ascii(rawLine);
    if (!line) {
      y -= 11;
      continue;
    }

    const words = line.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, 10) > 516 && current) {
        page.drawText(current, { x: 48, y, size: 10, font: regular });
        y -= 15;
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) {
      page.drawText(current, { x: 48, y, size: 10, font: regular });
      y -= 15;
    }
  }

  const footer = ascii(company.regulatoryNotice);
  page.drawText(footer.slice(0, 100), {
    x: 48,
    y: 34,
    size: 7,
    font: regular,
    color: rgb(0.29, 0.35, 0.43),
  });
  const bytes = await pdf.save();
  const filename = `${document.slug}.pdf`;
  const preview = searchParams.get("preview") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": preview ? "private, no-store" : "public, max-age=3600",
    },
  });
}
