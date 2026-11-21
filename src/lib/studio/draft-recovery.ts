import { isHomePageData, type HomePageComponents } from "@/components/home/HomePageEditorConfig";
import type { Data } from "@puckeditor/core";

export type HomepageDraftRecovery = {
  content: Data<HomePageComponents>;
  savedAt: string;
};

export function parseHomepageDraftRecovery(value: string | null): HomepageDraftRecovery | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("content" in parsed) ||
      !("savedAt" in parsed) ||
      typeof parsed.savedAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.savedAt)) ||
      !isHomePageData(parsed.content)
    ) {
      return null;
    }

    return { content: parsed.content, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function isHomepageDraftRecoveryNewer(
  recovery: HomepageDraftRecovery,
  serverSavedAt: string | null,
): boolean {
  if (!serverSavedAt || !Number.isFinite(Date.parse(serverSavedAt))) return true;
  return Date.parse(recovery.savedAt) > Date.parse(serverSavedAt);
}
