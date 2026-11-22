import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";

const documentCategories = [
  "Monthly Outlooks",
  "Quarterly Outlooks",
  "Annual Outlooks",
  "Fund Fact Sheets / MDDs",
  "Manager Updates",
  "Presentations",
  "Educational Material",
  "Investor Notices",
] as const;

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const result = await access.supabase
    .from("site_documents")
    .select("*")
    .order("slug")
    .order("version", { ascending: false })
    .limit(1000);
  if (result.error) {
    console.error("Site document versions could not be loaded.", result.error);
    return NextResponse.json({ error: "Document versions could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ documents: result.data });
}

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The document request could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return NextResponse.json({ error: "The document request is invalid." }, { status: 400 });
  }
  const slugValue = record.slug;
  if (typeof slugValue !== "string") {
    return NextResponse.json({ error: "The document details are invalid." }, { status: 400 });
  }
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue) ? slugValue : null;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const objectPath = typeof record.objectPath === "string" ? record.objectPath.trim() : "";
  const effectiveDate = typeof record.effectiveDate === "string" ? record.effectiveDate : "";
  const category = typeof record.category === "string" && documentCategories.some((item) => item === record.category)
    ? record.category
    : null;
  const strategy = record.strategy === undefined
    ? null
    : record.strategy === null
      ? null
      : record.strategy === "your firm Balanced" || record.strategy === "your firm Cautious" || record.strategy === "Both"
      ? record.strategy
      : undefined;
  const fileSizeBytes = record.fileSizeBytes === undefined
    ? null
    : typeof record.fileSizeBytes === "number"
      ? record.fileSizeBytes
      : Number.NaN;
  const checksum = record.checksumSha256 === undefined ? null : record.checksumSha256;
  const fileFormat = record.fileFormat === undefined
    ? "PDF"
    : typeof record.fileFormat === "string"
      ? record.fileFormat.trim().toUpperCase()
      : "";
  const scheduledAt = typeof record.scheduledAt === "string" ? record.scheduledAt : null;
  if (!slug ||
    title.length < 1 || title.length > 160 ||
    !/^firm-documents\/[a-z0-9._/-]+$/i.test(objectPath) ||
  objectPath.split("/").some((segment) => segment === "." || segment === ".." || !segment) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ||
    (record.category !== undefined && !category) ||
    strategy === undefined ||
    (fileSizeBytes !== null && (!Number.isInteger(fileSizeBytes) || Number(fileSizeBytes) < 1 || Number(fileSizeBytes) > 52_428_800)) ||
    (checksum !== null && (typeof checksum !== "string" || !/^[0-9a-f]{64}$/i.test(checksum))) ||
    fileFormat !== "PDF" ||
    (scheduledAt !== null && (!Number.isFinite(Date.parse(scheduledAt)) || !/[zZ]|[+-]\d{2}:\d{2}$/.test(scheduledAt))) ||
    (record.authorName !== undefined && (typeof record.authorName !== "string" || record.authorName.trim().length > 120)) ||
    (record.authorDesignation !== undefined && (typeof record.authorDesignation !== "string" || record.authorDesignation.trim().length > 120))) {
    return NextResponse.json({ error: "The document details are invalid." }, { status: 400 });
  }
  const storedFile = await access.supabase.storage.from("firm-documents").download(objectPath);
  if (storedFile.error || !storedFile.data) {
    console.error("Site document source file could not be verified.", storedFile.error);
    return NextResponse.json({ error: "The uploaded document could not be verified." }, { status: 502 });
  }
  const fileBytes = new Uint8Array(await storedFile.data.arrayBuffer());
  if (fileBytes.byteLength < 5 || fileBytes.byteLength > 52_428_800 ||
    new TextDecoder().decode(fileBytes.slice(0, 5)) !== "%PDF-") {
    return NextResponse.json({ error: "The stored document is not a valid PDF within the 50 MB limit." }, { status: 400 });
  }
  const verifiedChecksum = createHash("sha256").update(fileBytes).digest("hex");
  if ((fileSizeBytes !== null && fileSizeBytes !== fileBytes.byteLength) ||
    (typeof checksum === "string" && checksum.toLowerCase() !== verifiedChecksum)) {
    return NextResponse.json({ error: "The document size or checksum does not match the stored file." }, { status: 400 });
  }
  const existing = await access.supabase
    .from("site_documents")
    .select("version")
    .eq("slug", slug)
    .order("version", { ascending: false })
    .limit(1);
  if (existing.error) {
    return NextResponse.json({ error: "Document versions could not be checked." }, { status: 502 });
  }
  const version = ((existing.data?.[0]?.version as number | undefined) ?? 0) + 1;
  const inserted = await access.supabase.from("site_documents").insert({
    slug,
    title,
    version,
    object_path: objectPath,
    effective_date: effectiveDate,
    status: "draft",
    document_category: category ?? "Investor Notices",
    strategy,
    file_format: fileFormat,
    file_size_bytes: fileBytes.byteLength,
    checksum_sha256: verifiedChecksum,
    scheduled_at: scheduledAt,
    author_name: typeof record.authorName === "string" ? record.authorName.trim() || null : null,
    author_designation: typeof record.authorDesignation === "string" ? record.authorDesignation.trim() || null : null,
    created_by: access.user.id,
  }).select("id").single();
  if (inserted.error) {
    console.error("Site document draft could not be saved.", inserted.error);
    return NextResponse.json({ error: "The draft could not be saved." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "site_document.draft.create",
    "site_document",
    inserted.data.id,
    {
      slug,
      title,
      version,
      effectiveDate,
      category: category ?? "Investor Notices",
      strategy,
      fileFormat,
      fileSizeBytes: fileBytes.byteLength,
      checksumSha256: verifiedChecksum,
      scheduledAt,
    },
  );
  if (!audited) {
    await access.supabase.from("site_documents").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The draft could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id, version });
}
