export const MAX_MANAGER_UPDATE_TITLE = 160;
export const MAX_MANAGER_UPDATE_BODY = 10_000;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export type ManagerUpdateKind = "text" | "audio" | "video";

export type ManagerUpdateInput = {
  title: string;
  body: string;
  kind: ManagerUpdateKind;
  mediaPath: string | null;
  category?: string;
  authorName?: string | null;
  authorDesignation?: string | null;
  authorBio?: string | null;
  executiveSummary?: string | null;
  keyTakeaways?: string[];
  perspective?: string | null;
  relatedSlugs?: string[];
  strategy?: "PLACEHOLDER BRAND Balanced" | "PLACEHOLDER BRAND Cautious" | "Both";
  featured?: boolean;
  scheduledAt?: string | null;
  pdfObjectPath?: string | null;
};

const managerMediaPathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp3|m4a|mp4)$/i;
const researchCategories = [
  "Market Commentary",
  "Investment Strategy",
  "Economic Insights",
  "Fund Updates",
  "Adviser Insights",
  "Investor Education",
] as const;
const researchPdfPathPattern = /^insights\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;
const researchSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseManagerUpdateInput(input: unknown): ManagerUpdateInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) =>
    !["title", "body", "kind", "mediaPath", "category", "authorName", "authorDesignation", "authorBio", "executiveSummary", "keyTakeaways", "perspective", "relatedSlugs", "strategy", "featured", "scheduledAt", "pdfObjectPath"].includes(key),
  )) return null;
  if (typeof record.title !== "string" || typeof record.body !== "string") return null;

  const title = record.title.trim();
  const body = record.body.trim();
  const kind = record.kind;
  const mediaPath = record.mediaPath === undefined ? null : record.mediaPath;
  const category = record.category;
  const authorName = record.authorName;
  const authorDesignation = record.authorDesignation;
  const authorBio = record.authorBio;
  const executiveSummary = record.executiveSummary;
  const keyTakeaways = record.keyTakeaways;
  const perspective = record.perspective;
  const relatedSlugs = record.relatedSlugs;
  const strategy = record.strategy;
  const featured = record.featured;
  const scheduledAt = record.scheduledAt;
  const pdfObjectPath = record.pdfObjectPath;
  if (
    !title ||
    title.length > MAX_MANAGER_UPDATE_TITLE ||
    !body ||
    body.length > MAX_MANAGER_UPDATE_BODY ||
    (kind !== "text" && kind !== "audio" && kind !== "video") ||
    (kind === "text" && mediaPath !== null) ||
    (kind !== "text" && (typeof mediaPath !== "string" || !managerMediaPathPattern.test(mediaPath))) ||
    (category !== undefined && (typeof category !== "string" || !researchCategories.some((item) => item === category))) ||
    (authorName !== undefined && authorName !== null && (typeof authorName !== "string" || !authorName.trim() || authorName.trim().length > 120)) ||
    (authorDesignation !== undefined && authorDesignation !== null && (typeof authorDesignation !== "string" || !authorDesignation.trim() || authorDesignation.trim().length > 120)) ||
    (authorBio !== undefined && authorBio !== null && (typeof authorBio !== "string" || authorBio.trim().length > 500)) ||
    (executiveSummary !== undefined && executiveSummary !== null && (
      typeof executiveSummary !== "string" ||
      executiveSummary.trim().length < 20 ||
      executiveSummary.trim().length > 1000 ||
      executiveSummary.trim().split(/(?<=[.!?])\s+/).filter(Boolean).length < 2 ||
      executiveSummary.trim().split(/(?<=[.!?])\s+/).filter(Boolean).length > 3
    )) ||
    (keyTakeaways !== undefined && (
      !Array.isArray(keyTakeaways) ||
      keyTakeaways.length < 3 ||
      keyTakeaways.length > 5 ||
      keyTakeaways.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > 300)
    )) ||
    (perspective !== undefined && perspective !== null && (typeof perspective !== "string" || perspective.trim().length < 10 || perspective.trim().length > 1000)) ||
    (relatedSlugs !== undefined && (
      !Array.isArray(relatedSlugs) ||
      relatedSlugs.length > 5 ||
      relatedSlugs.some((item) => typeof item !== "string" || !researchSlugPattern.test(item)) ||
      new Set(relatedSlugs).size !== relatedSlugs.length
    )) ||
    (strategy !== undefined && strategy !== "PLACEHOLDER BRAND Balanced" && strategy !== "PLACEHOLDER BRAND Cautious" && strategy !== "Both") ||
    (featured !== undefined && typeof featured !== "boolean") ||
    (scheduledAt !== undefined && scheduledAt !== null && (
      typeof scheduledAt !== "string" ||
      !Number.isFinite(Date.parse(scheduledAt)) ||
      !/[zZ]|[+-]\d{2}:\d{2}$/.test(scheduledAt)
    )) ||
    (pdfObjectPath !== undefined && pdfObjectPath !== null && (
      typeof pdfObjectPath !== "string" || !researchPdfPathPattern.test(pdfObjectPath)
    ))
  ) {
    return null;
  }
  return {
    title,
    body,
    kind,
    mediaPath: mediaPath as string | null,
    ...(typeof category === "string" ? { category } : {}),
    ...(typeof authorName === "string" || authorName === null ? { authorName: authorName?.trim() || null } : {}),
    ...(typeof authorDesignation === "string" || authorDesignation === null ? { authorDesignation: authorDesignation?.trim() || null } : {}),
    ...(typeof authorBio === "string" || authorBio === null ? { authorBio: authorBio?.trim() || null } : {}),
    ...(typeof executiveSummary === "string" || executiveSummary === null ? { executiveSummary: executiveSummary?.trim() || null } : {}),
    ...(Array.isArray(keyTakeaways) ? { keyTakeaways: keyTakeaways.map((item) => item.trim()) } : {}),
    ...(typeof perspective === "string" || perspective === null ? { perspective: perspective?.trim() || null } : {}),
    ...(Array.isArray(relatedSlugs) ? { relatedSlugs: [...relatedSlugs] as string[] } : {}),
    ...(strategy === "PLACEHOLDER BRAND Balanced" || strategy === "PLACEHOLDER BRAND Cautious" || strategy === "Both" ? { strategy } : {}),
    ...(typeof featured === "boolean" ? { featured } : {}),
    ...(typeof scheduledAt === "string" || scheduledAt === null ? { scheduledAt } : {}),
    ...(typeof pdfObjectPath === "string" || pdfObjectPath === null ? { pdfObjectPath } : {}),
  };
}

export async function validateManagerMediaFile(file: File): Promise<"mp3" | "m4a" | "mp4" | null> {
  const extension = file.name.toLowerCase().split(".").pop();
  const sizeLimit = extension === "mp4" ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
  if (file.size < 1 || file.size > sizeLimit) return null;
  if (extension === "mp3" && file.type === "audio/mpeg") {
    const header = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) return "mp3";
    if (header.length >= 2 && header[0] === 0xff && (header[1] & 0xe0) === 0xe0) return "mp3";
    return null;
  }
  if (extension === "m4a" && ["audio/mp4", "audio/x-m4a"].includes(file.type)) {
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    return new TextDecoder().decode(header.slice(4, 8)) === "ftyp" ? "m4a" : null;
  }
  if (extension === "mp4" && file.type === "video/mp4") {
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    return new TextDecoder().decode(header.slice(4, 8)) === "ftyp" ? "mp4" : null;
  }
  return null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
