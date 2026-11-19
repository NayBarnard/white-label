import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { disabledFeatureResponse } from "@/lib/features/route-guard";
import { validateManagerMediaFile } from "@/lib/manager-updates/validation";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const disabled = disabledFeatureResponse("managerUpdates");
  if (disabled) return disabled;
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const contentLength = request.headers.get("content-length");
  const requestLength = contentLength === null ? Number.NaN : Number(contentLength);
  if (!Number.isSafeInteger(requestLength) || requestLength < 1 || requestLength > MAX_UPLOAD_BYTES + 128 * 1024) {
    return NextResponse.json({ error: "The media file exceeds the allowed size." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The media upload request could not be read." }, { status: 400 });
  }
  if (Array.from(form.keys()).some((key) => key !== "file") || form.getAll("file").length !== 1) {
    return NextResponse.json({ error: "Provide one supported audio or video file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Provide one supported audio or video file." }, { status: 400 });
  }

  let extension: Awaited<ReturnType<typeof validateManagerMediaFile>>;
  try {
    extension = await validateManagerMediaFile(file);
  } catch (error) {
    console.error("Manager update media validation failed.", error);
    return NextResponse.json({ error: "The media file could not be checked." }, { status: 400 });
  }
  if (!extension) {
    return NextResponse.json(
      { error: "Upload an MP3 or M4A audio file, or an MP4 video, within the allowed size." },
      { status: 400 },
    );
  }

  const mediaPath = `${randomUUID()}.${extension}`;
  try {
    const { error } = await access.supabase.storage
      .from("manager-updates")
      .upload(mediaPath, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("Manager update media upload failed.", error);
      return NextResponse.json({ error: "The media file could not be uploaded." }, { status: 502 });
    }
    const audited = await writeAdminAudit(
      access.supabase,
      access.user.id,
      "manager_update.media_uploaded",
      "manager_updates",
      mediaPath,
      { media_type: extension, size_bytes: file.size },
    );
    if (!audited) {
      const { error: cleanupError } = await access.supabase.storage.from("manager-updates").remove([mediaPath]);
      if (cleanupError) console.error("Manager update media rollback failed.", cleanupError);
      return NextResponse.json({ error: "The upload was rolled back because its audit record could not be written." }, { status: 500 });
    }
    return NextResponse.json({ mediaPath }, { status: 201 });
  } catch (error) {
    console.error("Manager update media upload failed.", error);
    return NextResponse.json({ error: "The media file could not be uploaded." }, { status: 502 });
  }
}
