import { describe, expect, it } from "vitest";
import { MAX_AUDIO_BYTES, parseManagerUpdateInput, validateManagerMediaFile } from "./validation";

const validTextUpdate = {
  title: "Quarterly note",
  body: "A general market update.",
  kind: "text",
};

describe("manager update validation", () => {
  it("accepts bounded text updates and rejects malformed or unsafe values", () => {
    expect(parseManagerUpdateInput(validTextUpdate)).toEqual({
      ...validTextUpdate,
      mediaPath: null,
    });
    expect(parseManagerUpdateInput({ ...validTextUpdate, title: "   " })).toBeNull();
    expect(parseManagerUpdateInput({ ...validTextUpdate, extra: true })).toBeNull();
    expect(parseManagerUpdateInput({
      ...validTextUpdate,
      kind: "audio",
      mediaPath: "../../private.mp3",
    })).toBeNull();
    expect(parseManagerUpdateInput({ ...validTextUpdate, body: "x".repeat(10_001) })).toBeNull();
  });

  it("validates approval metadata, category, scheduling and attached PDFs", () => {
    const update = parseManagerUpdateInput({
      ...validTextUpdate,
      category: "Economic Insights",
      authorName: "PLACEHOLDER BRAND Investment Team",
      featured: true,
      scheduledAt: "2026-12-01T10:00:00Z",
      pdfObjectPath: "insights/123e4567-e89b-42d3-a456-426614174000.pdf",
    });
    expect(update).toMatchObject({
      category: "Economic Insights",
      authorName: "PLACEHOLDER BRAND Investment Team",
      featured: true,
      pdfObjectPath: "insights/123e4567-e89b-42d3-a456-426614174000.pdf",
    });
    expect(parseManagerUpdateInput({ ...validTextUpdate, category: "Unapproved category" })).toBeNull();
    expect(parseManagerUpdateInput({ ...validTextUpdate, scheduledAt: "tomorrow" })).toBeNull();
    expect(parseManagerUpdateInput({ ...validTextUpdate, pdfObjectPath: "../../private.pdf" })).toBeNull();
  });

  it("accepts supported audio bytes and rejects mismatched or oversized media", async () => {
    const makeFile = (name: string, type: string, size: number, header: number[]) =>
      ({
        name,
        type,
        size,
        slice: () => ({ arrayBuffer: async () => new Uint8Array(header).buffer }),
      }) as File;
    expect(await validateManagerMediaFile(makeFile("note.mp3", "audio/mpeg", 3, [0x49, 0x44, 0x33]))).toBe("mp3");
    expect(await validateManagerMediaFile(makeFile("note.mp3", "video/mp4", 3, [0x49, 0x44, 0x33]))).toBeNull();
    expect(await validateManagerMediaFile(makeFile("note.mp3", "audio/mpeg", MAX_AUDIO_BYTES + 1, [0x49, 0x44, 0x33]))).toBeNull();
  });
});
