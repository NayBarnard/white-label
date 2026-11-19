import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { getResearchVersionStatus } from "@/lib/insights/library";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "The research library is not configured." }, { status: 503 });
  }

  try {
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase
      .from("site_documents")
      .select("id,slug,title,version,effective_date,document_category,strategy,file_format,file_size_bytes,checksum_sha256,approved_at,published_at,status")
      .in("status", ["published", "archived"])
      .order("effective_date", { ascending: false })
      .order("version", { ascending: false })
      .limit(500);
    if (error) {
      console.error("Published research library could not be loaded.", error);
      return NextResponse.json({ error: "Published documents could not be loaded." }, { status: 502 });
    }

    const latestVersion = new Map<string, number>();
    for (const document of data) {
      if (document.status === "published") {
        latestVersion.set(document.slug, Math.max(latestVersion.get(document.slug) ?? 0, document.version));
      }
    }
    const documents = data.map((document) => ({
      id: document.id,
      slug: document.slug,
      title: document.title,
      version: document.version,
      category: document.document_category,
      strategy: document.strategy ?? "Both",
      publicationDate: document.effective_date,
      format: document.file_format,
      sizeBytes: document.file_size_bytes,
      checksum: document.checksum_sha256,
      status: getResearchVersionStatus(document.status, document.version, latestVersion.get(document.slug)),
      approvedAt: document.approved_at,
      publishedAt: document.published_at,
      downloadUrl: getResearchVersionStatus(document.status, document.version, latestVersion.get(document.slug)) === "Latest"
        ? `/api/documents/${encodeURIComponent(document.slug)}?version=${document.version}`
        : null,
    }));
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Published research library request failed.", error);
    return NextResponse.json({ error: "Published documents could not be loaded." }, { status: 500 });
  }
}
