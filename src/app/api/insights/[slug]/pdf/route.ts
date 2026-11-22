import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { company, performanceDisclosures, returnSummary } from "@/data/firmData";
import { getCanonicalResearchArticle } from "@/lib/insights/server";
import type { PortalDatabase } from "@/lib/supabase/portal";

function wrap(text: string, width: number, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.replace(/[^\x20-\x7E]/g, "-").split(/\s+/)) {
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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const article = await getCanonicalResearchArticle(slug);
  if (!article) return NextResponse.json({ error: "Research article not found." }, { status: 404 });

  const branding = new URL(request.url).searchParams.get("branding");
  if (branding && branding !== "clean" && branding !== "co-branded") {
    return NextResponse.json({ error: "Unsupported PDF branding." }, { status: 400 });
  }

  if (slug.startsWith("manager-update-")) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceRoleKey) {
      const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      const update = await supabase
        .from("manager_updates")
        .select("pdf_object_path")
        .eq("public_slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (update.error) {
        console.error("Research PDF attachment could not be loaded.", update.error);
        return NextResponse.json({ error: "The research PDF could not be loaded." }, { status: 502 });
      }
      if (update.data?.pdf_object_path && branding === "clean") {
        const signed = await supabase.storage
          .from("firm-documents")
          .createSignedUrl(update.data.pdf_object_path, 60, { download: `${slug}.pdf` });
        if (signed.error || !signed.data?.signedUrl) {
          console.error("Research PDF attachment could not be signed.", signed.error);
          return NextResponse.json({ error: "The research PDF could not be opened." }, { status: 502 });
        }
        return NextResponse.redirect(signed.data.signedUrl, { status: 302 });
      }
    }
  }
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = [pdf.addPage([612, 792])];
  let page = pages[0];
  let y = 742;
  const navy = rgb(20 / 255, 43 / 255, 73 / 255);
  const gold = rgb(197 / 255, 160 / 255, 89 / 255);

  const write = (value: string, size = 10, isBold = false, color = rgb(0.18, 0.22, 0.29)) => {
    for (const line of wrap(value, 516, isBold ? bold : regular, size)) {
      if (y < 62) {
        page = pdf.addPage([612, 792]);
        pages.push(page);
        y = 742;
      }
      page.drawText(line, { x: 48, y, size, font: isBold ? bold : regular, color });
      y -= size + 7;
    }
  };

  if (branding !== "clean") {
    write(company.legalName.toUpperCase(), 10, true, navy);
    y -= 4;
  }
  write(article.title, 20, true, navy);
  write(`${article.category} · ${article.author} · ${article.designation} · ${article.date} · ${article.readingTime} min read`, 9, false);
  write(`Executive summary: ${article.executiveSummary}`, 10);
  write("Research", 13, true, navy);
  for (const paragraph of article.body.split(/(?<=[.!?])\s+/).filter(Boolean)) write(paragraph);
  write("Key takeaways", 13, true, navy);
  article.keyTakeaways.forEach((takeaway, index) => write(`${index + 1}. ${takeaway}`));
  write("your firm perspective", 13, true, navy);
  write(article.perspective);
  write("Published performance context", 13, true, navy);
  write(`Published cumulative return summary: ${returnSummary.period}; as at ${returnSummary.asAt}. Source: ${returnSummary.source}. This context is not a market quote or forecast.`);
  write("Related research", 13, true, navy);
  for (const relatedSlug of article.relatedSlugs) write(`/insights/${relatedSlug}`);
  write(`Source attribution: ${article.source}`);
  write(`FSCA and FAIS disclosure: ${company.regulatoryNotice}. your firm is regulated by the Financial Sector Conduct Authority (FSCA). ${performanceDisclosures.advice}`);
  write(performanceDisclosures.pastPerformance, 8);

  if (branding !== "clean") {
    for (const target of pages) {
      target.drawLine({ start: { x: 48, y: 34 }, end: { x: 564, y: 34 }, thickness: 1, color: gold });
      target.drawText(company.regulatoryNotice.slice(0, 105), { x: 48, y: 20, size: 6, font: regular, color: navy });
    }
  }
  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${article.slug}-${branding === "clean" ? "clean" : "adviser-ready"}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
