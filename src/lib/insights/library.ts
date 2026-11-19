export type ResearchVersionStatus = "Latest" | "Archived";

export function getResearchVersionStatus(
  status: string,
  version: number,
  latestPublishedVersion: number | undefined,
): ResearchVersionStatus {
  return status === "published" && version === latestPublishedVersion ? "Latest" : "Archived";
}
