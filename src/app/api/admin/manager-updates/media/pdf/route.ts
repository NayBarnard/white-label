import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { disabledFeatureResponse } from "@/lib/features/route-guard";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const disabled = disabledFeatureResponse("managerUpdates");
  if (disabled) return disabled;
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > MAX_PDF_BYTES + 128 * 1024) {
    return NextResponse.json({ error: "The PDF exceeds the allowed size." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The PDF upload request could not be read." }, { status: 400 });
  }
  if (Array.from(form.keys()).some((key) => key !== "file") || form.getAll("file").length !== 1) {
    return NextResponse.json({ error: "Provide one PDF file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf") || file.size < 5 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "Provide a PDF file within the 50 MB limit." }, { status: 400 });
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    console.error("Manager update PDF could not be read.", error);
    return NextResponse.json({ error: "The PDF could not be checked." }, { status: 400 });
  }
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return NextResponse.json({ error: "The uploaded file is not a valid PDF." }, { status: 400 });
  }
  const pdfObjectPath = `insights/${randomUUID()}.pdf`;
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const { error } = await access.supabase.storage
    .from("firm-documents")
    .upload(pdfObjectPath, bytes, { contentType: "application/pdf", upsert: false });
  if (error) {
    console.error("Manager update PDF upload failed.", error);
    return NextResponse.json({ error: "The PDF could not be uploaded." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "manager_update.pdf_uploaded",
    "manager_updates",
    pdfObjectPath,
    { size_bytes: bytes.byteLength, checksum_sha256: checksum },
  );
  if (!audited) {
    const cleanup = await access.supabase.storage.from("firm-documents").remove([pdfObjectPath]);
    if (cleanup.error) console.error("Manager update PDF rollback failed.", cleanup.error);
    return NextResponse.json({ error: "The upload was rolled back because its audit record could not be written." }, { status: 500 });
  }
  return NextResponse.json({ pdfObjectPath, checksumSha256: checksum }, { status: 201 });
}
