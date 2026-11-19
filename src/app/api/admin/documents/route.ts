import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { isUuid } from "@/lib/admin/validation";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

function formText(form: FormData, key: string, maximum: number) {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maximum ? trimmed : null;
}

function parseIssuedAt(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? `${value}T00:00:00.000Z`
    : undefined;
}

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const requestLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(requestLength) && requestLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "PDF files must be 4 MB or smaller." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The document upload request could not be read." }, { status: 400 });
  }
  const allowedFields = new Set(["userId", "title", "documentType", "issuedAt", "file"]);
  const unexpectedField = Array.from(form.keys()).some((field) => !allowedFields.has(field));
  const duplicateField = Array.from(allowedFields).some((field) => form.getAll(field).length > 1);
  if (unexpectedField || duplicateField) {
    return NextResponse.json({ error: "The document upload request contains invalid fields." }, { status: 400 });
  }
  const userId = formText(form, "userId", 36);
  const title = formText(form, "title", 160);
  const documentType = formText(form, "documentType", 80);
  const issuedAtText = formText(form, "issuedAt", 10);
  const issuedAt = parseIssuedAt(issuedAtText);
  const file = form.get("file");
  if (
    !userId ||
    !isUuid(userId) ||
    !title ||
    !documentType ||
    issuedAt === undefined ||
    !(file instanceof File) ||
    file.size < 1 ||
    file.size > MAX_UPLOAD_BYTES ||
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return NextResponse.json(
      { error: "Provide a client, title, document type, valid issue date, and PDF file under 4 MB." },
      { status: 400 },
    );
  }

  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (new TextDecoder().decode(signature) !== "%PDF-") {
    return NextResponse.json({ error: "The selected file is not a valid PDF." }, { status: 400 });
  }

  try {
    const { data: userResult, error: userError } = await access.supabase.auth.admin.getUserById(userId);
    if (userError) {
      console.error("Admin document client lookup failed.", userError);
      return NextResponse.json({ error: "The selected client could not be verified." }, { status: 502 });
    }
    if (!userResult.user || userResult.user.app_metadata.role === "admin") {
      return NextResponse.json({ error: "Select a valid client account." }, { status: 400 });
    }

    const safeFileName = file.name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 100);
    const objectPath = `${userId}/${randomUUID()}-${safeFileName}`;
    const { error: uploadError } = await access.supabase.storage
      .from("client-documents")
      .upload(objectPath, file, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) {
      console.error("Admin document upload failed.", uploadError);
      return NextResponse.json({ error: "The document could not be uploaded." }, { status: 502 });
    }

    const { data: document, error: insertError } = await access.supabase
      .from("client_documents")
      .insert({
        user_id: userId,
        title,
        document_type: documentType,
        object_path: objectPath,
        issued_at: issuedAt,
      })
      .select("id")
      .single();
    if (insertError) {
      console.error("Admin document record creation failed.", insertError);
      const { error: cleanupError } = await access.supabase.storage
        .from("client-documents")
        .remove([objectPath]);
      if (cleanupError) console.error("Admin document upload cleanup failed.", cleanupError);
      return NextResponse.json({ error: "The document record could not be created." }, { status: 502 });
    }

    const audited = await writeAdminAudit(
      access.supabase,
      access.user.id,
      "document.uploaded",
      "client_documents",
      document.id,
      { client_user_id: userId, title, document_type: documentType },
    );
    if (!audited) {
      const { error: rowCleanupError } = await access.supabase
        .from("client_documents")
        .delete()
        .eq("id", document.id);
      const { error: objectCleanupError } = await access.supabase.storage
        .from("client-documents")
        .remove([objectPath]);
      if (rowCleanupError) console.error("Admin document record rollback failed.", rowCleanupError);
      if (objectCleanupError) console.error("Admin document upload rollback failed.", objectCleanupError);
      return NextResponse.json(
        { error: "The upload was rolled back because its audit record could not be written. Contact support if it remains visible." },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: document.id });
  } catch (error) {
    console.error("Admin document upload failed.", error);
    return NextResponse.json({ error: "The document could not be uploaded." }, { status: 502 });
  }
}
